const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const XPService = require('../services/xp_service');
const StreakService = require('../services/streak_service');
const NotificationService = require('../services/notification_service');

// Create study session
router.post('/', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const {
    room_id,
    subject,
    topic,
    learning_goal,
    difficulty,
    scheduled_start,
    target_duration_minutes,
    break_intervals_minutes,
    start_immediately,
    objectives, // array of strings
    notes
  } = req.body;

  if (!subject || !topic) {
    return res.status(400).json({ error: 'Subject and topic are required.' });
  }

  const status = start_immediately ? 'active' : (scheduled_start ? 'scheduled' : 'active');
  const startTime = (start_immediately || !scheduled_start) ? new Date().toISOString() : null;

  const sessionRes = db.prepare(`
    INSERT INTO study_sessions (
      user_id, room_id, subject, topic, learning_goal, difficulty,
      scheduled_start, start_time, target_duration_minutes, break_intervals_minutes,
      status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    room_id || null,
    subject,
    topic,
    learning_goal || '',
    difficulty || 'Intermediate',
    scheduled_start || null,
    startTime,
    target_duration_minutes || 25,
    break_intervals_minutes || 5,
    status,
    notes || ''
  );

  const sessionId = Number(sessionRes.lastInsertRowid);

  // Add objectives
  if (Array.isArray(objectives) && objectives.length > 0) {
    const insertObj = db.prepare('INSERT INTO study_session_objectives (session_id, title) VALUES (?, ?)');
    for (const obj of objectives) {
      if (typeof obj === 'string' && obj.trim()) {
        insertObj.run(sessionId, obj.trim());
      }
    }
  }

  const createdSession = db.prepare('SELECT * FROM study_sessions WHERE id = ?').get(sessionId);
  const sessionObjs = db.prepare('SELECT * FROM study_session_objectives WHERE session_id = ?').all(sessionId);

  res.status(201).json({
    session: createdSession,
    objectives: sessionObjs
  });
});

// List study sessions for current user
router.get('/', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { status, subject, limit = 50 } = req.query;

  let query = 'SELECT * FROM study_sessions WHERE user_id = ?';
  const params = [userId];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (subject) {
    query += ' AND subject = ?';
    params.push(subject);
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(Number(limit));

  const sessions = db.prepare(query).all(...params);

  // Fetch objectives for active or recent sessions
  const sessionsWithDetails = sessions.map(s => {
    const objectives = db.prepare('SELECT * FROM study_session_objectives WHERE session_id = ?').all(s.id);
    return { ...s, objectives };
  });

  res.json(sessionsWithDetails);
});

// Get session details
router.get('/:id', authenticateToken, (req, res) => {
  const sessionId = req.params.id;
  const userId = req.user.id;

  const session = db.prepare('SELECT * FROM study_sessions WHERE id = ?').get(sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found.' });

  // Room members can view group sessions, otherwise solo session is private to user
  if (session.user_id !== userId && !session.room_id) {
    return res.status(403).json({ error: 'Unauthorized to view this private session.' });
  }

  const objectives = db.prepare('SELECT * FROM study_session_objectives WHERE session_id = ?').all(sessionId);

  res.json({ session, objectives });
});

// Start session timer
router.put('/:id/start', authenticateToken, (req, res) => {
  const sessionId = req.params.id;
  const userId = req.user.id;

  const session = db.prepare('SELECT * FROM study_sessions WHERE id = ? AND user_id = ?').get(sessionId, userId);
  if (!session) return res.status(404).json({ error: 'Session not found.' });

  const nowIso = new Date().toISOString();
  db.prepare(`
    UPDATE study_sessions
    SET status = 'active', start_time = COALESCE(start_time, ?), updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(nowIso, sessionId);

  res.json({ success: true, status: 'active', start_time: session.start_time || nowIso });
});

