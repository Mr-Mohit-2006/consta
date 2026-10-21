const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const NotificationService = require('../services/notification_service');
const FriendService = require('../services/friend_service');
const StreakService = require('../services/streak_service');

// Create study task
router.post('/', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const {
    title,
    instructions,
    subject,
    topic,
    room_id,
    due_date,
    priority,
    expected_outcome,
    reference_materials, // array of { title, url }
    allowed_submission_types, // array of ['text', 'image', 'multi_image', 'document', 'link']
    review_type,
    rubric_id,
    is_group_task,
    assigned_user_ids // array of user IDs
  } = req.body;

  if (!title || !instructions || !subject) {
    return res.status(400).json({ error: 'Title, instructions, and subject are required.' });
  }

  const validPriority = ['low', 'medium', 'high', 'urgent'].includes(priority) ? priority : 'medium';
  const validReview = ['self', 'peer', 'ai', 'mentor'].includes(review_type) ? review_type : 'peer';

  // Default rubric if none provided
  let selectedRubricId = rubric_id || null;
  if (!selectedRubricId) {
    const defaultRub = db.prepare('SELECT id FROM review_rubrics WHERE is_default = 1').get();
    if (defaultRub) selectedRubricId = defaultRub.id;
  }

  const taskRes = db.prepare(`
    INSERT INTO study_tasks (
      title, instructions, subject, topic, creator_id, room_id,
      due_date, priority, expected_outcome, reference_materials,
      allowed_submission_types, review_type, rubric_id, status, is_group_task
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'not_started', ?)
  `).run(
    title,
    instructions,
    subject,
    topic || '',
    userId,
    room_id || null,
    due_date || null,
    validPriority,
    expected_outcome || '',
    JSON.stringify(reference_materials || []),
    JSON.stringify(allowed_submission_types || ['text', 'image', 'multi_image', 'document', 'link']),
    validReview,
    selectedRubricId,
    is_group_task ? 1 : 0
  );

  const taskId = Number(taskRes.lastInsertRowid);

  // Create chat room for this task's dedicated discussion thread
  db.prepare(`
    INSERT INTO chat_rooms (room_type, reference_id)
    VALUES ('task_discussion', ?)
  `).run(taskId);

  // Assign users
  const assignees = new Set(Array.isArray(assigned_user_ids) ? assigned_user_ids : []);
  // If solo task or creator assigned themself
  if (!is_group_task || assignees.size === 0) {
    assignees.add(userId);
  }

  const insertAssign = db.prepare("INSERT OR IGNORE INTO study_task_assignments (task_id, user_id, status) VALUES (?, ?, 'assigned')");
  for (const uid of assignees) {
    insertAssign.run(taskId, uid);
    if (uid !== userId) {
      NotificationService.notify(
        uid,
        'task',
        'New Study Task Assigned',
        `You have been assigned to task: "${title}"`,
        `/tasks/${taskId}`
      );
    }
  }

  const task = db.prepare('SELECT * FROM study_tasks WHERE id = ?').get(taskId);
  res.status(201).json(task);
});

// List tasks
router.get('/', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { room_id, status, assigned_to_me, created_by_me, subject } = req.query;

  let query = `
    SELECT t.*, u.full_name as creator_name, r.name as room_name,
           (SELECT status FROM study_task_assignments a WHERE a.task_id = t.id AND a.user_id = ?) as user_assignment_status,
           (SELECT s.status FROM study_submissions s WHERE s.task_id = t.id AND s.user_id = ?) as user_submission_status
    FROM study_tasks t
    JOIN users u ON t.creator_id = u.id
    LEFT JOIN study_rooms r ON t.room_id = r.id
    WHERE 1=1
  `;
  const params = [userId, userId];

  if (room_id) {
    query += ' AND t.room_id = ?';
    params.push(room_id);
  }
  if (status) {
    query += ' AND t.status = ?';
    params.push(status);
  }
  if (subject) {
    query += ' AND t.subject = ?';
    params.push(subject);
  }
  if (assigned_to_me === 'true') {
    query += ' AND t.id IN (SELECT task_id FROM study_task_assignments WHERE user_id = ?)';
    params.push(userId);
  }
  if (created_by_me === 'true') {
    query += ' AND t.creator_id = ?';
    params.push(userId);
  }

  query += ' ORDER BY t.created_at DESC';

  const tasks = db.prepare(query).all(...params);

  const formatted = tasks.map(t => ({
    ...t,
    reference_materials: JSON.parse(t.reference_materials || '[]'),
    allowed_submission_types: JSON.parse(t.allowed_submission_types || '[]')
  }));

  res.json(formatted);
});

