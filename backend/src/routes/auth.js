const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db, checkpointDb } = require('../db/database');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');
const userBackupService = require('../db/user_backup_service');
const XPService = require('../services/xp_service');
const StreakService = require('../services/streak_service');

// Check if username is available
router.get('/check-username', (req, res) => {
  const username = (req.query.username || '').trim().toLowerCase();
  if (!username || username.length < 3) {
    return res.json({ available: false, message: 'Username must be at least 3 characters.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE LOWER(username) = ?').get(username);
  if (existing) {
    return res.json({ available: false, message: 'This username is already taken.' });
  }
  return res.json({ available: true, message: 'Username is available!' });
});

// Check if email is available
router.get('/check-email', (req, res) => {
  const email = (req.query.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return res.json({ available: false, message: 'Enter a valid email address.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(email);
  if (existing) {
    return res.json({ available: false, message: 'An account with this email already exists.' });
  }
  return res.json({ available: true, message: 'Email is available!' });
});

// Register
router.post('/register', (req, res) => {
  const { username, email, password, full_name, bio, timezone } = req.body;

  if (!username || !email || !password || !full_name) {
    return res.status(400).json({ error: 'Username, email, password, and full name are required.' });
  }

  const cleanUsername = username.trim().toLowerCase();
  const cleanEmail = email.trim().toLowerCase();

  const existing = db.prepare('SELECT id FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?').get(cleanUsername, cleanEmail);
  if (existing) {
    return res.status(400).json({ error: 'Username or email already in use.' });
  }

  const pwHash = bcrypt.hashSync(password, 8);
  const userRole = 'student'; // Single unified user mode
  const tz = timezone || 'UTC';

  const userRes = db.prepare(`
    INSERT INTO users (username, email, password_hash, full_name, bio, role, timezone)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(cleanUsername, cleanEmail, pwHash, full_name.trim(), bio || '', userRole, tz);

  const userId = Number(userRes.lastInsertRowid);

  // Default profile
  db.prepare(`
    INSERT INTO user_profiles (user_id, is_public, show_streak, show_xp, show_tasks, show_analytics, skills, subjects, portfolio_links)
    VALUES (?, 1, 1, 1, 1, 1, '[]', '[]', '[]')
  `).run(userId);

  // Notification preferences
  db.prepare('INSERT INTO notification_preferences (user_id) VALUES (?)').run(userId);

  // Welcome bonus XP
  XPService.awardXP(userId, 50, 'Welcome to the CONSTA platform!', 'study_session', 'welcome', 1);

  // Initial streak record
  StreakService.recordActivity(userId, 'overall', 'account_created', userId, tz);

  // Backup user for persistent multi-device & container restart recovery
  try {
    userBackupService.saveOrUpdateUser({
      id: userId,
      username: cleanUsername,
      email: cleanEmail,
      password_hash: pwHash,
      full_name: full_name.trim(),
      bio: bio || '',
      avatar_url: '',
      role: userRole,
      timezone: tz,
      profile: {
        is_public: 1,
        show_streak: 1,
        show_xp: 1,
        show_tasks: 1,
        show_analytics: 1,
        skills: [],
        subjects: [],
        portfolio_links: []
      }
    });
    checkpointDb();
  } catch (err) {
    console.warn('Backup save notice:', err.message);
  }

  const token = jwt.sign({ id: userId, username: cleanUsername, role: userRole }, JWT_SECRET, { expiresIn: '90d' });

  const user = db.prepare('SELECT id, username, email, full_name, bio, avatar_url, role, timezone, created_at FROM users WHERE id = ?').get(userId);

  res.status(201).json({ token, user });
});

// Login with automatic cold-start restoration and client self-healing
router.post('/login', (req, res) => {
  const { identifier, password, clientRecovery } = req.body; // username or email

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Identifier and password are required.' });
  }

  const cleanId = identifier.trim().toLowerCase();

  let user = db.prepare(`
    SELECT * FROM users 
    WHERE LOWER(username) = ? OR LOWER(email) = ?
  `).get(cleanId, cleanId);

  // If user is missing from SQLite (e.g. cold container restart / rebuild), restore from persistent backup
  if (!user) {
    try {
      userBackupService.restoreUsersToDb(db);
      user = db.prepare(`
        SELECT * FROM users 
        WHERE LOWER(username) = ? OR LOWER(email) = ?
      `).get(cleanId, cleanId);
    } catch (err) {
      console.warn('Restore check notice on login:', err.message);
    }
  }

  // Client-assisted auto-recovery: if ephemeral container wiped the database, restore the user on-the-fly
  if (!user && clientRecovery) {
    try {
      const recEmail = (clientRecovery.email || '').trim().toLowerCase();
      const recUsername = (clientRecovery.username || '').trim().toLowerCase();
      if ((recEmail === cleanId || recUsername === cleanId) && clientRecovery.full_name) {
        const pwHash = bcrypt.hashSync(password, 8);
        const ins = db.prepare(`
          INSERT INTO users (username, email, password_hash, full_name, role, timezone)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(username) DO UPDATE SET password_hash = excluded.password_hash
        `).run(recUsername, recEmail, pwHash, clientRecovery.full_name, clientRecovery.role || 'student', clientRecovery.timezone || 'UTC');

        const newId = Number(ins.lastInsertRowid);
        db.prepare('INSERT OR IGNORE INTO user_profiles (user_id) VALUES (?)').run(newId);
        db.prepare('INSERT OR IGNORE INTO notification_preferences (user_id) VALUES (?)').run(newId);
        
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(newId);
        userBackupService.saveOrUpdateUser({
          id: newId,
          username: recUsername,
          email: recEmail,
          password_hash: pwHash,
          full_name: user.full_name,
          role: user.role,
          timezone: user.timezone
        });
        checkpointDb();
      }
    } catch (recErr) {
      console.warn('Auto-recovery notice on login:', recErr.message);
    }
  }

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email/username or password.' });
  }

  checkpointDb();

  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '90d' });

  delete user.password_hash;
  res.json({ token, user });
});

// Self-healing account recovery endpoint
router.post('/recover-account', (req, res) => {
  const { identifier, password, userProfile } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ error: 'Identifier and password required.' });
  }

  const cleanId = identifier.trim().toLowerCase();
  let user = db.prepare('SELECT * FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?').get(cleanId, cleanId);

  if (!user && userProfile) {
    try {
      const cleanUsername = (userProfile.username || cleanId).trim().toLowerCase();
      const cleanEmail = (userProfile.email || `${cleanId}@consta.user`).trim().toLowerCase();
      const pwHash = bcrypt.hashSync(password, 8);

      const ins = db.prepare(`
        INSERT INTO users (username, email, password_hash, full_name, role, timezone)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(cleanUsername, cleanEmail, pwHash, userProfile.full_name || cleanUsername, userProfile.role || 'student', userProfile.timezone || 'UTC');

      const newId = Number(ins.lastInsertRowid);
      db.prepare('INSERT OR IGNORE INTO user_profiles (user_id) VALUES (?)').run(newId);
      db.prepare('INSERT OR IGNORE INTO notification_preferences (user_id) VALUES (?)').run(newId);

      user = db.prepare('SELECT * FROM users WHERE id = ?').get(newId);
      userBackupService.saveOrUpdateUser({
        id: newId,
        username: cleanUsername,
        email: cleanEmail,
        password_hash: pwHash,
        full_name: user.full_name,
        role: user.role,
        timezone: user.timezone
      });
      checkpointDb();
    } catch (e) {
      console.error('Account recovery error:', e.message);
    }
  }

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials. Unable to recover account.' });
  }

  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '90d' });
  delete user.password_hash;
  res.json({ token, user, recovered: true });
});

// Request password reset code via email
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = db.prepare('SELECT id, username, email FROM users WHERE LOWER(email) = ?').get(cleanEmail);

  if (!user) {
    return res.status(404).json({ error: 'No account found with this email address.' });
  }

  // Generate 6-digit verification code
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

  db.prepare(`
    INSERT INTO password_resets (email, code, expires_at, used)
    VALUES (?, ?, datetime('now', '+15 minutes'), 0)
  `).run(cleanEmail, resetCode);

  // Return reset code for demo/testing convenience alongside simulated email delivery
  res.json({
    success: true,
    message: `A 6-digit password reset code has been sent to ${cleanEmail}. (Code: ${resetCode})`,
    email: cleanEmail,
    code: resetCode
  });
});

