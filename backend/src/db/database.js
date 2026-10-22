const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const userBackupService = require('./user_backup_service');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../consta.sqlite');
const db = new DatabaseSync(dbPath);

db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

function initDatabase() {
  db.exec(`
    -- Users and Authentication
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      bio TEXT DEFAULT '',
      avatar_url TEXT DEFAULT '',
      timezone TEXT DEFAULT 'UTC',
      role TEXT CHECK(role IN ('student', 'mentor', 'admin')) DEFAULT 'student',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- User Profiles & Portfolio Configuration
    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id INTEGER PRIMARY KEY,
      is_public INTEGER DEFAULT 1,
      show_streak INTEGER DEFAULT 1,
      show_xp INTEGER DEFAULT 1,
      show_tasks INTEGER DEFAULT 1,
      show_analytics INTEGER DEFAULT 1,
      portfolio_links TEXT DEFAULT '[]',
      skills TEXT DEFAULT '[]',
      subjects TEXT DEFAULT '[]',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Study Rooms (Group Study)
    CREATE TABLE IF NOT EXISTS study_rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      description TEXT DEFAULT '',
      objectives TEXT DEFAULT '',
      room_type TEXT CHECK(room_type IN ('public', 'private', 'invite_only')) DEFAULT 'public',
      join_code TEXT UNIQUE,
      owner_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Study Room Memberships
    CREATE TABLE IF NOT EXISTS study_room_memberships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT CHECK(role IN ('owner', 'moderator', 'member')) DEFAULT 'member',
      status TEXT CHECK(status IN ('active', 'invited', 'muted', 'banned', 'pending')) DEFAULT 'active',
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(room_id, user_id),
      FOREIGN KEY (room_id) REFERENCES study_rooms(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Study Sessions (Solo and Group)
    CREATE TABLE IF NOT EXISTS study_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      room_id INTEGER,
      subject TEXT NOT NULL,
      topic TEXT NOT NULL,
      learning_goal TEXT DEFAULT '',
      difficulty TEXT CHECK(difficulty IN ('Beginner', 'Intermediate', 'Advanced', 'Expert')) DEFAULT 'Intermediate',
      scheduled_start DATETIME,
      start_time DATETIME,
      end_time DATETIME,
      target_duration_minutes INTEGER DEFAULT 25,
      actual_duration_seconds INTEGER DEFAULT 0,
      break_intervals_minutes INTEGER DEFAULT 5,
      status TEXT CHECK(status IN ('scheduled', 'active', 'paused', 'completed', 'cancelled')) DEFAULT 'active',
      notes TEXT DEFAULT '',
      problems_encountered TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (room_id) REFERENCES study_rooms(id) ON DELETE SET NULL
    );

    -- Session Learning Objectives Checklist
    CREATE TABLE IF NOT EXISTS study_session_objectives (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      is_completed INTEGER DEFAULT 0,
      completed_at DATETIME,
      FOREIGN KEY (session_id) REFERENCES study_sessions(id) ON DELETE CASCADE
    );

    -- Review Rubrics
    CREATE TABLE IF NOT EXISTS review_rubrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      creator_id INTEGER,
      subject TEXT DEFAULT 'General',
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Review Criteria in a Rubric
    CREATE TABLE IF NOT EXISTS review_criteria (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rubric_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      max_score INTEGER DEFAULT 5,
      weight REAL DEFAULT 1.0,
      FOREIGN KEY (rubric_id) REFERENCES review_rubrics(id) ON DELETE CASCADE
    );

    -- Study Tasks
    CREATE TABLE IF NOT EXISTS study_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      instructions TEXT NOT NULL,
      subject TEXT NOT NULL,
      topic TEXT DEFAULT '',
      creator_id INTEGER NOT NULL,
      room_id INTEGER,
      due_date DATETIME,
      priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
      expected_outcome TEXT DEFAULT '',
      reference_materials TEXT DEFAULT '[]',
      allowed_submission_types TEXT DEFAULT '["text","image","multi_image","document","link"]',
      review_type TEXT CHECK(review_type IN ('self', 'peer', 'ai', 'mentor')) DEFAULT 'peer',
      rubric_id INTEGER,
      status TEXT CHECK(status IN ('not_started', 'in_progress', 'submitted', 'under_review', 'revision_requested', 'approved', 'rejected', 'completed')) DEFAULT 'not_started',
      is_group_task INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (room_id) REFERENCES study_rooms(id) ON DELETE SET NULL,
      FOREIGN KEY (rubric_id) REFERENCES review_rubrics(id) ON DELETE SET NULL
    );

    -- Study Task Assignments
    CREATE TABLE IF NOT EXISTS study_task_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      status TEXT CHECK(status IN ('assigned', 'in_progress', 'completed')) DEFAULT 'assigned',
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      UNIQUE(task_id, user_id),
      FOREIGN KEY (task_id) REFERENCES study_tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Submissions
    CREATE TABLE IF NOT EXISTS study_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      current_version INTEGER DEFAULT 1,
      status TEXT CHECK(status IN ('submitted', 'under_review', 'revision_requested', 'approved', 'rejected')) DEFAULT 'submitted',
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(task_id, user_id),
      FOREIGN KEY (task_id) REFERENCES study_tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Submission Versions (Versioning support)
    CREATE TABLE IF NOT EXISTS submission_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id INTEGER NOT NULL,
      version_number INTEGER NOT NULL,
      text_content TEXT DEFAULT '',
      link_url TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(submission_id, version_number),
      FOREIGN KEY (submission_id) REFERENCES study_submissions(id) ON DELETE CASCADE
    );

    -- Submission Attachments
    CREATE TABLE IF NOT EXISTS submission_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version_id INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      attachment_type TEXT CHECK(attachment_type IN ('image', 'multi_image', 'document', 'code')) DEFAULT 'image',
      FOREIGN KEY (version_id) REFERENCES submission_versions(id) ON DELETE CASCADE
    );

    -- Submission Reviews
    CREATE TABLE IF NOT EXISTS submission_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id INTEGER NOT NULL,
      version_id INTEGER NOT NULL,
      reviewer_id INTEGER,
      reviewer_type TEXT CHECK(reviewer_type IN ('self', 'peer', 'mentor', 'ai')) NOT NULL,
      overall_score REAL DEFAULT 0,
      status TEXT CHECK(status IN ('draft', 'submitted')) DEFAULT 'submitted',
      decision TEXT CHECK(decision IN ('approved', 'revision_requested', 'rejected')) NOT NULL,
      what_done_well TEXT DEFAULT '',
      what_needs_improvement TEXT DEFAULT '',
      specific_mistakes TEXT DEFAULT '',
      suggested_next_steps TEXT DEFAULT '',
      learning_resources TEXT DEFAULT '',
      general_comments TEXT DEFAULT '',
      is_ai_review INTEGER DEFAULT 0,
      ai_confidence REAL DEFAULT 0,
      ai_disclaimer TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (submission_id) REFERENCES study_submissions(id) ON DELETE CASCADE,
      FOREIGN KEY (version_id) REFERENCES submission_versions(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Criterion-Specific Review Comments & Scores
    CREATE TABLE IF NOT EXISTS review_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      review_id INTEGER NOT NULL,
      criterion_id INTEGER NOT NULL,
      score INTEGER NOT NULL,
      comment TEXT DEFAULT '',
      FOREIGN KEY (review_id) REFERENCES submission_reviews(id) ON DELETE CASCADE,
      FOREIGN KEY (criterion_id) REFERENCES review_criteria(id) ON DELETE CASCADE
    );

    -- Feedback Threads
    CREATE TABLE IF NOT EXISTS feedback_threads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id INTEGER NOT NULL,
      version_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      status TEXT CHECK(status IN ('open', 'resolved')) DEFAULT 'open',
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (submission_id) REFERENCES study_submissions(id) ON DELETE CASCADE,
      FOREIGN KEY (version_id) REFERENCES submission_versions(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Feedback Messages
    CREATE TABLE IF NOT EXISTS feedback_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      thread_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      is_helpful_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (thread_id) REFERENCES feedback_threads(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Feedback Helpful Votes
    CREATE TABLE IF NOT EXISTS feedback_helpful_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(message_id, user_id),
      FOREIGN KEY (message_id) REFERENCES feedback_messages(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Chat Rooms (Study Room or Task Discussions)
    CREATE TABLE IF NOT EXISTS chat_rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_type TEXT CHECK(room_type IN ('study_room', 'task_discussion', 'direct')) NOT NULL,
      reference_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(room_type, reference_id)
    );

    -- Chat Messages
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_room_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      parent_id INTEGER,
      content TEXT NOT NULL,
      mentions TEXT DEFAULT '[]',
      is_pinned INTEGER DEFAULT 0,
      is_solution INTEGER DEFAULT 0,
      is_helpful_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (chat_room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES chat_messages(id) ON DELETE SET NULL
    );

    -- Message Attachments
    CREATE TABLE IF NOT EXISTS message_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE
    );

    -- Study Challenges
    CREATE TABLE IF NOT EXISTS study_challenges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER,
      task_id INTEGER,
      creator_id INTEGER,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      challenge_scope TEXT CHECK(challenge_scope IN ('self', 'group', 'friends')) DEFAULT 'group',
      time_limit_minutes INTEGER DEFAULT 30,
      min_score REAL DEFAULT 4.0,
      target_criteria TEXT DEFAULT '',
      xp_reward INTEGER DEFAULT 100,
      status TEXT CHECK(status IN ('active', 'completed', 'expired')) DEFAULT 'active',
      duration_type TEXT DEFAULT 'daily',
      has_timer INTEGER DEFAULT 1,
      scheduled_date TEXT,
      start_date DATETIME,
      end_date DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (room_id) REFERENCES study_rooms(id) ON DELETE CASCADE,
      FOREIGN KEY (task_id) REFERENCES study_tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Study Challenge Participants
    CREATE TABLE IF NOT EXISTS study_challenge_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      challenge_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      status TEXT CHECK(status IN ('joined', 'in_progress', 'completed', 'failed')) DEFAULT 'joined',
      started_at DATETIME,
      time_taken_seconds INTEGER DEFAULT 0,
      score_achieved REAL DEFAULT 0,
      progress REAL DEFAULT 0.0,
      is_completed INTEGER DEFAULT 0,
      completed_at DATETIME,
      UNIQUE(challenge_id, user_id),
      FOREIGN KEY (challenge_id) REFERENCES study_challenges(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Friendships & Study Buddies
    CREATE TABLE IF NOT EXISTS friendships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      friend_id INTEGER NOT NULL,
      status TEXT CHECK(status IN ('pending', 'accepted', 'blocked')) DEFAULT 'accepted',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, friend_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Gamification: XP Transactions Ledger (Immutable Audit Log)
    CREATE TABLE IF NOT EXISTS xp_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      reason TEXT NOT NULL,
      category TEXT CHECK(category IN ('task_completed', 'submission_approved', 'revision_improvement', 'peer_review', 'doubt_resolved', 'study_session', 'streak_milestone', 'challenge_completed', 'penalty', 'reversal')) NOT NULL,
      ref_type TEXT,
      ref_id INTEGER,
      audited_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (audited_by) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Level Definitions
    CREATE TABLE IF NOT EXISTS level_definitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level_number INTEGER UNIQUE NOT NULL,
      title TEXT NOT NULL,
      min_xp INTEGER NOT NULL,
      badge_icon TEXT DEFAULT 'award'
    );

    -- Daily Streak Records
    CREATE TABLE IF NOT EXISTS streak_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category TEXT CHECK(category IN ('overall', 'study', 'habit', 'subject')) NOT NULL,
      current_streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      last_activity_date TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, category),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Daily Activity Logs (Persistent proof of daily work for streaks)
    CREATE TABLE IF NOT EXISTS daily_activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      activity_date TEXT NOT NULL,
      activity_type TEXT NOT NULL,
      ref_id INTEGER,
      count INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, category, activity_date, activity_type, ref_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Learning Achievements
    CREATE TABLE IF NOT EXISTS learning_achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      icon TEXT DEFAULT 'trophy',
      criteria_type TEXT NOT NULL,
      criteria_threshold INTEGER DEFAULT 1,
      xp_reward INTEGER DEFAULT 50
    );

    -- User Achievements
    CREATE TABLE IF NOT EXISTS user_achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      achievement_id INTEGER NOT NULL,
      unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, achievement_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (achievement_id) REFERENCES learning_achievements(id) ON DELETE CASCADE
    );

    -- Reported Messages (Moderation & safety)
    CREATE TABLE IF NOT EXISTS reported_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL,
      reporter_id INTEGER NOT NULL,
      reason TEXT NOT NULL,
      status TEXT CHECK(status IN ('pending', 'reviewed', 'dismissed', 'actioned')) DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE,
      FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- XP Appeals (For disputed penalties or reversals)
    CREATE TABLE IF NOT EXISTS appeals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      xp_transaction_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      reason TEXT NOT NULL,
      status TEXT CHECK(status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
      reviewed_by INTEGER,
      review_notes TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (xp_transaction_id) REFERENCES xp_transactions(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Notifications
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link TEXT DEFAULT '',
      is_read INTEGER DEFAULT 0,
      read_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Notification Preferences
    CREATE TABLE IF NOT EXISTS notification_preferences (
      user_id INTEGER PRIMARY KEY,
      email_enabled INTEGER DEFAULT 1,
      session_reminders INTEGER DEFAULT 1,
      task_updates INTEGER DEFAULT 1,
      review_alerts INTEGER DEFAULT 1,
      chat_mentions INTEGER DEFAULT 1,
      streak_alerts INTEGER DEFAULT 1,
      friend_activity_alerts INTEGER DEFAULT 1,
      challenge_alerts INTEGER DEFAULT 1,
      quiet_hours_enabled INTEGER DEFAULT 0,
      quiet_hours_start TEXT DEFAULT '22:00',
      quiet_hours_end TEXT DEFAULT '07:00',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Indexes for high-frequency queries
    CREATE INDEX IF NOT EXISTS idx_sessions_user_status ON study_sessions(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_tasks_room_status ON study_tasks(room_id, status);
    CREATE INDEX IF NOT EXISTS idx_tasks_creator ON study_tasks(creator_id);
    CREATE INDEX IF NOT EXISTS idx_submissions_task ON study_submissions(task_id);
    CREATE INDEX IF NOT EXISTS idx_xp_user ON xp_transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_date ON daily_activity_logs(user_id, activity_date);
    CREATE INDEX IF NOT EXISTS idx_chat_room_time ON chat_messages(chat_room_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id, friend_id);
  `);

  runMigrations();
  seedData();
}

