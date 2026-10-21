const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const FriendService = require('../services/friend_service');

// Get all friends
router.get('/', authenticateToken, (req, res) => {
  const friends = FriendService.getFriends(req.user.id);
  res.json(friends);
});

// Search user by ID (or username/email) to add as friend
router.get('/search', authenticateToken, (req, res) => {
  const query = (req.query.id || req.query.query || '').trim();
  if (!query) {
    return res.status(400).json({ error: 'Please enter a user ID, username, or email to search.' });
  }

  const userId = req.user.id;
  const targetUser = db.prepare(`
    SELECT id, username, full_name, bio, avatar_url, role, timezone, created_at,
           (SELECT current_streak FROM streak_records sr WHERE sr.user_id = users.id AND sr.category = 'study') as study_streak
    FROM users 
    WHERE id = ? OR LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)
  `).get(query, query, query);

  if (!targetUser) {
    return res.status(404).json({ error: `No user found with identifier "${query}".` });
  }

  const isFriendRow = db.prepare(`
    SELECT id FROM friendships
    WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
      AND status = 'accepted'
  `).get(userId, targetUser.id, targetUser.id, userId);

  res.json({
    user: targetUser,
    is_self: targetUser.id === userId,
    is_friend: Boolean(isFriendRow)
  });
});

// Add friend
router.post('/', authenticateToken, (req, res) => {
  const { identifier } = req.body;
  if (!identifier) {
    return res.status(400).json({ error: 'Username, email, or user ID required.' });
  }

  try {
    const id = FriendService.addFriend(req.user.id, identifier);
    res.status(201).json({ success: true, message: 'Friend added successfully.', id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Remove friend
router.delete('/:friendId', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const friendId = req.params.friendId;

  db.prepare(`
    DELETE FROM friendships
    WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
  `).run(userId, friendId, friendId, userId);

  res.json({ success: true, message: 'Study buddy removed.' });
});

// Friends recent activity stream
router.get('/activity', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const friends = FriendService.getFriends(userId);
  if (friends.length === 0) return res.json([]);

  const friendIds = friends.map(f => f.id);
  const placeholders = friendIds.map(() => '?').join(',');

  const activities = db.prepare(`
    SELECT l.*, u.username, u.full_name, u.avatar_url
    FROM daily_activity_logs l
    JOIN users u ON l.user_id = u.id
    WHERE l.user_id IN (${placeholders})
    ORDER BY l.created_at DESC
    LIMIT 20
  `).all(...friendIds);

  res.json(activities);
});

module.exports = router;
