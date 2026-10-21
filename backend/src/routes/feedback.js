const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const XPService = require('../services/xp_service');
const NotificationService = require('../services/notification_service');

// Get feedback thread and messages for a submission version
router.get('/threads/:submissionId/:versionId', authenticateToken, (req, res) => {
  const { submissionId, versionId } = req.params;
  const userId = req.user.id;

  const submission = db.prepare('SELECT * FROM study_submissions WHERE id = ?').get(submissionId);
  if (!submission) return res.status(404).json({ error: 'Submission not found.' });

  // Get or create thread
  let thread = db.prepare(`
    SELECT * FROM feedback_threads WHERE submission_id = ? AND version_id = ?
  `).get(submissionId, versionId);

  if (!thread) {
    const threadRes = db.prepare(`
      INSERT INTO feedback_threads (submission_id, version_id, title, created_by)
      VALUES (?, ?, 'Discussion on Submission v' || (SELECT version_number FROM submission_versions WHERE id = ?), ?)
    `).run(submissionId, versionId, versionId, userId);
    thread = db.prepare('SELECT * FROM feedback_threads WHERE id = ?').get(Number(threadRes.lastInsertRowid));
  }

  // Get messages
  const messages = db.prepare(`
    SELECT m.*, u.username, u.full_name, u.avatar_url,
           (SELECT COUNT(*) FROM feedback_helpful_votes v WHERE v.message_id = m.id AND v.user_id = ?) as user_voted_helpful
    FROM feedback_messages m
    JOIN users u ON m.user_id = u.id
    WHERE m.thread_id = ?
    ORDER BY m.created_at ASC
  `).all(userId, thread.id);

  // Reviews on this version
  const reviews = db.prepare(`
    SELECT r.*, u.full_name as reviewer_name, u.avatar_url as reviewer_avatar
    FROM submission_reviews r
    LEFT JOIN users u ON r.reviewer_id = u.id
    WHERE r.version_id = ?
    ORDER BY r.created_at DESC
  `).all(versionId);

  res.json({
    thread,
    reviews,
    messages
  });
});

// Post a message to feedback thread
router.post('/threads/:threadId/messages', authenticateToken, (req, res) => {
  const threadId = req.params.threadId;
  const userId = req.user.id;
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message content is required.' });
  }

  const thread = db.prepare('SELECT * FROM feedback_threads WHERE id = ?').get(threadId);
  if (!thread) return res.status(404).json({ error: 'Feedback thread not found.' });

  const msgRes = db.prepare(`
    INSERT INTO feedback_messages (thread_id, user_id, message)
    VALUES (?, ?, ?)
  `).run(threadId, userId, message.trim());

  const newMsg = db.prepare(`
    SELECT m.*, u.username, u.full_name, u.avatar_url, 0 as user_voted_helpful
    FROM feedback_messages m
    JOIN users u ON m.user_id = u.id
    WHERE m.id = ?
  `).get(Number(msgRes.lastInsertRowid));

  // Notify learner or reviewer
  const submission = db.prepare('SELECT user_id, task_id FROM study_submissions WHERE id = ?').get(thread.submission_id);
  if (submission && submission.user_id !== userId) {
    NotificationService.notify(
      submission.user_id,
      'review',
      'New Feedback Thread Reply',
      `${req.user.full_name} commented on your feedback thread.`,
      `/tasks/${submission.task_id}`
    );
  }

  res.status(201).json(newMsg);
});

// Mark feedback as helpful
router.post('/messages/:messageId/helpful', authenticateToken, (req, res) => {
  const messageId = req.params.messageId;
  const userId = req.user.id;

  const msg = db.prepare('SELECT * FROM feedback_messages WHERE id = ?').get(messageId);
  if (!msg) return res.status(404).json({ error: 'Message not found.' });

  if (msg.user_id === userId) {
    return res.status(400).json({ error: 'Cannot mark your own message as helpful.' });
  }

  try {
    db.prepare(`
      INSERT INTO feedback_helpful_votes (message_id, user_id)
      VALUES (?, ?)
    `).run(messageId, userId);

    db.prepare(`
      UPDATE feedback_messages
      SET is_helpful_count = is_helpful_count + 1
      WHERE id = ?
    `).run(messageId);

    // Award XP to author of helpful feedback
    XPService.awardXP(
      msg.user_id,
      10,
      'Your feedback explanation was marked as helpful!',
      'doubt_resolved',
      'feedback_message',
      messageId
    );

    res.json({ success: true, is_helpful_count: msg.is_helpful_count + 1 });
  } catch (err) {
    res.status(400).json({ error: 'You have already marked this feedback as helpful.' });
  }
});

// Mark thread status (e.g. improvements addressed)
router.put('/threads/:threadId/status', authenticateToken, (req, res) => {
  const threadId = req.params.threadId;
  const { status } = req.body;

  if (!['open', 'resolved'].includes(status)) {
    return res.status(400).json({ error: 'Valid statuses: open, resolved.' });
  }

  db.prepare(`
    UPDATE feedback_threads
    SET status = ?
    WHERE id = ?
  `).run(status, threadId);

  res.json({ success: true, status });
});

module.exports = router;
