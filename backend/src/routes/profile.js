const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { optionalToken } = require('../middleware/auth');
const XPService = require('../services/xp_service');
const StreakService = require('../services/streak_service');

// Get public profile / learning portfolio
router.get('/:username', optionalToken, (req, res) => {
  const username = req.params.username;
  const viewerId = req.user ? req.user.id : null;

  const targetUser = db.prepare(`
    SELECT id, username, full_name, bio, avatar_url, role, timezone, created_at
    FROM users WHERE username = ?
  `).get(username);

  if (!targetUser) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const profile = db.prepare('SELECT * FROM user_profiles WHERE user_id = ?').get(targetUser.id) || {
    is_public: 1,
    show_streak: 1,
    show_xp: 1,
    show_tasks: 1,
    show_analytics: 1,
    skills: '[]',
    subjects: '[]',
    portfolio_links: '[]'
  };

  const isOwner = viewerId === targetUser.id;

  // Check privacy
  if (!profile.is_public && !isOwner) {
    return res.status(403).json({ error: 'This learning portfolio is private.' });
  }

  // Progression & Level
  let progression = null;
  if (profile.show_xp || isOwner) {
    progression = XPService.getUserProgression(targetUser.id);
  }

  // Streaks
  let streaks = null;
  if (profile.show_streak || isOwner) {
    streaks = StreakService.getUserStreaks(targetUser.id);
  }

  // Unlocked public achievements
  const achievements = db.prepare(`
    SELECT a.code, a.title, a.description, a.category, a.icon, a.xp_reward, ua.unlocked_at
    FROM user_achievements ua
    JOIN learning_achievements a ON ua.achievement_id = a.id
    WHERE ua.user_id = ?
    ORDER BY ua.unlocked_at DESC
  `).all(targetUser.id);

  // Selected completed study tasks (only approved ones, protecting private drafts)
  let showcaseTasks = [];
  if (profile.show_tasks || isOwner) {
    showcaseTasks = db.prepare(`
      SELECT t.id, t.title, t.subject, t.topic, t.expected_outcome,
             s.updated_at as completed_at,
             (SELECT overall_score FROM submission_reviews r WHERE r.submission_id = s.id AND r.decision = 'approved' ORDER BY r.created_at DESC LIMIT 1) as verified_score
      FROM study_submissions s
      JOIN study_tasks t ON s.task_id = t.id
      WHERE s.user_id = ? AND s.status = 'approved'
      ORDER BY s.updated_at DESC
      LIMIT 10
    `).all(targetUser.id);
  }

  // Accepted solutions (helpful answers in doubt solving)
  const acceptedSolutions = db.prepare(`
    SELECT cm.id, cm.content, cm.created_at, cr.room_type
    FROM chat_messages cm
    JOIN chat_rooms cr ON cm.chat_room_id = cr.id
    WHERE cm.sender_id = ? AND cm.is_solution = 1
    ORDER BY cm.created_at DESC
    LIMIT 5
  `).all(targetUser.id);

  // Activity timeline (privacy safe)
  const timeline = db.prepare(`
    SELECT activity_date, activity_type, COUNT(*) as count
    FROM daily_activity_logs
    WHERE user_id = ?
    GROUP BY activity_date, activity_type
    ORDER BY activity_date DESC
    LIMIT 15
  `).all(targetUser.id);

  res.json({
    user: targetUser,
    isOwner,
    profile: {
      is_public: Boolean(profile.is_public),
      skills: JSON.parse(profile.skills || '[]'),
      subjects: JSON.parse(profile.subjects || '[]'),
      portfolio_links: JSON.parse(profile.portfolio_links || '[]')
    },
    progression,
    streaks,
    achievements,
    showcaseTasks,
    acceptedSolutions,
    timeline
  });
});

module.exports = router;
