const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const express = require('express');
const cors = require('cors');
const { db, clearAllUserData } = require('../src/db/database');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', require('../src/routes/auth'));
app.use('/api/study-sessions', require('../src/routes/study_sessions'));
app.use('/api/study-rooms', require('../src/routes/study_rooms'));
app.use('/api/study-tasks', require('../src/routes/study_tasks'));
app.use('/api/submissions', require('../src/routes/submissions'));
app.use('/api/chat', require('../src/routes/chat'));
app.use('/api/gamification', require('../src/routes/gamification'));
app.use('/api/streaks', require('../src/routes/streaks'));
app.use('/api/profile', require('../src/routes/profile'));
app.use('/api/analytics', require('../src/routes/analytics'));
app.use('/api/friends', require('../src/routes/friends'));
app.use('/api/challenges', require('../src/routes/challenges'));

const PORT = 5088;
const baseUrl = `http://localhost:${PORT}`;
let server;

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

let user1Token;
let user1Id;
let user2Token;
let user2Id;

test.before(async () => {
  clearAllUserData();
  await new Promise((resolve) => {
    server = app.listen(PORT, resolve);
  });
});

test.after(async () => {
  clearAllUserData();
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('1. Fresh database starts completely clean', () => {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const taskCount = db.prepare('SELECT COUNT(*) as count FROM study_tasks').get().count;
  const roomCount = db.prepare('SELECT COUNT(*) as count FROM study_rooms').get().count;
  const sessionCount = db.prepare('SELECT COUNT(*) as count FROM study_sessions').get().count;

  assert.strictEqual(userCount, 0, 'User table should be empty');
  assert.strictEqual(taskCount, 0, 'Task table should be empty');
  assert.strictEqual(roomCount, 0, 'Rooms table should be empty');
  assert.strictEqual(sessionCount, 0, 'Sessions table should be empty');
});

test('2. First user registers and gets isolated account with clean initial state', async () => {
  const res = await request('/api/auth/register', {
    method: 'POST',
    body: {
      username: 'alice_fresh',
      email: 'alice@example.com',
      password: 'Password123!',
      full_name: 'Alice Johnson'
    }
  });

  assert.strictEqual(res.status, 201);
  assert.ok(res.data.token);
  assert.strictEqual(res.data.user.username, 'alice_fresh');
  user1Token = res.data.token;
  user1Id = res.data.user.id;

  // Check Alice initial streaks and XP
  const streakRes = await request('/api/streaks', {
    headers: { Authorization: `Bearer ${user1Token}` }
  });
  assert.strictEqual(streakRes.status, 200);

  const xpRes = await request('/api/gamification/progression', {
    headers: { Authorization: `Bearer ${user1Token}` }
  });
  assert.strictEqual(xpRes.status, 200);
  assert.strictEqual(xpRes.data.level, 1);
  assert.strictEqual(xpRes.data.currentXp, 50); // Welcome XP
});

test('3. Alice opens Group Study -> receives auto-seeded starter cohorts with Discord chat & topic checklists', async () => {
  const res = await request('/api/study-rooms', {
    headers: { Authorization: `Bearer ${user1Token}` }
  });

  assert.strictEqual(res.status, 200);
  assert.ok(Array.isArray(res.data));
  assert.ok(res.data.length >= 4, 'Should contain 4 starter cohorts');

  const csGroup = res.data.find(r => r.subject === 'Computer Science');
  assert.ok(csGroup, 'CS cohort should exist');
  assert.strictEqual(csGroup.user_status, 'active', 'Alice should be active in primary cohort');
  assert.ok(csGroup.challenges.length > 0, 'Cohort should have active challenge with timer');

  // Fetch details of CS cohort
  const detailRes = await request(`/api/study-rooms/${csGroup.id}`, {
    headers: { Authorization: `Bearer ${user1Token}` }
  });

  assert.strictEqual(detailRes.status, 200);
  assert.strictEqual(detailRes.data.room.name, 'Computer Science & Engineering Cohort');
  assert.ok(detailRes.data.isMember);
  assert.ok(detailRes.data.tasks.length > 0, 'Group should have admin task');

  const adminTask = detailRes.data.tasks[0];
  assert.ok(Array.isArray(adminTask.topics_checklist), 'Task should have topics checklist');
  assert.strictEqual(adminTask.topics_checklist.length, 3, 'Should have 3 starter topics');
  assert.strictEqual(adminTask.duration_days, 3, 'Should have 3 days duration timer');

  // Verify Discord chat room exists and has starter message
  assert.ok(detailRes.data.chatRoomId, 'Room should have a linked chat room');
  const chatRes = await request(`/api/chat/${detailRes.data.chatRoomId}/messages`, {
    headers: { Authorization: `Bearer ${user1Token}` }
  });

  assert.strictEqual(chatRes.status, 200);
  assert.ok(Array.isArray(chatRes.data));
  assert.ok(chatRes.data.length > 0, 'Chat should have welcome message');
});

test('4. Alice can toggle topics on Admin task', async () => {
  const tasksRes = await request('/api/study-tasks', {
    headers: { Authorization: `Bearer ${user1Token}` }
  });

  const groupTask = tasksRes.data.find(t => t.duration_days === 3);
  assert.ok(groupTask, 'Admin group task found');

  const topicToToggle = groupTask.topics_checklist[0];
  const toggleRes = await request(`/api/study-tasks/${groupTask.id}/topics/${topicToToggle.id}/toggle`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${user1Token}` }
  });

  assert.strictEqual(toggleRes.status, 200);
  const updated = toggleRes.data.topics_checklist.find(t => String(t.id) === String(topicToToggle.id));
  assert.strictEqual(updated.completed, true, 'Topic checkbox should now be toggled to completed');
});

test('5. Alice starts a Solo Study Session with checklist objectives', async () => {
  const sessionRes = await request('/api/study-sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${user1Token}` },
    body: {
      subject: 'Computer Science',
      topic: 'Graph Algorithms',
      learning_goal: 'Understand Dijkstra and Bellman-Ford',
      target_duration_minutes: 25,
      break_intervals_minutes: 5,
      start_immediately: true,
      objectives: ['Implement adjacency list', 'Write priority queue relaxation']
    }
  });

  assert.strictEqual(sessionRes.status, 201);
  assert.strictEqual(sessionRes.data.session.status, 'active');
  assert.strictEqual(sessionRes.data.objectives.length, 2);
});

