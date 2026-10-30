# Table of Contents

### Description
**Abstract** ................................................................................................................................................... 1  
**1. Introduction** ..................................................................................................................................... 2-4  
**2. Literature Review** ............................................................................................................................. 5-6  
**3. Objectives** ............................................................................................................................................ 7  
**4. Methodology / Planning of Work** ....................................................................................................... 8  
**References** ............................................................................................................................................... 9  

---

<div style="page-break-after: always;"></div>

# Abstract

Self-directed online learners and peer study groups often struggle with consistency, superficial productivity, disorganized academic discussions, and a lack of constructive revision feedback. Traditional productivity tools rely on passive elapsed-time timers without validating knowledge acquisition, while general messaging platforms (such as WhatsApp or Discord) mix casual banter with coursework, leading to lost assignments and unaddressed doubts. This project proposes **CONSTA**, an integrated collaborative study and personal growth platform engineered to convert passive study sessions into verifiable academic outcomes. In the solo study module, focus timers are decoupled from rewards; verified study experience points (XP) are awarded only upon the confirmed completion of an interactive learning objective checklist, supplemented by an integrated roadblock logger.

For group learning, the system provides structured cohorts governed by administrative roles, unique name enforcement, sub-topic checklists, and deadline timers. Coursework is managed via an eight-stage task lifecycle supporting multi-version submissions ($v1 \to v2 \to v3$) with changelog notes, multi-format attachments (handwritten photos, documents, code links), and criterion-based rubric scorecards alongside assistive AI feedback. Real-time doubt discussions are powered by WebSockets for zero-refresh message and diagram delivery, incorporating an “Accepted Solution” peer-reward mechanism (+15 XP). An auditable, append-only database transaction ledger records every XP transition to prevent point-farming exploits, complemented by a daily streak consistency heatmap. The prototype is built using React 19, Tailwind CSS v4, Node.js, Express, WebSockets (`ws`), and native SQLite in Write-Ahead Logging (WAL) mode, validated with a 33-suite automated regression test battery.

**Keywords:** collaborative study, verifiable learning outcomes, rubric evaluation, multi-version submissions, real-time doubt clearing, anti-exploit gamification, WebSockets, SQLite WAL.

---

<div style="page-break-after: always;"></div>

# Chapter 1  
# Introduction

### 1.1 Background and Problem Statement
Academic productivity determines how effectively students acquire, retain, and apply complex concepts over time. Most self-directed learners rely on informal tools such as standalone timer applications, basic to-do checklists, or social messaging channels. Such unstructured workflows lead to two costly outcomes: passive "fake productivity," where a timer runs without genuine comprehension or problem solving, and communication fragmentation, where study tasks, reference files, and academic questions are overwhelmed by casual chat. The most common remedy in existing software is a simple Pomodoro timer or an unverified streak counter. A basic clock, however, cannot verify whether a student achieved their stated learning goals or remained idle.

Modern e-learning research emphasizes structured peer collaboration, active recall, and formative rubric feedback. Educational platforms such as Canvas, Moodle, and Khan Academy offer institutional assignment management, while developer platforms like GitHub demonstrate the educational value of multi-version revision histories and peer review. These systems, however, are either closed within enterprise/university deployments, lack real-time peer doubt-resolution mechanics, or fail to provide student-centric gamification safeguards that reward verified effort rather than superficial clicks. No lightweight, unified platform combines outcome-verified solo study, governed study cohorts, iterative multi-version coursework submissions, and real-time doubt clearing with auditable consistency metrics.

### 1.2 Proposed System
This project proposes **CONSTA**, an integrated collaborative study and personal growth ecosystem with verifiable accountability. Here, the word "system" denotes an interconnected full-stack pipeline that captures verified study sessions, coordinates peer cohorts, manages coursework revision iterations, and streams real-time academic solutions. The platform requires students to pair focus timers with a tangible learning objective checklist; running a clock alone awards no study credentials.

