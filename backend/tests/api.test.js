process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { app, server } = require('../src/server');
const { db, clearAllUserData } = require('../src/db/database');
const XPService = require('../src/services/xp_service');
const StreakService = require('../src/services/streak_service');
const AIReviewService = require('../src/services/ai_review_service');

const PORT = 5099;
let baseUrl = `http://localhost:${PORT}`;

async function request(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

test.before(async () => {
  const bcrypt = require('bcryptjs');
  const pwHash = bcrypt.hashSync('password123', 8);

  const testUsers = [
    { username: 'alex_learner', email: 'alex@consta.edu', name: 'Mohit Kumar', role: 'student', tz: 'UTC' },
    { username: 'sam_study', email: 'sam@consta.edu', name: 'Sam Chen', role: 'student', tz: 'UTC' },
    { username: 'jordan_mentor', email: 'jordan@consta.edu', name: 'Dr. Jordan Hayes', role: 'mentor', tz: 'UTC' },
    { username: 'dr_stone', email: 'dr_stone@consta.edu', name: 'Dr. Senku Ishigami', role: 'mentor', tz: 'UTC' }
  ];

  for (const u of testUsers) {
    let existing = db.prepare('SELECT id FROM users WHERE username = ?').get(u.username);
    if (!existing) {
      const res = db.prepare(`
        INSERT INTO users (username, email, password_hash, full_name, bio, role, timezone)
        VALUES (?, ?, ?, ?, 'Test Bio', ?, ?)
      `).run(u.username, u.email, pwHash, u.name, u.role, u.tz);
      existing = { id: Number(res.lastInsertRowid) };
    } else {
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(pwHash, existing.id);
    }
    db.prepare(`
      INSERT OR IGNORE INTO user_profiles (user_id, is_public, show_streak, show_xp, show_tasks, show_analytics)
      VALUES (?, 1, 1, 1, 1, 1)
    `).run(existing.id);
  }

  // Ensure friendship between alex and sam
  const alex = db.prepare('SELECT id FROM users WHERE username = ?').get('alex_learner');
  const sam = db.prepare('SELECT id FROM users WHERE username = ?').get('sam_study');
  if (alex && sam) {
    db.prepare("INSERT OR IGNORE INTO friendships (user_id, friend_id, status) VALUES (?, ?, 'accepted')").run(alex.id, sam.id);
    db.prepare("INSERT OR IGNORE INTO friendships (user_id, friend_id, status) VALUES (?, ?, 'accepted')").run(sam.id, alex.id);
  }

  // Clean prior test artifacts
  db.prepare('DELETE FROM appeals').run();
  db.prepare("UPDATE users SET full_name = 'Mohit Kumar' WHERE username = 'alex_learner'").run();

  await new Promise(resolve => server.listen(PORT, resolve));
});

test.after(async () => {
  await new Promise(resolve => server.close(resolve));
});

test('1. Health Check & Platform Meta', async () => {
  const res = await request('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.data.status, 'ok');
  assert.equal(res.data.platform, 'CONSTA Collaborative Study & Personal Growth Platform');
});

test('2. Authentication: Register and Login', async () => {
  const username = 'test_student_' + Date.now();
  const email = `${username}@example.com`;

  // Register
  const regRes = await request('/api/auth/register', {
    method: 'POST',
    body: {
      username,
      email,
      password: 'password123',
      full_name: 'Test Student',
      bio: 'Lifelong learner',
      role: 'student',
      timezone: 'UTC'
    }
  });

  assert.equal(regRes.status, 201);
  assert.ok(regRes.data.token);
  assert.equal(regRes.data.user.username, username);

  // Login
  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    body: { identifier: username, password: 'password123' }
  });
  assert.equal(loginRes.status, 200);
  assert.ok(loginRes.data.token);
});

