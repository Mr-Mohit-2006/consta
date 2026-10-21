const { db } = require('../db/database');

class XPService {
  /**
   * Award XP to a user with duplicate protection and audit logging.
   */
  static awardXP(userId, amount, reason, category, refType = null, refId = null, auditedBy = null) {
    if (amount <= 0) return null;

    // Duplicate check: if refType and refId are specified and category shouldn't repeat
    if (refType && refId !== null) {
      const existing = db.prepare(`
        SELECT id FROM xp_transactions 
        WHERE user_id = ? AND ref_type = ? AND ref_id = ? AND category = ?
      `).get(userId, refType, refId, category);

      if (existing) {
        // Prevent duplicate XP reward for the same event
        return null;
      }
    }

    const res = db.prepare(`
      INSERT INTO xp_transactions (user_id, amount, reason, category, ref_type, ref_id, audited_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, amount, reason, category, refType, refId, auditedBy);

    // Check if new XP triggers level-up or achievements
    this.checkUserLevelProgress(userId);

    return Number(res.lastInsertRowid);
  }

  /**
   * Deduct XP with strict safeguards and mandatory audited reason.
   */
  static deductXP(userId, amount, reason, category = 'penalty', refType = null, refId = null, auditedBy = null) {
    if (amount <= 0) return null;

    // Strict Safeguards:
    // Never allow deducting XP without a documented reason
    if (!reason || reason.trim().length < 5) {
      throw new Error('XP deductions require a clearly documented, auditable justification.');
    }

    const deduction = -Math.abs(amount);

    const res = db.prepare(`
      INSERT INTO xp_transactions (user_id, amount, reason, category, ref_type, ref_id, audited_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, deduction, reason, category, refType, refId, auditedBy);

    return Number(res.lastInsertRowid);
  }

  /**
   * Retrieve total current balance, lifetime earned XP, level, and progression details.
   */
  static getUserProgression(userId) {
    // Current available XP balance (sum of all positive and negative transactions)
    const balanceRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total_xp,
             COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as lifetime_xp
      FROM xp_transactions
      WHERE user_id = ?
    `).get(userId);

    const currentXp = Math.max(0, balanceRow.total_xp);
    const lifetimeXp = balanceRow.lifetime_xp;

    // Get all level definitions ordered by min_xp ascending
    const levels = db.prepare('SELECT * FROM level_definitions ORDER BY min_xp ASC').all();

    let currentLevel = levels[0] || { level_number: 1, title: 'Novice Explorer', min_xp: 0, badge_icon: 'seed' };
    let nextLevel = levels[1] || null;

    for (let i = 0; i < levels.length; i++) {
      if (lifetimeXp >= levels[i].min_xp) {
        currentLevel = levels[i];
        nextLevel = levels[i + 1] || null;
      } else {
        break;
      }
    }

    let progressPercentage = 100;
    let xpToNextLevel = 0;

    if (nextLevel) {
      const xpInCurrentBracket = lifetimeXp - currentLevel.min_xp;
      const bracketRange = nextLevel.min_xp - currentLevel.min_xp;
      progressPercentage = Math.min(100, Math.max(0, Math.round((xpInCurrentBracket / bracketRange) * 100)));
      xpToNextLevel = Math.max(0, nextLevel.min_xp - lifetimeXp);
    }

    return {
      userId,
      currentXp,
      lifetimeXp,
      level: currentLevel.level_number,
      title: currentLevel.title,
      badgeIcon: currentLevel.badge_icon,
      nextLevel: nextLevel ? {
        level: nextLevel.level_number,
        title: nextLevel.title,
        minXp: nextLevel.min_xp
      } : null,
      xpToNextLevel,
      progressPercentage
    };
  }

  /**
   * Get transaction history with pagination and details.
   */
  static getHistory(userId, limit = 25, offset = 0) {
    return db.prepare(`
      SELECT x.*, u.full_name as auditor_name
      FROM xp_transactions x
      LEFT JOIN users u ON x.audited_by = u.id
      WHERE x.user_id = ?
      ORDER BY x.created_at DESC
      LIMIT ? OFFSET ?
    `).all(userId, limit, offset);
  }

  /**
   * File an appeal for an XP penalty.
   */
  static fileAppeal(userId, transactionId, reason) {
    const tx = db.prepare('SELECT * FROM xp_transactions WHERE id = ? AND user_id = ?').get(transactionId, userId);
    if (!tx) {
      throw new Error('Transaction not found or unauthorized.');
    }
    if (tx.amount >= 0) {
      throw new Error('Appeals are only applicable to negative XP adjustments.');
    }

    const existingAppeal = db.prepare('SELECT id FROM appeals WHERE xp_transaction_id = ?').get(transactionId);
    if (existingAppeal) {
      throw new Error('An appeal has already been filed for this transaction.');
    }

    const res = db.prepare(`
      INSERT INTO appeals (xp_transaction_id, user_id, reason, status)
      VALUES (?, ?, ?, 'pending')
    `).run(transactionId, userId, reason);

    return Number(res.lastInsertRowid);
  }

  /**
   * Resolve an appeal (e.g. Mentor/Admin).
   */
  static resolveAppeal(appealId, status, reviewerId, notes) {
    const appeal = db.prepare('SELECT * FROM appeals WHERE id = ?').get(appealId);
    if (!appeal) throw new Error('Appeal not found.');

    db.prepare(`
      UPDATE appeals
      SET status = ?, reviewed_by = ?, review_notes = ?
      WHERE id = ?
    `).run(status, reviewerId, notes, appealId);

    // If accepted, reverse the original deduction
    if (status === 'accepted') {
      const originalTx = db.prepare('SELECT * FROM xp_transactions WHERE id = ?').get(appeal.xp_transaction_id);
      if (originalTx && originalTx.amount < 0) {
        const refundAmount = Math.abs(originalTx.amount);
        this.awardXP(
          appeal.user_id,
          refundAmount,
          `Appeal accepted: reversal of adjustment #${originalTx.id} - ${notes}`,
          'reversal',
          'appeal',
          appealId,
          reviewerId
        );
      }
    }

    return true;
  }

  /**
   * Checks for achievement triggers on XP gain.
   */
  static checkUserLevelProgress(userId) {
    const prog = this.getUserProgression(userId);
    // Auto-check any milestones if needed
    return prog;
  }
}

module.exports = XPService;
