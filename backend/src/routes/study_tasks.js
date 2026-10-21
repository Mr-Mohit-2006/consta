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
    assigned_user_ids, // array of user IDs
    topics_checklist, // array of string topics or objects { id, topic, completed }
    duration_days // number of days for task timer
  } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Task title is required.' });
  }

  const cleanTitle = title.trim();
  const cleanInstructions = (instructions && instructions.trim()) || '';
  let cleanSubject = (subject && subject.trim()) || 'General';

  // If assigned to a room, verify user is an Admin/Moderator of that room
  if (room_id) {
    const room = db.prepare('SELECT owner_id, subject FROM study_rooms WHERE id = ?').get(room_id);
    if (!room) {
      return res.status(404).json({ error: 'Study group not found.' });
    }
    if (cleanSubject === 'General' && room.subject) {
      cleanSubject = room.subject;
    }

    const membership = db.prepare("SELECT role FROM study_room_memberships WHERE room_id = ? AND user_id = ? AND status = 'active'").get(room_id, userId);
    const isAdmin = Number(room.owner_id) === Number(userId) || (membership && (membership.role === 'owner' || membership.role === 'moderator'));
    if (!isAdmin) {
      return res.status(403).json({ error: 'Only group admins and moderators can add group tasks.' });
    }
  }

  // Calculate timer duration and due date
  const numDays = Math.max(0, parseInt(duration_days, 10) || 0);
  let calculatedDueDate = due_date || null;
  if (!calculatedDueDate && numDays > 0) {
    const d = new Date();
    d.setDate(d.getDate() + numDays);
    calculatedDueDate = d.toISOString();
  }

  // Format topics checklist
  let checklist = [];
  if (Array.isArray(topics_checklist)) {
    checklist = topics_checklist.map((item, idx) => {
      if (typeof item === 'string') {
        return { id: idx + 1, topic: item.trim(), completed: false };
      }
      return {
        id: item.id || idx + 1,
        topic: (item.topic || item.title || '').trim(),
        completed: Boolean(item.completed)
      };
    }).filter(t => t.topic.length > 0);
  }

  const validPriority = ['low', 'medium', 'high', 'urgent'].includes(priority) ? priority : 'medium';
  const validReview = ['self', 'peer', 'ai', 'mentor'].includes(review_type) ? review_type : 'peer';

  // Default rubric if none provided
  let selectedRubricId = rubric_id || null;
  if (!selectedRubricId) {
    const defaultRub = db.prepare('SELECT id FROM review_rubrics WHERE is_default = 1').get();
    if (defaultRub) selectedRubricId = defaultRub.id;
  }

  const isGroup = Boolean(is_group_task || room_id);

  const taskRes = db.prepare(`
    INSERT INTO study_tasks (
      title, instructions, subject, topic, creator_id, room_id,
      due_date, priority, expected_outcome, reference_materials,
      allowed_submission_types, review_type, rubric_id, status, is_group_task,
      topics_checklist, duration_days, timer_started_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'not_started', ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(
    cleanTitle,
    cleanInstructions,
    cleanSubject,
    topic || '',
    userId,
    room_id || null,
    calculatedDueDate,
    validPriority,
    expected_outcome || '',
    JSON.stringify(reference_materials || []),
    JSON.stringify(allowed_submission_types || ['text', 'image', 'multi_image', 'document', 'link']),
    validReview,
    selectedRubricId,
    isGroup ? 1 : 0,
    JSON.stringify(checklist),
    numDays
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
  if (!isGroup || assignees.size === 0) {
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
        `You have been assigned to task: "${cleanTitle}"`,
        `/tasks/${taskId}`
      );
    }
  }

  const task = db.prepare('SELECT * FROM study_tasks WHERE id = ?').get(taskId);
  if (task) {
    task.topics_checklist = JSON.parse(task.topics_checklist || '[]');
  }
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
    topics_checklist: JSON.parse(t.topics_checklist || '[]'),
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

  task.topics_checklist = JSON.parse(task.topics_checklist || '[]');
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
function handleToggleTask(req, res) {
  const taskId = req.params.id;
  const userId = req.user.id;

  if (!taskId || taskId === 'undefined' || taskId === 'null' || isNaN(Number(taskId))) {
    return res.status(400).json({ error: 'Valid task ID is required.' });
  }

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
}

router.patch('/:id/toggle', authenticateToken, handleToggleTask);
router.put('/:id/toggle', authenticateToken, handleToggleTask);

// Toggle individual topic inside task checklist
function handleToggleTopic(req, res) {
  const taskId = req.params.id;
  const userId = req.user.id;
  const { topicId, topicIndex } = req.body;

  if (!taskId || taskId === 'undefined' || isNaN(Number(taskId))) {
    return res.status(400).json({ error: 'Valid task ID is required.' });
  }

  const task = db.prepare('SELECT * FROM study_tasks WHERE id = ?').get(taskId);
  if (!task) return res.status(404).json({ error: 'Task not found.' });

  let checklist = [];
  try {
    checklist = JSON.parse(task.topics_checklist || '[]');
  } catch (e) {
    checklist = [];
  }

  if (checklist.length === 0) {
    return res.status(400).json({ error: 'This task has no topic checklist items.' });
  }

  let found = false;
  checklist = checklist.map((item, idx) => {
    const match = (topicId !== undefined && item.id == topicId) || (topicIndex !== undefined && idx === Number(topicIndex));
    if (match) {
      found = true;
      const nextCompleted = !item.completed;
      return {
        ...item,
        completed: nextCompleted,
        completed_at: nextCompleted ? new Date().toISOString() : null,
        completed_by: nextCompleted ? req.user.full_name : null
      };
    }
    return item;
  });

  if (!found && checklist.length > 0 && (topicIndex !== undefined || topicId !== undefined)) {
    const targetIdx = topicIndex !== undefined ? Number(topicIndex) : 0;
    if (checklist[targetIdx]) {
      checklist[targetIdx].completed = !checklist[targetIdx].completed;
      found = true;
    }
  }

  const allCompleted = checklist.length > 0 && checklist.every(item => item.completed);
  const anyCompleted = checklist.some(item => item.completed);
  let newStatus = task.status;
  if (allCompleted) {
    newStatus = 'completed';
    StreakService.recordActivity(userId, 'study', 'task_completed', taskId, req.user.timezone);
  } else if (anyCompleted && (task.status === 'not_started' || task.status === 'completed')) {
    newStatus = 'in_progress';
  }

  db.prepare(`
    UPDATE study_tasks
    SET topics_checklist = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(JSON.stringify(checklist), newStatus, taskId);

  res.json({
    success: true,
    taskId: Number(taskId),
    status: newStatus,
    is_completed: newStatus === 'completed',
    topics_checklist: checklist
  });
}