test('3. Solo Study Session Workflow with Checklist Objectives', async () => {
  // Use seeded user alex_learner
  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    body: { identifier: 'alex_learner', password: 'password123' }
  });
  const token = loginRes.data.token;
  const authHeader = { Authorization: `Bearer ${token}` };

  // Create solo session
  const createRes = await request('/api/study-sessions', {
    method: 'POST',
    headers: authHeader,
    body: {
      subject: 'Algorithms',
      topic: 'Binary Search Trees & Balancing',
      learning_goal: 'Understand AVL rotations and height invariants',
      difficulty: 'Intermediate',
      target_duration_minutes: 30,
      break_intervals_minutes: 5,
      start_immediately: true,
      objectives: ['Derive rotation formulas', 'Implement insert operation', 'Trace AVL tree insertions']
    }
  });

  assert.equal(createRes.status, 201);
  const sessionId = createRes.data.session.id;
  assert.ok(sessionId);
  assert.equal(createRes.data.objectives.length, 3);

  // Complete objectives
  const obj1 = createRes.data.objectives[0];
  const objToggleRes = await request(`/api/study-sessions/${sessionId}/objectives/${obj1.id}`, {
    method: 'PUT',
    headers: authHeader,
    body: { is_completed: true }
  });
  assert.equal(objToggleRes.status, 200);
  assert.equal(objToggleRes.data.is_completed, 1);

  // Complete session
  const completeRes = await request(`/api/study-sessions/${sessionId}/complete`, {
    method: 'PUT',
    headers: authHeader,
    body: {
      actual_duration_seconds: 1800,
      notes: 'Successfully mastered single and double rotations.',
      problems_encountered: 'Double rotation index balancing required careful hand trace.'
    }
  });

  assert.equal(completeRes.status, 200);
  assert.equal(completeRes.data.session.status, 'completed');
  assert.ok(completeRes.data.xpAwarded > 0);
  assert.equal(completeRes.data.summary.objectivesCompleted, 1);
});

test('4. Group Study Room & Task Management', async () => {
  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    body: { identifier: 'dr_stone', password: 'password123' }
  });
  const token = loginRes.data.token;
  const authHeader = { Authorization: `Bearer ${token}` };

  // Create study room
  const roomRes = await request('/api/study-rooms', {
    method: 'POST',
    headers: authHeader,
    body: {
      name: 'Distributed Systems & Consensus Lab',
      subject: 'Computer Science',
      description: 'Studying Raft and Paxos protocols collaboratively.',
      objectives: 'Build a toy consensus cluster and analyze leader election invariants.',
      room_type: 'public'
    }
  });

  assert.equal(roomRes.status, 201);
  const roomId = roomRes.data.room.id;

  // Create a shared study task
  const taskRes = await request('/api/study-tasks', {
    method: 'POST',
    headers: authHeader,
    body: {
      title: 'Raft Leader Election State Diagram & Invariant Proof',
      instructions: 'Trace the state transitions: Follower -> Candidate -> Leader. Prove why election safety holds.',
      subject: 'Computer Science',
      topic: 'Distributed Consensus',
      room_id: roomId,
      priority: 'high',
      expected_outcome: 'Accurate state machine transition diagram and explanation of quorum voting.',
      allowed_submission_types: ['text', 'image', 'document', 'link'],
      review_type: 'peer',
      is_group_task: true,
      assigned_user_ids: [1, 2] // Alex and Sam
    }
  });

  assert.equal(taskRes.status, 201);
  const taskId = taskRes.data.id;
  assert.ok(taskId);
});

