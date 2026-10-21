const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { db } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const AnalyticsService = require('../services/analytics_service');

// Create study room
router.post('/', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { name, subject, description, objectives, room_type } = req.body;

  if (!name || !subject) {
    return res.status(400).json({ error: 'Room name and subject are required.' });
  }

  const type = ['public', 'private', 'invite_only'].includes(room_type) ? room_type : 'public';
  const joinCode = crypto.randomBytes(4).toString('hex').toUpperCase();

  const roomRes = db.prepare(`
    INSERT INTO study_rooms (name, subject, description, objectives, room_type, join_code, owner_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(name, subject, description || '', objectives || '', type, joinCode, userId);

  const roomId = Number(roomRes.lastInsertRowid);

  // Add creator as owner in memberships
  db.prepare(`
    INSERT INTO study_room_memberships (room_id, user_id, role, status)
    VALUES (?, ?, 'owner', 'active')
  `).run(roomId, userId);

  // Create chat room for room discussion
  const chatRoomRes = db.prepare(`
    INSERT INTO chat_rooms (room_type, reference_id)
    VALUES ('study_room', ?)
  `).run(roomId);

  const room = db.prepare('SELECT * FROM study_rooms WHERE id = ?').get(roomId);
  res.status(201).json({ room, chat_room_id: Number(chatRoomRes.lastInsertRowid) });
});

// List rooms (public rooms, or all rooms user can discover)
router.get('/', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { search, subject } = req.query;

  // Auto-seed a default public cohort if total study rooms is 0
  const totalRoomsCount = db.prepare('SELECT COUNT(*) as count FROM study_rooms').get()?.count || 0;
  if (totalRoomsCount === 0) {
    try {
      const roomRes = db.prepare(`
        INSERT INTO study_rooms (name, subject, description, objectives, room_type, join_code, owner_id)
        VALUES (?, ?, ?, ?, 'public', 'CS101', ?)
      `).run(
        'Computer Science & Engineering Cohort',
        'Computer Science',
        'Public collaborative study group for Computer Science, Algorithms, and System Architecture.',
        'Complete cohort topic checklist, solve doubts in Discord chat, and compete in weekly mastery sprints.',
        userId
      );

      const roomId = Number(roomRes.lastInsertRowid);

      db.prepare(`
        INSERT INTO study_room_memberships (room_id, user_id, role, status)
        VALUES (?, ?, 'owner', 'active')
      `).run(roomId, userId);

      const chatRoomRes = db.prepare(`
        INSERT INTO chat_rooms (room_type, reference_id)
        VALUES ('study_room', ?)
      `).run(roomId);
      const chatRoomId = Number(chatRoomRes.lastInsertRowid);

      db.prepare(`
        INSERT INTO chat_messages (chat_room_id, sender_id, content)
        VALUES (?, ?, ?)
      `).run(
        chatRoomId,
        userId,
        '👋 Welcome to the Computer Science & Engineering Cohort! This is our real-time Discord-style chat. Feel free to discuss tasks, ask questions, or share handwritten notes.'
      );

      db.prepare(`
        INSERT INTO study_tasks (
          creator_id, room_id, title, subject, topic, priority, review_type,
          instructions, is_group_task, duration_days, topics_checklist, status
        ) VALUES (?, ?, ?, ?, ?, 'high', 'peer', ?, 1, 3, ?, 'pending')
      `).run(
        userId,
        roomId,
        'Data Structures & Algorithms Sprint',
        'Computer Science',
        'Core Algorithms',
        'Complete the following topics checklist before the 3-day countdown timer expires. Check off each topic as you master it.',
        JSON.stringify([
          { id: 'topic_1', title: 'Arrays, Hashing & Two-Pointer Patterns', completed: false },
          { id: 'topic_2', title: 'Binary Trees, BST & Graph Traversals', completed: false },
          { id: 'topic_3', title: 'Dynamic Programming & Memoization', completed: false }
        ])
      );

      const todayStr = new Date().toISOString().split('T')[0];
      db.prepare(`
        INSERT INTO study_challenges (
          room_id, creator_id, title, description, challenge_scope,
          time_limit_minutes, min_score, target_criteria, xp_reward, status,
          duration_type, has_timer, scheduled_date, start_date, end_date
        ) VALUES (
          ?, ?, ?, ?, 'group',
          45, 4.0, 'Complete sprint task with score >= 4.0', 250, 'active',
          'weekly', 1, ?, CURRENT_TIMESTAMP, datetime(CURRENT_TIMESTAMP, '+7 days')
        )
      `).run(
        roomId,
        userId,
        'Weekly Mastery Sprint - Algorithms Challenge',
        'Compete with cohort members in this timed 45-minute sprint to solve targeted algorithms.',
        todayStr
      );
    } catch (e) {
      console.error('Error auto-seeding initial study room:', e);
    }
  }

  let query = `
    SELECT r.*, u.full_name as owner_name,
           (SELECT COUNT(*) FROM study_room_memberships m WHERE m.room_id = r.id AND m.status = 'active') as member_count,
           (SELECT role FROM study_room_memberships m WHERE m.room_id = r.id AND m.user_id = ?) as user_role,
           (SELECT status FROM study_room_memberships m WHERE m.room_id = r.id AND m.user_id = ?) as user_status
    FROM study_rooms r
    JOIN users u ON r.owner_id = u.id
    WHERE 1=1
  `;
  const params = [userId, userId];

  if (search) {
    query += ' AND (r.name LIKE ? OR r.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (subject) {
    query += ' AND r.subject = ?';
    params.push(subject);
  }

  query += ' ORDER BY r.created_at DESC';

  const rooms = db.prepare(query).all(...params);

  const challengesStmt = db.prepare(`
    SELECT c.id, c.room_id, c.title, c.description, c.duration_type, c.has_timer,
           c.time_limit_minutes, c.scheduled_date, c.start_date, c.end_date,
           c.xp_reward, c.status,
           (SELECT COUNT(*) FROM study_challenge_participants p WHERE p.challenge_id = c.id) as participant_count
    FROM study_challenges c
    WHERE c.room_id = ? AND c.status = 'active'
    ORDER BY COALESCE(c.scheduled_date, c.start_date) ASC, c.created_at DESC
  `);

  const enrichedRooms = rooms.map(r => ({
    ...r,
    challenges: challengesStmt.all(r.id)
  }));

  res.json(enrichedRooms);
});

// Get room details
router.get('/:id', authenticateToken, (req, res) => {
  const roomId = req.params.id;
  const userId = req.user.id;

  const room = db.prepare(`
    SELECT r.*, u.full_name as owner_name, u.avatar_url as owner_avatar
    FROM study_rooms r
    JOIN users u ON r.owner_id = u.id
    WHERE r.id = ?
  `).get(roomId);

  if (!room) return res.status(404).json({ error: 'Study room not found.' });

  // Check membership
  const userMembership = db.prepare(`
    SELECT * FROM study_room_memberships WHERE room_id = ? AND user_id = ?
  `).get(roomId, userId);

  const isMember = Boolean(userMembership && userMembership.status === 'active');
  const isPending = Boolean(userMembership && userMembership.status === 'pending');
  const isAdmin = Boolean(userMembership && userMembership.role === 'owner');

  // Members list (only active members)
  let members = [];
  let tasks = [];
  let challenges = [];
  let pendingRequests = [];

  if (isMember || room.room_type === 'public') {
    members = db.prepare(`
      SELECT m.id as membership_id, m.role, m.status, m.joined_at,
             u.id as user_id, u.username, u.full_name, u.avatar_url,
             (SELECT current_streak FROM streak_records sr WHERE sr.user_id = u.id AND sr.category = 'study') as study_streak
      FROM study_room_memberships m
      JOIN users u ON m.user_id = u.id
      WHERE m.room_id = ? AND m.status = 'active'
      ORDER BY CASE m.role WHEN 'owner' THEN 1 WHEN 'moderator' THEN 2 ELSE 3 END, m.joined_at ASC
    `).all(roomId);

    tasks = db.prepare(`
      SELECT t.*, u.full_name as creator_name,
             (SELECT COUNT(*) FROM study_task_assignments a WHERE a.task_id = t.id) as assigned_count,
             (SELECT COUNT(*) FROM study_submissions s WHERE s.task_id = t.id AND s.status = 'approved') as approved_count
      FROM study_tasks t
      JOIN users u ON t.creator_id = u.id
      WHERE t.room_id = ?
      ORDER BY t.created_at DESC
    `).all(roomId).map(t => ({
      ...t,
      topics_checklist: JSON.parse(t.topics_checklist || '[]')
    }));

    challenges = db.prepare(`
      SELECT c.*, u.full_name as creator_name,
             (SELECT COUNT(*) FROM study_challenge_participants p WHERE p.challenge_id = c.id) as participant_count,
             (SELECT status FROM study_challenge_participants p WHERE p.challenge_id = c.id AND p.user_id = ?) as my_status,
             (SELECT is_completed FROM study_challenge_participants p WHERE p.challenge_id = c.id AND p.user_id = ?) as my_completed
      FROM study_challenges c
      LEFT JOIN users u ON c.creator_id = u.id
      WHERE c.room_id = ?
      ORDER BY COALESCE(c.scheduled_date, c.start_date) ASC, c.created_at DESC
    `).all(userId, userId, roomId);
  }

  // If Admin, query pending join requests
  if (isAdmin) {
    pendingRequests = db.prepare(`
      SELECT m.id as membership_id, m.joined_at,
             u.id as user_id, u.username, u.full_name, u.avatar_url,
             (SELECT current_streak FROM streak_records sr WHERE sr.user_id = u.id AND sr.category = 'study') as study_streak
      FROM study_room_memberships m
      JOIN users u ON m.user_id = u.id
      WHERE m.room_id = ? AND m.status = 'pending'
      ORDER BY m.joined_at ASC
    `).all(roomId);
  }

  // Chat room id
  let chatRoom = db.prepare("SELECT id FROM chat_rooms WHERE room_type = 'study_room' AND reference_id = ?").get(roomId);
  if (!chatRoom && (isMember || room.room_type === 'public')) {
    const crRes = db.prepare("INSERT INTO chat_rooms (room_type, reference_id) VALUES ('study_room', ?)").run(roomId);
    chatRoom = { id: Number(crRes.lastInsertRowid) };
  }

  res.json({
    room,
    userRole: userMembership ? userMembership.role : null,
    userStatus: userMembership ? userMembership.status : null,
    isMember,
    isPending,
    pendingRequests,
    chatRoomId: chatRoom ? chatRoom.id : null,
    members,
    challenges,
    tasks
  });
});

// Join room (Public: joins immediately; Private: submits join request for Admin approval)
router.post('/:id/join', authenticateToken, (req, res) => {
  const roomId = req.params.id;
  const userId = req.user.id;
  const NotificationService = require('../services/notification_service');

  const room = db.prepare('SELECT * FROM study_rooms WHERE id = ?').get(roomId);
  if (!room) return res.status(404).json({ error: 'Study group not found.' });

  const existingMembership = db.prepare('SELECT * FROM study_room_memberships WHERE room_id = ? AND user_id = ?').get(roomId, userId);

  if (existingMembership && existingMembership.status === 'active') {
    return res.json({ success: true, status: 'active', message: 'You are already an active member of this group.' });
  }

  if (room.room_type === 'private') {
    // Private group: requires Admin approval
    db.prepare(`
      INSERT INTO study_room_memberships (room_id, user_id, role, status)
      VALUES (?, ?, 'member', 'pending')
      ON CONFLICT(room_id, user_id)
      DO UPDATE SET status = 'pending'
    `).run(roomId, userId);

    // Notify Group Admin
    try {
      NotificationService.notify(
        room.owner_id,
        'group_request',
        '⏳ New Group Join Request',
        `${req.user.full_name} has requested to join your private group "${room.name}". Approval required.`,
        `/group`
      );
    } catch (e) {
      // ignore
    }

    return res.json({
      success: true,
      pendingApproval: true,
      status: 'pending',
      message: 'Join request submitted! Waiting for Group Admin approval.'
    });
  }

  // Public group: join immediately
  db.prepare(`
    INSERT INTO study_room_memberships (room_id, user_id, role, status)
    VALUES (?, ?, 'member', 'active')
    ON CONFLICT(room_id, user_id)
    DO UPDATE SET status = 'active'
  `).run(roomId, userId);

  res.json({ success: true, status: 'active', message: 'Successfully joined study group.' });
});

// Approve pending join request (Admin only)
router.post('/:id/requests/:targetUserId/approve', authenticateToken, (req, res) => {
  const { id: roomId, targetUserId } = req.params;
  const userId = req.user.id;
  const NotificationService = require('../services/notification_service');

  const room = db.prepare('SELECT owner_id, name FROM study_rooms WHERE id = ?').get(roomId);
  if (!room) return res.status(404).json({ error: 'Study group not found.' });

  if (room.owner_id !== userId) {
    return res.status(403).json({ error: 'Only the Group Admin can approve join requests.' });
  }

  const updateRes = db.prepare(`
    UPDATE study_room_memberships
    SET status = 'active', joined_at = CURRENT_TIMESTAMP
    WHERE room_id = ? AND user_id = ? AND status = 'pending'
  `).run(roomId, targetUserId);

  if (updateRes.changes === 0) {
    return res.status(404).json({ error: 'No pending join request found for this user.' });
  }

  // Notify the approved user
  try {
    NotificationService.notify(
      Number(targetUserId),
      'group_approved',
      '🎉 Join Request Approved!',
      `The Group Admin approved your request to join "${room.name}". You are now an active member!`,
      `/group`
    );
  } catch (e) {
    // ignore
  }

  res.json({ success: true, message: 'User approved and added to group.' });
});

// Reject / Decline pending join request (Admin only)
router.post('/:id/requests/:targetUserId/reject', authenticateToken, (req, res) => {
  const { id: roomId, targetUserId } = req.params;
  const userId = req.user.id;

  const room = db.prepare('SELECT owner_id FROM study_rooms WHERE id = ?').get(roomId);
  if (!room) return res.status(404).json({ error: 'Study group not found.' });

  if (room.owner_id !== userId) {
    return res.status(403).json({ error: 'Only the Group Admin can decline join requests.' });
  }

  db.prepare("DELETE FROM study_room_memberships WHERE room_id = ? AND user_id = ? AND status = 'pending'").run(roomId, targetUserId);
  res.json({ success: true, message: 'Join request declined.' });
});

// Cancel own pending join request
router.post('/:id/cancel-request', authenticateToken, (req, res) => {
  const roomId = req.params.id;
  const userId = req.user.id;

  db.prepare("DELETE FROM study_room_memberships WHERE room_id = ? AND user_id = ? AND status = 'pending'").run(roomId, userId);
  res.json({ success: true, message: 'Join request cancelled.' });
});

// Leave room
router.post('/:id/leave', authenticateToken, (req, res) => {
  const roomId = req.params.id;
  const userId = req.user.id;

  const room = db.prepare('SELECT owner_id FROM study_rooms WHERE id = ?').get(roomId);
  if (!room) return res.status(404).json({ error: 'Study room not found.' });
  if (room.owner_id === userId) {
    return res.status(400).json({ error: 'Group admin cannot leave their own group.' });
  }

  db.prepare('DELETE FROM study_room_memberships WHERE room_id = ? AND user_id = ?').run(roomId, userId);
  res.json({ success: true, message: 'Successfully left study group.' });
});

// Add / Invite member to room (owner/moderator only)
router.post('/:id/members', authenticateToken, (req, res) => {
  const roomId = req.params.id;
  const userId = req.user.id;
  const { identifier, role } = req.body; // username or email

  if (!identifier) {
    return res.status(400).json({ error: 'Username or email is required to add a member.' });
  }

  const room = db.prepare('SELECT * FROM study_rooms WHERE id = ?').get(roomId);
  if (!room) return res.status(404).json({ error: 'Study room not found.' });

  const myMembership = db.prepare('SELECT role FROM study_room_memberships WHERE room_id = ? AND user_id = ?').get(roomId, userId);
  if (!myMembership || (myMembership.role !== 'owner' && myMembership.role !== 'moderator')) {
    return res.status(403).json({ error: 'Only group admin or moderators can add members.' });
  }

  const cleanId = identifier.trim().toLowerCase();
  const targetUser = db.prepare('SELECT id, username, full_name FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?').get(cleanId, cleanId);

  if (!targetUser) {
    return res.status(404).json({ error: 'No user found with that username or email.' });
  }

  const targetRole = role === 'moderator' ? 'moderator' : 'member';

  db.prepare(`
    INSERT INTO study_room_memberships (room_id, user_id, role, status)
    VALUES (?, ?, ?, 'active')
    ON CONFLICT(room_id, user_id)
    DO UPDATE SET status = 'active', role = ?
  `).run(roomId, targetUser.id, targetRole, targetRole);

  // Send in-app notification to the invited user
  try {
    const NotificationService = require('../services/notification_service');
    NotificationService.createNotification(
      targetUser.id,
      'group_invite',
      `Added to Study Group: ${room.name}`,
      `You were added to "${room.name}" as a ${targetRole}.`,
      `/group`
    );
  } catch (e) {
    // Ignore notification error
  }

  res.status(201).json({
    success: true,
    message: `${targetUser.full_name} (@${targetUser.username}) added to group.`,
    user: targetUser
  });
});

// Remove / Kick member from room (owner/moderator only)
router.delete('/:id/members/:memberId', authenticateToken, (req, res) => {
  const { id: roomId, memberId } = req.params;
  const userId = req.user.id;

  const room = db.prepare('SELECT owner_id FROM study_rooms WHERE id = ?').get(roomId);
  if (!room) return res.status(404).json({ error: 'Study room not found.' });

  const myMembership = db.prepare('SELECT role FROM study_room_memberships WHERE room_id = ? AND user_id = ?').get(roomId, userId);
  if (!myMembership || (myMembership.role !== 'owner' && myMembership.role !== 'moderator')) {
    return res.status(403).json({ error: 'Only group admin or moderators can remove members.' });
  }

  if (Number(memberId) === room.owner_id) {
    return res.status(400).json({ error: 'Cannot remove the group admin/creator.' });
  }

  db.prepare('DELETE FROM study_room_memberships WHERE room_id = ? AND user_id = ?').run(roomId, memberId);
  res.json({ success: true, message: 'Member removed from study room.' });
});

// Change member role (owner/moderator only)
router.put('/:id/members/:memberId/role', authenticateToken, (req, res) => {
  const { id: roomId, memberId } = req.params;
  const userId = req.user.id;
  const { role } = req.body;

  const myMembership = db.prepare('SELECT role FROM study_room_memberships WHERE room_id = ? AND user_id = ?').get(roomId, userId);
  if (!myMembership || (myMembership.role !== 'owner' && myMembership.role !== 'moderator')) {
    return res.status(403).json({ error: 'Only owners or moderators can change member roles.' });
  }

  if (!['moderator', 'member'].includes(role)) {
    return res.status(400).json({ error: 'Valid roles: moderator, member.' });
  }

  db.prepare(`
    UPDATE study_room_memberships
    SET role = ?
    WHERE room_id = ? AND user_id = ?
  `).run(role, roomId, memberId);

  res.json({ success: true, role });
});

// Group analytics
router.get('/:id/analytics', authenticateToken, (req, res) => {
  try {
    const analytics = AnalyticsService.getGroupAnalytics(req.params.id, req.user.id);
    res.json(analytics);
  } catch (err) {
    res.status(403).json({ error: err.message });
  }
});

// Delete group (Group Admin only)
router.delete('/:id', authenticateToken, (req, res) => {
  const roomId = req.params.id;
  const userId = req.user.id;

  if (!roomId || roomId === 'undefined' || roomId === 'null' || isNaN(Number(roomId))) {
    return res.status(400).json({ error: 'Valid group ID is required.' });
  }

  const room = db.prepare('SELECT owner_id, name FROM study_rooms WHERE id = ?').get(roomId);
  if (!room) return res.status(404).json({ error: 'Study group not found.' });

  if (room.owner_id !== userId) {
    return res.status(403).json({ error: 'Only the Group Admin can delete this study group.' });
  }

  // Clean up tasks and their chat rooms
  const tasks = db.prepare('SELECT id FROM study_tasks WHERE room_id = ?').all(roomId);
  for (const t of tasks) {
    const taskChat = db.prepare("SELECT id FROM chat_rooms WHERE room_type = 'task_discussion' AND reference_id = ?").get(t.id);
    if (taskChat) {
      db.prepare('DELETE FROM chat_messages WHERE chat_room_id = ?').run(taskChat.id);
      db.prepare('DELETE FROM chat_rooms WHERE id = ?').run(taskChat.id);
    }
    db.prepare('DELETE FROM study_task_assignments WHERE task_id = ?').run(t.id);
    db.prepare('DELETE FROM study_challenges WHERE task_id = ?').run(t.id);
    db.prepare('DELETE FROM study_submissions WHERE task_id = ?').run(t.id);
  }

  // Clean up study room chat
  const roomChat = db.prepare("SELECT id FROM chat_rooms WHERE room_type = 'study_room' AND reference_id = ?").get(roomId);
  if (roomChat) {
    db.prepare('DELETE FROM chat_messages WHERE chat_room_id = ?').run(roomChat.id);
    db.prepare('DELETE FROM chat_rooms WHERE id = ?').run(roomChat.id);
  }

  // Clean up related rows
  db.prepare('DELETE FROM study_room_memberships WHERE room_id = ?').run(roomId);
  db.prepare('DELETE FROM study_tasks WHERE room_id = ?').run(roomId);
  db.prepare('DELETE FROM study_challenges WHERE room_id = ?').run(roomId);
  db.prepare('DELETE FROM study_rooms WHERE id = ?').run(roomId);

  res.json({ success: true, message: `Group "${room.name}" deleted successfully.` });
});

module.exports = router;