router.patch('/:id/toggle-topic', authenticateToken, handleToggleTopic);
router.post('/:id/toggle-topic', authenticateToken, handleToggleTopic);

// Delete task (Creator or Group Admin only)
router.delete('/:id', authenticateToken, (req, res) => {
  const taskId = req.params.id;
  const userId = req.user.id;

  if (!taskId || taskId === 'undefined' || taskId === 'null' || isNaN(Number(taskId))) {
    return res.status(400).json({ error: 'Valid task ID is required.' });
  }

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

  // Clean up related rows safely
  const taskChat = db.prepare("SELECT id FROM chat_rooms WHERE room_type = 'task_discussion' AND reference_id = ?").get(taskId);
  if (taskChat) {
    db.prepare('DELETE FROM chat_messages WHERE chat_room_id = ?').run(taskChat.id);
    db.prepare('DELETE FROM chat_rooms WHERE id = ?').run(taskChat.id);
  }

  db.prepare('DELETE FROM study_task_assignments WHERE task_id = ?').run(taskId);
  db.prepare('DELETE FROM study_challenges WHERE task_id = ?').run(taskId);
  db.prepare('DELETE FROM study_submissions WHERE task_id = ?').run(taskId);
  db.prepare('DELETE FROM study_tasks WHERE id = ?').run(taskId);

  res.json({ success: true, message: 'Task deleted successfully.' });
});

module.exports = router;