test('5. Multi-Version Submission & AI-Assisted Evaluation', async () => {
  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    body: { identifier: 'alex_learner', password: 'password123' }
  });
  const token = loginRes.data.token;
  const authHeader = { Authorization: `Bearer ${token}` };

  // Fetch tasks
  const tasksRes = await request('/api/study-tasks', { headers: authHeader });
  assert.ok(tasksRes.data.length > 0);
  const targetTask = tasksRes.data[0];

  // Submit answer v1
  const subRes = await request(`/api/submissions/${targetTask.id}/submit`, {
    method: 'POST',
    headers: authHeader,
    body: {
      text_content: 'Here is my complete solution: The invariant ensures that at most one candidate receives a majority of votes in any term.\n\n```python\ndef request_vote(term, candidate_id):\n    if term > current_term:\n        voted_for = candidate_id\n        return True\n    return False\n```\nStep-by-step trace demonstrates safety with 5 nodes quorum.',
      link_url: 'https://github.com/alex/raft-consensus-lab',
      notes: 'Initial draft covering election safety invariants and quorum math.'
    }
  });

  assert.equal(subRes.status, 201);
  const submissionId = subRes.data.submissionId;
  const versionId = subRes.data.version.id;
  assert.equal(subRes.data.version.version_number, 1);

  // Trigger AI-assisted review analysis
  const aiRes = await request('/api/reviews/ai-assist', {
    method: 'POST',
    headers: authHeader,
    body: { submission_id: submissionId, version_id: versionId }
  });

  assert.equal(aiRes.status, 200);
  assert.ok(aiRes.data.criteriaEvaluations.length > 0);
  assert.ok(aiRes.data.confidence > 0.5);
  assert.ok(aiRes.data.disclaimer.includes('ASSISTIVE AI REVIEW NOTICE'));
  assert.ok(aiRes.data.whatDoneWell);
});

test('6. Peer Review & Rubric Evaluation', async () => {
  // Reviewer: Sam reviews Alex's submission
  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    body: { identifier: 'sam_study', password: 'password123' }
  });
  const token = loginRes.data.token;
  const authHeader = { Authorization: `Bearer ${token}` };

  // Find Alex's submission
  const alexUser = db.prepare('SELECT id FROM users WHERE username = ?').get('alex_learner');
  const alexSub = db.prepare('SELECT * FROM study_submissions WHERE user_id = ? ORDER BY id DESC LIMIT 1').get(alexUser.id);
  assert.ok(alexSub);
  const alexVersion = db.prepare('SELECT * FROM submission_versions WHERE submission_id = ? ORDER BY version_number DESC LIMIT 1').get(alexSub.id);
  assert.ok(alexVersion);

  const reviewRes = await request('/api/reviews/submit', {
    method: 'POST',
    headers: authHeader,
    body: {
      submission_id: alexSub.id,
      version_id: alexVersion.id,
      reviewer_type: 'peer',
      decision: 'approved',
      what_done_well: 'Clear invariant formulation and great code snippet with quorum logic.',
      what_needs_improvement: 'Could further specify split vote timeout randomization.',
      specific_mistakes: 'None observed.',
      suggested_next_steps: 'Extend to log replication heartbeat simulation.',
      learning_resources: 'https://raft.github.io',
      general_comments: 'Excellent work meeting all task rubric criteria.',
      criterion_scores: [
        { criterion_id: 1, score: 5, comment: 'Flawless safety logic' },
        { criterion_id: 2, score: 5, comment: 'Addresses all components' },
        { criterion_id: 3, score: 5, comment: 'Clear code and formatting' },
        { criterion_id: 4, score: 5, comment: 'Sound reasoning' },
        { criterion_id: 5, score: 4, comment: 'Follows guidelines' },
        { criterion_id: 6, score: 5, comment: 'Github repository proof provided' }
      ]
    }
  });

  assert.equal(reviewRes.status, 201);
  assert.equal(reviewRes.data.decision, 'approved');

  // Verify task status updated to approved
  const updatedTask = db.prepare('SELECT status FROM study_tasks WHERE id = ?').get(alexSub.task_id);
  assert.equal(updatedTask.status, 'approved');
});