// Verify code and reset password
router.post('/reset-password', (req, res) => {
  const { email, code, new_password } = req.body;

  if (!email || !code || !new_password) {
    return res.status(400).json({ error: 'Email, verification code, and new password are required.' });
  }

  if (new_password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = code.trim();

  // Find valid, unexpired, unused reset record
  const resetRecord = db.prepare(`
    SELECT id FROM password_resets
    WHERE LOWER(email) = ? AND code = ? AND used = 0 AND expires_at > datetime('now')
    ORDER BY id DESC LIMIT 1
  `).get(cleanEmail, cleanCode);

  if (!resetRecord) {
    return res.status(400).json({ error: 'Invalid or expired verification code. Please request a new one.' });
  }

  // Hash new password and update user
  const newHash = bcrypt.hashSync(new_password, 8);
  const updateRes = db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE LOWER(email) = ?').run(newHash, cleanEmail);

  if (updateRes.changes === 0) {
    return res.status(404).json({ error: 'User account not found.' });
  }

  // Backup updated password hash
  try {
    userBackupService.updatePassword(cleanEmail, newHash);
  } catch (err) {
    console.warn('Backup password update notice:', err.message);
  }

  // Mark token as used
  db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(resetRecord.id);

  res.json({
    success: true,
    message: 'Your password has been successfully reset. Please log in with your new password.'
  });
});

// Current user profile & status
router.get('/me', authenticateToken, (req, res) => {
  const user = req.user;
  const profile = db.prepare('SELECT * FROM user_profiles WHERE user_id = ?').get(user.id) || {};
  const streaks = StreakService.getUserStreaks(user.id);
  const progression = XPService.getUserProgression(user.id);

  if (profile.skills && typeof profile.skills === 'string') {
    try { profile.skills = JSON.parse(profile.skills); } catch { profile.skills = []; }
  } else if (!Array.isArray(profile.skills)) {
    profile.skills = [];
  }

  if (profile.subjects && typeof profile.subjects === 'string') {
    try { profile.subjects = JSON.parse(profile.subjects); } catch { profile.subjects = []; }
  } else if (!Array.isArray(profile.subjects)) {
    profile.subjects = [];
  }

  if (profile.portfolio_links && typeof profile.portfolio_links === 'string') {
    try { profile.portfolio_links = JSON.parse(profile.portfolio_links); } catch { profile.portfolio_links = []; }
  } else if (!Array.isArray(profile.portfolio_links)) {
    profile.portfolio_links = [];
  }

  res.json({
    user,
    profile,
    streaks,
    progression
  });
});

// Update profile
router.put('/profile', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { full_name, bio, avatar_url, timezone, is_public, show_streak, show_xp, show_tasks, show_analytics, skills, subjects, portfolio_links } = req.body;

  if (full_name !== undefined || bio !== undefined || avatar_url !== undefined || timezone !== undefined) {
    db.prepare(`
      UPDATE users 
      SET full_name = COALESCE(?, full_name),
          bio = COALESCE(?, bio),
          avatar_url = COALESCE(?, avatar_url),
          timezone = COALESCE(?, timezone),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(full_name, bio, avatar_url, timezone, userId);
  }

  if (is_public !== undefined || show_streak !== undefined || show_xp !== undefined || skills !== undefined) {
    db.prepare(`
      UPDATE user_profiles
      SET is_public = COALESCE(?, is_public),
          show_streak = COALESCE(?, show_streak),
          show_xp = COALESCE(?, show_xp),
          show_tasks = COALESCE(?, show_tasks),
          show_analytics = COALESCE(?, show_analytics),
          skills = COALESCE(?, skills),
          subjects = COALESCE(?, subjects),
          portfolio_links = COALESCE(?, portfolio_links)
      WHERE user_id = ?
    `).run(
      is_public !== undefined ? (is_public ? 1 : 0) : null,
      show_streak !== undefined ? (show_streak ? 1 : 0) : null,
      show_xp !== undefined ? (show_xp ? 1 : 0) : null,
      show_tasks !== undefined ? (show_tasks ? 1 : 0) : null,
      show_analytics !== undefined ? (show_analytics ? 1 : 0) : null,
      skills ? JSON.stringify(skills) : null,
      subjects ? JSON.stringify(subjects) : null,
      portfolio_links ? JSON.stringify(portfolio_links) : null,
      userId
    );
  }

  const updatedUser = db.prepare('SELECT id, username, email, full_name, bio, avatar_url, role, timezone FROM users WHERE id = ?').get(userId);
  const updatedProfile = db.prepare('SELECT * FROM user_profiles WHERE user_id = ?').get(userId);
  if (updatedProfile) {
    updatedProfile.skills = JSON.parse(updatedProfile.skills || '[]');
    updatedProfile.subjects = JSON.parse(updatedProfile.subjects || '[]');
    updatedProfile.portfolio_links = JSON.parse(updatedProfile.portfolio_links || '[]');
  }

  // Backup updated profile
  try {
    const pw = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId);
    userBackupService.saveOrUpdateUser({
      username: updatedUser.username,
      email: updatedUser.email,
      password_hash: pw ? pw.password_hash : '',
      full_name: updatedUser.full_name,
      bio: updatedUser.bio,
      avatar_url: updatedUser.avatar_url,
      role: updatedUser.role,
      timezone: updatedUser.timezone,
      profile: updatedProfile
    });
  } catch (err) {
    console.warn('Backup profile save notice:', err.message);
  }

  res.json({ user: updatedUser, profile: updatedProfile });
});

// Search users for mentions / invitations
router.get('/users', authenticateToken, (req, res) => {
  const query = req.query.q || '';
  const users = db.prepare(`
    SELECT id, username, full_name, avatar_url, role
    FROM users
    WHERE username LIKE ? OR full_name LIKE ?
    LIMIT 20
  `).all(`%${query}%`, `%${query}%`);
  res.json(users);
});

module.exports = router;