In collaborative cohorts, room creators act as administrators who publish assignments with sub-topic checklists and countdown timers. When submitting coursework, students can upload multiple handwritten diagrams, documents, or repository links across successive iterations ($v1, v2, v3$), preserving revision notes. Submissions are evaluated against explicit rubric criteria (*Correctness*, *Completeness*, *Clarity*, *Methodology*), augmented by assistive AI evaluations providing targeted suggestions. Academic doubts are cleared via bidirectional WebSockets with zero page reloads, where peers can mark verified answers as "Accepted Solutions." All user points are strictly logged in an append-only ledger (`xp_transactions`) to eliminate gaming of streaks. The complete workflow is illustrated in Fig. 1.

---

<div style="page-break-after: always;"></div>

### Overall System Workflow

```
+---------------------------------------------------------------------------------------------------+
|                                          USER INTERFACE                                           |
|                     (React 19 + Tailwind v4 + Lucide React + Vite 8 Client)                      |
+---------------------------------+---------------------------------+-------------------------------+
                                  |                                 |
                                  v                                 v
        +-----------------------------------+     +-----------------------------------+
        |       Solo Study Focus Engine     |     |    Cohort & Real-Time Doubt Hub   |
        |  - Configurable focus timer       |     |  - Admin cohort governance        |
        |  - Verifiable objective checklist |     |  - Sub-topic checklist & timers   |
        |  - Roadblock & doubt logger       |     |  - WebSocket instant doubt chat   |
        |  - Pedagogical concept explainer  |     |  - Image & diagram uploads        |
        +-----------------+-----------------+     +-----------------+-----------------+
                          |                                         |
                          +--------------------+--------------------+
                                               |
                                               v
                        +---------------------------------------------+
                        |  Multi-Version Submission & Rubric Engine   |
                        |  - 8-stage task lifecycle                   |
                        |  - Revision versioning (v1 -> v2 -> v3)     |
                        |  - Rubric scorecards (Clarity, Method, etc) |
                        |  - Assistive AI evaluation & suggestions    |
                        +----------------------+----------------------+
                                               |
                                               v
                        +---------------------------------------------+
                        |        Anti-Exploit Gamification Ledger     |
                        |  - Append-only audited xp_transactions      |
                        |  - Accepted solution reward (+15 XP)        |
                        |  - Daily study streak activity heatmap      |
                        |  - Rank progression (Level 1 - Level 10)    |
                        +----------------------+----------------------+
                                               |
                                               v
                        +---------------------------------------------+
                        |         Persistent SQLite Engine (WAL)      |
                        |  - Node.js native driver (node:sqlite)      |
                        |  - Auto-checkpointing (TRUNCATE)            |
                        |  - Secondary JSON backup recovery engine    |
                        +---------------------------------------------+
```

**Fig. 1. Overall architecture and workflow of the proposed CONSTA Collaborative Study Platform.**

---

<div style="page-break-after: always;"></div>

### 1.3 Field and Technology Used
The project belongs to the domain of collaborative educational technology (EdTech), computer-supported collaborative learning (CSCL), and real-time distributed web systems. It is implemented using a modern JavaScript/Node.js stack:
- **Frontend Layer:** Built using React 19 and Vite 8 for fast reactive component rendering, styled with Tailwind CSS v4 using a specialized high-contrast **Cream + Burgundy** color palette (`#FAF4EB`, `#873B46`, `#332426`), with vector iconography supplied by Lucide React.
- **Backend Layer:** Powered by Node.js (v22.5.0+) and Express.js for RESTful API routing, JWT-based stateless authorization, and Multer for multipart file and diagram processing.
- **Real-Time Communication:** Driven by a native WebSocket server (`ws`) enabling low-latency (<100ms) bidirectional messaging, typing status broadcasts, and peer notification events without polling.
- **Data Persistence & Reliability:** Utilizes the native Node.js driver (`node:sqlite`) in Write-Ahead Logging (WAL) mode with automated `wal_checkpoint(TRUNCATE)` and a secondary automated JSON user backup recovery service.