test('7. Doubt-Solving Chat & Solution Acceptance', async () => {
  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    body: { identifier: 'sam_study', password: 'password123' }
  });
  const token = loginRes.data.token;
  const authHeader = { Authorization: `Bearer ${token}` };

  // Post chat message in study room #1
  const chatRoom = db.prepare("SELECT id FROM chat_rooms WHERE reference_id = 1 AND room_type = 'study_room'").get();
  assert.ok(chatRoom);

  const postMsgRes = await request(`/api/chat/room/${chatRoom.id}/messages`, {
    method: 'POST',
    headers: authHeader,
    body: {
      content: 'How do we handle split-brain in Raft if two candidates timeout simultaneously?',
      mentions: ['dr_stone']
    }
  });

  assert.equal(postMsgRes.status, 201);
  const doubtMsgId = postMsgRes.data.id;

  // Dr. Stone replies with the solution
  const mentorLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { identifier: 'dr_stone', password: 'password123' }
  });
  const mentorToken = mentorLogin.data.token;

  const replyRes = await request(`/api/chat/room/${chatRoom.id}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${mentorToken}` },
    body: {
      content: 'Raft prevents persistent split votes by using randomized election timeouts (e.g., 150-300ms). This breaks symmetry and ensures one node will almost always time out first.',
      parent_id: doubtMsgId
    }
  });

  assert.equal(replyRes.status, 201);
  const replyId = replyRes.data.id;

  // Sam marks Dr. Stone\'s reply as accepted solution
  const solutionRes = await request(`/api/chat/messages/${replyId}/solution`, {
    method: 'POST',
    headers: authHeader
  });

  assert.equal(solutionRes.status, 200);
  assert.equal(solutionRes.data.is_solution, 1);
});

test('8. Gamification Ledger, Levels, and Penalty Safeguards', async () => {
  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    body: { identifier: 'alex_learner', password: 'password123' }
  });
  const token = loginRes.data.token;
  const authHeader = { Authorization: `Bearer ${token}` };

  // Progression metrics
  const progRes = await request('/api/gamification/progression', { headers: authHeader });
  assert.equal(progRes.status, 200);
  assert.ok(progRes.data.level >= 1);
  assert.ok(progRes.data.currentXp > 0);

  // Auditable ledger history
  const histRes = await request('/api/gamification/history', { headers: authHeader });
  assert.equal(histRes.status, 200);
  assert.ok(histRes.data.length > 0);
  for (const entry of histRes.data) {
    assert.ok(entry.reason);
    assert.ok(entry.category);
  }

  // Safeguard: Cannot deduct XP without a clear reason
  assert.throws(() => {
    XPService.deductXP(1, 20, '', 'penalty');
  }, /justification/);

  // Mentor applies audited moderation penalty
  const mentorLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { identifier: 'dr_stone', password: 'password123' }
  });
  const alexUser = db.prepare('SELECT id, full_name FROM users WHERE username = ?').get('alex_learner');
  const penRes = await request('/api/gamification/penalty', {
    method: 'POST',
    headers: { Authorization: `Bearer ${mentorLogin.data.token}` },
    body: {
      target_user_id: alexUser.id,
      amount: 10,
      reason: 'Confirmed test transaction adjustment for platform verification audit.'
    }
  });
  assert.equal(penRes.status, 200);

  // Alex files an appeal for this penalty
  const appealRes = await request('/api/gamification/appeal', {
    method: 'POST',
    headers: authHeader,
    body: {
      xp_transaction_id: penRes.data.transactionId,
      reason: 'This was an honest misinterpretation of testing guidelines.'
    }
  });
  assert.equal(appealRes.status, 201);
  assert.ok(appealRes.data.appealId);
});

test('9. Daily Streaks & Consistency Heatmap', async () => {
  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    body: { identifier: 'alex_learner', password: 'password123' }
  });
  const authHeader = { Authorization: `Bearer ${loginRes.data.token}` };

  const streaksRes = await request('/api/streaks', { headers: authHeader });
  assert.equal(streaksRes.status, 200);
  assert.ok(streaksRes.data.overall.current_streak >= 1);
  assert.ok(streaksRes.data.study.current_streak >= 1);

  const heatmapRes = await request('/api/streaks/heatmap', { headers: authHeader });
  assert.equal(heatmapRes.status, 200);
  assert.ok(typeof heatmapRes.data === 'object');

  const weeklyRes = await request('/api/streaks/weekly', { headers: authHeader });
  assert.equal(weeklyRes.status, 200);
  assert.equal(weeklyRes.data.length, 7);
});

