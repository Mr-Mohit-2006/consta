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
      ORDER BY u.full_name ASC
    `).all(userId, userId, userId, userId, userId);
  }

  /**
   * Get pending incoming and outgoing friend requests.
   */
  static getRequests(userId) {
    const incoming = db.prepare(`
      SELECT f.id as request_id, f.created_at,
             u.id as user_id, u.username, u.full_name, u.avatar_url,
             (SELECT current_streak FROM streak_records sr WHERE sr.user_id = u.id AND sr.category = 'study') as study_streak
      FROM friendships f
      JOIN users u ON f.user_id = u.id
      WHERE f.friend_id = ? AND f.status = 'pending'
      ORDER BY f.created_at DESC
    `).all(userId);

    const outgoing = db.prepare(`
      SELECT f.id as request_id, f.created_at,
             u.id as user_id, u.username, u.full_name, u.avatar_url
      FROM friendships f
      JOIN users u ON f.friend_id = u.id
      WHERE f.user_id = ? AND f.status = 'pending'
      ORDER BY f.created_at DESC
    `).all(userId);

    return { incoming, outgoing };
  }

  /**
   * Send real-time push notification to all approved friends of a user.
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
   * Send a friend request (requires approval).
   */
  static addFriend(userId, friendIdentifier) {
    const friend = db.prepare(`
      SELECT id, username, full_name FROM users
      WHERE id = ? OR LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)
    `).get(friendIdentifier, friendIdentifier, friendIdentifier);

    if (!friend) {
      throw new Error('User not found.');
    }
    if (friend.id === userId) {
      throw new Error('Cannot add yourself as a friend.');
    }

    // Check if already accepted
    const acceptedRow = db.prepare(`
      SELECT id FROM friendships 
      WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
        AND status = 'accepted'
    `).get(userId, friend.id, friend.id, userId);

    if (acceptedRow) {
      throw new Error('You are already friends.');
    }

    // Check if user already sent a pending request
    const pendingSent = db.prepare(`
      SELECT id FROM friendships
      WHERE user_id = ? AND friend_id = ? AND status = 'pending'
    `).get(userId, friend.id);

    if (pendingSent) {
      return { status: 'pending', message: 'Friend request is already pending.' };
    }

    // Check if the target user has ALREADY sent a pending request to this user -> Auto-approve!
    const pendingReceived = db.prepare(`
      SELECT id FROM friendships
      WHERE user_id = ? AND friend_id = ? AND status = 'pending'
    `).get(friend.id, userId);

    const currentUser = db.prepare('SELECT username, full_name FROM users WHERE id = ?').get(userId);

    if (pendingReceived) {
      db.prepare("UPDATE friendships SET status = 'accepted' WHERE id = ?").run(pendingReceived.id);

      // Clean up any extra duplicates so only one friendship link exists
      db.prepare(`
        DELETE FROM friendships 
        WHERE id != ? AND ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
      `).run(pendingReceived.id, userId, friend.id, friend.id, userId);

      NotificationService.notify(
        friend.id,
        'friend_accepted',
        '🤝 Friend Request Accepted',
        `${currentUser.full_name} accepted your friend request!`,
        `/profile/${currentUser.username}`
      );

      return { status: 'accepted', message: 'Mutual friend request approved! You are now friends.' };
    }

    // Otherwise, create a pending friend request
    const res = db.prepare(`
      INSERT INTO friendships (user_id, friend_id, status)
      VALUES (?, ?, 'pending')
      ON CONFLICT(user_id, friend_id) DO UPDATE SET status = 'pending'
    `).run(userId, friend.id);

    // Send in-app notification to the recipient for approval
    NotificationService.notify(
      friend.id,
      'friend_request',
      '🤝 New Friend Request',
      `${currentUser.full_name} (@${currentUser.username}) sent you a friend request. Approve or decline to connect.`,
      '/friends'
    );

    return {
      status: 'pending',
      id: Number(res.lastInsertRowid),
      message: `Friend request sent to ${friend.full_name}. Approval required.`
    };
  }

  /**
   * Approve an incoming friend request.
   */
  static approveRequest(userId, requestIdOrSenderId) {
    let reqRow = db.prepare(`
      SELECT * FROM friendships
      WHERE id = ? AND friend_id = ? AND status = 'pending'
    `).get(requestIdOrSenderId, userId);

    if (!reqRow) {
      reqRow = db.prepare(`
        SELECT * FROM friendships
        WHERE user_id = ? AND friend_id = ? AND status = 'pending'
      `).get(requestIdOrSenderId, userId);
    }

    if (!reqRow) {
      throw new Error('Friend request not found or already processed.');
    }

    // Mark request as accepted (ensures strictly ONE friendship record between the two friends)
    db.prepare("UPDATE friendships SET status = 'accepted' WHERE id = ?").run(reqRow.id);

    // Clean up any extra duplicates so only one friendship link exists
    db.prepare(`
      DELETE FROM friendships 
      WHERE id != ? AND ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))
    `).run(reqRow.id, reqRow.user_id, reqRow.friend_id, reqRow.friend_id, reqRow.user_id);

    const currentUser = db.prepare('SELECT username, full_name FROM users WHERE id = ?').get(userId);

    // Notify the requester that their request was accepted
    NotificationService.notify(
      reqRow.user_id,
      'friend_accepted',
      '🤝 Friend Request Accepted',
      `${currentUser.full_name} (@${currentUser.username}) accepted your friend request!`,
      `/profile/${currentUser.username}`
    );

    return { success: true, message: 'Friend request approved.' };
  }

  /**
   * Reject / decline an incoming friend request.
   */
  static rejectRequest(userId, requestIdOrSenderId) {
    let reqRow = db.prepare(`
      SELECT * FROM friendships
      WHERE id = ? AND friend_id = ? AND status = 'pending'
    `).get(requestIdOrSenderId, userId);

    if (!reqRow) {
      reqRow = db.prepare(`
        SELECT * FROM friendships
        WHERE user_id = ? AND friend_id = ? AND status = 'pending'
      `).get(requestIdOrSenderId, userId);
    }

    if (reqRow) {
      db.prepare('DELETE FROM friendships WHERE id = ?').run(reqRow.id);
    }

    return { success: true, message: 'Friend request declined.' };
  }

  /**
   * Remove an accepted friend or cancel request.
   */
  static removeFriend(userId, friendId) {
    db.prepare(`
      DELETE FROM friendships
      WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
    `).run(userId, friendId, friendId, userId);

    return { success: true, message: 'Friend removed.' };
  }
}

module.exports = FriendService;