// Get task details
router.get('/:id', authenticateToken, (req, res) => {
  const taskId = req.params.id;
  const userId = req.user.id;

  const task = db.prepare(`
    SELECT t.*, u.full_name as creator_name, u.avatar_url as creator_avatar,
           r.name as room_name
    FROM study_tasks t
    JOIN users u ON t.creator_id = u.id
    LEFT JOIN study_rooms r ON t.room_id = r.id
    WHERE t.id = ?
  `).get(taskId);

  if (!task) return res.status(404).json({ error: 'Task not found.' });

  task.reference_materials = JSON.parse(task.reference_materials || '[]');
  task.allowed_submission_types = JSON.parse(task.allowed_submission_types || '[]');

  // Assigned members
  const assignments = db.prepare(`
    SELECT a.*, u.username, u.full_name, u.avatar_url
    FROM study_task_assignments a
    JOIN users u ON a.user_id = u.id
    WHERE a.task_id = ?
  `).all(taskId);

  // Rubric details
  let rubric = null;
  if (task.rubric_id) {
    rubric = db.prepare('SELECT * FROM review_rubrics WHERE id = ?').get(task.rubric_id);
    if (rubric) {
      rubric.criteria = db.prepare('SELECT * FROM review_criteria WHERE rubric_id = ?').all(rubric.id);
    }
  }

  // Current user's submission if any
  const mySubmission = db.prepare(`
    SELECT * FROM study_submissions WHERE task_id = ? AND user_id = ?
  `).get(taskId, userId);

  let submissionDetails = null;
  if (mySubmission) {
    const versions = db.prepare(`
      SELECT * FROM submission_versions WHERE submission_id = ? ORDER BY version_number DESC
    `).all(mySubmission.id);

    const latestVersion = versions[0] || null;
    let attachments = [];
    let reviews = [];

    if (latestVersion) {
      attachments = db.prepare('SELECT * FROM submission_attachments WHERE version_id = ?').all(latestVersion.id);
      reviews = db.prepare(`
        SELECT r.*, u.full_name as reviewer_name, u.avatar_url as reviewer_avatar
        FROM submission_reviews r
        LEFT JOIN users u ON r.reviewer_id = u.id
        WHERE r.submission_id = ?
        ORDER BY r.created_at DESC
      `).all(mySubmission.id);
    }

    submissionDetails = {
      ...mySubmission,
      versions,
      latestVersion,
      attachments,
      reviews
    };
  }

  // Task discussion chat room
  let chatRoom = db.prepare("SELECT id FROM chat_rooms WHERE room_type = 'task_discussion' AND reference_id = ?").get(taskId);
  if (!chatRoom) {
    const crRes = db.prepare("INSERT INTO chat_rooms (room_type, reference_id) VALUES ('task_discussion', ?)").run(taskId);
    chatRoom = { id: Number(crRes.lastInsertRowid) };
  }

  res.json({
    task,
    assignments,
    rubric,
    mySubmission: submissionDetails,
    chatRoomId: chatRoom.id
  });
});

