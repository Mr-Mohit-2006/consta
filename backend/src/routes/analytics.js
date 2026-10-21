const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const AnalyticsService = require('../services/analytics_service');

// Personal study analytics
router.get('/personal', authenticateToken, (req, res) => {
  try {
    const analytics = AnalyticsService.getPersonalAnalytics(req.user.id);
    res.json(analytics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Group study room analytics
router.get('/group/:roomId', authenticateToken, (req, res) => {
  try {
    const analytics = AnalyticsService.getGroupAnalytics(req.params.roomId, req.user.id);
    res.json(analytics);
  } catch (err) {
    res.status(403).json({ error: err.message });
  }
});

module.exports = router;
