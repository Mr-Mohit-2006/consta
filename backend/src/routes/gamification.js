const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const XPService = require('../services/xp_service');

// Get current progression and level metrics
router.get('/progression', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const progression = XPService.getUserProgression(userId);
  res.json(progression);
});

// Get auditable XP transaction ledger
router.get('/history', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const limit = Number(req.query.limit) || 30;
  const offset = Number(req.query.offset) || 0;

  const history = XPService.getHistory(userId, limit, offset);
  res.json(history);
});

// Get all level definitions
router.get('/levels', authenticateToken, (req, res) => {
  const levels = db.prepare('SELECT * FROM level_definitions ORDER BY min_xp ASC').all();
  res.json(levels);
});

// Get achievements (all definitions with unlocked status for current user)
router.get('/achievements', authenticateToken, (req, res) => {
  const userId = req.user.id;

  const achievements = db.prepare(`
    SELECT a.*,
           ua.unlocked_at,
           CASE WHEN ua.id IS NOT NULL THEN 1 ELSE 0 END as is_unlocked
    FROM learning_achievements a
    LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
    ORDER BY is_unlocked DESC, a.xp_reward ASC
  `).all(userId);

  res.json(achievements);
});

// File an appeal for an XP penalty
router.post('/appeal', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { xp_transaction_id, reason } = req.body;

  if (!xp_transaction_id || !reason || !reason.trim()) {
    return res.status(400).json({ error: 'xp_transaction_id and appeal reason are required.' });
  }

  try {
    const appealId = XPService.fileAppeal(userId, xp_transaction_id, reason.trim());
    res.status(201).json({ success: true, appealId, message: 'Appeal submitted for mentor/moderator review.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// List user's appeals
router.get('/appeals', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const appeals = db.prepare(`
    SELECT a.*, x.amount, x.reason as transaction_reason, x.created_at as transaction_date
    FROM appeals a
    JOIN xp_transactions x ON a.xp_transaction_id = x.id
    WHERE a.user_id = ?
    ORDER BY a.created_at DESC
  `).all(userId);

  res.json(appeals);
});

// Moderation route: Apply auditable penalty (admin / mentor only)
router.post('/penalty', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'mentor') {
    return res.status(403).json({ error: 'Only authorized mentors and administrators can execute audited penalties.' });
  }

  const { target_user_id, amount, reason, ref_type, ref_id } = req.body;

  if (!target_user_id || !amount || !reason || reason.trim().length < 8) {
    return res.status(400).json({ error: 'Target user, amount, and detailed auditable reason are strictly required.' });
  }

  try {
    const txId = XPService.deductXP(
      target_user_id,
      amount,
      reason.trim(),
      'penalty',
      ref_type || 'moderation',
      ref_id || 0,
      req.user.id
    );
    res.json({ success: true, transactionId: txId });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