// Start task -> Triggers push notifications to friends!
router.post('/:id/start', authenticateToken, (req, res) => {
  const taskId = req.params.id;
  const userId = req.user.id;

  const task = db.prepare('SELECT * FROM study_tasks WHERE id = ?').get(taskId);
  if (!task) return res.status(404).json({ error: 'Task not found.' });

  db.prepare("UPDATE study_tasks SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(taskId);

  db.prepare(`
    INSERT INTO study_task_assignments (task_id, user_id, status)
    VALUES (?, ?, 'in_progress')
    ON CONFLICT(task_id, user_id)
    DO UPDATE SET status = 'in_progress'
  `).run(taskId, userId);

  // Record activity in streak service
  StreakService.recordActivity(userId, 'study', 'task_started', taskId, req.user.timezone);

  // Push notifications to all friends!
  const notified = FriendService.notifyFriends(
    userId,
    'task',
    `🚀 Friend Started: "${task.title.slice(0, 35)}"`,
    `${req.user.full_name} started working on "${task.title}". Check out their progress or study together!`,
    `/tasks/${taskId}`
  );

  res.json({
    success: true,
    status: 'in_progress',
    notifiedFriendsCount: notified.length
  });
});

// Update task status
router.put('/:id/status', authenticateToken, (req, res) => {
  const taskId = req.params.id;
  const userId = req.user.id;
  const { status } = req.body;

  const validStatuses = ['not_started', 'in_progress', 'submitted', 'under_review', 'revision_requested', 'approved', 'rejected', 'completed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid task status.' });
  }

  const task = db.prepare('SELECT * FROM study_tasks WHERE id = ?').get(taskId);
  if (!task) return res.status(404).json({ error: 'Task not found.' });

  db.prepare('UPDATE study_tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, taskId);

  // Also update assignment status for the user if applicable
  db.prepare(`
    UPDATE study_task_assignments
    SET status = ?, completed_at = CASE WHEN ? = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END
    WHERE task_id = ? AND user_id = ?
  `).run(status === 'completed' ? 'completed' : 'in_progress', status, taskId, userId);

  // If status is transitioning to in_progress, notify friends!
  if (status === 'in_progress') {
    FriendService.notifyFriends(
      userId,
      'task',
      `🚀 Friend Started: "${task.title.slice(0, 35)}"`,
      `${req.user.full_name} started working on "${task.title}". Join them or cheer them on!`,
      `/tasks/${taskId}`
    );
  }

  res.json({ success: true, status });
});

// Toggle task completion (Checkbox functionality)
router.patch('/:id/toggle', authenticateToken, (req, res) => {
  const taskId = req.params.id;
  const userId = req.user.id;

  const task = db.prepare('SELECT * FROM study_tasks WHERE id = ?').get(taskId);
  if (!task) return res.status(404).json({ error: 'Task not found.' });

  const isCurrentlyCompleted = task.status === 'completed' || task.status === 'approved';
  const newStatus = isCurrentlyCompleted ? 'not_started' : 'completed';

  db.prepare('UPDATE study_tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStatus, taskId);

  db.prepare(`
    INSERT INTO study_task_assignments (task_id, user_id, status, completed_at)
    VALUES (?, ?, ?, CASE WHEN ? = 'completed' THEN CURRENT_TIMESTAMP ELSE NULL END)
    ON CONFLICT(task_id, user_id)
    DO UPDATE SET status = ?, completed_at = CASE WHEN ? = 'completed' THEN CURRENT_TIMESTAMP ELSE NULL END
  `).run(taskId, userId, newStatus, newStatus, newStatus, newStatus);

  if (newStatus === 'completed') {
    StreakService.recordActivity(userId, 'study', 'task_completed', taskId, req.user.timezone);
  }

  res.json({
    success: true,
    status: newStatus,
    is_completed: newStatus === 'completed'
  });
});

// Delete task (Creator or Group Admin only)
router.delete('/:id', authenticateToken, (req, res) => {
  const taskId = req.params.id;
  const userId = req.user.id;

  const task = db.prepare(`
    SELECT t.*, r.owner_id as room_owner_id
    FROM study_tasks t
    LEFT JOIN study_rooms r ON t.room_id = r.id
    WHERE t.id = ?
  `).get(taskId);

  if (!task) return res.status(404).json({ error: 'Task not found.' });

  const isCreator = task.creator_id === userId;
  const isRoomAdmin = task.room_owner_id === userId;

  if (!isCreator && !isRoomAdmin) {
    return res.status(403).json({ error: 'Only the task creator or group admin can delete this task.' });
  }

  // Clean up related rows
  db.prepare('DELETE FROM study_task_assignments WHERE task_id = ?').run(taskId);
  db.prepare('DELETE FROM study_challenges WHERE task_id = ?').run(taskId);
  db.prepare('DELETE FROM chat_rooms WHERE room_type = \'task_discussion\' AND reference_id = ?').run(taskId);
  db.prepare('DELETE FROM study_tasks WHERE id = ?').run(taskId);

  res.json({ success: true, message: 'Task deleted successfully.' });
});

module.exports = router;