test('10. Personal & Group Analytics Based on Real DB Records', async () => {
  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    body: { identifier: 'alex_learner', password: 'password123' }
  });
  const authHeader = { Authorization: `Bearer ${loginRes.data.token}` };

  const personalRes = await request('/api/analytics/personal', { headers: authHeader });
  assert.equal(personalRes.status, 200);
  assert.ok(personalRes.data.overview.totalSessions >= 1);
  assert.ok(personalRes.data.overview.tasksSubmitted >= 1);
  assert.ok(personalRes.data.overview.tasksApproved >= 1);

  const testRoom = db.prepare('SELECT id FROM study_rooms WHERE name = ?').get('Distributed Systems & Consensus Lab') || db.prepare('SELECT id FROM study_rooms ORDER BY id DESC LIMIT 1').get();
  const groupRes = await request(`/api/analytics/group/${testRoom ? testRoom.id : 1}`, { headers: authHeader });
  assert.equal(groupRes.status, 200);
  assert.ok(groupRes.data.members >= 1);
  assert.ok(groupRes.data.totalTasks >= 1);
});

test('11. Public Profile & Portfolio with Privacy Controls', async () => {
  // Public view without token
  const pubRes = await request('/api/profile/alex_learner');
  assert.equal(pubRes.status, 200);
  assert.equal(pubRes.data.user.username, 'alex_learner');
  assert.ok(pubRes.data.profile.is_public);
  assert.ok(pubRes.data.showcaseTasks.length > 0);
  assert.ok(pubRes.data.achievements);
  assert.ok(pubRes.data.timeline);
});

test('12. Push Notification to Friends When Starting Task', async () => {
  // Alex logs in and starts a task
  const alexLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { identifier: 'alex_learner', password: 'password123' }
  });
  const alexToken = alexLogin.data.token;

  // Alex starts task #1
  const startRes = await request('/api/study-tasks/1/start', {
    method: 'POST',
    headers: { Authorization: `Bearer ${alexToken}` }
  });
  assert.equal(startRes.status, 200);
  assert.equal(startRes.data.status, 'in_progress');
  assert.ok(startRes.data.notifiedFriendsCount > 0);

  // Sam logs in and checks notifications
  const samLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { identifier: 'sam_study', password: 'password123' }
  });
  const notifRes = await request('/api/notifications', {
    headers: { Authorization: `Bearer ${samLogin.data.token}` }
  });
  assert.equal(notifRes.status, 200);
  const friendAlert = notifRes.data.find(n => n.title.includes('Friend Started'));
  assert.ok(friendAlert, 'Friend should have received task start push notification');
  assert.ok(friendAlert.message.includes('started working on'));
});