function runMigrations() {
  try {
    const taskCols = db.prepare('PRAGMA table_info(study_tasks)').all().map(c => c.name);
    if (!taskCols.includes('topics_checklist')) {
      db.exec("ALTER TABLE study_tasks ADD COLUMN topics_checklist TEXT DEFAULT '[]';");
    }
    if (!taskCols.includes('duration_days')) {
      db.exec("ALTER TABLE study_tasks ADD COLUMN duration_days INTEGER DEFAULT 0;");
    }
    if (!taskCols.includes('timer_started_at')) {
      db.exec("ALTER TABLE study_tasks ADD COLUMN timer_started_at DATETIME;");
    }

    const challengeCols = db.prepare('PRAGMA table_info(study_challenges)').all().map(c => c.name);
    if (!challengeCols.includes('task_id')) {
      db.exec('ALTER TABLE study_challenges ADD COLUMN task_id INTEGER;');
    }
    db.exec('CREATE INDEX IF NOT EXISTS idx_challenges_task ON study_challenges(task_id);');
    if (!challengeCols.includes('creator_id')) {
      db.exec('ALTER TABLE study_challenges ADD COLUMN creator_id INTEGER;');
    }
    if (!challengeCols.includes('challenge_scope')) {
      db.exec("ALTER TABLE study_challenges ADD COLUMN challenge_scope TEXT DEFAULT 'group';");
    }
    if (!challengeCols.includes('time_limit_minutes')) {
      db.exec('ALTER TABLE study_challenges ADD COLUMN time_limit_minutes INTEGER DEFAULT 30;');
    }
    if (!challengeCols.includes('min_score')) {
      db.exec('ALTER TABLE study_challenges ADD COLUMN min_score REAL DEFAULT 4.0;');
    }
    if (!challengeCols.includes('status')) {
      db.exec("ALTER TABLE study_challenges ADD COLUMN status TEXT DEFAULT 'active';");
    }
    if (!challengeCols.includes('duration_type')) {
      db.exec("ALTER TABLE study_challenges ADD COLUMN duration_type TEXT DEFAULT 'daily';");
    }
    if (!challengeCols.includes('has_timer')) {
      db.exec("ALTER TABLE study_challenges ADD COLUMN has_timer INTEGER DEFAULT 1;");
    }
    if (!challengeCols.includes('scheduled_date')) {
      db.exec("ALTER TABLE study_challenges ADD COLUMN scheduled_date TEXT;");
    }

    const partCols = db.prepare('PRAGMA table_info(study_challenge_participants)').all().map(c => c.name);
    if (!partCols.includes('status')) {
      db.exec("ALTER TABLE study_challenge_participants ADD COLUMN status TEXT DEFAULT 'joined';");
    }
    if (!partCols.includes('started_at')) {
      db.exec('ALTER TABLE study_challenge_participants ADD COLUMN started_at DATETIME;');
    }
    if (!partCols.includes('time_taken_seconds')) {
      db.exec('ALTER TABLE study_challenge_participants ADD COLUMN time_taken_seconds INTEGER DEFAULT 0;');
    }
    if (!partCols.includes('score_achieved')) {
      db.exec('ALTER TABLE study_challenge_participants ADD COLUMN score_achieved REAL DEFAULT 0;');
    }

    const notifPrefCols = db.prepare('PRAGMA table_info(notification_preferences)').all().map(c => c.name);
    if (!notifPrefCols.includes('friend_activity_alerts')) {
      db.exec('ALTER TABLE notification_preferences ADD COLUMN friend_activity_alerts INTEGER DEFAULT 1;');
    }

    // Refresh study_room_memberships check constraint for pending status
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS study_room_memberships_v2 (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          room_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          role TEXT CHECK(role IN ('owner', 'moderator', 'member')) DEFAULT 'member',
          status TEXT CHECK(status IN ('active', 'invited', 'muted', 'banned', 'pending')) DEFAULT 'active',
          joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(room_id, user_id),
          FOREIGN KEY (room_id) REFERENCES study_rooms(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        INSERT OR IGNORE INTO study_room_memberships_v2 SELECT * FROM study_room_memberships;
        DROP TABLE study_room_memberships;
        ALTER TABLE study_room_memberships_v2 RENAME TO study_room_memberships;
      `);
    } catch (e) {
      // Table may already be updated
    }
    if (!notifPrefCols.includes('challenge_alerts')) {
      db.exec('ALTER TABLE notification_preferences ADD COLUMN challenge_alerts INTEGER DEFAULT 1;');
    }

    db.exec(`
      DROP TABLE IF EXISTS user_follows;

      CREATE TABLE IF NOT EXISTS password_resets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        code TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        used INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_resets_email ON password_resets(email);

      -- Deduplicate any reciprocal friendships so strictly one connection exists per friend pair
      DELETE FROM friendships
      WHERE id NOT IN (
        SELECT MIN(id)
        FROM friendships
        GROUP BY MIN(user_id, friend_id), MAX(user_id, friend_id)
      );
    `);
  } catch (e) {
    console.error('Migration notice:', e.message);
  }
}

function seedData() {
  // Check if level_definitions exists
  const existingLevels = db.prepare('SELECT COUNT(*) as count FROM level_definitions').get();
  if (existingLevels.count === 0) {
    const levels = [
      { level: 1, title: 'Novice Explorer', xp: 0, icon: 'seed' },
      { level: 2, title: 'Curious Learner', xp: 100, icon: 'compass' },
      { level: 3, title: 'Diligent Student', xp: 250, icon: 'book-open' },
      { level: 4, title: 'Active Scholar', xp: 450, icon: 'feather' },
      { level: 5, title: 'Critical Thinker', xp: 700, icon: 'brain' },
      { level: 6, title: 'Collaborator', xp: 1000, icon: 'users' },
      { level: 7, title: 'Peer Mentor', xp: 1400, icon: 'award' },
      { level: 8, title: 'Knowledge Architect', xp: 1900, icon: 'layers' },
      { level: 9, title: 'Master Strategist', xp: 2500, icon: 'zap' },
      { level: 10, title: 'Consta Grandmaster', xp: 3500, icon: 'crown' }
    ];

    const insertLevel = db.prepare('INSERT INTO level_definitions (level_number, title, min_xp, badge_icon) VALUES (?, ?, ?, ?)');
    for (const l of levels) {
      insertLevel.run(l.level, l.title, l.xp, l.icon);
    }
  }

  // Seed Rubrics
  const existingRubrics = db.prepare('SELECT COUNT(*) as count FROM review_rubrics').get();
  if (existingRubrics.count === 0) {
    const rubRes = db.prepare(`
      INSERT INTO review_rubrics (title, description, subject, is_default)
      VALUES (?, ?, ?, 1)
    `).run(
      'Standard Comprehensive Learning Rubric',
      'Configurable rubric assessing correctness, completeness, clarity of explanation, methodology, and adherence to requirements.',
      'General'
    );
    const rubricId = Number(rubRes.lastInsertRowid);

    const criteria = [
      { title: 'Correctness', desc: 'Accuracy of the final solution, calculations, or thesis.', max: 5, weight: 1.2 },
      { title: 'Completeness', desc: 'Addresses all sub-questions and requirements stated in the task.', max: 5, weight: 1.0 },
      { title: 'Clarity of Explanation', desc: 'Well-structured, legible, clear terminology and stepwise reasoning.', max: 5, weight: 1.0 },
      { title: 'Method & Reasoning', desc: 'Sound approach, logical flow, derivation steps, or code design.', max: 5, weight: 1.0 },
      { title: 'Adherence to Requirements', desc: 'Follows requested format, citation, and constraints.', max: 5, weight: 0.8 },
      { title: 'Evidence & Verification', desc: 'Provides screenshots, proof of execution, or working examples.', max: 5, weight: 1.0 }
    ];

    const insertCrit = db.prepare('INSERT INTO review_criteria (rubric_id, title, description, max_score, weight) VALUES (?, ?, ?, ?, ?)');
    for (const c of criteria) {
      insertCrit.run(rubricId, c.title, c.desc, c.max, c.weight);
    }
  }

  // Seed Achievements
  const existingAchievements = db.prepare('SELECT COUNT(*) as count FROM learning_achievements').get();
  if (existingAchievements.count === 0) {
    const achievements = [
      { code: 'FIRST_SESSION', title: 'First Steps', desc: 'Completed your first solo study session with learning objectives.', cat: 'session', icon: 'zap', type: 'session_completed', thresh: 1, xp: 50 },
      { code: 'FIRST_SUBMISSION', title: 'Work in the Open', desc: 'Submitted your first study task answer for review.', cat: 'submission', icon: 'send', type: 'submission_made', thresh: 1, xp: 50 },
      { code: 'FIRST_APPROVED', title: 'Stamp of Quality', desc: 'Received an approved peer or mentor review.', cat: 'submission', icon: 'check-circle', type: 'submission_approved', thresh: 1, xp: 75 },
      { code: 'REVISION_CHAMP', title: 'Growth Mindset', desc: 'Successfully revised and improved a task after feedback.', cat: 'feedback', icon: 'refresh-cw', type: 'revision_approved', thresh: 1, xp: 60 },
      { code: 'PEER_REVIEWER', title: 'Helpful Colleague', desc: 'Provided 3 constructive peer reviews with rubric evaluations.', cat: 'review', icon: 'eye', type: 'peer_review_given', thresh: 3, xp: 90 },
      { code: 'STREAK_7', title: 'Week of Dedication', desc: 'Maintained a 7-day study streak.', cat: 'streak', icon: 'flame', type: 'streak_days', thresh: 7, xp: 120 },
      { code: 'STREAK_30', title: 'Unstoppable Momentum', desc: 'Maintained a 30-day study streak.', cat: 'streak', icon: 'award', type: 'streak_days', thresh: 30, xp: 300 },
      { code: 'DOUBT_SOLVER', title: 'Community Pillar', desc: 'Had your answer marked as helpful or accepted solution.', cat: 'chat', icon: 'help-circle', type: 'doubt_resolved', thresh: 1, xp: 60 }
    ];

    const insertAch = db.prepare('INSERT INTO learning_achievements (code, title, description, category, icon, criteria_type, criteria_threshold, xp_reward) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    for (const a of achievements) {
      insertAch.run(a.code, a.title, a.desc, a.cat, a.icon, a.type, a.thresh, a.xp);
    }
  }

  // Restore and maintain persistent registered users across container restarts & redeployments
  userBackupService.restoreUsersToDb(db);
}

function clearAllUserData() {
  db.exec(`
    PRAGMA foreign_keys = OFF;
    DELETE FROM study_challenge_participants;
    DELETE FROM study_challenges;
    DELETE FROM message_attachments;
    DELETE FROM chat_messages;
    DELETE FROM chat_rooms;
    DELETE FROM feedback_helpful_votes;
    DELETE FROM feedback_messages;
    DELETE FROM feedback_threads;
    DELETE FROM review_comments;
    DELETE FROM submission_reviews;
    DELETE FROM submission_attachments;
    DELETE FROM submission_versions;
    DELETE FROM study_submissions;
    DELETE FROM study_task_assignments;
    DELETE FROM study_tasks;
    DELETE FROM study_room_memberships;
    DELETE FROM study_rooms;
    DELETE FROM study_session_objectives;
    DELETE FROM study_sessions;
    DELETE FROM xp_transactions;
    DELETE FROM user_achievements;
    DELETE FROM daily_activity_logs;
    DELETE FROM streak_records;
    DELETE FROM reported_messages;
    DELETE FROM appeals;
    DELETE FROM notifications;
    DELETE FROM notification_preferences;
    DELETE FROM password_resets;
    DELETE FROM friendships;
    DELETE FROM user_profiles;
    DELETE FROM users;
    DELETE FROM sqlite_sequence WHERE name NOT IN ('level_definitions', 'learning_achievements', 'review_rubrics', 'review_criteria');
    PRAGMA foreign_keys = ON;
  `);
}

initDatabase();

module.exports = {
  db,
  initDatabase,
  clearAllUserData
};
