const { db } = require('../db/database');

class NotificationService {
  static clients = new Map(); // userId -> Set of WebSocket clients

  static registerClient(userId, ws) {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId).add(ws);
  }

  static unregisterClient(userId, ws) {
    if (this.clients.has(userId)) {
      this.clients.get(userId).delete(ws);
      if (this.clients.get(userId).size === 0) {
        this.clients.delete(userId);
      }
    }
  }

  /**
   * Directly push any real-time event to an authenticated user's active WebSocket connection(s).
   */
  static sendToUser(userId, data) {
    if (!userId) return;
    const targetId = Number(userId);
    const userSockets = this.clients.get(targetId);
    if (userSockets && userSockets.size > 0) {
      const msgStr = typeof data === 'string' ? data : JSON.stringify(data);
      for (const ws of userSockets) {
        if (ws.readyState === 1) { // WebSocket.OPEN
          try {
            ws.send(msgStr);
          } catch {
            // ignore send error on abruptly closed socket
          }
        }
      }
    }
  }

  /**
   * Check if current time falls within user quiet hours.
   */
  static isQuietHours(pref) {
    if (!pref || !pref.quiet_hours_enabled) return false;
    try {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const [startH, startM] = (pref.quiet_hours_start || '22:00').split(':').map(Number);
      const [endH, endM] = (pref.quiet_hours_end || '07:00').split(':').map(Number);

      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      if (startMinutes < endMinutes) {
        return currentMinutes >= startMinutes && currentMinutes < endMinutes;
      } else {
        // Crosses midnight, e.g. 22:00 to 07:00
        return currentMinutes >= startMinutes || currentMinutes < endMinutes;
      }
    } catch {
      return false;
    }
  }

  /**
   * Create an in-app notification with preference check and duplicate prevention.
   */
  static notify(userId, type, title, message, link = '') {
    // 1. Fetch user notification preferences
    const pref = db.prepare('SELECT * FROM notification_preferences WHERE user_id = ?').get(userId);

    if (pref) {
      if (type === 'session' && !pref.session_reminders) return null;
      if (type === 'task' && !pref.task_updates) return null;
      if (type === 'review' && !pref.review_alerts) return null;
      if (type === 'chat' && !pref.chat_mentions) return null;
      if (type === 'streak' && !pref.streak_alerts) return null;
    }

    // 2. Duplicate prevention (prevent identical unread notifications within 10 minutes)
    const existing = db.prepare(`
      SELECT id FROM notifications
      WHERE user_id = ? AND type = ? AND title = ? AND is_read = 0
        AND created_at >= datetime('now', '-10 minutes')
    `).get(userId, type, title);

    if (existing) {
      return null;
    }

    // 3. Insert notification
    const res = db.prepare(`
      INSERT INTO notifications (user_id, type, title, message, link)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, type, title, message, link);

    const notificationId = Number(res.lastInsertRowid);
    const notificationPayload = {
      id: notificationId,
      user_id: userId,
      type,
      title,
      message,
      link,
      is_read: 0,
      created_at: new Date().toISOString()
    };

    // 4. Real-time push via WebSockets if user is connected
    const userSockets = this.clients.get(userId);
    if (userSockets && userSockets.size > 0) {
      const msgStr = JSON.stringify({
        type: 'NOTIFICATION',
        payload: notificationPayload
      });
      for (const ws of userSockets) {
        if (ws.readyState === 1) { // OPEN
          ws.send(msgStr);
        }
      }
    }

    return notificationPayload;
  }

  static getNotifications(userId, limit = 30) {
    return db.prepare(`
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(userId, limit);
  }

  static getUnreadCount(userId) {
    const row = db.prepare(`
      SELECT COUNT(*) as unread_count
      FROM notifications
      WHERE user_id = ? AND is_read = 0
    `).get(userId);
    return row ? row.unread_count : 0;
  }

  static markAsRead(userId, notificationId) {
    db.prepare(`
      UPDATE notifications
      SET is_read = 1, read_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(notificationId, userId);
  }

  static markAllAsRead(userId) {
    db.prepare(`
      UPDATE notifications
      SET is_read = 1, read_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND is_read = 0
    `).run(userId);
  }
}

module.exports = NotificationService;
