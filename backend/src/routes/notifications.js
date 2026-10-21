const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const NotificationService = require('../services/notification_service');

// Get notifications
router.get('/', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const limit = Number(req.query.limit) || 30;
  const notifications = NotificationService.getNotifications(userId, limit);
  res.json(notifications);
});

// Get unread count
router.get('/unread-count', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const unreadCount = NotificationService.getUnreadCount(userId);
  res.json({ unreadCount });
});

// Mark single notification read
router.put('/:id/read', authenticateToken, (req, res) => {
  NotificationService.markAsRead(req.user.id, req.params.id);
  res.json({ success: true });
});

// Mark all read
router.put('/read-all', authenticateToken, (req, res) => {
  NotificationService.markAllAsRead(req.user.id);
  res.json({ success: true });
});

// Get notification preferences
router.get('/preferences', authenticateToken, (req, res) => {
  const userId = req.user.id;
  let pref = db.prepare('SELECT * FROM notification_preferences WHERE user_id = ?').get(userId);

  if (!pref) {
    db.prepare('INSERT INTO notification_preferences (user_id) VALUES (?)').run(userId);
    pref = db.prepare('SELECT * FROM notification_preferences WHERE user_id = ?').get(userId);
  }

  res.json(pref);
});

// Update notification preferences
router.put('/preferences', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const {
    email_enabled,
    session_reminders,
    task_updates,
    review_alerts,
    chat_mentions,
    streak_alerts,
    quiet_hours_enabled,
    quiet_hours_start,
    quiet_hours_end
  } = req.body;

  db.prepare(`
    UPDATE notification_preferences
    SET email_enabled = COALESCE(?, email_enabled),
        session_reminders = COALESCE(?, session_reminders),
        task_updates = COALESCE(?, task_updates),
        review_alerts = COALESCE(?, review_alerts),
        chat_mentions = COALESCE(?, chat_mentions),
        streak_alerts = COALESCE(?, streak_alerts),
        quiet_hours_enabled = COALESCE(?, quiet_hours_enabled),
        quiet_hours_start = COALESCE(?, quiet_hours_start),
        quiet_hours_end = COALESCE(?, quiet_hours_end)
    WHERE user_id = ?
  `).run(
    email_enabled !== undefined ? (email_enabled ? 1 : 0) : null,
    session_reminders !== undefined ? (session_reminders ? 1 : 0) : null,
    task_updates !== undefined ? (task_updates ? 1 : 0) : null,
    review_alerts !== undefined ? (review_alerts ? 1 : 0) : null,
    chat_mentions !== undefined ? (chat_mentions ? 1 : 0) : null,
    streak_alerts !== undefined ? (streak_alerts ? 1 : 0) : null,
    quiet_hours_enabled !== undefined ? (quiet_hours_enabled ? 1 : 0) : null,
    quiet_hours_start || null,
    quiet_hours_end || null,
    userId
  );

  const updated = db.prepare('SELECT * FROM notification_preferences WHERE user_id = ?').get(userId);
  res.json(updated);
});

module.exports = router;