### 1.4 Verifiable Learning Outcomes and Exploit Prevention
Educational gamification frequently degrades when students discover exploits—such as clicking buttons repeatedly or leaving background processes active—to accumulate badges. CONSTA resolves this via **outcome-driven verification** and an **auditable transaction ledger**. A focus timer by itself does not increment the study streak or award XP. Instead, users must explicitly verify target objectives and log roadblocks encountered.

Furthermore, every XP modification is recorded as a discreet record in `xp_transactions` containing the user ID, delta amount, source category (`session_objective`, `accepted_solution`, `peer_review`, `challenge_win`), and entity reference ID. Duplicate awards for the same session or task are blocked at the database constraint level. When doubts are resolved, only the question author can award the "Accepted Solution" designation (+15 XP), preventing collusion and ensuring authentic peer assistance.

### 1.5 Key Technical Terms
The primary terms and operational parameters used throughout this synopsis are summarized in Table 1.

**Table 1. Key platform terminology and operational parameters.**

| Term | Meaning / Technical Definition |
| :--- | :--- |
| **Verifiable Outcome** | A concrete learning milestone confirmed upon session completion; required to earn session XP. |
| **Roadblock Logger** | A dedicated data store capturing confusing concepts, bugs, or derivation bottlenecks during study. |
| **Cohort Admin** | The user who creates a study group; possesses exclusive permissions to assign tasks and manage members. |
| **Task Lifecycle** | 8 sequential states: `not_started`, `in_progress`, `submitted`, `under_review`, `revision_requested`, `approved`, `rejected`, `completed`. |
| **Multi-Version Revision** | Iterative submission tracking ($v1 \to v2 \to v3$) preserving prior file attachments, derivations, and changelogs. |
| **Rubric Scorecard** | Criterion-based assessment evaluating *Correctness*, *Completeness*, *Clarity*, and *Methodology*. |
| **Accepted Solution** | Author-endorsed chat response resolving an academic doubt, transferring +15 XP to the solver. |
| **Audited XP Ledger** | Append-only database table (`xp_transactions`) logging every reward or penalty with reference keys. |
| **Write-Ahead Logging (WAL)** | SQLite concurrency mode allowing simultaneous non-blocking reads while writing log transactions. |

---

<div style="page-break-after: always;"></div>

# Chapter 2  
# Literature Survey

**Collaborative Learning Systems.** Modern educational psychology demonstrates that active peer discussion and collaborative problem-solving significantly increase retention compared to isolated study [1]. Collaborative learning environments encourage students to articulate reasoning, identify conceptual gaps, and engage in cognitive restructuring [2]. Traditional Learning Management Systems (LMS), such as Blackboard or Moodle, structure institutional materials but offer rigid, top-down workflows that fail to support spontaneous student-formed cohorts or agile study groups [3].

**Focus Tracking and the "Passive Timer" Fallacy.** The Pomodoro technique has been widely adopted in digital productivity applications (e.g., Forest, Pomofocus) to reduce cognitive fatigue and procrastination [4]. However, existing applications treat time duration as a proxy for learning outcome [5]. Empirical studies indicate that tracking elapsed time without measuring output fosters passive clock-watching and creates an illusion of competence [6]. CONSTA addresses this limitation by decoupling clock duration from learning credentials, requiring tangible checklist confirmation.

**Formative Rubrics and Iterative Revisions.** Formative feedback that occurs during the learning process is considerably more effective than summative letter grades delivered after completion [7]. Rubric-referenced evaluations provide transparent criteria regarding what constitutes mastery, guiding peer reviewers toward constructive assessments [8]. Furthermore, allowing students to resubmit work through multi-version revisions mirrors professional software engineering practices and promotes a growth mindset [9].

**Real-Time Academic Doubt Resolution.** Instantaneous messaging platforms have become the de facto medium for informal student interaction [10]. However, using general chat applications for academic queries leads to conversational drift, lost homework files, and unverifiable answers [11]. Dedicated question-and-answer architectures (e.g., Stack Overflow) illustrate that reputation incentives and "accepted answer" markers reliably surface high-quality technical explanations [12]. CONSTA synthesizes real-time WebSockets with accepted-answer peer rewards directly inside cohort study channels.

