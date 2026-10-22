const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { db } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const XPService = require('../services/xp_service');
const NotificationService = require('../services/notification_service');
const { broadcastToChatRoom } = require('../websocket/chat_server');

const uploadDir = path.join(__dirname, '../../uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, 'chat-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname))
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Helper: Check chat room access
function checkChatRoomAccess(chatRoomId, userId) {
  const room = db.prepare('SELECT * FROM chat_rooms WHERE id = ?').get(chatRoomId);
  if (!room) return null;

  if (room.room_type === 'study_room') {
    const studyRoom = db.prepare('SELECT * FROM study_rooms WHERE id = ?').get(room.reference_id);
    if (!studyRoom) return null;

    const isOwner = Number(studyRoom.owner_id) === Number(userId);
    const membership = db.prepare("SELECT * FROM study_room_memberships WHERE room_id = ? AND user_id = ? AND status = 'active'").get(studyRoom.id, userId);
    return (membership || isOwner) ? room : null;
  } else if (room.room_type === 'task_discussion') {
    const task = db.prepare('SELECT * FROM study_tasks WHERE id = ?').get(room.reference_id);
    if (!task) return null;
    if (task.creator_id === userId) return room;

    const assignment = db.prepare('SELECT * FROM study_task_assignments WHERE task_id = ? AND user_id = ?').get(task.id, userId);
    if (assignment) return room;

    if (task.room_id) {
      const roomMem = db.prepare("SELECT * FROM study_room_memberships WHERE room_id = ? AND user_id = ? AND status = 'active'").get(task.room_id, userId);
      if (roomMem) return room;
    }
    return null;
  }

  return room;
}

// Get messages for a chat room
router.get(['/room/:chatRoomId/messages', '/:chatRoomId/messages'], authenticateToken, (req, res) => {
  const chatRoomId = req.params.chatRoomId;
  const userId = req.user.id;
  const { search, limit = 50, before_id } = req.query;

  const room = checkChatRoomAccess(chatRoomId, userId);
  if (!room) {
    return res.status(403).json({ error: 'Access denied or chat room does not exist.' });
  }

  let query = `
    SELECT m.*, u.username, u.full_name, u.avatar_url, u.role as user_role,
           (SELECT COUNT(*) FROM chat_messages r WHERE r.parent_id = m.id) as reply_count
    FROM chat_messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.chat_room_id = ?
  `;
  const params = [chatRoomId];

  if (before_id) {
    query += ' AND m.id < ?';
    params.push(before_id);
  }

  if (search) {
    query += ' AND m.content LIKE ?';
    params.push(`%${search}%`);
  }

  query += ' ORDER BY m.created_at ASC LIMIT ?';
  params.push(Number(limit));

  const messages = db.prepare(query).all(...params);

  // Attachments
  const messagesWithAttachments = messages.map(m => {
    const attachments = db.prepare('SELECT * FROM message_attachments WHERE message_id = ?').all(m.id);
    return {
      ...m,
      mentions: JSON.parse(m.mentions || '[]'),
      attachments
    };
  });

  res.json(messagesWithAttachments);
});

