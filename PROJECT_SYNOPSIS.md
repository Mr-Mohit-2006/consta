# PROJECT SYNOPSIS

## 1. Project Title
**CONSTA: A Real-Time Collaborative Study and Verifiable Personal Growth Ecosystem**

---

## 2. Abstract / Executive Summary
In the era of digital education, self-directed learners and academic study groups frequently struggle with consistency, passive study habits, disorganized peer interactions, and a lack of constructive feedback. Traditional productivity tools emphasize time-spent metrics without validating actual comprehension, while general messaging platforms fragment academic discussions and course material.

**CONSTA** is an integrated collaborative study platform engineered to foster genuine academic accountability. The system pairs custom solo focus sessions with verifiable learning outcome checklists, structured group study cohorts featuring administrative governance, a multi-version submission and rubric-based peer evaluation engine, real-time doubt-solving chat powered by WebSockets, and an anti-exploit gamification ledger. By combining modern web technologies (React 19, Tailwind CSS v4, Node.js 22, Express, WebSockets, and SQLite in WAL mode), CONSTA bridges the gap between individual study discipline and collaborative peer learning.

---

## 3. Problem Statement
Modern students utilizing online and remote study tools encounter several critical bottlenecks:
1. **"Fake Productivity" (Passive Timer Running):** Conventional Pomodoro applications track elapsed time rather than knowledge acquisition. Students run background timers without retaining information or solving problems.
2. **Disorganized Group Study on General Messaging Apps:** Chat apps (WhatsApp, Discord, Telegram) mix off-topic casual banter with coursework. Assignment requirements, revisions, deadlines, and peer doubts inevitably get buried.
3. **Absence of Iterative Feedback (The Revision Void):** Students typically submit an assignment once, receive an arbitrary grade, and never correct misconceptions or resubmit improved iterations.
4. **Frictional Doubt Resolution:** Asking academic questions online often requires third-party image hosts, periodic page refreshes, and lacks mechanisms to verify or highlight correct answers.
5. **Exploitable Gamification Systems:** Many educational apps employ shallow point schemes that can be gamed through automated scripts or repetitive clicks, defeating the purpose of reward-based incentives.

---

## 4. Objectives of the Project
The primary objectives of the CONSTA platform are:
- **Outcome-Driven Accountability:** Decouple focus timer duration from reward points; award verified XP only upon the completion of concrete learning objectives.
- **Structured Cohort Governance:** Provide students with dedicated study cohorts where designated creators/admins can assign tasks, enforce topic checklists, set deadlines, and manage membership.
- **Iterative Submission Lifecycle:** Enable learners to submit multi-format coursework ($v1 \to v2 \to v3\dots$) with changelog notes and receive criterion-based rubric scorecards alongside assistive AI feedback.
- **Zero-Latency Doubt Resolution:** Deliver bidirectional real-time chat via WebSockets with image/diagram upload capabilities and an "Accepted Solution" peer-reward mechanism.
- **Transparent & Resilient Gamification:** Maintain an auditable, append-only database transaction ledger for all XP gains/losses, daily consistency streak heatmaps, and zero-data-loss SQLite persistence.

---

## 5. Scope of the System
- **User Roles:** Registered students, Group Creators/Admins, Peer Reviewers, and Study Cohort Members.
- **Functional Scope:**
  - Secure registration, authentication (JWT + bcrypt), and profile customization.
  - Individual Pomodoro study sessions with difficulty settings and roadblock loggers.
  - Public and private study rooms (with invite codes and join request approval queues).
  - Multi-topic group tasks with dynamic progress bars and countdown timers.
  - Multi-format submissions (text derivations, multi-page image attachments, PDFs, external repository links).
  - Double-blind or structured peer rubric evaluations with quantitative and qualitative feedback.
  - Real-time doubt-solving chat with typing indicators and image zoom preview.
  - Multi-category daily streaks and XP ledger with rank progression (Novice Explorer $\to$ Master Scholar).

---

## 6. Functional Modules

### Module 1: Solo Study & Verifiable Outcomes
- Configurable focus timer (duration, subject, topic, and difficulty level).
- Interactive objective checklist requiring active student confirmation before study XP is credited.
- Roadblock Logger: Captures bottlenecks, unsolved questions, and confusing concepts for later review.
- Assistive Pedagogical Concept Explainer for instant contextual clarity.

### Module 2: Collaborative Study Rooms (Cohorts)
- Public rooms and private cohorts requiring admin approval or unique join codes.
- Administrative tools: Task creation with sub-topic checklists, member permission management, and cohort deletion.
- Real-time group activity feed and deadline countdown trackers.

