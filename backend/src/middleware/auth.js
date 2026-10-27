const jwt = require('jsonwebtoken');
const { db } = require('../db/database');
const userBackupService = require('../db/user_backup_service');

const JWT_SECRET = process.env.JWT_SECRET || 'consta_jwt_secret_persistent_key_2026_collaborative_platform_auth';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    let user = db.prepare('SELECT id, username, email, full_name, role, timezone, avatar_url FROM users WHERE id = ?').get(decoded.id);

    // Fallback lookup by username if ID changed or not found
    if (!user && decoded.username) {
      user = db.prepare('SELECT id, username, email, full_name, role, timezone, avatar_url FROM users WHERE LOWER(username) = ?').get(decoded.username.toLowerCase());
    }

    if (!user) {
      // Re-hydrate users from persistent backup in case of container restart/ephemeral reset
      try {
        userBackupService.restoreUsersToDb(db);
        user = db.prepare('SELECT id, username, email, full_name, role, timezone, avatar_url FROM users WHERE id = ?').get(decoded.id);
        if (!user && decoded.username) {
          user = db.prepare('SELECT id, username, email, full_name, role, timezone, avatar_url FROM users WHERE LOWER(username) = ?').get(decoded.username.toLowerCase());
        }
      } catch (e) {
        console.warn('Backup restore notice during auth:', e.message);
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'User not found or session expired.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
}

function optionalToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = db.prepare('SELECT id, username, email, full_name, role, timezone, avatar_url FROM users WHERE id = ?').get(decoded.id);
      if (user) {
        req.user = user;
      }
    } catch {
      // Ignore if optional
    }
  }
  next();
}

module.exports = {
  authenticateToken,
  optionalToken,
  JWT_SECRET
};
