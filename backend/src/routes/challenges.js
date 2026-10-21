const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const FriendService = require('../services/friend_service');
const NotificationService = require('../services/notification_service');
const XPService = require('../services/xp_service');
const StreakService = require('../services/streak_service');

// Create challenge for any task (self, group, or friends)
router.post('/', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const {
    task_id,
    room_id,
    title,
    description,
    challenge_scope, // 'self' | 'group' | 'friends'
    time_limit_minutes,
    min_score,
    target_criteria,
    xp_reward,
    duration_type // 'daily' | 'weekly' | 'monthly'
  } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Challenge title is required.' });
  }

  const validDuration = ['daily', 'weekly', 'monthly'].includes(duration_type) ? duration_type : 'daily';
  const scope = ['self', 'group', 'friends'].includes(challenge_scope) ? challenge_scope : 'group';

  let timeLimit = Number(time_limit_minutes);
  let xpBonus = Number(xp_reward);
  let daysModifier = '+1 day';

  if (validDuration === 'weekly') {
    if (!timeLimit) timeLimit = 7 * 24 * 60; // 7 days in minutes
    if (!xpBonus) xpBonus = 250;
    daysModifier = '+7 days';
  } else if (validDuration === 'monthly') {
    if (!timeLimit) timeLimit = 30 * 24 * 60; // 30 days in minutes
    if (!xpBonus) xpBonus = 600;
    daysModifier = '+30 days';
  } else {
    if (!timeLimit) timeLimit = 60;
    if (!xpBonus) xpBonus = 100;
    daysModifier = '+1 day';
  }

  const scoreReq = Number(min_score) || 4.0;

  let task = null;
  if (task_id) {
    task = db.prepare('SELECT * FROM study_tasks WHERE id = ?').get(task_id);
    if (!task) return res.status(404).json({ error: 'Referenced task not found.' });
  }

  const chalRes = db.prepare(`
    INSERT INTO study_challenges (
      room_id, task_id, creator_id, title, description, challenge_scope,
      time_limit_minutes, min_score, target_criteria, xp_reward, status,
      duration_type, start_date, end_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, CURRENT_TIMESTAMP, datetime('now', '${daysModifier}'))
  `).run(
    room_id || null,
    task_id || null,
    userId,
    title.trim(),
    description || `${validDuration.toUpperCase()} Challenge: Complete target task before deadline with score >= ${scoreReq}`,
    scope,
    timeLimit,
    scoreReq,
    target_criteria || `${validDuration} goal target`,
    xpBonus,
    validDuration
  );

  const challengeId = Number(chalRes.lastInsertRowid);

  // Auto-enroll creator
  db.prepare(`
    INSERT INTO study_challenge_participants (challenge_id, user_id, status)
    VALUES (?, ?, 'joined')
  `).run(challengeId, userId);

  // Notifications depending on scope
  if (scope === 'group' && room_id) {
    const room = db.prepare('SELECT name FROM study_rooms WHERE id = ?').get(room_id);
    const members = db.prepare("SELECT user_id FROM study_room_memberships WHERE room_id = ? AND user_id != ? AND status = 'active'").all(room_id, userId);

    for (const m of members) {
      NotificationService.notify(
        m.user_id,
        'challenge',
        '🏆 New Cohort Challenge Launched!',
        `${req.user.full_name} launched challenge "${title.trim()}" in ${room?.name || 'your cohort'}! Compete for +${xpBonus} XP!`,
        task_id ? `/tasks/${task_id}` : `/group`
      );
    }
  } else if (scope === 'friends') {
    FriendService.notifyFriends(
      userId,
      'challenge',
      '⚡ Friend Challenge Invite!',
      `${req.user.full_name} invited you to challenge: "${title.trim()}"! Target: ${timeLimit} mins.`,
      task_id ? `/tasks/${task_id}` : `/tasks`
    );
  }

  const challenge = db.prepare('SELECT * FROM study_challenges WHERE id = ?').get(challengeId);
  res.status(201).json(challenge);
});

// List challenges
router.get('/', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { task_id, room_id, scope } = req.query;

  let query = `
    SELECT c.*, u.full_name as creator_name, t.title as task_title, t.subject as task_subject,
           (SELECT COUNT(*) FROM study_challenge_participants p WHERE p.challenge_id = c.id) as participant_count,
           (SELECT status FROM study_challenge_participants p WHERE p.challenge_id = c.id AND p.user_id = ?) as my_status,
           (SELECT is_completed FROM study_challenge_participants p WHERE p.challenge_id = c.id AND p.user_id = ?) as my_completed
    FROM study_challenges c
    LEFT JOIN users u ON c.creator_id = u.id
    LEFT JOIN study_tasks t ON c.task_id = t.id
    WHERE 1=1
  `;
  const params = [userId, userId];

  if (task_id) {
    query += ' AND c.task_id = ?';
    params.push(task_id);
  }
  if (room_id) {
    query += ' AND c.room_id = ?';
    params.push(room_id);
  }
  if (scope) {
    query += ' AND c.challenge_scope = ?';
    params.push(scope);
  }

  query += ' ORDER BY c.created_at DESC';

  const challenges = db.prepare(query).all(...params);
  res.json(challenges);
});

