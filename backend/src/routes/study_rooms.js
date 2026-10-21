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

// List rooms (public rooms or rooms user is a member of)
router.get('/', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { search, subject } = req.query;

  let query = `
    SELECT r.*, u.full_name as owner_name,
           (SELECT COUNT(*) FROM study_room_memberships m WHERE m.room_id = r.id AND m.status = 'active') as member_count,
           (SELECT role FROM study_room_memberships m WHERE m.room_id = r.id AND m.user_id = ?) as user_role
    FROM study_rooms r
    JOIN users u ON r.owner_id = u.id
    WHERE (r.room_type = 'public' OR r.id IN (
      SELECT room_id FROM study_room_memberships WHERE user_id = ? AND status = 'active'
    ))
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
  res.json(rooms);
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

  if (room.room_type !== 'public' && (!userMembership || userMembership.status !== 'active')) {
    return res.status(403).json({ error: 'This is a private study room. You must join or be invited.' });
  }

  // Members list
  const members = db.prepare(`
    SELECT m.id as membership_id, m.role, m.status, m.joined_at,
           u.id as user_id, u.username, u.full_name, u.avatar_url,
           (SELECT current_streak FROM streak_records sr WHERE sr.user_id = u.id AND sr.category = 'study') as study_streak
    FROM study_room_memberships m
    JOIN users u ON m.user_id = u.id
    WHERE m.room_id = ? AND m.status = 'active'
    ORDER BY CASE m.role WHEN 'owner' THEN 1 WHEN 'moderator' THEN 2 ELSE 3 END, m.joined_at ASC
  `).all(roomId);

  // Chat room id
  let chatRoom = db.prepare("SELECT id FROM chat_rooms WHERE room_type = 'study_room' AND reference_id = ?").get(roomId);
  if (!chatRoom) {
    const crRes = db.prepare("INSERT INTO chat_rooms (room_type, reference_id) VALUES ('study_room', ?)").run(roomId);
    chatRoom = { id: Number(crRes.lastInsertRowid) };
  }

  // Active challenges
  const challenges = db.prepare('SELECT * FROM study_challenges WHERE room_id = ? ORDER BY created_at DESC').all(roomId);

  // Shared tasks
  const tasks = db.prepare(`
    SELECT t.*, u.full_name as creator_name,
           (SELECT COUNT(*) FROM study_task_assignments a WHERE a.task_id = t.id) as assigned_count,
           (SELECT COUNT(*) FROM study_submissions s WHERE s.task_id = t.id AND s.status = 'approved') as approved_count
    FROM study_tasks t
    JOIN users u ON t.creator_id = u.id
    WHERE t.room_id = ?
    ORDER BY t.created_at DESC
  `).all(roomId);

  res.json({
    room,
    userRole: userMembership ? userMembership.role : null,
    isMember: Boolean(userMembership && userMembership.status === 'active'),
    chatRoomId: chatRoom.id,
    members,
    challenges,
    tasks
  });
});

// Join room
router.post('/:id/join', authenticateToken, (req, res) => {
  const roomId = req.params.id;
  const userId = req.user.id;
  const { join_code } = req.body;

  const room = db.prepare('SELECT * FROM study_rooms WHERE id = ?').get(roomId);
  if (!room) return res.status(404).json({ error: 'Study room not found.' });

  if (room.room_type === 'private' || room.room_type === 'invite_only') {
    if (!join_code || join_code.trim().toUpperCase() !== room.join_code) {
      return res.status(403).json({ error: 'Invalid join code for this private study room.' });
    }
  }

  // Insert or activate membership
  db.prepare(`
    INSERT INTO study_room_memberships (room_id, user_id, role, status)
    VALUES (?, ?, 'member', 'active')
    ON CONFLICT(room_id, user_id)
    DO UPDATE SET status = 'active'
  `).run(roomId, userId);

  res.json({ success: true, message: 'Successfully joined study room.' });
});

// Leave room
router.post('/:id/leave', authenticateToken, (req, res) => {
  const roomId = req.params.id;
  const userId = req.user.id;

  const room = db.prepare('SELECT owner_id FROM study_rooms WHERE id = ?').get(roomId);
  if (room && room.owner_id === userId) {
    return res.status(400).json({ error: 'Room owners cannot leave without transferring ownership.' });
  }

  db.prepare('DELETE FROM study_room_memberships WHERE room_id = ? AND user_id = ?').run(roomId, userId);
  res.json({ success: true, message: 'Successfully left study room.' });
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

module.exports = router;
