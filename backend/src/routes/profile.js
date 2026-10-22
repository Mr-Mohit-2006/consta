const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../db/database');
const { authenticateToken, optionalToken } = require('../middleware/auth');
const XPService = require('../services/xp_service');
const StreakService = require('../services/streak_service');
const userBackupService = require('../db/user_backup_service');

// Get current logged-in user profile with study buddies, streaks, and settings
router.get('/me', authenticateToken, (req, res) => {
  const userId = req.user.id;

  const user = db.prepare(`
    SELECT id, username, email, full_name, bio, avatar_url, role, timezone, created_at
    FROM users WHERE id = ?
  `).get(userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const profile = db.prepare('SELECT * FROM user_profiles WHERE user_id = ?').get(userId) || {
    is_public: 1,
    show_streak: 1,
    show_xp: 1,
    show_tasks: 1,
    show_analytics: 1,
    skills: '[]',
    subjects: '[]',
    portfolio_links: '[]'
  };

  // Friends / Buddies count
  const friendCountRow = db.prepare(`
    SELECT COUNT(*) as count FROM friendships
    WHERE (user_id = ? OR friend_id = ?) AND status = 'accepted'
  `).get(userId, userId);
  const friendCount = friendCountRow ? friendCountRow.count : 0;

  // Progression & Level
  const progression = XPService.getUserProgression(userId);

  // Streaks
  const streaks = StreakService.getUserStreaks(userId);

  // Friends list
  const friends = db.prepare(`
    SELECT u.id, u.username, u.full_name, u.avatar_url, f.created_at as friendship_date,
           (SELECT current_streak FROM streak_records sr WHERE sr.user_id = u.id AND sr.category = 'study') as study_streak
    FROM friendships f
    JOIN users u ON (CASE WHEN f.user_id = ? THEN f.friend_id ELSE f.user_id END) = u.id
    WHERE (f.user_id = ? OR f.friend_id = ?) AND f.status = 'accepted'
    ORDER BY u.full_name ASC
  `).all(userId, userId, userId);

  res.json({
    user,
    profile: {
      is_public: Boolean(profile.is_public),
      skills: JSON.parse(profile.skills || '[]'),
      subjects: JSON.parse(profile.subjects || '[]')
    },
    counts: {
      friends: friendCount,
      buddies: friendCount
    },
    progression,
    streaks,
    friends
  });
});

// Update privacy mode (Public vs Private: Friends Only)
router.put('/privacy', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { is_public } = req.body;
  const val = is_public ? 1 : 0;

  db.prepare(`
    INSERT INTO user_profiles (user_id, is_public) VALUES (?, ?)
    ON CONFLICT(user_id) DO UPDATE SET is_public = ?
  `).run(userId, val, val);

  try {
    const user = db.prepare('SELECT username, email FROM users WHERE id = ?').get(userId);
    if (user) {
      userBackupService.saveOrUpdateUser({
        username: user.username,
        email: user.email,
        profile: { is_public: val }
      });
    }
  } catch (err) {}

  res.json({ success: true, is_public: Boolean(val) });
});