### Module 3: Tasks & Multi-Version Submission Engine
- Complete 8-stage task lifecycle: `not_started` $\to$ `in_progress` $\to$ `submitted` $\to$ `under_review` $\to$ `revision_requested` $\to$ `approved` $\to$ `completed`.
- Versioning support: Students iterate on work ($v1 \to v2 \to v3$) with changelog annotations.
- Rubric scorecard evaluation: Correctness, Completeness, Clarity of Explanation, and Reasoning.
- Assistive AI assessment providing criterion-level scoring and specific suggestions for improvement.

### Module 4: Real-Time Doubt Solving & Discussions
- WebSocket-driven live messaging with zero page refreshes.
- Dual context: Specific study group cohorts or direct 1-on-1 friend network.
- Inline photo uploads and diagram sharing (JPEG, PNG, WEBP, PDF up to 15MB).
- "Accepted Solution" endorsement awarding the peer solver +15 verified XP.

### Module 5: Anti-Exploit Gamification & Streak Analytics
- Centralized `xp_transactions` ledger auditing every reward and penalty with source IDs.
- Daily consistency streak engine calculating consecutive active learning days with a GitHub-style activity heatmap.
- Privacy-controlled student profiles and portfolio showcases.

---

## 7. System Architecture & Tech Stack

### Frontend Technology
- **Library/Framework:** React 19 (Functional Components, Hooks, Context API)
- **Styling & Design System:** Tailwind CSS v4 (Custom Cream + Burgundy design tokens)
- **Icons:** Lucide React (SVG Vector Icon Library)
- **Bundler & Build Tool:** Vite 8 with Rolldown bundling
- **Code Linter:** Oxlint

### Backend Technology
- **Runtime Environment:** Node.js (v22.5.0+)
- **API Framework:** Express.js (RESTful architecture, custom auth & validation middleware)
- **Real-Time Communication:** `ws` (Lightweight, RFC 6455 compliant WebSocket server)
- **File & Media Handling:** Multer (Multipart/form-data upload management with disk storage and MIME validation)

### Database & Security
- **Database Engine:** `node:sqlite` (Node.js built-in zero-dependency high-throughput SQLite engine)
- **Reliability Mode:** Write-Ahead Logging (`PRAGMA journal_mode = WAL`) with automatic `wal_checkpoint(TRUNCATE)`
- **Data Persistence:** Dual-layer SQLite WAL + Automated User Backup Recovery Service
- **Authentication:** JSON Web Tokens (JWT) with Bearer token authentication
- **Password Security:** `bcryptjs` salted password hashing

---

## 8. Hardware & Software Requirements

### Hardware Requirements (Development / Server)
- **Processor:** Dual-Core 2.0 GHz or higher (Intel Core i3/i5/i7 or AMD equivalent / ARM64)
- **RAM:** Minimum 4 GB (8 GB recommended for concurrent builds and test runners)
- **Disk Space:** Minimum 500 MB free space for code repository, SQLite database, and media uploads
- **Network:** Standard broadband internet connection for real-time WebSocket communication

### Software Requirements
- **Operating System:** Windows 10/11, macOS, or Linux (Ubuntu 20.04+ / Debian)
- **Node.js:** v22.5.0 or later
- **Package Manager:** npm (Node Package Manager) v10+
- **Modern Web Browser:** Google Chrome, Mozilla Firefox, Microsoft Edge, or Safari with WebSocket and ES2022+ support

---

## 9. Testing & Quality Assurance
The system incorporates an automated test suite executed via the native Node.js test runner (`node:test`):
- **33 Automated Unit, Integration, and E2E Tests** covering:
  - Auth workflows (registration, login, invalid credentials, password recovery).
  - Multi-user data isolation and fresh database bootstrapping.
  - Solo study session logging and objective checklist completion.
  - Group creation, duplicate name rejections, and admin task management.
  - Submission lifecycle, rubric evaluations, and version history updates.
  - Real-time WebSocket broadcasting without refresh.
  - Database WAL auto-checkpointing and session recovery verification.
- **Pass Rate:** 33 / 33 tests passing (100% test coverage for critical business logic).

---

## 10. Expected Significance & Impact
CONSTA provides an academic bridge between isolated solo revision and chaotic social messaging:
1. **Fosters Authentic Study Habits:** Shifts the student mindset from passive clock-watching to tangible, checklist-driven milestone completion.
2. **Promotes Peer-to-Peer Pedagogy:** Encourages collaborative teaching through doubt-solving and constructive rubric reviews.
3. **Data-Driven Self-Reflection:** Offers personal analytics (focus minutes, streak heatmaps, level progress) enabling students to identify peak study periods and subject roadblocks.

---

## 11. Conclusion & Future Enhancements
CONSTA successfully delivers an all-in-one ecosystem for academic accountability and collaborative growth. Future enhancements will explore:
- Cross-platform native mobile applications (React Native / Flutter).
- Native WebRTC peer-to-peer audio/video study study rooms.
- Fine-tuned local pedagogical LLM models for automated preliminary assignment grading and rubric generation.
- Institutional Learning Management System (LMS) integration via LTI standards (Canvas, Moodle, Google Classroom).
