const { db } = require('../db/database');
const StreakService = require('./streak_service');
const XPService = require('./xp_service');

class AnalyticsService {
  /**
   * Personal study analytics computed entirely from persistent DB records.
   */
  static getPersonalAnalytics(userId) {
    // 1. Session statistics
    const sessionStats = db.prepare(`
      SELECT 
        COUNT(*) as total_sessions,
        COALESCE(SUM(actual_duration_seconds), 0) as total_focus_seconds,
        COALESCE(AVG(actual_duration_seconds), 0) as avg_session_seconds,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions
      FROM study_sessions
      WHERE user_id = ?
    `).get(userId);

    // 2. Study time by subject
    const subjectBreakdown = db.prepare(`
      SELECT subject, 
             COUNT(*) as session_count,
             COALESCE(SUM(actual_duration_seconds), 0) as total_seconds
      FROM study_sessions
      WHERE user_id = ?
      GROUP BY subject
      ORDER BY total_seconds DESC
    `).all(userId);

    // 3. Task and submission statistics
    const taskStats = db.prepare(`
      SELECT 
        COUNT(DISTINCT s.id) as total_submitted,
        COUNT(DISTINCT CASE WHEN s.status = 'approved' THEN s.id END) as total_approved,
        COUNT(DISTINCT CASE WHEN s.status = 'revision_requested' THEN s.id END) as revisions_requested,
        COUNT(DISTINCT v.id) as total_versions_submitted
      FROM study_submissions s
      LEFT JOIN submission_versions v ON s.id = v.submission_id
      WHERE s.user_id = ?
    `).get(userId);

    // 4. Feedback received
    const feedbackStats = db.prepare(`
      SELECT 
        COUNT(DISTINCT r.id) as total_reviews_received,
        COALESCE(AVG(r.overall_score), 0) as avg_review_score,
        COUNT(DISTINCT m.id) as feedback_replies_count
      FROM study_submissions s
      LEFT JOIN submission_reviews r ON s.id = r.submission_id
      LEFT JOIN feedback_threads ft ON s.id = ft.submission_id
      LEFT JOIN feedback_messages m ON ft.id = m.thread_id
      WHERE s.user_id = ?
    `).get(userId);

    // 5. Streaks
    const streaks = StreakService.getUserStreaks(userId);

    // 6. XP breakdown (gained and lost)
    const xpBreakdown = db.prepare(`
      SELECT 
        category,
        COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as xp_gained,
        COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as xp_lost,
        COUNT(*) as transaction_count
      FROM xp_transactions
      WHERE user_id = ?
      GROUP BY category
    `).all(userId);

    // 7. Consistency trends (activity logs grouped by date over past 30 days)
    const consistencyLogs = db.prepare(`
      SELECT activity_date, category, SUM(count) as count
      FROM daily_activity_logs
      WHERE user_id = ? AND activity_date >= date('now', '-30 days')
      GROUP BY activity_date, category
      ORDER BY activity_date ASC
    `).all(userId);

    const progression = XPService.getUserProgression(userId);

    return {
      overview: {
        totalSessions: sessionStats.total_sessions,
        completedSessions: sessionStats.completed_sessions,
        totalFocusMinutes: Math.round(sessionStats.total_focus_seconds / 60),
        avgSessionMinutes: Math.round(sessionStats.avg_session_seconds / 60),
        tasksSubmitted: taskStats.total_submitted,
        tasksApproved: taskStats.total_approved,
        approvalRate: taskStats.total_submitted > 0 ? Math.round((taskStats.total_approved / taskStats.total_submitted) * 100) : 0,
        revisionsRequested: taskStats.revisions_requested,
        totalVersions: taskStats.total_versions_submitted,
        reviewsReceived: feedbackStats.total_reviews_received,
        avgReviewScore: Math.round(feedbackStats.avg_review_score * 10) / 10
      },
      streaks,
      progression,
      subjectBreakdown,
      xpBreakdown,
      consistencyLogs
    };
  }