// Get challenge details with leaderboard
router.get('/:id', authenticateToken, (req, res) => {
  const challengeId = req.params.id;
  const userId = req.user.id;

  const challenge = db.prepare(`
    SELECT c.*, u.full_name as creator_name, u.avatar_url as creator_avatar,
           t.title as task_title, t.instructions as task_instructions, t.subject as task_subject
    FROM study_challenges c
    LEFT JOIN users u ON c.creator_id = u.id
    LEFT JOIN study_tasks t ON c.task_id = t.id
    WHERE c.id = ?
  `).get(challengeId);

  if (!challenge) return res.status(404).json({ error: 'Challenge not found.' });

  // Participants leaderboard
  const participants = db.prepare(`
    SELECT p.*, u.username, u.full_name, u.avatar_url
    FROM study_challenge_participants p
    JOIN users u ON p.user_id = u.id
    WHERE p.challenge_id = ?
    ORDER BY p.is_completed DESC, p.time_taken_seconds ASC, p.score_achieved DESC
  `).all(challengeId);

  const myRecord = participants.find(p => p.user_id === userId) || null;

  res.json({
    challenge,
    participants,
    myRecord
  });
});

// Join challenge
router.post('/:id/join', authenticateToken, (req, res) => {
  const challengeId = req.params.id;
  const userId = req.user.id;

  const challenge = db.prepare('SELECT * FROM study_challenges WHERE id = ?').get(challengeId);
  if (!challenge) return res.status(404).json({ error: 'Challenge not found.' });

  db.prepare(`
    INSERT OR IGNORE INTO study_challenge_participants (challenge_id, user_id, status)
    VALUES (?, ?, 'joined')
  `).run(challengeId, userId);

  res.json({ success: true, message: 'Joined challenge successfully.' });
});

// Start challenge attempt -> Push notification to friends!
router.post('/:id/start', authenticateToken, (req, res) => {
  const challengeId = req.params.id;
  const userId = req.user.id;

  const challenge = db.prepare(`
    SELECT c.*, t.title as task_title
    FROM study_challenges c
    LEFT JOIN study_tasks t ON c.task_id = t.id
    WHERE c.id = ?
  `).get(challengeId);

  if (!challenge) return res.status(404).json({ error: 'Challenge not found.' });

  const nowIso = new Date().toISOString();

  db.prepare(`
    INSERT INTO study_challenge_participants (challenge_id, user_id, status, started_at)
    VALUES (?, ?, 'in_progress', ?)
    ON CONFLICT(challenge_id, user_id)
    DO UPDATE SET status = 'in_progress', started_at = ?
  `).run(challengeId, userId, nowIso, nowIso);

  // Also if challenge is tied to a task, update assignment status
  if (challenge.task_id) {
    db.prepare(`
      INSERT OR IGNORE INTO study_task_assignments (task_id, user_id, status)
      VALUES (?, ?, 'in_progress')
    `).run(challenge.task_id, userId);

    db.prepare(`
      UPDATE study_tasks
      SET status = CASE WHEN status = 'not_started' THEN 'in_progress' ELSE status END
      WHERE id = ?
    `).run(challenge.task_id);
  }

  // Push notification to friends when user starts challenge
  const notifiedFriends = FriendService.notifyFriends(
    userId,
    'challenge',
    '🔥 Friend Started a Challenge!',
    `${req.user.full_name} just started the challenge "${challenge.title}"! Cheer them on or join the race!`,
    challenge.task_id ? `/tasks/${challenge.task_id}` : `/group`
  );

  res.json({
    success: true,
    status: 'in_progress',
    started_at: nowIso,
    notifiedFriendsCount: notifiedFriends.length
  });
});

// Complete challenge attempt
router.post('/:id/complete', authenticateToken, (req, res) => {
  const challengeId = req.params.id;
  const userId = req.user.id;
  const { score_achieved, time_taken_seconds } = req.body;

  const challenge = db.prepare('SELECT * FROM study_challenges WHERE id = ?').get(challengeId);
  if (!challenge) return res.status(404).json({ error: 'Challenge not found.' });

  const participant = db.prepare('SELECT * FROM study_challenge_participants WHERE challenge_id = ? AND user_id = ?').get(challengeId, userId);
  if (!participant) return res.status(400).json({ error: 'You have not joined this challenge.' });

  let durationSec = Number(time_taken_seconds);
  if (!durationSec && participant.started_at) {
    const startMs = new Date(participant.started_at).getTime();
    durationSec = Math.max(1, Math.round((Date.now() - startMs) / 1000));
  }

  const score = Number(score_achieved) || 5.0;

  db.prepare(`
    UPDATE study_challenge_participants
    SET status = 'completed',
        is_completed = 1,
        completed_at = CURRENT_TIMESTAMP,
        time_taken_seconds = ?,
        score_achieved = ?
    WHERE challenge_id = ? AND user_id = ?
  `).run(durationSec, score, challengeId, userId);

  // Award bonus XP for challenge completion
  const xpReward = challenge.xp_reward || 100;
  XPService.awardXP(
    userId,
    xpReward,
    `🏆 Completed challenge: "${challenge.title}"`,
    'challenge_completed',
    'study_challenge',
    challengeId
  );

  // Record streak
  StreakService.recordActivity(userId, 'study', 'challenge_completed', challengeId, req.user.timezone);

  // Notify friends of completion
  const mins = Math.floor(durationSec / 60);
  const secs = durationSec % 60;
  FriendService.notifyFriends(
    userId,
    'challenge',
    '🎉 Friend Conquered a Challenge!',
    `${req.user.full_name} completed challenge "${challenge.title}" in ${mins}m ${secs}s (+${xpReward} XP)!`,
    challenge.task_id ? `/tasks/${challenge.task_id}` : `/group`
  );

  res.json({
    success: true,
    is_completed: 1,
    time_taken_seconds: durationSec,
    score_achieved: score,
    xpReward
  });
});

module.exports = router;
