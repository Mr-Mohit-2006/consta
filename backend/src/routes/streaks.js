const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const StreakService = require('../services/streak_service');

// Get all streak categories
router.get('/', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const streaks = StreakService.getUserStreaks(userId);
  res.json(streaks);
});

// Get weekly activity calendar
router.get('/weekly', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const weekly = StreakService.getWeeklyActivity(userId, req.user.timezone);
  res.json(weekly);
});

// Get consistency heatmap (90 days)
router.get('/heatmap', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const daysBack = Number(req.query.days) || 90;
  const heatmap = StreakService.getHeatmap(userId, daysBack);
  res.json(heatmap);
});

// Record habit or study milestone
router.post('/record-habit', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { habit_name } = req.body;

  if (!habit_name || !habit_name.trim()) {
    return res.status(400).json({ error: 'Habit name is required.' });
  }

  const streakResult = StreakService.recordActivity(userId, 'habit', habit_name.trim(), null, req.user.timezone);
  res.json({ success: true, streakResult });
});

module.exports = router;