**Anti-Exploit Gamification in Education.** Gamification elements—such as points, badges, and leaderboards—stimulate short-term intrinsic and extrinsic motivation [13]. Nonetheless, poorly designed point systems are susceptible to "gaming the system," wherein users optimize for points rather than learning [14]. To maintain platform credibility, game mechanics must incorporate transparent, auditable transaction ledgers, daily consistency thresholds, and penalties for exploitative behaviors [15].

**Research Gap.** Existing solutions either: (i) track time without validating learning outcomes, (ii) manage assignments without supporting iterative multi-version revisions or rubric-driven peer feedback, (iii) conduct study chats on unmoderated third-party platforms with no solution-verification mechanisms, or (iv) employ exploitable point systems lacking audit trails. This project addresses all four gaps in a cohesive, responsive web platform.

### References
1. D. W. Johnson, R. T. Johnson, and K. A. Smith, "Cooperative learning: Improving university instruction by basing practice on validated theory," *Journal on Excellence in College Teaching*, vol. 25, no. 3&4, pp. 85–118, 2014.
2. P. Dillenbourg, "What do you mean by collaborative learning?," *Collaborative-learning: Cognitive and Computational Approaches*, Elsevier, pp. 1–19, 1999.
3. S. Graf and Kinshuk, "Advanced adaptability in learning management systems," *International Journal of Computer and Information Engineering*, vol. 1, no. 8, pp. 2530–2535, 2007.
4. F. Cirillo, *The Pomodoro Technique: The Acclaimed Time-Management System That Has Transformed How We Work*, New York: Crown Publishing, 2018.
5. J. Dunlosky, K. A. Rawson, E. J. Marsh, M. J. Nathan, and D. T. Willingham, "Improving students’ learning with effective learning techniques," *Psychological Science in the Public Interest*, vol. 14, no. 1, pp. 4–58, 2013.

---

<div style="page-break-after: always;"></div>

