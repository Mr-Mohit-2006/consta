const { db } = require('../db/database');
const NotificationService = require('./notification_service');

class FriendService {
  /**
   * Get all accepted friends for a user.
   */
  static getFriends(userId) {
    return db.prepare(`
      SELECT u.id, u.username, u.full_name, u.avatar_url, u.role, u.timezone,
             (SELECT current_streak FROM streak_records sr WHERE sr.user_id = u.id AND sr.category = 'study') as study_streak,
             f.created_at as friendship_date
      FROM friendships f
      JOIN users u ON (f.friend_id = u.id AND f.user_id = ?) OR (f.user_id = u.id AND f.friend_id = ?)
      WHERE (f.user_id = ? OR f.friend_id = ?)
        AND f.status = 'accepted'
        AND u.id != ?
      GROUP BY u.id
    `).all(userId, userId, userId, userId, userId);
  }

  /**
   * Send real-time push notification to all friends of a user.
   */
  static notifyFriends(userId, type, title, message, link = '') {
    const friends = this.getFriends(userId);
    const notified = [];

    for (const friend of friends) {
      // Check friend's notification preferences
      const pref = db.prepare('SELECT * FROM notification_preferences WHERE user_id = ?').get(friend.id);
      if (pref && pref.friend_activity_alerts === 0) {
        continue;
      }

      NotificationService.notify(friend.id, type, title, message, link);
      notified.push(friend.id);
    }

    return notified;
  }

  /**
   * Add / Request friendship
   */
  static addFriend(userId, friendIdentifier) {
    const friend = db.prepare('SELECT id, full_name FROM users WHERE username = ? OR email = ? OR id = ?').get(friendIdentifier, friendIdentifier, friendIdentifier);
    if (!friend) {
      throw new Error('User not found.');
    }
    if (friend.id === userId) {
      throw new Error('Cannot add yourself as a friend.');
    }

    const existing = db.prepare(`
      SELECT * FROM friendships 
      WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
    `).get(userId, friend.id, friend.id, userId);

    if (existing) {
      if (existing.status === 'accepted') {
        throw new Error('You are already friends.');
      }
      return existing;
    }

    const res = db.prepare(`
      INSERT INTO friendships (user_id, friend_id, status)
      VALUES (?, ?, 'accepted')
    `).run(userId, friend.id);

    // Mutual friendship
    db.prepare(`
      INSERT OR IGNORE INTO friendships (user_id, friend_id, status)
      VALUES (?, ?, 'accepted')
    `).run(friend.id, userId);

    const currentUser = db.prepare('SELECT full_name FROM users WHERE id = ?').get(userId);
    NotificationService.notify(
      friend.id,
      'friend',
      'New Study Buddy Connected! 🤝',
      `${currentUser.full_name} is now your study buddy. You will receive notifications when each other starts tasks or challenges!`,
      '/profile/' + currentUser.full_name
    );

    return Number(res.lastInsertRowid);
  }
}

module.exports = FriendService;
