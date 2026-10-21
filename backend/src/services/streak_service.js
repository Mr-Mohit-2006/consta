const { db } = require('../db/database');
const XPService = require('./xp_service');

class StreakService {
  /**
   * Helper to format a date in a specific timezone as YYYY-MM-DD.
   */
  static getTodayDateString(timezone = 'UTC') {
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone || 'UTC',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      return formatter.format(now);
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  }

  /**
   * Get previous day date string in YYYY-MM-DD.
   */
  static getYesterdayDateString(todayStr) {
    const d = new Date(todayStr + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  /**
   * Record a verified activity and update category streak.
   * Duplicate activities on the same day are logged without falsely inflating the streak.
   */
  static recordActivity(userId, category, activityType, refId = null, timezone = 'UTC') {
    const validCategories = ['overall', 'study', 'habit', 'subject'];
    const cat = validCategories.includes(category) ? category : 'overall';
    const todayStr = this.getTodayDateString(timezone);

    // 1. Log the activity record in daily_activity_logs (ignore duplicates)
    try {
      db.prepare(`
        INSERT INTO daily_activity_logs (user_id, category, activity_date, activity_type, ref_id, count)
        VALUES (?, ?, ?, ?, ?, 1)
        ON CONFLICT(user_id, category, activity_date, activity_type, ref_id)
        DO UPDATE SET count = count + 1
      `).run(userId, cat, todayStr, activityType, refId);
    } catch (e) {
      // Ignore conflict error if any
    }

    // Also record in 'overall' if cat was 'study' or 'habit'
    if (cat !== 'overall') {
      try {
        db.prepare(`
          INSERT INTO daily_activity_logs (user_id, category, activity_date, activity_type, ref_id, count)
          VALUES (?, 'overall', ?, ?, ?, 1)
          ON CONFLICT(user_id, category, activity_date, activity_type, ref_id)
          DO UPDATE SET count = count + 1
        `).run(userId, todayStr, activityType, refId);
      } catch (e) {
        // Ignore
      }
      this.updateStreakRecord(userId, 'overall', todayStr);
    }

    // 2. Update streak record for this specific category
    return this.updateStreakRecord(userId, cat, todayStr);
  }

  static updateStreakRecord(userId, category, todayStr) {
    let streakRow = db.prepare(`
      SELECT * FROM streak_records WHERE user_id = ? AND category = ?
    `).get(userId, category);

    if (!streakRow) {
      db.prepare(`
        INSERT INTO streak_records (user_id, category, current_streak, longest_streak, last_activity_date)
        VALUES (?, ?, 1, 1, ?)
      `).run(userId, category, todayStr);

      this.checkMilestones(userId, category, 1);
      return { current_streak: 1, longest_streak: 1, last_activity_date: todayStr };
    }

    const lastDate = streakRow.last_activity_date;

    if (lastDate === todayStr) {
      // Already recorded for today; streak remains intact
      return streakRow;
    }

    const yesterdayStr = this.getYesterdayDateString(todayStr);

    let newCurrent = 1;
    if (lastDate === yesterdayStr) {
      // Consecutive day!
      newCurrent = streakRow.current_streak + 1;
    } else {
      // Gap detected; streak restarts at 1, but historical longest_streak is safely preserved!
      newCurrent = 1;
    }

    const newLongest = Math.max(streakRow.longest_streak, newCurrent);

    db.prepare(`
      UPDATE streak_records
      SET current_streak = ?, longest_streak = ?, last_activity_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND category = ?
    `).run(newCurrent, newLongest, todayStr, userId, category);

    this.checkMilestones(userId, category, newCurrent);

    return {
      current_streak: newCurrent,
      longest_streak: newLongest,
      last_activity_date: todayStr
    };
  }

  /**
   * Award milestone bonus XP and check achievements for streak consistency.
   */
  static checkMilestones(userId, category, streakDays) {
    const milestones = [
      { days: 3, xp: 30, code: 'STREAK_3' },
      { days: 7, xp: 75, code: 'STREAK_7' },
      { days: 14, xp: 150, code: 'STREAK_14' },
      { days: 30, xp: 350, code: 'STREAK_30' },
      { days: 60, xp: 600, code: 'STREAK_60' },
      { days: 100, xp: 1200, code: 'STREAK_100' }
    ];

    const match = milestones.find(m => m.days === streakDays);
    if (match) {
      XPService.awardXP(
        userId,
        match.xp,
        `🔥 ${streakDays}-Day ${category.toUpperCase()} Streak Milestone reached!`,
        'streak_milestone',
        'streak',
        streakDays
      );

      // Unlock learning achievement if exists
      const ach = db.prepare('SELECT id FROM learning_achievements WHERE code = ?').get(match.code);
      if (ach) {
        try {
          db.prepare(`
            INSERT OR IGNORE INTO user_achievements (user_id, achievement_id)
            VALUES (?, ?)
          `).run(userId, ach.id);
        } catch (e) {
          // ignore duplicate
        }
      }
    }
  }

  /**
   * Get all streaks for a user.
   */
  static getUserStreaks(userId) {
    const records = db.prepare('SELECT * FROM streak_records WHERE user_id = ?').all(userId);
    const map = {};
    for (const r of records) {
      map[r.category] = r;
    }
    return {
      overall: map.overall || { current_streak: 0, longest_streak: 0, last_activity_date: null },
      study: map.study || { current_streak: 0, longest_streak: 0, last_activity_date: null },
      habit: map.habit || { current_streak: 0, longest_streak: 0, last_activity_date: null },
      subject: map.subject || { current_streak: 0, longest_streak: 0, last_activity_date: null }
    };
  }

  /**
   * Get weekly activity calendar (past 7 days with counts).
   */
  static getWeeklyActivity(userId, timezone = 'UTC') {
    const todayStr = this.getTodayDateString(timezone);
    const days = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayStr + 'T12:00:00Z');
      d.setUTCDate(d.getUTCDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      days.push(dateStr);
    }

    const logs = db.prepare(`
      SELECT activity_date, category, SUM(count) as total_count
      FROM daily_activity_logs
      WHERE user_id = ? AND activity_date >= ?
      GROUP BY activity_date, category
    `).all(userId, days[0]);

    const resultMap = {};
    for (const day of days) {
      resultMap[day] = { date: day, total: 0, categories: {} };
    }

    for (const log of logs) {
      if (resultMap[log.activity_date]) {
        resultMap[log.activity_date].total += log.total_count;
        resultMap[log.activity_date].categories[log.category] = log.total_count;
      }
    }

    return Object.values(resultMap);
  }

  /**
   * Get monthly / 90-day consistency heatmap.
   */
  static getHeatmap(userId, daysBack = 90) {
    const logs = db.prepare(`
      SELECT activity_date, SUM(count) as total_count
      FROM daily_activity_logs
      WHERE user_id = ? AND activity_date >= date('now', '-' || ? || ' days')
      GROUP BY activity_date
      ORDER BY activity_date ASC
    `).all(userId, daysBack);

    const logMap = {};
    for (const l of logs) {
      logMap[l.activity_date] = l.total_count;
    }

    return logMap;
  }
}

module.exports = StreakService;
