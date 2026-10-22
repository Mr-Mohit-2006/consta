const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const BACKUP_FILE = process.env.USER_BACKUP_FILE || (
  process.env.NODE_ENV === 'test'
    ? path.join(__dirname, 'persistent_users_test.json')
    : path.join(__dirname, 'persistent_users.json')
);

const DEFAULT_USERS = [
  {
    username: 'alex_learner',
    email: 'alex@consta.edu',
    password_hash: bcrypt.hashSync('password123', 8),
    full_name: 'Alex Rivera',
    bio: 'Computer Science and Mathematics student passionate about distributed systems and algorithmic problem solving.',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    role: 'student',
    timezone: 'UTC',
    profile: {
      is_public: 1,
      show_streak: 1,
      show_xp: 1,
      show_tasks: 1,
      show_analytics: 1,
      skills: ['Algorithms', 'Data Structures', 'TypeScript', 'Database Design', 'System Architecture'],
      subjects: ['Computer Science', 'Mathematics', 'Software Engineering'],
      portfolio_links: [
        { label: 'GitHub', url: 'https://github.com' },
        { label: 'Portfolio', url: 'https://consta.dev' }
      ]
    }
  },
  {
    username: 'sam_study',
    email: 'sam@consta.edu',
    password_hash: bcrypt.hashSync('password123', 8),
    full_name: 'Sam Chen',
    bio: 'Software engineer & AI enthusiast. Studying compilers and systems design collaboratively.',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    role: 'student',
    timezone: 'UTC',
    profile: {
      is_public: 1,
      show_streak: 1,
      show_xp: 1,
      show_tasks: 1,
      show_analytics: 1,
      skills: ['Frontend', 'React', 'CSS', 'UI/UX Design'],
      subjects: ['Web Development', 'Computer Science'],
      portfolio_links: [{ label: 'GitHub', url: 'https://github.com' }]
    }
  },
  {
    username: 'dr_stone',
    email: 'mentor@consta.edu',
    password_hash: bcrypt.hashSync('password123', 8),
    full_name: 'Dr. Evelyn Stone',
    bio: 'Academic mentor and senior reviewer in Algorithms & Computational Systems.',
    avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    role: 'mentor',
    timezone: 'UTC',
    profile: {
      is_public: 1,
      show_streak: 1,
      show_xp: 1,
      show_tasks: 1,
      show_analytics: 1,
      skills: ['Distributed Systems', 'Research', 'Mentorship'],
      subjects: ['Computer Science', 'Software Engineering'],
      portfolio_links: [{ label: 'Academic Profile', url: 'https://consta.edu' }]
    }
  }
];

function getAllBackupUsers() {
  try {
    if (fs.existsSync(BACKUP_FILE)) {
      const content = fs.readFileSync(BACKUP_FILE, 'utf8');
      const users = JSON.parse(content);
      if (Array.isArray(users) && users.length > 0) {
        return users;
      }
    }
  } catch (err) {
    console.error('Error reading persistent_users.json:', err.message);
  }
  // Initialize with default users if backup file does not exist or is empty
  saveAllBackupUsers(DEFAULT_USERS);
  return DEFAULT_USERS;
}

function saveAllBackupUsers(users) {
  try {
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving persistent_users.json:', err.message);
  }
}

function saveOrUpdateUser(userData) {
  const users = getAllBackupUsers();
  const existingIndex = users.findIndex(
    u => (u.username && u.username.toLowerCase() === userData.username.toLowerCase()) ||
         (u.email && u.email.toLowerCase() === userData.email.toLowerCase())
  );

  if (existingIndex >= 0) {
    users[existingIndex] = {
      ...users[existingIndex],
      ...userData,
      profile: {
        ...(users[existingIndex].profile || {}),
        ...(userData.profile || {})
      }
    };
  } else {
    users.push(userData);
  }

  saveAllBackupUsers(users);
}

function updatePassword(email, newPasswordHash) {
  const users = getAllBackupUsers();
  const target = users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
  if (target) {
    target.password_hash = newPasswordHash;
    saveAllBackupUsers(users);
  }
}

function restoreUsersToDb(db) {
  const users = getAllBackupUsers();
  const todayStr = new Date().toISOString().slice(0, 10);

  const insertUser = db.prepare(`
    INSERT INTO users (username, email, password_hash, full_name, bio, avatar_url, role, timezone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(username) DO UPDATE SET
      password_hash = excluded.password_hash,
      full_name = excluded.full_name,
      bio = excluded.bio,
      avatar_url = excluded.avatar_url,
      timezone = excluded.timezone
  `);

  const insertProfile = db.prepare(`
    INSERT OR IGNORE INTO user_profiles (user_id, is_public, show_streak, show_xp, show_tasks, show_analytics, skills, subjects, portfolio_links)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertPref = db.prepare('INSERT OR IGNORE INTO notification_preferences (user_id) VALUES (?)');
  const insertStreak = db.prepare('INSERT OR IGNORE INTO streak_records (user_id, category, current_streak, longest_streak, last_activity_date) VALUES (?, ?, ?, ?, ?)');

  for (const u of users) {
    try {
      insertUser.run(
        u.username.toLowerCase(),
        u.email.toLowerCase(),
        u.password_hash,
        u.full_name || u.username,
        u.bio || '',
        u.avatar_url || '',
        u.role || 'student',
        u.timezone || 'UTC'
      );

      const dbUser = db.prepare('SELECT id FROM users WHERE LOWER(username) = ?').get(u.username.toLowerCase());
      if (dbUser) {
        const uid = dbUser.id;
        const prof = u.profile || {};
        insertProfile.run(
          uid,
          prof.is_public !== undefined ? prof.is_public : 1,
          prof.show_streak !== undefined ? prof.show_streak : 1,
          prof.show_xp !== undefined ? prof.show_xp : 1,
          prof.show_tasks !== undefined ? prof.show_tasks : 1,
          prof.show_analytics !== undefined ? prof.show_analytics : 1,
          JSON.stringify(prof.skills || []),
          JSON.stringify(prof.subjects || []),
          JSON.stringify(prof.portfolio_links || [])
        );

        insertPref.run(uid);

        insertStreak.run(uid, 'overall', 1, 1, todayStr);
        insertStreak.run(uid, 'study', 1, 1, todayStr);
      }
    } catch (err) {
      console.warn(`Could not restore user ${u.username}:`, err.message);
    }
  }
}

module.exports = {
  getAllBackupUsers,
  saveOrUpdateUser,
  updatePassword,
  restoreUsersToDb,
  DEFAULT_USERS
};