test('6. Second user registers -> has independent isolated space, can join public cohorts', async () => {
  const res = await request('/api/auth/register', {
    method: 'POST',
    body: {
      username: 'bob_fresh',
      email: 'bob@example.com',
      password: 'Password123!',
      full_name: 'Bob Smith'
    }
  });

  assert.strictEqual(res.status, 201);
  user2Token = res.data.token;
  user2Id = res.data.user.id;

  // Bob has zero tasks of his own
  const bobTasks = await request('/api/study-tasks?created_by_me=true', {
    headers: { Authorization: `Bearer ${user2Token}` }
  });

  assert.strictEqual(bobTasks.status, 200);
  assert.strictEqual(bobTasks.data.length, 0, 'Bob should have 0 personal tasks');

  // Bob can view and join cohorts
  const roomsRes = await request('/api/study-rooms', {
    headers: { Authorization: `Bearer ${user2Token}` }
  });

  assert.strictEqual(roomsRes.status, 200);
  assert.ok(roomsRes.data.length >= 4);

  // Bob can post in the cohort Discord chat
  const mathGroup = roomsRes.data.find(r => r.subject === 'Mathematics');
  const mathDetail = await request(`/api/study-rooms/${mathGroup.id}`, {
    headers: { Authorization: `Bearer ${user2Token}` }
  });

  const postMsgRes = await request(`/api/chat/${mathDetail.data.chatRoomId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${user2Token}` },
    body: { content: 'Hello cohort! Bob here ready to solve proofs.' }
  });

  assert.strictEqual(postMsgRes.status, 201);
  assert.strictEqual(postMsgRes.data.content, 'Hello cohort! Bob here ready to solve proofs.');
});

test('7. Bob can exit a study group cleanly', async () => {
  const roomsRes = await request('/api/study-rooms', {
    headers: { Authorization: `Bearer ${user2Token}` }
  });

  const activeRoom = roomsRes.data.find(r => r.user_status === 'active' && r.user_role !== 'owner');
  if (activeRoom) {
    const leaveRes = await request(`/api/study-rooms/${activeRoom.id}/leave`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${user2Token}` }
    });

    assert.strictEqual(leaveRes.status, 200);

    // Verify Bob is no longer a member
    const checkRes = await request(`/api/study-rooms/${activeRoom.id}`, {
      headers: { Authorization: `Bearer ${user2Token}` }
    });

    assert.strictEqual(checkRes.data.isMember, false, 'Bob should no longer be a member after leaving');
  }
});

test('8. Analytics and Personal Progress are strictly isolated per user', async () => {
  const aliceAnalytics = await request('/api/analytics/personal', {
    headers: { Authorization: `Bearer ${user1Token}` }
  });

  const bobAnalytics = await request('/api/analytics/personal', {
    headers: { Authorization: `Bearer ${user2Token}` }
  });

  assert.strictEqual(aliceAnalytics.status, 200);
  assert.strictEqual(bobAnalytics.status, 200);

  // Alice has 1 session, Bob has 0 sessions
  assert.strictEqual(aliceAnalytics.data.overview.totalSessions, 1);
  assert.strictEqual(bobAnalytics.data.overview.totalSessions, 0);
});