test('13. Group and Self Challenge on Any Task with Friend Alerts', async () => {
  // Sam creates a Self Challenge on task #1
  const samLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { identifier: 'sam_study', password: 'password123' }
  });
  const samToken = samLogin.data.token;

  const selfChalRes = await request('/api/challenges', {
    method: 'POST',
    headers: { Authorization: `Bearer ${samToken}` },
    body: {
      task_id: 1,
      title: 'LIS Binary Search Speedrun',
      description: 'Implement patience sorting within 25 minutes error-free.',
      challenge_scope: 'self',
      time_limit_minutes: 25,
      xp_reward: 80
    }
  });
  assert.equal(selfChalRes.status, 201);
  const selfChallengeId = selfChalRes.data.id;

  // Sam starts the challenge -> Friend notifications should fire!
  const startChalRes = await request(`/api/challenges/${selfChallengeId}/start`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${samToken}` }
  });
  assert.equal(startChalRes.status, 200);
  assert.equal(startChalRes.data.status, 'in_progress');

  // Alex checks notifications for friend challenge alert
  const alexLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { identifier: 'alex_learner', password: 'password123' }
  });
  const alexNotifs = await request('/api/notifications', {
    headers: { Authorization: `Bearer ${alexLogin.data.token}` }
  });
  const chalAlert = alexNotifs.data.find(n => n.title.includes('Friend Started a Challenge'));
  assert.ok(chalAlert, 'Alex should receive friend challenge start notification');

  // Sam completes the challenge
  const compChalRes = await request(`/api/challenges/${selfChallengeId}/complete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${samToken}` },
    body: { time_taken_seconds: 1200, score_achieved: 5.0 }
  });
  assert.equal(compChalRes.status, 200);
  assert.equal(compChalRes.data.is_completed, 1);
  assert.equal(compChalRes.data.xpReward, 80);

  // Dr. Stone creates a Group Challenge on task #1 for room #1
  const mentorLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { identifier: 'dr_stone', password: 'password123' }
  });
  const groupChalRes = await request('/api/challenges', {
    method: 'POST',
    headers: { Authorization: `Bearer ${mentorLogin.data.token}` },
    body: {
      task_id: 1,
      room_id: 1,
      title: 'Cohort LIS Patience Sort Tournament',
      description: 'First to submit approved solution earns +100 bonus XP!',
      challenge_scope: 'group',
      time_limit_minutes: 60,
      xp_reward: 100
    }
  });
  assert.equal(groupChalRes.status, 201);
  assert.equal(groupChalRes.data.challenge_scope, 'group');
});

test('14. Password Reset via Email Flow', async () => {
  const testEmail = 'reset_user_' + Date.now() + '@example.com';
  const testUsername = 'reset_user_' + Date.now();
  
  // Register user
  await request('/api/auth/register', {
    method: 'POST',
    body: {
      username: testUsername,
      email: testEmail,
      password: 'oldPassword123',
      full_name: 'Reset Test'
    }
  });

  // Request reset code
  const forgotRes = await request('/api/auth/forgot-password', {
    method: 'POST',
    body: { email: testEmail }
  });
  assert.equal(forgotRes.status, 200);
  assert.ok(forgotRes.data.code);
  const code = forgotRes.data.code;

  // Reset password with code
  const resetRes = await request('/api/auth/reset-password', {
    method: 'POST',
    body: {
      email: testEmail,
      code,
      new_password: 'newPassword123'
    }
  });
  assert.equal(resetRes.status, 200);
  assert.equal(resetRes.data.success, true);

  // Try logging in with old password (should fail)
  const failedLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { identifier: testEmail, password: 'oldPassword123' }
  });
  assert.equal(failedLogin.status, 401);

  // Login with new password (should succeed)
  const successLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { identifier: testEmail, password: 'newPassword123' }
  });
  assert.equal(successLogin.status, 200);
  assert.ok(successLogin.data.token);
});

test('15. Weekly/Monthly Challenges, Group Deletion, Task Toggle & Deletion', async () => {
  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    body: { identifier: 'alex_learner', password: 'password123' }
  });
  const token = loginRes.data.token;

  // 1. Create a test group
  const createGroupRes = await request('/api/study-rooms', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: {
      name: 'Temp Test Group',
      subject: 'Computer Science',
      description: 'Group for testing delete and task schedule features'
    }
  });
  assert.equal(createGroupRes.status, 201);
  const roomId = createGroupRes.data.room.id;

  // 2. Add task to group
  const createTaskRes = await request('/api/study-tasks', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: {
      title: 'Group Milestone Task',
      instructions: 'Complete by Friday',
      subject: 'Computer Science',
      room_id: roomId,
      due_date: '2026-10-30',
      is_group_task: true
    }
  });
  assert.equal(createTaskRes.status, 201);
  const taskId = createTaskRes.data.id;

  // 3. Toggle task completion (Checkbox)
  const toggleRes = await request(`/api/study-tasks/${taskId}/toggle`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(toggleRes.status, 200);
  assert.equal(toggleRes.data.status, 'completed');
  assert.equal(toggleRes.data.is_completed, true);

  // 4. Create Weekly Challenge on task
  const weeklyChalRes = await request('/api/challenges', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: {
      task_id: taskId,
      room_id: roomId,
      title: '7-Day Weekly Mastery Challenge',
      duration_type: 'weekly',
      challenge_scope: 'group'
    }
  });
  assert.equal(weeklyChalRes.status, 201);
  assert.equal(weeklyChalRes.data.duration_type, 'weekly');

  // 5. Delete task
  const delTaskRes = await request(`/api/study-tasks/${taskId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(delTaskRes.status, 200);
  assert.equal(delTaskRes.data.success, true);

  // 6. Delete group
  const delGroupRes = await request(`/api/study-rooms/${roomId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(delGroupRes.status, 200);
  assert.equal(delGroupRes.data.success, true);
});

test('16. Private Group Join Request & Admin Approval Flow', async () => {
  // Admin creates private room
  const adminLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { identifier: 'alex_learner', password: 'password123' }
  });
  const adminToken = adminLogin.data.token;

  const privateRoomRes = await request('/api/study-rooms', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      name: 'Private Research Lab',
      subject: 'Algorithms',
      description: 'Exclusive research cohort',
      room_type: 'private'
    }
  });
  assert.equal(privateRoomRes.status, 201);
  const roomId = privateRoomRes.data.room.id;

  // Learner requests to join private room
  const learnerLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { identifier: 'sam_study', password: 'password123' }
  });
  const learnerToken = learnerLogin.data.token;

  const requestJoinRes = await request(`/api/study-rooms/${roomId}/join`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${learnerToken}` }
  });
  assert.equal(requestJoinRes.status, 200);
  assert.equal(requestJoinRes.data.status, 'pending');
  assert.equal(requestJoinRes.data.pendingApproval, true);

  // Admin checks room details and sees pending request
  const adminRoomDetails = await request(`/api/study-rooms/${roomId}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(adminRoomDetails.status, 200);
  assert.equal(adminRoomDetails.data.pendingRequests.length, 1);
  assert.equal(adminRoomDetails.data.pendingRequests[0].user_id, learnerLogin.data.user.id);

  // Admin approves join request
  const approveRes = await request(`/api/study-rooms/${roomId}/requests/${learnerLogin.data.user.id}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(approveRes.status, 200);
  assert.equal(approveRes.data.success, true);

  // Learner is now an active member
  const learnerRoomDetails = await request(`/api/study-rooms/${roomId}`, {
    headers: { Authorization: `Bearer ${learnerToken}` }
  });
  assert.equal(learnerRoomDetails.status, 200);
  assert.equal(learnerRoomDetails.data.isMember, true);
  assert.equal(learnerRoomDetails.data.isPending, false);
});

