const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const XPService = require('../services/xp_service');
const StreakService = require('../services/streak_service');
const NotificationService = require('../services/notification_service');

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'sub-' + uniqueSuffix + ext);
  }
});

// File validation
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.pdf', '.docx', '.txt', '.zip', '.py', '.js', '.ts', '.java', '.cpp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${ext} is not supported. Permitted types: images, PDFs, documents, source code.`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit
});

// Submit answer or revision
router.post('/:taskId/submit', authenticateToken, upload.array('attachments', 10), (req, res) => {
  const taskId = req.params.taskId;
  const userId = req.user.id;
  const { text_content, link_url, notes } = req.body;
  const files = req.files || [];

  if ((!text_content || !text_content.trim()) && files.length === 0 && (!link_url || !link_url.trim())) {
    return res.status(400).json({ error: 'Submission must contain text, file attachments, or a valid link.' });
  }

  const task = db.prepare('SELECT * FROM study_tasks WHERE id = ?').get(taskId);
  if (!task) return res.status(404).json({ error: 'Task not found.' });

  // Check or create study_submission
  let submission = db.prepare('SELECT * FROM study_submissions WHERE task_id = ? AND user_id = ?').get(taskId, userId);
  let newVersionNumber = 1;

  if (submission) {
    newVersionNumber = submission.current_version + 1;
    db.prepare(`
      UPDATE study_submissions
      SET current_version = ?, status = 'submitted', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newVersionNumber, submission.id);
  } else {
    const subRes = db.prepare(`
      INSERT INTO study_submissions (task_id, user_id, current_version, status)
      VALUES (?, ?, 1, 'submitted')
    `).run(taskId, userId);
    submission = { id: Number(subRes.lastInsertRowid), current_version: 1 };
  }

  // Insert submission version
  const verRes = db.prepare(`
    INSERT INTO submission_versions (submission_id, version_number, text_content, link_url, notes)
    VALUES (?, ?, ?, ?, ?)
  `).run(submission.id, newVersionNumber, text_content || '', link_url || '', notes || '');

  const versionId = Number(verRes.lastInsertRowid);

  // Insert attachments
  const insertAttachment = db.prepare(`
    INSERT INTO submission_attachments (version_id, file_path, original_name, mime_type, file_size, attachment_type)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const f of files) {
    const ext = path.extname(f.originalname).toLowerCase();
    let attType = 'image';
    if (['.pdf', '.docx', '.txt'].includes(ext)) attType = 'document';
    else if (['.py', '.js', '.ts', '.java', '.cpp'].includes(ext)) attType = 'code';
    else if (files.length > 1) attType = 'multi_image';

    const relativePath = '/uploads/' + f.filename;
    insertAttachment.run(versionId, relativePath, f.originalname, f.mimetype, f.size, attType);
  }

  // Update task status to under_review
  db.prepare(`UPDATE study_tasks SET status = 'under_review', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(taskId);
  db.prepare(`UPDATE study_task_assignments SET status = 'in_progress' WHERE task_id = ? AND user_id = ?`).run(taskId, userId);

  // Gamification: XP award for initial submission or revision
  if (newVersionNumber === 1) {
    XPService.awardXP(userId, 15, `Submitted work for task: "${task.title}"`, 'task_completed', 'submission', submission.id);
  } else {
    XPService.awardXP(userId, 10, `Submitted revised version #${newVersionNumber} for task: "${task.title}"`, 'revision_improvement', 'submission_version', versionId);
  }

  // Record daily streak activity (submission is a verified study action)
  StreakService.recordActivity(userId, 'study', 'task_submitted', taskId, req.user.timezone);

  // Notify creator / reviewers
  if (task.creator_id !== userId) {
    NotificationService.notify(
      task.creator_id,
      'review',
      'New Task Submission Ready for Review',
      `${req.user.full_name} submitted v${newVersionNumber} for "${task.title}"`,
      `/tasks/${taskId}`
    );
  }

  const savedVersion = db.prepare('SELECT * FROM submission_versions WHERE id = ?').get(versionId);
  const savedAttachments = db.prepare('SELECT * FROM submission_attachments WHERE version_id = ?').all(versionId);

  res.status(201).json({
    submissionId: submission.id,
    version: savedVersion,
    attachments: savedAttachments
  });
});

// Get user's submission history with versions and attachments
router.get('/:taskId', authenticateToken, (req, res) => {
  const taskId = req.params.taskId;
  const userId = req.user.id;
  const targetUserId = req.query.user_id ? Number(req.query.user_id) : userId;

  const task = db.prepare('SELECT * FROM study_tasks WHERE id = ?').get(taskId);
  if (!task) return res.status(404).json({ error: 'Task not found.' });

  // Security check: only author, task creator, or room moderators can view private submissions
  if (targetUserId !== userId && task.creator_id !== userId) {
    if (task.room_id) {
      const membership = db.prepare('SELECT role FROM study_room_memberships WHERE room_id = ? AND user_id = ?').get(task.room_id, userId);
      if (!membership || (membership.role !== 'owner' && membership.role !== 'moderator')) {
        return res.status(403).json({ error: 'Unauthorized to view this user’s private submission.' });
      }
    } else {
      return res.status(403).json({ error: 'Unauthorized to view this private submission.' });
    }
  }

  const submission = db.prepare('SELECT * FROM study_submissions WHERE task_id = ? AND user_id = ?').get(taskId, targetUserId);
  if (!submission) return res.json({ submission: null, versions: [] });

  const versions = db.prepare(`
    SELECT * FROM submission_versions WHERE submission_id = ? ORDER BY version_number DESC
  `).all(submission.id);

  const versionsWithDetails = versions.map(v => {
    const attachments = db.prepare('SELECT * FROM submission_attachments WHERE version_id = ?').all(v.id);
    const reviews = db.prepare(`
      SELECT r.*, u.full_name as reviewer_name, u.avatar_url as reviewer_avatar
      FROM submission_reviews r
      LEFT JOIN users u ON r.reviewer_id = u.id
      WHERE r.version_id = ?
    `).all(v.id);

    return {
      ...v,
      attachments,
      reviews
    };
  });

  res.json({
    submission,
    versions: versionsWithDetails
  });
});

// Get all submissions for a task (for reviewer / teacher / moderator dashboard)
router.get('/:taskId/all', authenticateToken, (req, res) => {
  const taskId = req.params.taskId;
  const userId = req.user.id;

  const task = db.prepare('SELECT * FROM study_tasks WHERE id = ?').get(taskId);
  if (!task) return res.status(404).json({ error: 'Task not found.' });

  const submissions = db.prepare(`
    SELECT s.*, u.username, u.full_name, u.avatar_url,
           v.id as latest_version_id, v.text_content, v.link_url, v.notes, v.submitted_at as version_submitted_at,
           (SELECT COUNT(*) FROM submission_attachments a WHERE a.version_id = v.id) as attachment_count,
           (SELECT decision FROM submission_reviews r WHERE r.version_id = v.id ORDER BY r.created_at DESC LIMIT 1) as latest_decision
    FROM study_submissions s
    JOIN users u ON s.user_id = u.id
    LEFT JOIN submission_versions v ON s.id = v.submission_id AND s.current_version = v.version_number
    WHERE s.task_id = ?
    ORDER BY s.updated_at DESC
  `).all(taskId);

  const submissionsWithAttachments = submissions.map(s => {
    const attachments = s.latest_version_id
      ? db.prepare('SELECT * FROM submission_attachments WHERE version_id = ?').all(s.latest_version_id)
      : [];
    return { ...s, attachments };
  });

  res.json(submissionsWithAttachments);
});

module.exports = router;
