# CONSTA: Collaborative Study and Personal Growth Module

Welcome to the **CONSTA** platform's extended **Study Mode** and Personal Growth ecosystem. This platform supports individual learning, collaborative cohorts, multi-version submissions, structured peer and mentor reviews, assistive AI assessments, doubt-solving discussions, transparent XP ledgers, and multi-category daily streaks.

---

## 🌟 Key Architecture & Modules

### 1. Solo Study Mode
- **Personal Focus Sessions**: Select subject, topic, learning goal, and difficulty level (*Beginner*, *Intermediate*, *Advanced*, *Expert*).
- **Duration vs. Learning Outcome Tracking**: Session timer duration is tracked separately from learning outcomes. Running a timer does not alone count as learning proof.
- **Checklist of Learning Objectives**: Interactive, persistent checklist; completing objectives awards verified study XP and consistency streak.
- **Problem Logger**: Dedicated field to log roadblocks, doubts, and difficult concepts encountered during learning.
- **AI Concept Explanations**: Instant pedagogical concept breakdowns with key principles and non-infallible disclaimers.
- **Session Summaries & History**: Daily historical records of focus time and objective completion.

### 2. Group Study & Cohorts
- **Study Rooms**: Create or join public, private (join code required), or invite-only cohorts.
- **Roles & Permissions**: Room owner, moderators, and active members.
- **Shared Tasks**: Assignments distributed across cohort members.
- **Group Discussion & Chat**: Integrated real-time room chat with threads and file attachments.
- **Participation & Turnaround Analytics**: Metrics on task completion, review latency, and accepted solutions without fabricating numbers. Membership alone does not award participation XP.

### 3. Study Tasks & Multi-Version Submissions
- **Task Lifecycle**: 8 distinct states: `not_started`, `in_progress`, `submitted`, `under_review`, `revision_requested`, `approved`, `rejected`, `completed`.
- **Multi-Format Submissions**:
  1. Text answers and derivations
  2. Images and screenshots of handwritten/digital work
  3. Multiple images for multi-page answers
  4. Document and PDF attachments (up to 15MB)
  5. Links to external projects or code repositories
- **Version History**: Submissions preserve `v1`, `v2`, `v3`... revisions with changelog notes.

### 4. Submission Review & Verification
- **Rubric-Driven Scorecards**: Configurable criteria (*Correctness*, *Completeness*, *Clarity of Explanation*, *Method & Reasoning*, *Adherence to Requirements*, *Evidence & Verification*).
- **Constructive Feedback Fields**: What was done well, What needs improvement, Specific mistakes or missing steps, Suggested next steps, and Learning resources.
- **Assistive AI Review Service**:
  - Analyzes submission text, attachments, and link references against rubric criteria.
  - Generates criterion scores, strengths, and missing steps.
  - Displays confidence score and **mandatory non-infallible disclaimer** (AI reviews are assistive, do not grant high-value final certifications, and require human verification).

### 5. Real-Time Doubt-Solving Chat & Discussions
- **Dual Chat Scope**: Study room chat and dedicated task discussion threads.
- **Real-Time WebSockets**: Instant message streaming, typing indicators (`isTyping`), and live room presence counts.
- **Accepted Solutions**: Mark peer responses as accepted solutions (+15 XP to solver).
- **Helpful Upvotes**: Community reactions (+10 XP to author).
- **Safety**: Server-side permissions, attachments validation, and message reporting for moderation.

### 6. Performance-Based Gamification & Safeguards
- **Auditable XP Ledger**: Every transaction (positive or negative) is recorded in `xp_transactions` with an audited reason and reference ID.
- **Duplicate Prevention**: Prevents double rewards for repeated submissions or duplicate completions.
- **Strict Safeguards**:
  - Points are **never** deducted for asking questions or honest mistakes.
  - Negative adjustments require documented reasons and authorized moderator/admin actions.
  - **Appeal System**: Learners can file an appeal against penalties for administrative review and reversal.
- **Progressive Level Curve**: Level 1 (*Novice Explorer*) through Level 10 (*Consta Grandmaster*).

### 7. Multi-Category Daily Streaks
- **Streak Categories**:
  - `overall`: Sustained general consistency.
  - `study`: Verified task completion or completed session objectives.
  - `habit`: Daily supplementary focus habits.
  - `subject`: Subject-specific study cadence.
- **Historical Preservation**: Past activity is permanently preserved in `daily_activity_logs`. A broken streak never erases completed day history.
- **Heatmap & Calendar**: 90-day activity matrix and 7-day weekly calendar.

### 8. Public Portfolio & Privacy Controls
- Accessible at `/profile/:username`.
- Granular privacy settings: toggle public profile, show/hide streaks, show/hide XP, show/hide tasks, and show/hide analytics.
- Protects private drafts, reviewer-only comments, and room chats.

---

## 🗄️ Database Entities

1. `users` & `user_profiles`
2. `study_rooms` & `study_room_memberships`
3. `study_sessions` & `study_session_objectives`
4. `study_tasks` & `study_task_assignments`
5. `study_submissions`, `submission_versions`, & `submission_attachments`
6. `review_rubrics`, `review_criteria`, `submission_reviews`, & `review_comments`
7. `feedback_threads`, `feedback_messages`, & `feedback_helpful_votes`
8. `chat_rooms`, `chat_messages`, `message_attachments`, & `reported_messages`
9. `study_challenges` & `study_challenge_participants`
10. `xp_transactions` & `level_definitions`
11. `streak_records` & `daily_activity_logs`
12. `learning_achievements` & `user_achievements`
13. `notifications` & `notification_preferences`
14. `appeals`

---

## 🚀 Running the Platform

### Running Automated Integration Tests
```bash
cd backend
npm test
```
All 11 comprehensive automated tests will execute against `node:test` covering authentication, solo study, cohorts, multi-version submissions, AI evaluations, peer reviews, doubt chats, XP ledger safeguards, streaks, analytics, and public portfolios.

### Starting Backend Server
```bash
cd backend
npm start
```
Starts backend API and WebSocket server on `http://localhost:5000` (and `ws://localhost:5000/ws`).

### Starting Frontend Dev Server
```bash
cd frontend
npm run dev
```
Starts the Vite React frontend on `http://localhost:5173`.
Proxy is preconfigured to route `/api`, `/uploads`, and `/ws` to `localhost:5000`.

---

## 👥 Seed Personas for Immediate Testing
- **Alex Rivera** (`alex_learner` / `password123`) - Student & active learner.
- **Sam Chen** (`sam_study` / `password123`) - Peer collaborator & reviewer.
- **Dr. Evelyn Stone** (`dr_stone` / `password123`) - Academic mentor & senior reviewer.