  /**
   * Group study room analytics (permission-aware, privacy-preserving aggregate metrics).
   */
  static getGroupAnalytics(roomId, requestingUserId) {
    // Verify requester has access to this room
    const membership = db.prepare("SELECT role FROM study_room_memberships WHERE room_id = ? AND user_id = ? AND status = 'active'").get(roomId, requestingUserId);
    const room = db.prepare('SELECT room_type, owner_id FROM study_rooms WHERE id = ?').get(roomId);

    if (!room) throw new Error('Study room not found.');
    if (room.room_type !== 'public' && !membership && room.owner_id !== requestingUserId) {
      throw new Error('Access denied to private study room analytics.');
    }

    // 1. Members count and active participants
    const memberStats = db.prepare(`
      SELECT 
        COUNT(*) as total_members,
        COUNT(CASE WHEN role = 'moderator' OR role = 'owner' THEN 1 END) as facilitators_count
      FROM study_room_memberships
      WHERE room_id = ? AND status = 'active'
    `).get(roomId);

    // 2. Group sessions
    const sessionStats = db.prepare(`
      SELECT 
        COUNT(*) as total_sessions,
        COALESCE(SUM(actual_duration_seconds), 0) as total_group_seconds
      FROM study_sessions
      WHERE room_id = ?
    `).get(roomId);

    // 3. Shared task completion
    const taskStats = db.prepare(`
      SELECT 
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN status = 'completed' OR status = 'approved' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN status = 'in_progress' OR status = 'under_review' THEN 1 END) as active_tasks
      FROM study_tasks
      WHERE room_id = ?
    `).get(roomId);

    // 4. Submission review turnaround time (hours from submission to review)
    const turnaround = db.prepare(`
      SELECT 
        AVG((julianday(r.created_at) - julianday(v.submitted_at)) * 24) as avg_turnaround_hours
      FROM study_tasks t
      JOIN study_submissions s ON t.id = s.task_id
      JOIN submission_versions v ON s.id = v.submission_id
      JOIN submission_reviews r ON v.id = r.version_id
      WHERE t.room_id = ?
    `).get(roomId);

    // 5. Helpful contributions in discussions
    const helpfulContributions = db.prepare(`
      SELECT 
        COUNT(CASE WHEN is_solution = 1 THEN 1 END) as accepted_solutions,
        COALESCE(SUM(is_helpful_count), 0) as helpful_reactions
      FROM chat_rooms cr
      JOIN chat_messages cm ON cr.id = cm.chat_room_id
      WHERE cr.room_type = 'study_room' AND cr.reference_id = ?
    `).get(roomId);

    // 6. Challenges
    const challengeStats = db.prepare(`
      SELECT 
        COUNT(DISTINCT c.id) as total_challenges,
        COUNT(DISTINCT cp.user_id) as participants_count,
        COUNT(CASE WHEN cp.is_completed = 1 THEN 1 END) as completed_challenges
      FROM study_challenges c
      LEFT JOIN study_challenge_participants cp ON c.id = cp.challenge_id
      WHERE c.room_id = ?
    `).get(roomId);

    return {
      roomId,
      members: memberStats.total_members,
      facilitators: memberStats.facilitators_count,
      groupSessions: sessionStats.total_sessions,
      totalGroupFocusMinutes: Math.round(sessionStats.total_group_seconds / 60),
      totalTasks: taskStats.total_tasks,
      completedTasks: taskStats.completed_tasks,
      taskCompletionRate: taskStats.total_tasks > 0 ? Math.round((taskStats.completed_tasks / taskStats.total_tasks) * 100) : 0,
      avgReviewTurnaroundHours: turnaround.avg_turnaround_hours ? Math.round(turnaround.avg_turnaround_hours * 10) / 10 : null,
      acceptedSolutions: helpfulContributions.accepted_solutions,
      helpfulReactions: helpfulContributions.helpful_reactions,
      totalChallenges: challengeStats.total_challenges,
      completedChallenges: challengeStats.completed_challenges
    };
  }
}

module.exports = AnalyticsService;