test('17. Group Challenge Scheduling for Date, Timer Configuration, and Deletion', async () => {
  const adminLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { identifier: 'alex_learner', password: 'password123' }
  });
  const adminToken = adminLogin.data.token;

  // Create room
  const roomRes = await request('/api/study-rooms', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      name: 'Scheduled Sprint Group',
      subject: 'Data Structures',
      room_type: 'public'
    }
  });
  assert.equal(roomRes.status, 201);
  const roomId = roomRes.data.room.id;

  // Schedule a challenge for a future date with timer
  const scheduledDateStr = '2026-10-25';
  const chalRes = await request('/api/challenges', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      room_id: roomId,
      title: 'Saturday Binary Tree Quest',
      challenge_scope: 'group',
      duration_type: 'weekly',
      scheduled_date: scheduledDateStr,
      time_limit_minutes: 45,
      has_timer: 1,
      min_score: 4.5,
      xp_reward: 250
    }
  });
  assert.equal(chalRes.status, 201);
  assert.equal(chalRes.data.scheduled_date, scheduledDateStr);
  assert.equal(chalRes.data.has_timer, 1);
  assert.equal(chalRes.data.time_limit_minutes, 45);
  const challengeId = chalRes.data.id;

  // Room details should include this challenge with scheduled date
  const roomDetails = await request(`/api/study-rooms/${roomId}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(roomDetails.status, 200);
  const foundChal = roomDetails.data.challenges.find(c => c.id === challengeId);
  assert.ok(foundChal, 'Group details should include the scheduled challenge');
  assert.equal(foundChal.scheduled_date, scheduledDateStr);
  assert.equal(foundChal.has_timer, 1);

  // Delete challenge
  const delChalRes = await request(`/api/challenges/${challengeId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(delChalRes.status, 200);
  assert.equal(delChalRes.data.success, true);
});

test.after(async () => {
  clearAllUserData();
  if (server && server.close) {
    server.close();
  }
});





