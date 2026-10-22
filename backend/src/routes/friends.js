const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const FriendService = require('../services/friend_service');

// Get all approved friends
router.get('/', authenticateToken, (req, res) => {
  const friends = FriendService.getFriends(req.user.id);
  res.json(friends);
});

// Get pending friend requests (incoming & outgoing)
router.get('/requests', authenticateToken, (req, res) => {
  const requests = FriendService.getRequests(req.user.id);
  res.json(requests);
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

  // Check relationship status
  let friendStatus = 'none';
  const isAccepted = db.prepare(`
    SELECT id FROM friendships
    WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
      AND status = 'accepted'
  `).get(userId, targetUser.id, targetUser.id, userId);

  if (isAccepted) {
    friendStatus = 'accepted';
  } else {
    const sentPending = db.prepare(`
      SELECT id FROM friendships
      WHERE user_id = ? AND friend_id = ? AND status = 'pending'
    `).get(userId, targetUser.id);

    if (sentPending) {
      friendStatus = 'pending_sent';
    } else {
      const receivedPending = db.prepare(`
        SELECT id FROM friendships
        WHERE user_id = ? AND friend_id = ? AND status = 'pending'
      `).get(targetUser.id, userId);

      if (receivedPending) {
        friendStatus = 'pending_received';
      }
    }
  }

  res.json({
    user: targetUser,
    is_self: targetUser.id === userId,
    is_friend: friendStatus === 'accepted',
    friend_status: friendStatus
  });
});

// Send friend request
router.post('/', authenticateToken, (req, res) => {
  const { identifier } = req.body;
  if (!identifier) {
    return res.status(400).json({ error: 'Username, email, or user ID required.' });
  }

  try {
    const result = FriendService.addFriend(req.user.id, identifier);
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Approve friend request by request ID or requester user ID
router.post('/requests/:id/approve', authenticateToken, (req, res) => {
  try {
    const result = FriendService.approveRequest(req.user.id, req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:friendId/approve', authenticateToken, (req, res) => {
  try {
    const result = FriendService.approveRequest(req.user.id, req.params.friendId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Reject / decline friend request by request ID or requester user ID
router.post('/requests/:id/reject', authenticateToken, (req, res) => {
  try {
    const result = FriendService.rejectRequest(req.user.id, req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:friendId/reject', authenticateToken, (req, res) => {
  try {
    const result = FriendService.rejectRequest(req.user.id, req.params.friendId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Remove friend or cancel request
router.delete('/:friendId', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const friendId = req.params.friendId;

  const result = FriendService.removeFriend(userId, friendId);
  res.json(result);
});

// Friends recent activity stream (approved friends only)
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