6. B. Oakley, *A Mind for Numbers: How to Excel at Math and Science (Even If You Flunked Algebra)*, New York: TarcherPerigee, 2014.
7. J. Hattie and H. Timperley, "The power of feedback," *Review of Educational Research*, vol. 77, no. 1, pp. 81–112, 2007.
8. H. G. Andrade, "Using rubrics to promote thinking and learning," *Educational Leadership*, vol. 57, no. 5, pp. 13–18, 2000.
9. C. S. Dweck, *Mindset: The New Psychology of Success*, New York: Random House, 2006.
10. T. Tang and M. Wang, "Students’ motivation for using social media in higher education," *Computers & Education*, vol. 146, p. 103730, 2020.
11. R. Junco, "The relationship between frequency of social messaging and academic performance," *Computers & Education*, vol. 59, no. 2, pp. 505–514, 2012.
12. L. Mamykina, B. Manoim, M. Mittal, G. Hripcsak, and B. Hartmann, "Design lessons from the success of Stack Overflow," in *Proc. SIGCHI Conf. Human Factors in Computing Systems (CHI '11)*, 2011, pp. 2845–2854.
13. S. Deterding, D. Dixon, R. Khaled, and L. Nacke, "From game design elements to gamefulness: Defining gamification," in *Proc. 15th Int. Academic MindTrek Conf.*, 2011, pp. 9–15.
14. R. S. Baker, A. T. Corbett, K. R. Koedinger, and A. Z. Wagner, "Off-task behavior in the cognitive tutor classroom: When students 'game the system'," in *Proc. SIGCHI Conf. Human Factors in Computing Systems (CHI '04)*, 2004, pp. 383–390.
15. K. Seaborn and D. I. Fels, "Gamification in theory and practice: A systematic review," *International Journal of Human-Computer Studies*, vol. 74, pp. 14–31, 2015.

---

<div style="page-break-after: always;"></div>

# Chapter 3  
# Objective

Based on the literature review and identified research gaps, the project aims to achieve the following specific technical and functional objectives:

1. **To engineer an outcome-driven solo study module** where study duration is decoupled from reward incentives, requiring active completion of an objective checklist and roadblock logger to earn validated study XP.
2. **To implement a collaborative cohort system with role-based governance**, enabling group creators to act as Admins who publish multi-topic checklists, configure duration timers in days, and control membership via approval queues and unique IDs.
3. **To develop an iterative coursework submission engine** supporting an 8-stage lifecycle (`not_started` to `completed`) with multi-version revisions ($v1 \to v2 \to v3$), multi-page image attachments, PDFs up to 15MB, and repository links.
4. **To construct a standardized rubric-driven peer review system** evaluating submissions across four distinct dimensions (*Correctness*, *Completeness*, *Clarity*, and *Methodology*), accompanied by assistive AI evaluation scoring and constructive feedback prompts.
5. **To deploy a real-time doubt-solving communication engine** utilizing native WebSockets (`ws`) for zero-refresh message broadcasting, image/diagram sharing, and author-validated "Accepted Solution" rewards (+15 XP).
6. **To design an anti-exploit gamification and streak architecture** backed by an auditable, append-only database transaction ledger (`xp_transactions`) that records all score transitions with entity reference IDs and visualizes consistency via an activity heatmap.
7. **To guarantee high database reliability and zero data loss** on local and server restarts by configuring native SQLite in Write-Ahead Logging (WAL) mode with automated truncation checkpoints and client-side session auto-recovery.
8. **To validate the complete platform through automated end-to-end testing**, ensuring that all 33 test suites (covering auth, cohorts, submissions, real-time WebSockets, and database persistence) pass with 100% reliability.

---

<div style="page-break-after: always;"></div>

# Chapter 4  
# Methodology

The development and execution of the CONSTA platform follow a modular, incremental engineering methodology organized into six core sequential steps:

**Step 1: System Authentication and Security Layer.**  
A stateless authentication pipeline is implemented using Node.js and Express. Passwords are cryptographically salted and hashed using `bcryptjs` (salt rounds = 10). Authentication tokens are generated using JSON Web Tokens (JWT) with bearer header authorization. User profiles are initialized with isolated records, supporting username availability validation and secure email-based reset code verification.

**Step 2: Outcome-Driven Solo Study Architecture.**  
The client interface renders a configurable study session controller (subject, topic, target duration, difficulty). Active session states are maintained in local memory and synchronized with the backend. Study duration timers operate independently of reward calculations. Upon session conclusion, users must review and mark off their concrete checklist of learning objectives and log encountered roadblocks. Verified XP is credited to the database only after objective confirmation.

**Step 3: Collaborative Cohorts and Administrative Governance.**  
A relational schema establishes study cohorts with unique, case-insensitive group names. Cohort creators are automatically assigned the `admin` role, granting privileges to assign group tasks, configure deadline timers in days, approve/reject private join requests, and remove inactive members. Cohort discovery supports both public browsing and direct peer invitation via unique numerical user IDs.

**Step 4: Multi-Version Submission and Rubric Evaluation Engine.**  
Tasks advance through an 8-stage state machine. When completing a task, learners upload multi-page handwritten answers, code links, or PDFs via Multer middleware with size safeguards (15MB max). When revisions are requested, the engine increments the submission version ($v1 \to v2 \to v3$), preserving previous iterations and changelog notes. Reviewers grade submissions using structured rubric scorecards with criterion weights, while an assistive pedagogical AI service parses submissions to output preliminary criterion scores and missing steps.

**Step 5: Real-Time WebSocket Doubt Resolution.**  
A dedicated WebSocket server (`ws`) binds to the HTTP server to manage real-time communication channels. Messages and photo attachments stream across active connections with sub-100ms latency without full-page reloads. The original question author can mark any peer response as the "Accepted Solution," which automatically triggers a +15 XP grant in the audited ledger and displays an accepted badge to all room members.

**Step 6: Data Persistence, Testing, and Verification.**  
The database is configured on native `node:sqlite` with `PRAGMA journal_mode = WAL` and `PRAGMA synchronous = NORMAL`. Automatic checkpoints (`wal_checkpoint(TRUNCATE)`) prevent uncommitted write-ahead log bloating. A test suite of 33 automated tests verifies multi-user isolation, room creation, rubric grading, real-time message broadcasting, and cold-restart persistence.

### Platform Requirements
- **Software Requirements:** Node.js (v22.5.0+), npm v10+, React 19, Vite 8, Tailwind CSS v4, Express.js, native `node:sqlite`, WebSockets (`ws`), modern web browser (Chrome, Firefox, Edge).
- **Hardware Requirements:** Modern laptop or desktop computer (Intel Core i3/i5/i7, AMD Ryzen, or Apple Silicon), minimum 4 GB RAM, 500 MB free storage.

---

<div style="page-break-after: always;"></div>

# References

[1] D. W. Johnson, R. T. Johnson, and K. A. Smith, "Cooperative learning: Improving university instruction by basing practice on validated theory," *Journal on Excellence in College Teaching*, vol. 25, no. 3&4, pp. 85–118, 2014.

[2] P. Dillenbourg, "What do you mean by collaborative learning?," *Collaborative-learning: Cognitive and Computational Approaches*, Elsevier, pp. 1–19, 1999.

[3] S. Graf and Kinshuk, "Advanced adaptability in learning management systems," *International Journal of Computer and Information Engineering*, vol. 1, no. 8, pp. 2530–2535, 2007.

[4] F. Cirillo, *The Pomodoro Technique: The Acclaimed Time-Management System That Has Transformed How We Work*, New York: Crown Publishing, 2018.

[5] J. Dunlosky, K. A. Rawson, E. J. Marsh, M. J. Nathan, and D. T. Willingham, "Improving students’ learning with effective learning techniques," *Psychological Science in the Public Interest*, vol. 14, no. 1, pp. 4–58, 2013.

[6] B. Oakley, *A Mind for Numbers: How to Excel at Math and Science (Even If You Flunked Algebra)*, New York: TarcherPerigee, 2014.

[7] J. Hattie and H. Timperley, "The power of feedback," *Review of Educational Research*, vol. 77, no. 1, pp. 81–112, 2007.

[8] H. G. Andrade, "Using rubrics to promote thinking and learning," *Educational Leadership*, vol. 57, no. 5, pp. 13–18, 2000.

[9] C. S. Dweck, *Mindset: The New Psychology of Success*, New York: Random House, 2006.

[10] T. Tang and M. Wang, "Students’ motivation for using social media in higher education," *Computers & Education*, vol. 146, p. 103730, 2020.

[11] R. Junco, "The relationship between frequency of social messaging and academic performance," *Computers & Education*, vol. 59, no. 2, pp. 505–514, 2012.

[12] L. Mamykina, B. Manoim, M. Mittal, G. Hripcsak, and B. Hartmann, "Design lessons from the success of Stack Overflow," in *Proc. SIGCHI Conf. Human Factors in Computing Systems (CHI '11)*, 2011, pp. 2845–2854.

[13] S. Deterding, D. Dixon, R. Khaled, and L. Nacke, "From game design elements to gamefulness: Defining gamification," in *Proc. 15th Int. Academic MindTrek Conf.*, 2011, pp. 9–15.

[14] R. S. Baker, A. T. Corbett, K. R. Koedinger, and A. Z. Wagner, "Off-task behavior in the cognitive tutor classroom: When students 'game the system'," in *Proc. SIGCHI Conf. Human Factors in Computing Systems (CHI '04)*, 2004, pp. 383–390.

[15] K. Seaborn and D. I. Fels, "Gamification in theory and practice: A systematic review," *International Journal of Human-Computer Studies*, vol. 74, pp. 14–31, 2015.
