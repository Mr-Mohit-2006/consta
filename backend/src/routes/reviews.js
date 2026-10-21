const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const AIReviewService = require('../services/ai_review_service');
const XPService = require('../services/xp_service');
const StreakService = require('../services/streak_service');
const NotificationService = require('../services/notification_service');

// Get all review rubrics
router.get('/rubrics', authenticateToken, (req, res) => {
  const rubrics = db.prepare('SELECT * FROM review_rubrics ORDER BY is_default DESC, created_at DESC').all();
  const rubricsWithCriteria = rubrics.map(r => {
    const criteria = db.prepare('SELECT * FROM review_criteria WHERE rubric_id = ?').all(r.id);
    return { ...r, criteria };
  });
  res.json(rubricsWithCriteria);
});

// Create custom review rubric
router.post('/rubrics', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { title, description, subject, criteria } = req.body;

  if (!title || !Array.isArray(criteria) || criteria.length === 0) {
    return res.status(400).json({ error: 'Title and at least one criterion are required.' });
  }

  const rubRes = db.prepare(`
    INSERT INTO review_rubrics (title, description, creator_id, subject)
    VALUES (?, ?, ?, ?)
  `).run(title, description || '', userId, subject || 'General');

  const rubricId = Number(rubRes.lastInsertRowid);
  const insertCrit = db.prepare(`
    INSERT INTO review_criteria (rubric_id, title, description, max_score, weight)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const c of criteria) {
    insertCrit.run(rubricId, c.title, c.description || '', c.max_score || 5, c.weight || 1.0);
  }

  const newRubric = db.prepare('SELECT * FROM review_rubrics WHERE id = ?').get(rubricId);
  newRubric.criteria = db.prepare('SELECT * FROM review_criteria WHERE rubric_id = ?').all(rubricId);

  res.status(201).json(newRubric);
});

// Trigger AI-assisted evaluation
router.post('/ai-assist', authenticateToken, async (req, res) => {
  const { submission_id, version_id } = req.body;

  if (!submission_id || !version_id) {
    return res.status(400).json({ error: 'submission_id and version_id are required.' });
  }

  const submission = db.prepare('SELECT * FROM study_submissions WHERE id = ?').get(submission_id);
  if (!submission) return res.status(404).json({ error: 'Submission not found.' });

  const version = db.prepare('SELECT * FROM submission_versions WHERE id = ?').get(version_id);
  if (!version) return res.status(404).json({ error: 'Submission version not found.' });

  const task = db.prepare('SELECT * FROM study_tasks WHERE id = ?').get(submission.task_id);
  const criteria = task.rubric_id ? db.prepare('SELECT * FROM review_criteria WHERE rubric_id = ?').all(task.rubric_id) : [];
  const attachments = db.prepare('SELECT * FROM submission_attachments WHERE version_id = ?').all(version_id);

  try {
    const aiEvaluation = await AIReviewService.evaluateSubmission(task, version, criteria, attachments);
    res.json(aiEvaluation);
  } catch (err) {
    res.status(500).json({ error: 'AI analysis failed: ' + err.message });
  }
});

// Submit a review (peer, mentor, or self-review)
router.post('/submit', authenticateToken, (req, res) => {
  const reviewerId = req.user.id;
  const {
    submission_id,
    version_id,
    reviewer_type, // 'peer', 'mentor', 'self', 'ai'
    decision,      // 'approved', 'revision_requested', 'rejected'
    what_done_well,
    what_needs_improvement,
    specific_mistakes,
    suggested_next_steps,
    learning_resources,
    general_comments,
    criterion_scores, // array of { criterion_id, score, comment }
    is_ai_review,
    ai_confidence,
    ai_disclaimer
  } = req.body;

  let effectiveVersionId = version_id;
  if (!effectiveVersionId && submission_id) {
    const latestVer = db.prepare('SELECT id FROM submission_versions WHERE submission_id = ? ORDER BY version_number DESC LIMIT 1').get(submission_id);
    if (latestVer) effectiveVersionId = latestVer.id;
  }

  if (!submission_id || !effectiveVersionId || !decision) {
    return res.status(400).json({ error: 'submission_id, version_id, and decision are required.' });
  }

  const submission = db.prepare('SELECT * FROM study_submissions WHERE id = ?').get(submission_id);
  if (!submission) return res.status(404).json({ error: 'Submission not found.' });

  const task = db.prepare('SELECT * FROM study_tasks WHERE id = ?').get(submission.task_id);

  const type = ['peer', 'mentor', 'self', 'ai'].includes(reviewer_type) ? reviewer_type : 'peer';

  // Prevent self-review giving peer review rewards
  const isActualSelfReview = submission.user_id === reviewerId;
  const effectiveType = isActualSelfReview ? 'self' : type;

  // Calculate overall score from criteria if available
  let overallScore = 0;
  if (Array.isArray(criterion_scores) && criterion_scores.length > 0) {
    const sum = criterion_scores.reduce((acc, c) => acc + (Number(c.score) || 0), 0);
    overallScore = Math.round((sum / criterion_scores.length) * 10) / 10;
  }

  const revRes = db.prepare(`
    INSERT INTO submission_reviews (
      submission_id, version_id, reviewer_id, reviewer_type, overall_score, status, decision,
      what_done_well, what_needs_improvement, specific_mistakes, suggested_next_steps,
      learning_resources, general_comments, is_ai_review, ai_confidence, ai_disclaimer
    ) VALUES (?, ?, ?, ?, ?, 'submitted', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    submission_id,
    version_id,
    reviewerId,
    effectiveType,
    overallScore,
    decision,
    what_done_well || '',
    what_needs_improvement || '',
    specific_mistakes || '',
    suggested_next_steps || '',
    learning_resources || '',
    general_comments || '',
    is_ai_review ? 1 : 0,
    ai_confidence || 0,
    ai_disclaimer || ''
  );

  const reviewId = Number(revRes.lastInsertRowid);

  // Save criteria comments
  if (Array.isArray(criterion_scores)) {
    const insertCritComment = db.prepare(`
      INSERT INTO review_comments (review_id, criterion_id, score, comment)
      VALUES (?, ?, ?, ?)
    `);
    for (const c of criterion_scores) {
      if (c.criterion_id) {
        insertCritComment.run(reviewId, c.criterion_id, c.score || 0, c.comment || '');
      }
    }
  }

  // Update submission status
  db.prepare(`
    UPDATE study_submissions
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(decision, submission_id);

  // Update task status
  const newTaskStatus = decision === 'approved' ? 'approved' : (decision === 'revision_requested' ? 'revision_requested' : 'rejected');
  db.prepare(`
    UPDATE study_tasks
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(newTaskStatus, task.id);

  // Gamification rewards for approved work or peer review
  if (decision === 'approved') {
    // Only award full approval XP if approved by a human reviewer or verified mentor
    if (!is_ai_review && !isActualSelfReview) {
      // Award learner for approved work
      XPService.awardXP(
        submission.user_id,
        50,
        `Task submission approved for "${task.title}"`,
        'submission_approved',
        'task',
        task.id
      );

      // Award reviewer for providing constructive feedback
      XPService.awardXP(
        reviewerId,
        20,
        `Contributed verified peer review for task "${task.title}"`,
        'peer_review',
        'submission_review',
        reviewId
      );

      // Record study streak activity for the learner
      StreakService.recordActivity(submission.user_id, 'study', 'task_approved', task.id);
    }

    // Update assignment to completed
    db.prepare(`
      UPDATE study_task_assignments
      SET status = 'completed', completed_at = CURRENT_TIMESTAMP
      WHERE task_id = ? AND user_id = ?
    `).run(task.id, submission.user_id);

    // Notify learner
    NotificationService.notify(
      submission.user_id,
      'review',
      'Submission Approved! 🎉',
      `Your submission for "${task.title}" has been approved.`,
      `/tasks/${task.id}`
    );
  } else if (decision === 'revision_requested') {
    // Notify learner with specific improvements requested
    NotificationService.notify(
      submission.user_id,
      'review',
      'Revision Requested',
      `Reviewer requested improvements on "${task.title}": ${what_needs_improvement || 'See feedback for details.'}`,
      `/tasks/${task.id}`
    );
  }

  const review = db.prepare('SELECT * FROM submission_reviews WHERE id = ?').get(reviewId);
  res.status(201).json(review);
});

module.exports = router;