// Update profile details (Name, Bio, Avatar)
router.put('/me', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { full_name, bio, avatar_url, timezone } = req.body;

  db.prepare(`
    UPDATE users 
    SET full_name = COALESCE(?, full_name),
        bio = COALESCE(?, bio),
        avatar_url = COALESCE(?, avatar_url),
        timezone = COALESCE(?, timezone),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(full_name?.trim() || null, bio !== undefined ? bio.trim() : null, avatar_url?.trim() || null, timezone || null, userId);

  const updatedUser = db.prepare('SELECT id, username, email, full_name, bio, avatar_url, role, timezone, created_at FROM users WHERE id = ?').get(userId);

  try {
    userBackupService.saveOrUpdateUser({
      username: updatedUser.username,
      email: updatedUser.email,
      full_name: updatedUser.full_name,
      bio: updatedUser.bio,
      avatar_url: updatedUser.avatar_url,
      timezone: updatedUser.timezone
    });
  } catch (err) {}

  res.json({ success: true, user: updatedUser });
});

// Reset / Change password
router.post('/reset-password', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }

  const newHash = bcrypt.hashSync(newPassword, 8);
  db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newHash, userId);

  try {
    userBackupService.updatePassword(user.email, newHash);
  } catch (err) {}

  res.json({ success: true, message: 'Password updated successfully!' });
});

// Get user profile by username with privacy check (Private mode = Only Friends Can See)
router.get('/:username', optionalToken, (req, res) => {
  const username = req.params.username;
  const viewerId = req.user ? req.user.id : null;

  const targetUser = db.prepare(`
    SELECT id, username, full_name, bio, avatar_url, role, timezone, created_at
    FROM users WHERE LOWER(username) = LOWER(?)
  `).get(username);

  if (!targetUser) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const profile = db.prepare('SELECT * FROM user_profiles WHERE user_id = ?').get(targetUser.id) || {
    is_public: 1,
    show_streak: 1,
    show_xp: 1,
    show_tasks: 1,
    show_analytics: 1
  };

  const isOwner = viewerId === targetUser.id;

  // Check if viewer is an accepted friend/buddy
  let isFriend = false;
  if (viewerId && !isOwner) {
    const friendRow = db.prepare(`
      SELECT id FROM friendships 
      WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)) 
        AND status = 'accepted'
    `).get(viewerId, targetUser.id, targetUser.id, viewerId);
    if (friendRow) isFriend = true;
  }

  // If private and not owner and not friend, block private details
  if (!profile.is_public && !isOwner && !isFriend) {
    return res.status(200).json({
      isPrivate: true,
      user: {
        id: targetUser.id,
        username: targetUser.username,
        full_name: targetUser.full_name,
        avatar_url: targetUser.avatar_url
      },
      counts: {
        friends: null,
        buddies: null
      },
      isFriend,
      is_buddy: isFriend,
      message: 'This profile is Private. Only approved friends are allowed to see full details, streaks, and progress.'
    });
  }

  // Friends / Buddies count
  const friendCountRow = db.prepare(`
    SELECT COUNT(*) as count FROM friendships
    WHERE (user_id = ? OR friend_id = ?) AND status = 'accepted'
  `).get(targetUser.id, targetUser.id);

  // Progression & Level
  const progression = XPService.getUserProgression(targetUser.id);

  // Streaks
  const streaks = StreakService.getUserStreaks(targetUser.id);

  // Achievements
  const achievements = db.prepare(`
    SELECT a.code, a.title, a.description, a.category, a.icon, a.xp_reward, ua.unlocked_at
    FROM user_achievements ua
    JOIN learning_achievements a ON ua.achievement_id = a.id
    WHERE ua.user_id = ?
    ORDER BY ua.unlocked_at DESC
  `).all(targetUser.id);

  // Showcase tasks
  const showcaseTasks = db.prepare(`
    SELECT t.id, t.title, t.subject, t.topic, t.expected_outcome,
           s.updated_at as completed_at,
           (SELECT overall_score FROM submission_reviews r WHERE r.submission_id = s.id AND r.decision = 'approved' ORDER BY r.created_at DESC LIMIT 1) as verified_score
    FROM study_submissions s
    JOIN study_tasks t ON s.task_id = t.id
    WHERE s.user_id = ? AND s.status = 'approved'
    ORDER BY s.updated_at DESC
    LIMIT 10
  `).all(targetUser.id);

  // Timeline
  const timeline = db.prepare(`
    SELECT activity_date, activity_type, COUNT(*) as count
    FROM daily_activity_logs
    WHERE user_id = ?
    GROUP BY activity_date, activity_type
    ORDER BY activity_date DESC
    LIMIT 15
  `).all(targetUser.id);

  res.json({
    isPrivate: false,
    user: targetUser,
    isOwner,
    isFriend,
    is_buddy: isFriend,
    profile: {
      is_public: Boolean(profile.is_public)
    },
    counts: {
      friends: friendCountRow ? friendCountRow.count : 0,
      buddies: friendCountRow ? friendCountRow.count : 0
    },
    progression,
    streaks,
    achievements,
    showcaseTasks,
    timeline
  });
});

module.exports = router;