// Post message to chat room
router.post(['/room/:chatRoomId/messages', '/:chatRoomId/messages'], authenticateToken, upload.array('attachments', 4), (req, res) => {
  const chatRoomId = req.params.chatRoomId;
  const userId = req.user.id;
  const { content, parent_id, mentions } = req.body;
  const files = req.files || [];

  if ((!content || !content.trim()) && files.length === 0) {
    return res.status(400).json({ error: 'Message content or attachment is required.' });
  }

  const room = checkChatRoomAccess(chatRoomId, userId);
  if (!room) {
    return res.status(403).json({ error: 'Access denied or chat room does not exist.' });
  }

  // Parse mentions (e.g. ['alex_learner', 'dr_stone'])
  let parsedMentions = [];
  try {
    parsedMentions = typeof mentions === 'string' ? JSON.parse(mentions) : (mentions || []);
  } catch {
    parsedMentions = [];
  }

  // Sanitize content
  const sanitizedContent = content ? content.trim() : '';

  const msgRes = db.prepare(`
    INSERT INTO chat_messages (chat_room_id, sender_id, parent_id, content, mentions)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    chatRoomId,
    userId,
    parent_id || null,
    sanitizedContent,
    JSON.stringify(parsedMentions)
  );

  const messageId = Number(msgRes.lastInsertRowid);

  // Attachments
  const insertAttachment = db.prepare(`
    INSERT INTO message_attachments (message_id, file_path, original_name, mime_type, file_size)
    VALUES (?, ?, ?, ?, ?)
  `);

  const savedAttachments = [];
  for (const f of files) {
    const relPath = '/uploads/' + f.filename;
    const attRes = insertAttachment.run(messageId, relPath, f.originalname, f.mimetype, f.size);
    savedAttachments.push({
      id: Number(attRes.lastInsertRowid),
      message_id: messageId,
      file_path: relPath,
      original_name: f.originalname,
      mime_type: f.mimetype,
      file_size: f.size
    });
  }

  // Mentions notifications
  for (const username of parsedMentions) {
    const mentionedUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (mentionedUser && mentionedUser.id !== userId) {
      NotificationService.notify(
        mentionedUser.id,
        'chat',
        'You were mentioned in a discussion',
        `${req.user.full_name}: "${sanitizedContent.slice(0, 80)}"`,
        `/chat/${chatRoomId}`
      );
    }
  }

  const savedMessage = db.prepare(`
    SELECT m.*, u.username, u.full_name, u.avatar_url, u.role as user_role
    FROM chat_messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.id = ?
  `).get(messageId);

  savedMessage.mentions = parsedMentions;
  savedMessage.attachments = savedAttachments;

  // Real-time broadcast to all connected WebSocket clients in this chat room
  try {
    broadcastToChatRoom(chatRoomId, {
      type: 'NEW_CHAT_MESSAGE',
      chatRoomId: Number(chatRoomId),
      message: savedMessage
    });
  } catch (e) {
    // ignore
  }

  res.status(201).json(savedMessage);
});

// Mark message as accepted solution (doubt resolution)
router.post('/messages/:messageId/solution', authenticateToken, (req, res) => {
  const messageId = req.params.messageId;
  const userId = req.user.id;

  const msg = db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(messageId);
  if (!msg) return res.status(404).json({ error: 'Message not found.' });

  const room = db.prepare('SELECT * FROM chat_rooms WHERE id = ?').get(msg.chat_room_id);
  if (!room) return res.status(404).json({ error: 'Room not found.' });

  // Toggle or mark solution
  const newSolutionState = msg.is_solution ? 0 : 1;
  db.prepare('UPDATE chat_messages SET is_solution = ? WHERE id = ?').run(newSolutionState, messageId);

  // If marked as solution and not the author itself, award XP!
  if (newSolutionState === 1 && msg.sender_id !== userId) {
    XPService.awardXP(
      msg.sender_id,
      15,
      'Your answer was marked as the accepted solution to a study doubt! 💡',
      'doubt_resolved',
      'chat_message',
      messageId
    );

    NotificationService.notify(
      msg.sender_id,
      'chat',
      'Answer Accepted as Solution! 💡',
      `${req.user.full_name} accepted your answer as the solution.`,
      `/chat/${msg.chat_room_id}`
    );
  }

  try {
    broadcastToChatRoom(msg.chat_room_id, {
      type: 'SOLUTION_TOGGLED',
      chatRoomId: Number(msg.chat_room_id),
      messageId: Number(messageId),
      is_solution: newSolutionState
    });
  } catch (e) {}

  res.json({ success: true, is_solution: newSolutionState });
});

// Upvote / Mark message as helpful
router.post('/messages/:messageId/helpful', authenticateToken, (req, res) => {
  const messageId = req.params.messageId;
  const msg = db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(messageId);
  if (!msg) return res.status(404).json({ error: 'Message not found.' });

  db.prepare('UPDATE chat_messages SET is_helpful_count = is_helpful_count + 1 WHERE id = ?').run(messageId);
  res.json({ success: true, is_helpful_count: msg.is_helpful_count + 1 });
});

// Pin / Unpin message (moderator / owner)
router.post('/messages/:messageId/pin', authenticateToken, (req, res) => {
  const messageId = req.params.messageId;
  const msg = db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(messageId);
  if (!msg) return res.status(404).json({ error: 'Message not found.' });

  const newPin = msg.is_pinned ? 0 : 1;
  db.prepare('UPDATE chat_messages SET is_pinned = ? WHERE id = ?').run(newPin, messageId);
  res.json({ success: true, is_pinned: newPin });
});

// Report message for moderation
router.post('/messages/:messageId/report', authenticateToken, (req, res) => {
  const messageId = req.params.messageId;
  const userId = req.user.id;
  const { reason } = req.body;

  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'Report reason is required.' });
  }

  db.prepare(`
    INSERT INTO reported_messages (message_id, reporter_id, reason)
    VALUES (?, ?, ?)
  `).run(messageId, userId, reason.trim());

  res.json({ success: true, message: 'Message has been submitted to moderators for review.' });
});

module.exports = router;