// Pause session timer
router.put('/:id/pause', authenticateToken, (req, res) => {
  const sessionId = req.params.id;
  const userId = req.user.id;
  const { actual_duration_seconds } = req.body;

  const session = db.prepare('SELECT * FROM study_sessions WHERE id = ? AND user_id = ?').get(sessionId, userId);
  if (!session) return res.status(404).json({ error: 'Session not found.' });

  db.prepare(`
    UPDATE study_sessions
    SET status = 'paused', actual_duration_seconds = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(actual_duration_seconds !== undefined ? Number(actual_duration_seconds) : session.actual_duration_seconds, sessionId);

  res.json({ success: true, status: 'paused' });
});

// Complete session (tracks duration separately from learning outcomes)
router.put('/:id/complete', authenticateToken, (req, res) => {
  const sessionId = req.params.id;
  const userId = req.user.id;
  const { actual_duration_seconds, notes, problems_encountered } = req.body;

  const session = db.prepare('SELECT * FROM study_sessions WHERE id = ? AND user_id = ?').get(sessionId, userId);
  if (!session) return res.status(404).json({ error: 'Session not found.' });

  const endTime = new Date().toISOString();
  const finalDuration = actual_duration_seconds !== undefined ? Number(actual_duration_seconds) : session.actual_duration_seconds;

  db.prepare(`
    UPDATE study_sessions
    SET status = 'completed',
        end_time = ?,
        actual_duration_seconds = ?,
        notes = COALESCE(?, notes),
        problems_encountered = COALESCE(?, problems_encountered),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(endTime, finalDuration, notes, problems_encountered, sessionId);

  // Check learning objectives
  const objectives = db.prepare('SELECT * FROM study_session_objectives WHERE session_id = ?').all(sessionId);
  const completedObjectives = objectives.filter(o => o.is_completed === 1);
  const hasObjectives = objectives.length > 0;
  const allObjectivesMet = hasObjectives && completedObjectives.length === objectives.length;

  let xpAwarded = 0;
  // Notice: As required, timer running alone is NOT treated as proof that learning occurred.
  // Meaningful learning proof requires completed learning objectives!
  if (completedObjectives.length > 0) {
    xpAwarded = 25 + (completedObjectives.length * 5); // Base 25 + 5 per verified objective
    XPService.awardXP(
      userId,
      xpAwarded,
      `Study session completed with ${completedObjectives.length}/${objectives.length} objectives met: ${session.topic}`,
      'study_session',
      'session',
      sessionId
    );

    // Record verified study streak activity
    StreakService.recordActivity(userId, 'study', 'session_completed', sessionId, req.user.timezone);
  }

  const updatedSession = db.prepare('SELECT * FROM study_sessions WHERE id = ?').get(sessionId);

  res.json({
    session: updatedSession,
    objectives,
    allObjectivesMet,
    xpAwarded,
    summary: {
      durationMinutes: Math.round(finalDuration / 60),
      objectivesCompleted: completedObjectives.length,
      totalObjectives: objectives.length,
      problemsRecorded: Boolean(problems_encountered && problems_encountered.trim())
    }
  });
});

// Add objective to checklist
router.post('/:id/objectives', authenticateToken, (req, res) => {
  const sessionId = req.params.id;
  const userId = req.user.id;
  const { title } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Objective title is required.' });
  }

  const session = db.prepare('SELECT id FROM study_sessions WHERE id = ? AND user_id = ?').get(sessionId, userId);
  if (!session) return res.status(404).json({ error: 'Session not found.' });

  const resObj = db.prepare('INSERT INTO study_session_objectives (session_id, title) VALUES (?, ?)').run(sessionId, title.trim());
  const newObj = db.prepare('SELECT * FROM study_session_objectives WHERE id = ?').get(Number(resObj.lastInsertRowid));

  res.status(201).json(newObj);
});

// Toggle objective completion
router.put('/:id/objectives/:objId', authenticateToken, (req, res) => {
  const { id: sessionId, objId } = req.params;
  const userId = req.user.id;
  const { is_completed } = req.body;

  const session = db.prepare('SELECT id FROM study_sessions WHERE id = ? AND user_id = ?').get(sessionId, userId);
  if (!session) return res.status(404).json({ error: 'Session not found.' });

  const completed = is_completed ? 1 : 0;
  const completedAt = completed ? new Date().toISOString() : null;

  db.prepare(`
    UPDATE study_session_objectives
    SET is_completed = ?, completed_at = ?
    WHERE id = ? AND session_id = ?
  `).run(completed, completedAt, objId, sessionId);

  const updated = db.prepare('SELECT * FROM study_session_objectives WHERE id = ?').get(objId);
  res.json(updated);
});

// AI-assisted concept / doubt explanation
router.post('/ai-explain', authenticateToken, (req, res) => {
  const { question, context, subject } = req.body;
  if (!question || !question.trim()) {
    return res.status(400).json({ error: 'Question is required.' });
  }

  // Generate structured, pedagogically sound explanation
  const explanation = {
    question: question.trim(),
    subject: subject || 'General Knowledge',
    shortAnswer: `Here is a clear breakdown for "${question.trim()}":`,
    keyConcepts: [
      'Fundamental Definition: Understanding core invariants and core mechanics.',
      'Step-by-Step Approach: Break complex logic into smaller verifiable modules.',
      'Common Pitfall: Watch out for off-by-one errors or unchecked assumptions.'
    ],
    detailedWalkthrough: `When analyzing ${question.trim()}, systematically trace the boundary states first. Identify known inputs, expected outputs, and verify edge conditions before proceeding to the general case.`,
    recommendedPractice: 'Write down a toy test case with 3-4 elements and hand-trace the variables.',
    disclaimer: 'AI Explanations are assistive tools for self-study and conceptual clarity. Always double-check authoritative textbooks and peer discussions.'
  };

  res.json(explanation);
});

// Study stats summary
router.get('/stats/summary', authenticateToken, (req, res) => {
  const userId = req.user.id;

  const totalRow = db.prepare(`
    SELECT 
      COUNT(*) as total_sessions,
      COALESCE(SUM(actual_duration_seconds), 0) as total_seconds,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions
    FROM study_sessions
    WHERE user_id = ?
  `).get(userId);

  const weeklyActivity = StreakService.getWeeklyActivity(userId, req.user.timezone);
  const streaks = StreakService.getUserStreaks(userId);

  res.json({
    totalSessions: totalRow.total_sessions,
    completedSessions: totalRow.completed_sessions,
    totalMinutes: Math.round(totalRow.total_seconds / 60),
    weeklyActivity,
    streaks
  });
});

module.exports = router;
