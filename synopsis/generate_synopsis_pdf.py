import win32com.client
import os

html_content = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Project Synopsis - CONSTA</title>
<style>
  @page {
    size: A4;
    margin: 25.4mm 25.4mm 25.4mm 25.4mm;
    mso-page-orientation: portrait;
  }
  body {
    font-family: "Times New Roman", Times, serif;
    font-size: 12pt;
    line-height: 1.35;
    color: #000000;
    margin: 0;
    padding: 0;
  }
  p {
    margin-top: 0;
    margin-bottom: 8pt;
    text-align: justify;
    text-justify: inter-word;
  }
  h1.cover-inst {
    font-size: 14pt;
    font-weight: bold;
    text-align: center;
    margin: 0 0 4pt 0;
    letter-spacing: 0.5pt;
  }
  h2.cover-inst-sub {
    font-size: 12pt;
    font-weight: bold;
    text-align: center;
    margin: 0 0 4pt 0;
  }
  p.cover-address {
    font-size: 11pt;
    text-align: center;
    margin: 0 0 35pt 0;
  }
  h2.cover-synopsis-of {
    font-size: 13pt;
    font-weight: bold;
    text-align: center;
    margin: 0 0 6pt 0;
    letter-spacing: 1pt;
  }
  p.cover-of {
    font-size: 11pt;
    font-weight: bold;
    text-align: center;
    margin: 0 0 8pt 0;
  }
  h1.cover-title {
    font-size: 15pt;
    font-weight: bold;
    text-align: center;
    margin: 0 0 35pt 0;
    line-height: 1.3;
  }
  p.cover-sub-text {
    font-size: 11pt;
    font-style: italic;
    text-align: center;
    margin: 0 0 8pt 0;
  }
  h2.cover-degree {
    font-size: 13pt;
    font-weight: bold;
    text-align: center;
    margin: 0 0 4pt 0;
  }
  p.cover-in {
    font-size: 11pt;
    font-style: italic;
    text-align: center;
    margin: 0 0 4pt 0;
  }
  h2.cover-dept {
    font-size: 12pt;
    font-weight: bold;
    text-align: center;
    margin: 0 0 35pt 0;
  }
  .logo-box {
    text-align: center;
    margin: 20pt 0 40pt 0;
  }
  .table-attribution {
    width: 100%;
    margin-top: 30pt;
    margin-bottom: 45pt;
    border-collapse: collapse;
    border: none;
  }
  .table-attribution td {
    border: none;
    padding: 2pt 4pt;
    vertical-align: top;
    font-size: 11pt;
    line-height: 1.3;
  }
  p.cover-footer-inst {
    font-size: 11pt;
    font-weight: bold;
    text-align: center;
    margin: 0 0 3pt 0;
  }
  p.cover-footer-univ {
    font-size: 11pt;
    font-weight: bold;
    text-align: center;
    margin: 0 0 3pt 0;
  }
  p.cover-footer-date {
    font-size: 11pt;
    font-weight: bold;
    text-align: center;
    margin: 0;
  }

  /* Table of contents */
  h2.toc-header {
    font-size: 14pt;
    font-weight: bold;
    text-align: center;
    margin: 0 0 25pt 0;
  }
  .toc-table {
    width: 100%;
    border-collapse: collapse;
    border: none;
    font-size: 11pt;
  }
  .toc-table td {
    border: none;
    padding: 5pt 0;
    vertical-align: bottom;
  }

  /* Chapters & Content */
  .page-break {
    page-break-before: always;
  }
  .chapter-title-box {
    text-align: center;
    margin-bottom: 18pt;
  }
  h2.chapter-num {
    font-size: 13pt;
    font-weight: bold;
    text-align: center;
    margin: 0 0 4pt 0;
  }
  h1.chapter-name {
    font-size: 14pt;
    font-weight: bold;
    text-align: center;
    margin: 0 0 16pt 0;
  }
  h2.abstract-header {
    font-size: 14pt;
    font-weight: bold;
    text-align: left;
    margin: 0 0 14pt 0;
  }
  h3.section-header {
    font-size: 12pt;
    font-weight: bold;
    text-align: left;
    margin: 12pt 0 6pt 0;
  }
  .content-table {
    width: 100%;
    border-collapse: collapse;
    margin: 10pt 0 12pt 0;
    font-size: 10.5pt;
  }
  .content-table th, .content-table td {
    border: 1px solid #000000;
    padding: 5pt 6pt;
    text-align: left;
    vertical-align: top;
  }
  .content-table th {
    background-color: #f2f2f2;
    font-weight: bold;
  }
  .diagram-container {
    text-align: center;
    margin: 25pt 0 15pt 0;
  }
  .caption {
    font-size: 11pt;
    text-align: center;
    margin-top: 10pt;
    margin-bottom: 20pt;
  }
  ol.objectives-list {
    margin: 0;
    padding-left: 20pt;
    text-align: justify;
  }
  ol.objectives-list li {
    margin-bottom: 8pt;
    line-height: 1.35;
  }
  ol.ref-list {
    margin: 0;
    padding-left: 20pt;
    text-align: justify;
  }
  ol.ref-list li {
    margin-bottom: 6pt;
    line-height: 1.3;
    font-size: 10.5pt;
  }
  .page-num-top {
    text-align: left;
    font-size: 11pt;
    margin-bottom: 12pt;
  }
</style>
</head>
<body>

<!-- ==================== COVER PAGE ==================== -->
<h1 class="cover-inst">GREATER NOIDA INSTITUTE OF TECHNOLOGY</h1>
<h2 class="cover-inst-sub">(ENGINEERING INSTITUTE)</h2>
<p class="cover-address">Plot No-7, Knowledge Park-II, Greater Noida</p>

<h2 class="cover-synopsis-of">PROJECT SYNOPSIS</h2>
<p class="cover-of">OF</p>
<h1 class="cover-title">CONSTA: COLLABORATIVE STUDY &amp; PERSONAL GROWTH PLATFORM WITH VERIFIABLE OUTCOMES</h1>

<p class="cover-sub-text">Submitted in partial fulfilment for the award of the degree</p>
<h2 class="cover-degree">BACHELOR OF TECHNOLOGY</h2>
<p class="cover-in">in</p>
<h2 class="cover-dept">Computer Science and Engineering</h2>

<div class="logo-box">
  <svg xmlns="http://www.w3.org/2000/svg" width="220" height="75" viewBox="0 0 220 75">
    <rect width="220" height="75" rx="6" fill="#0D2E5C"/>
    <rect x="5" y="5" width="210" height="65" rx="4" fill="#FFFFFF"/>
    <rect x="8" y="8" width="55" height="59" fill="#0D2E5C"/>
    <!-- Emblem stylized -->
    <circle cx="35" cy="32" r="16" fill="none" stroke="#FBB03B" stroke-width="2.5"/>
    <polygon points="35,22 42,37 28,37" fill="#FBB03B"/>
    <text x="35" y="57" font-family="'Times New Roman', serif" font-size="8" font-weight="bold" fill="#FFFFFF" text-anchor="middle">Since 2001</text>
    <!-- GNIOT text -->
    <rect x="68" y="10" width="144" height="40" fill="#FBB03B" rx="3"/>
    <text x="140" y="38" font-family="'Arial Black', Impact, sans-serif" font-size="28" font-weight="900" fill="#0D2E5C" text-anchor="middle" letter-spacing="-1">GNiOT</text>
    <rect x="68" y="52" width="144" height="15" fill="#0D2E5C" rx="2"/>
    <text x="140" y="63" font-family="'Arial', sans-serif" font-size="9" font-weight="bold" fill="#FFFFFF" text-anchor="middle" letter-spacing="1.5">ENGG. INSTITUTE</text>
  </svg>
</div>

<table class="table-attribution">
  <tr>
    <td style="width: 55%;">
      <strong>Submitted by:</strong><br><br>
      <strong>Mohit Kumar</strong><br>
      Roll No: 2201320100085<br>
      B.Tech CSE (Final Year)
    </td>
    <td style="width: 45%;">
      <strong>Under the Supervision of:</strong><br><br>
      <strong>Dr. / Prof. Project Guide</strong><br>
      Assistant Professor<br>
      Dept. of Computer Science &amp; Engg.
    </td>
  </tr>
</table>

<div style="margin-top: 40pt;">
  <p class="cover-footer-inst">Greater Noida Institute of Technology, Greater Noida</p>
  <p class="cover-footer-univ">Dr. A.P.J. Abdul Kalam Technical University, Lucknow</p>
  <p class="cover-footer-date">Academic Session: 2025 – 2026</p>
</div>

<!-- ==================== TABLE OF CONTENTS ==================== -->
<div class="page-break"></div>

<h2 class="toc-header">Table of Contents</h2>

<table class="toc-table">
  <tr>
    <td style="font-weight: bold; border-bottom: 1px solid #000;">Description</td>
    <td style="text-align: right; font-weight: bold; border-bottom: 1px solid #000; width: 80pt;">Page No.</td>
  </tr>
  <tr>
    <td>Abstract .............................................................................................................................................</td>
    <td style="text-align: right;">1</td>
  </tr>
  <tr>
    <td>1. Introduction .......................................................................................................................................</td>
    <td style="text-align: right;">2-4</td>
  </tr>
  <tr>
    <td>2. Literature Review ...............................................................................................................................</td>
    <td style="text-align: right;">5-6</td>
  </tr>
  <tr>
    <td>3. Objectives ..............................................................................................................................................</td>
    <td style="text-align: right;">7</td>
  </tr>
  <tr>
    <td>4. Methodology / Planning of Work .........................................................................................................</td>
    <td style="text-align: right;">8</td>
  </tr>
  <tr>
    <td>References .................................................................................................................................................</td>
    <td style="text-align: right;">9</td>
  </tr>
</table>

<!-- ==================== ABSTRACT (Page 1) ==================== -->
<div class="page-break"></div>
<div class="page-num-top">1</div>

<h2 class="abstract-header">Abstract</h2>

<p>
Self-directed online learners and peer study groups often struggle with consistency, superficial productivity, disorganized academic discussions, and a lack of constructive revision feedback. Traditional productivity tools rely on passive elapsed-time timers without validating knowledge acquisition, while general messaging platforms (such as WhatsApp, Telegram, or Discord) mix casual banter with coursework, leading to lost assignments and unaddressed doubts. This project proposes <strong>CONSTA</strong>, an integrated collaborative study and personal growth platform engineered to convert passive study sessions into verifiable academic outcomes. In the solo study module, focus timers are decoupled from rewards; verified study experience points (XP) are awarded only upon the confirmed completion of an interactive learning objective checklist, supplemented by an integrated roadblock logger.
</p>

<p>
For group learning, the system provides structured cohorts governed by administrative roles, unique name enforcement, sub-topic checklists, and deadline timers. Coursework is managed via an eight-stage task lifecycle supporting multi-version submissions (<i>v</i>1 &rarr; <i>v</i>2 &rarr; <i>v</i>3) with changelog notes, multi-format attachments (handwritten photos, documents, code links), and criterion-based rubric scorecards alongside assistive AI feedback. Real-time doubt discussions are powered by WebSockets for zero-refresh message and diagram delivery, incorporating an &ldquo;Accepted Solution&rdquo; peer-reward mechanism (+15 XP). An auditable, append-only database transaction ledger records every XP transition to prevent point-farming exploits, complemented by a daily streak consistency heatmap. The prototype is built in Python and Node.js using React 19, Tailwind CSS v4, Express, WebSockets (<code>ws</code>), and native SQLite in Write-Ahead Logging (WAL) mode, validated with a 33-suite automated regression test battery.
</p>

<p style="margin-top: 14pt;">
<strong>Keywords:</strong> collaborative study, verifiable learning outcomes, rubric evaluation, multi-version submissions, real-time doubt clearing, anti-exploit gamification, WebSockets, SQLite WAL.
</p>

<!-- ==================== CHAPTER 1: INTRODUCTION (Page 2) ==================== -->
<div class="page-break"></div>
<div class="page-num-top">2</div>

<div class="chapter-title-box">
  <h2 class="chapter-num">Chapter 1</h2>
  <h1 class="chapter-name">Introduction</h1>
</div>

<h3 class="section-header">1.1 Background and Problem Statement</h3>
<p>
Academic productivity determines how effectively students acquire, retain, and apply complex technical concepts over time. Most self-directed learners rely on informal tools such as standalone timer applications, basic to-do checklists, or social messaging channels. Such unstructured workflows lead to two costly outcomes: passive &ldquo;fake productivity,&rdquo; where a timer runs without genuine comprehension or problem solving, and communication fragmentation, where study tasks, reference files, and academic questions are overwhelmed by casual chat. The most common remedy in existing software is a simple Pomodoro timer or an unverified streak counter. A basic clock, however, cannot verify whether a student achieved their stated learning goals or remained idle.
</p>

<p>
Large online educational platforms emphasize structured peer collaboration, active recall, and formative rubric feedback. Platforms such as Canvas, Moodle, and Khan Academy offer institutional assignment management, while developer platforms like GitHub demonstrate the educational value of multi-version revision histories and peer review. These systems, however, are either closed within enterprise/university deployments, lack real-time peer doubt-resolution mechanics, or fail to provide student-centric gamification safeguards that reward verified effort rather than superficial clicks. No lightweight, unified platform combines outcome-verified solo study, governed study cohorts, iterative multi-version coursework submissions, and real-time doubt clearing with auditable consistency metrics.
</p>

<h3 class="section-header">1.2 Proposed System</h3>
<p>
This project proposes <strong>CONSTA</strong>, an integrated collaborative study and personal growth ecosystem with verifiable accountability. Here, the word &ldquo;system&rdquo; denotes an interconnected full-stack pipeline that captures verified study sessions, coordinates peer cohorts, manages coursework revision iterations, and streams real-time academic solutions. The platform requires students to pair focus timers with a tangible learning objective checklist; running a clock alone awards no study credentials.
</p>

<p>
In collaborative cohorts, room creators act as administrators who publish assignments with sub-topic checklists and countdown timers. When submitting coursework, students can upload multiple handwritten diagrams, documents, or repository links across successive iterations (<i>v</i>1, <i>v</i>2, <i>v</i>3), preserving revision notes. Submissions are evaluated against explicit rubric criteria (<i>Correctness</i>, <i>Completeness</i>, <i>Clarity</i>, <i>Methodology</i>), augmented by assistive AI evaluations providing targeted suggestions. Academic doubts are cleared via bidirectional WebSockets with zero page reloads, where peers can mark verified answers as &ldquo;Accepted Solutions.&rdquo; All user points are strictly logged in an append-only ledger (<code>xp_transactions</code>) to eliminate gaming of streaks. The overall flow is shown in Fig. 1.
</p>

<!-- ==================== FIG 1: WORKFLOW (Page 3) ==================== -->
<div class="page-break"></div>
<div class="page-num-top">3</div>

<div class="diagram-container">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 480" width="100%" height="auto">
    <defs>
      <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#000000"/>
      </marker>
    </defs>
    
    <!-- Row 1: Flow boxes -->
    <!-- Box 1: Solo Study -->
    <rect x="20" y="40" width="150" height="70" rx="3" fill="#FFFFFF" stroke="#000000" stroke-width="1.5"/>
    <text x="95" y="65" font-family="'Times New Roman', serif" font-size="12" font-weight="bold" text-anchor="middle">Solo Study Input</text>
    <text x="95" y="82" font-family="'Times New Roman', serif" font-size="10" text-anchor="middle">Timer, Objective Checklist,</text>
    <text x="95" y="96" font-family="'Times New Roman', serif" font-size="10" text-anchor="middle">Roadblock Logger</text>

    <!-- Arrow 1 -> 2 -->
    <line x1="170" y1="75" x2="200" y2="75" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>

    <!-- Box 2: Cohorts -->
    <rect x="205" y="40" width="150" height="70" rx="3" fill="#FFFFFF" stroke="#000000" stroke-width="1.5"/>
    <text x="280" y="65" font-family="'Times New Roman', serif" font-size="12" font-weight="bold" text-anchor="middle">Study Cohorts</text>
    <text x="280" y="82" font-family="'Times New Roman', serif" font-size="10" text-anchor="middle">Admin Governance,</text>
    <text x="280" y="96" font-family="'Times New Roman', serif" font-size="10" text-anchor="middle">Checklists, Deadlines</text>

    <!-- Arrow 2 -> 3 -->
    <line x1="355" y1="75" x2="385" y2="75" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>

    <!-- Box 3: Submissions & Rubrics -->
    <rect x="390" y="40" width="150" height="70" rx="3" fill="#FFFFFF" stroke="#000000" stroke-width="1.5"/>
    <text x="465" y="62" font-family="'Times New Roman', serif" font-size="11.5" font-weight="bold" text-anchor="middle">Multi-Version Tasks</text>
    <text x="465" y="78" font-family="'Times New Roman', serif" font-size="10" text-anchor="middle">8-Stage Lifecycle,</text>
    <text x="465" y="92" font-family="'Times New Roman', serif" font-size="10" text-anchor="middle">v1 -> v2 Revisions,</text>
    <text x="465" y="104" font-family="'Times New Roman', serif" font-size="9.5" text-anchor="middle">4-Criterion Rubrics</text>

    <!-- Arrow 3 -> 4 -->
    <line x1="540" y1="75" x2="570" y2="75" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>

    <!-- Box 4: Dashboard & Outcomes -->
    <rect x="575" y="40" width="130" height="70" rx="3" fill="#FFFFFF" stroke="#000000" stroke-width="1.5"/>
    <text x="640" y="62" font-family="'Times New Roman', serif" font-size="11.5" font-weight="bold" text-anchor="middle">Growth Dashboard</text>
    <text x="640" y="78" font-family="'Times New Roman', serif" font-size="10" text-anchor="middle">Daily Heatmaps,</text>
    <text x="640" y="92" font-family="'Times New Roman', serif" font-size="10" text-anchor="middle">Level Ranks (1-10),</text>
    <text x="640" y="104" font-family="'Times New Roman', serif" font-size="9.5" text-anchor="middle">Verified Metrics</text>

    <!-- Feedback Loop / Parallel: WebSocket Doubt Hub -->
    <rect x="205" y="170" width="220" height="65" rx="3" fill="#FFFFFF" stroke="#000000" stroke-width="1.5"/>
    <text x="315" y="195" font-family="'Times New Roman', serif" font-size="12" font-weight="bold" text-anchor="middle">Real-Time Doubt Hub</text>
    <text x="315" y="210" font-family="'Times New Roman', serif" font-size="10" text-anchor="middle">WebSockets (ws), Live Messages,</text>
    <text x="315" y="224" font-family="'Times New Roman', serif" font-size="10" text-anchor="middle">Accepted Solution (+15 XP)</text>

    <!-- Arrow from Cohorts down to Doubt Hub -->
    <line x1="280" y1="110" x2="280" y2="170" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>

    <!-- Arrow from Doubt Hub right to Ledger -->
    <line x1="425" y1="202" x2="490" y2="202" stroke="#000000" stroke-width="1.5"/>
    <line x1="490" y1="202" x2="490" y2="280" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>

    <!-- Arrow from Submissions down to Ledger -->
    <line x1="465" y1="110" x2="465" y2="280" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>

    <!-- Box: Anti-Exploit XP Ledger -->
    <rect x="360" y="280" width="210" height="65" rx="3" fill="#FFFFFF" stroke="#000000" stroke-width="1.5"/>
    <text x="465" y="305" font-family="'Times New Roman', serif" font-size="12" font-weight="bold" text-anchor="middle">Anti-Exploit XP Ledger</text>
    <text x="465" y="320" font-family="'Times New Roman', serif" font-size="10" text-anchor="middle">Append-Only xp_transactions,</text>
    <text x="465" y="334" font-family="'Times New Roman', serif" font-size="10" text-anchor="middle">Entity Uniqueness Constraints</text>

    <!-- Arrow from Ledger up to Dashboard -->
    <line x1="570" y1="312" x2="640" y2="312" stroke="#000000" stroke-width="1.5"/>
    <line x1="640" y1="312" x2="640" y2="110" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>
    <text x="645" y="230" font-family="'Times New Roman', serif" font-size="9" font-style="italic">Audited XP State</text>

    <!-- Bottom Database: SQLite WAL -->
    <rect x="250" y="390" width="220" height="55" rx="3" fill="#FFFFFF" stroke="#000000" stroke-width="1.5"/>
    <text x="360" y="413" font-family="'Times New Roman', serif" font-size="12" font-weight="bold" text-anchor="middle">Native SQLite WAL Database</text>
    <text x="360" y="428" font-family="'Times New Roman', serif" font-size="10" text-anchor="middle">PRAGMA journal_mode = WAL,</text>
    <text x="360" y="440" font-family="'Times New Roman', serif" font-size="9.5" text-anchor="middle">Automated Truncate Checkpoint &amp; JSON Backups</text>

    <!-- Arrow from Ledger to SQLite -->
    <line x1="465" y1="345" x2="465" y2="368" stroke="#000000" stroke-width="1.5"/>
    <line x1="465" y1="368" x2="360" y2="368" stroke="#000000" stroke-width="1.5"/>
    <line x1="360" y1="368" x2="360" y2="390" stroke="#000000" stroke-width="1.5" marker-end="url(#arrow)"/>
  </svg>
</div>

<p class="caption">
  <strong>Fig. 1.</strong> Overall workflow of the proposed CONSTA Collaborative Study Platform.
</p>

<!-- ==================== CHAPTER 1 CONTINUED (Page 4) ==================== -->
<div class="page-break"></div>
<div class="page-num-top">4</div>

<h3 class="section-header">1.3 Field and Technology Used</h3>
<p>
The project belongs to the domain of computer-supported collaborative learning (CSCL), educational web platforms, and real-time distributed application design. It is implemented in modern JavaScript/TypeScript and Node.js. The frontend is engineered with React 19 and styled with Tailwind CSS v4 to provide a high-contrast Cream + Burgundy aesthetic; Lucide React provides standardized vector iconography. The backend service layer is built using Node.js 22 LTS and Express.js for REST routing and token-based authentication.
</p>

<p>
Real-time doubt resolution is powered by native WebSockets (<code>ws</code>). Data persistence is provided by the native Node.js SQLite driver (<code>node:sqlite</code>) running in Write-Ahead Logging (WAL) mode, guaranteeing high read concurrency without requiring external database servers. Automated unit and regression tests are executed natively using <code>node:test</code> and <code>node:assert</code>.
</p>

<h3 class="section-header">1.4 Outcome-Driven Verification and Anti-Exploit Gamification</h3>
<p>
Educational gamification frequently degrades when students discover exploits—such as clicking buttons repeatedly or leaving background processes active—to accumulate badges. CONSTA resolves this via outcome-driven verification and an auditable transaction ledger. A focus timer by itself does not increment the study streak or award XP. Instead, users must explicitly verify target objectives and log roadblocks encountered. Furthermore, every XP modification is recorded as a discreet record in <code>xp_transactions</code> containing the user ID, delta amount, source category, and entity reference ID. Duplicate awards for the same session or task are blocked at the database constraint level. When doubts are resolved, only the question author can award the &ldquo;Accepted Solution&rdquo; designation (+15 XP), preventing collusion and ensuring authentic peer assistance.
</p>

<h3 class="section-header">1.5 Key Technical Terms</h3>
<p>
The operational terms, formulas, and parameters used throughout this synopsis are summarized in Table 1.
</p>

<p style="font-weight: bold; margin-bottom: 4pt; font-size: 11pt;">Table 1. Key platform terminology and operational parameters.</p>

<table class="content-table">
  <tr>
    <th style="width: 32%;">Term</th>
    <th style="width: 68%;">Meaning / Operational Formula</th>
  </tr>
  <tr>
    <td><strong>Verifiable Outcome</strong></td>
    <td>A concrete learning objective confirmed by the student upon session completion; required to earn session XP.</td>
  </tr>
  <tr>
    <td><strong>Roadblock Logger</strong></td>
    <td>A structured data store capturing conceptual obstacles, coding bugs, or derivation bottlenecks during study.</td>
  </tr>
  <tr>
    <td><strong>Cohort Admin</strong></td>
    <td>The user who creates a study group; possesses exclusive permissions to assign tasks, set deadlines, and manage members.</td>
  </tr>
  <tr>
    <td><strong>Task Lifecycle</strong></td>
    <td>Eight sequential states: <code>not_started</code>, <code>in_progress</code>, <code>submitted</code>, <code>under_review</code>, <code>revision_requested</code>, <code>approved</code>, <code>rejected</code>, <code>completed</code>.</td>
  </tr>
  <tr>
    <td><strong>Multi-Version Revision</strong></td>
    <td>Iterative submission tracking (<i>v</i>1 &rarr; <i>v</i>2 &rarr; <i>v</i>3) preserving prior file attachments, derivations, and changelogs.</td>
  </tr>
  <tr>
    <td><strong>Rubric Scorecard</strong></td>
    <td>Criterion-based assessment: 0.30&times;Correctness + 0.30&times;Completeness + 0.20&times;Clarity + 0.20&times;Methodology, clamped to [0, 100].</td>
  </tr>
  <tr>
    <td><strong>Accepted Solution</strong></td>
    <td>Author-endorsed chat response resolving an academic doubt, transferring +15 XP to the solver.</td>
  </tr>
  <tr>
    <td><strong>Audited XP Ledger</strong></td>
    <td>Append-only database table (<code>xp_transactions</code>) logging every reward or penalty with reference keys.</td>
  </tr>
  <tr>
    <td><strong>Write-Ahead Logging (WAL)</strong></td>
    <td>SQLite concurrency mode allowing simultaneous non-blocking reads while writing log transactions safely.</td>
  </tr>
</table>

<!-- ==================== CHAPTER 2: LITERATURE SURVEY (Page 5) ==================== -->
<div class="page-break"></div>
<div class="page-num-top">5</div>

<div class="chapter-title-box">
  <h2 class="chapter-num">Chapter 2</h2>
  <h1 class="chapter-name">Literature Survey</h1>
</div>

<p>
<strong>Collaborative learning theory.</strong> Modern educational psychology demonstrates that active peer discussion and collaborative problem-solving significantly increase retention compared to isolated study [1]. Collaborative learning environments encourage students to articulate reasoning, identify conceptual gaps, and engage in cognitive restructuring [2]. Traditional Learning Management Systems (LMS), such as Blackboard or Moodle, structure institutional materials but offer rigid, top-down workflows that fail to support spontaneous student-formed cohorts or agile study groups [3].
</p>

<p>
<strong>Focus tracking and the &ldquo;passive timer&rdquo; fallacy.</strong> The Pomodoro technique has been widely adopted in digital productivity applications (e.g., Forest, Pomofocus) to reduce cognitive fatigue and procrastination [4]. However, existing applications treat time duration as a proxy for learning outcome [5]. Empirical studies indicate that tracking elapsed time without measuring output fosters passive clock-watching and creates an illusion of competence [6]. CONSTA addresses this limitation by decoupling clock duration from learning credentials, requiring tangible checklist confirmation.
</p>

<p>
<strong>Formative rubrics and iterative revisions.</strong> Formative feedback that occurs during the learning process is considerably more effective than summative letter grades delivered after completion [7]. Rubric-referenced evaluations provide transparent criteria regarding what constitutes mastery, guiding peer reviewers toward constructive assessments [8]. Furthermore, allowing students to resubmit work through multi-version revisions mirrors professional software engineering practices and promotes a growth mindset [9].
</p>

<p>
<strong>Real-time academic doubt resolution.</strong> Instantaneous messaging platforms have become the de facto medium for informal student interaction [10]. However, using general chat applications for academic queries leads to conversational drift, lost homework files, and unverifiable answers [11]. Dedicated question-and-answer architectures (e.g., Stack Overflow) illustrate that reputation incentives and &ldquo;accepted answer&rdquo; markers reliably surface high-quality technical explanations [12]. CONSTA synthesizes real-time WebSockets with accepted-answer peer rewards directly inside cohort study channels.
</p>

<p>
<strong>Anti-exploit gamification.</strong> Gamification elements—such as points, badges, and leaderboards—stimulate short-term intrinsic and extrinsic motivation [13]. Nonetheless, poorly designed point systems are susceptible to &ldquo;gaming the system,&rdquo; wherein users optimize for points rather than learning [14]. To maintain platform credibility, game mechanics must incorporate transparent, auditable transaction ledgers, daily consistency thresholds, and penalties for exploitative behaviors [15].
</p>

<p>
<strong>Research gap.</strong> The reviewed literature confirms that existing tools (i) track time without validating learning outcomes, (ii) manage assignments without supporting iterative multi-version revisions or rubric-driven peer feedback, (iii) conduct study chats on unmoderated third-party platforms with no solution-verification mechanisms, or (iv) employ exploitable point systems lacking auditable database trails. This project addresses all four gaps in a single, responsive prototype.
</p>

<h3 class="section-header">References (Selected)</h3>
<p style="font-size: 10pt; line-height: 1.3;">
1. D. W. Johnson, R. T. Johnson, and K. A. Smith, &ldquo;Cooperative learning: Improving university instruction by basing practice on validated theory,&rdquo; <i>Journal on Excellence in College Teaching</i>, vol. 25, no. 3&amp;4, pp. 85&ndash;118, 2014.<br>
2. P. Dillenbourg, &ldquo;What do you mean by collaborative learning?,&rdquo; in <i>Collaborative-learning: Cognitive and Computational Approaches</i>, Elsevier, 1999, pp. 1&ndash;19.<br>
3. S. Graf and Kinshuk, &ldquo;Advanced adaptability in learning management systems,&rdquo; <i>Int. J. Comput. Inf. Eng.</i>, vol. 1, no. 8, pp. 2530&ndash;2535, 2007.<br>
4. F. Cirillo, <i>The Pomodoro Technique</i>. New York: Crown Publishing, 2018.
</p>

<!-- ==================== CHAPTER 2 CONTINUED (Page 6) ==================== -->
<div class="page-break"></div>
<div class="page-num-top">6</div>

<p style="font-size: 10pt; line-height: 1.35;">
5. J. Dunlosky, K. A. Rawson, E. J. Marsh, M. J. Nathan, and D. T. Willingham, &ldquo;Improving students&rsquo; learning with effective learning techniques,&rdquo; <i>Psychological Science in the Public Interest</i>, vol. 14, no. 1, pp. 4&ndash;58, 2013.<br>
6. B. Oakley, <i>A Mind for Numbers: How to Excel at Math and Science</i>. New York: TarcherPerigee, 2014.<br>
7. J. Hattie and H. Timperley, &ldquo;The power of feedback,&rdquo; <i>Review of Educational Research</i>, vol. 77, no. 1, pp. 81&ndash;112, 2007.<br>
8. H. G. Andrade, &ldquo;Using rubrics to promote thinking and learning,&rdquo; <i>Educational Leadership</i>, vol. 57, no. 5, pp. 13&ndash;18, 2000.<br>
9. C. S. Dweck, <i>Mindset: The New Psychology of Success</i>. New York: Random House, 2006.<br>
10. T. Tang and M. Wang, &ldquo;Students&rsquo; motivation for using social media in higher education,&rdquo; <i>Computers &amp; Education</i>, vol. 146, p. 103730, 2020.<br>
11. R. Junco, &ldquo;The relationship between frequency of social messaging and academic performance,&rdquo; <i>Computers &amp; Education</i>, vol. 59, no. 2, pp. 505&ndash;514, 2012.<br>
12. L. Mamykina, B. Manoim, M. Mittal, G. Hripcsak, and B. Hartmann, &ldquo;Design lessons from the success of Stack Overflow,&rdquo; in <i>Proc. SIGCHI Conf. Human Factors in Computing Systems (CHI &rsquo;11)</i>, 2011, pp. 2845&ndash;2854.<br>
13. S. Deterding, D. Dixon, R. Khaled, and L. Nacke, &ldquo;From game design elements to gamefulness: Defining gamification,&rdquo; in <i>Proc. 15th Int. Academic MindTrek Conf.</i>, 2011, pp. 9&ndash;15.<br>
14. R. S. Baker, A. T. Corbett, K. R. Koedinger, and A. Z. Wagner, &ldquo;Off-task behavior in the cognitive tutor classroom: When students &lsquo;game the system&rsquo;,&rdquo; in <i>Proc. SIGCHI Conf. Human Factors in Computing Systems (CHI &rsquo;04)</i>, 2004, pp. 383&ndash;390.<br>
15. K. Seaborn and D. I. Fels, &ldquo;Gamification in theory and practice: A systematic review,&rdquo; <i>International Journal of Human-Computer Studies</i>, vol. 74, pp. 14&ndash;31, 2015.
</p>

<!-- ==================== CHAPTER 3: OBJECTIVES (Page 7) ==================== -->
<div class="page-break"></div>
<div class="page-num-top">7</div>

<div class="chapter-title-box">
  <h2 class="chapter-num">Chapter 3</h2>
  <h1 class="chapter-name">Objective</h1>
</div>

<p>
Based on the literature review, the project aims to achieve the following specific technical and functional objectives:
</p>

<ol class="objectives-list">
  <li>To forecast and track study productivity through an outcome-driven solo study module where study duration is decoupled from reward incentives, requiring active completion of an objective checklist and roadblock logger.</li>
  <li>To implement a collaborative cohort system with role-based governance, enabling group creators to act as Admins who publish multi-topic checklists, configure duration countdown timers in days, and control group membership.</li>
  <li>To convert assignment grading into an iterative coursework submission engine supporting an 8-stage lifecycle (<code>not_started</code> to <code>completed</code>) with multi-version revisions (<i>v</i>1 &rarr; <i>v</i>2 &rarr; <i>v</i>3), multi-page image attachments, PDFs up to 15MB, and repository links.</li>
  <li>To construct a standardized rubric-driven peer review system evaluating submissions across four distinct dimensions (<i>Correctness</i>, <i>Completeness</i>, <i>Clarity</i>, and <i>Methodology</i>), accompanied by assistive AI evaluation scoring.</li>
  <li>To deploy a real-time doubt-solving communication engine utilizing native WebSockets (<code>ws</code>) for zero-refresh message broadcasting, image/diagram sharing, and author-validated &ldquo;Accepted Solution&rdquo; rewards (+15 XP).</li>
  <li>To design an anti-exploit gamification and streak architecture backed by an auditable, append-only database transaction ledger (<code>xp_transactions</code>) that records all score transitions with entity reference IDs and visualizes consistency via an activity heatmap.</li>
  <li>To guarantee high database reliability and zero data loss on local and server restarts by configuring native SQLite in Write-Ahead Logging (WAL) mode with automated truncation checkpoints.</li>
  <li>To validate the complete platform through automated end-to-end testing, ensuring that all 33 test suites (covering auth, cohorts, submissions, real-time WebSockets, and database persistence) pass with 100% reliability.</li>
</ol>

<!-- ==================== CHAPTER 4: METHODOLOGY (Page 8) ==================== -->
<div class="page-break"></div>
<div class="page-num-top">8</div>

<div class="chapter-title-box">
  <h2 class="chapter-num">Chapter 4</h2>
  <h1 class="chapter-name">Methodology</h1>
</div>

<p>
<strong>Step 1: System Authentication and Security Layer.</strong> A stateless authentication pipeline is implemented using Node.js and Express. Passwords are cryptographically salted and hashed using <code>bcryptjs</code> (salt rounds = 10). Authentication tokens are generated using JSON Web Tokens (JWT) with bearer header authorization. User profiles are initialized with isolated records, supporting username availability validation and secure email-based reset code verification.
</p>

<p>
<strong>Step 2: Outcome-Driven Solo Study Architecture.</strong> The client interface renders a configurable study session controller (subject, topic, target duration, difficulty). Active session states are maintained in local memory and synchronized with the backend. Study duration timers operate independently of reward calculations. Upon session conclusion, users must review and mark off their concrete checklist of learning objectives and log encountered roadblocks. Verified XP is credited to the database only after objective confirmation.
</p>

<p>
<strong>Step 3: Collaborative Cohorts and Administrative Governance.</strong> A relational schema establishes study cohorts with unique, case-insensitive group names. Cohort creators are automatically assigned the <code>admin</code> role, granting privileges to assign group tasks, configure deadline timers in days, approve private join requests, and manage membership. Cohort discovery supports both public browsing and direct peer invitation via unique join codes.
</p>

<p>
<strong>Step 4: Multi-Version Submission and Rubric Evaluation Engine.</strong> Tasks advance through an 8-stage state machine. When completing a task, learners upload multi-page handwritten answers, code links, or PDFs via Multer middleware with size safeguards (15MB max). When revisions are requested, the engine increments the submission version (<i>v</i>1 &rarr; <i>v</i>2 &rarr; <i>v</i>3), preserving previous iterations and changelog notes. Reviewers grade submissions using structured rubric scorecards with criterion weights, while an assistive pedagogical AI service parses submissions to output preliminary criterion scores and missing steps.
</p>

<p>
<strong>Step 5: Real-Time WebSocket Doubt Resolution.</strong> A dedicated WebSocket server (<code>ws</code>) binds to the HTTP server to manage real-time communication channels. Messages and photo attachments stream across active connections with sub-100ms latency without full-page reloads. The original question author can mark any peer response as the &ldquo;Accepted Solution,&rdquo; which automatically triggers a +15 XP grant in the audited ledger and displays an accepted badge to all room members.
</p>

<p>
<strong>Step 6: Data Persistence, Testing, and Verification.</strong> The database is configured on native <code>node:sqlite</code> with <code>PRAGMA journal_mode = WAL</code> and <code>PRAGMA synchronous = NORMAL</code>. Automatic checkpoints (<code>wal_checkpoint(TRUNCATE)</code>) prevent uncommitted write-ahead log bloating. A test suite of 33 automated tests verifies multi-user isolation, room creation, rubric grading, real-time message broadcasting, and cold-restart persistence.
</p>

<p style="margin-top: 10pt;">
<strong>Requirements. Software:</strong> Node.js (v22.5.0+), npm v10+, React 19, Vite 8, Tailwind CSS v4, Express.js, native <code>node:sqlite</code>, WebSockets (<code>ws</code>). <strong>Hardware:</strong> Standard laptop or desktop computer, 4 GB RAM, 500 MB free storage.
</p>

<!-- ==================== REFERENCES (Page 9) ==================== -->
<div class="page-break"></div>
<div class="page-num-top">9</div>

<div class="chapter-title-box">
  <h1 class="chapter-name" style="margin-top: 10pt;">References</h1>
</div>

<ol class="ref-list">
  <li>D. W. Johnson, R. T. Johnson, and K. A. Smith, &ldquo;Cooperative learning: Improving university instruction by basing practice on validated theory,&rdquo; <i>Journal on Excellence in College Teaching</i>, vol. 25, no. 3&amp;4, pp. 85&ndash;118, 2014.</li>
  <li>P. Dillenbourg, &ldquo;What do you mean by collaborative learning?,&rdquo; <i>Collaborative-learning: Cognitive and Computational Approaches</i>, Elsevier, pp. 1&ndash;19, 1999.</li>
  <li>S. Graf and Kinshuk, &ldquo;Advanced adaptability in learning management systems,&rdquo; <i>International Journal of Computer and Information Engineering</i>, vol. 1, no. 8, pp. 2530&ndash;2535, 2007.</li>
  <li>F. Cirillo, <i>The Pomodoro Technique: The Acclaimed Time-Management System That Has Transformed How We Work</i>, New York: Crown Publishing, 2018.</li>
  <li>J. Dunlosky, K. A. Rawson, E. J. Marsh, M. J. Nathan, and D. T. Willingham, &ldquo;Improving students&rsquo; learning with effective learning techniques,&rdquo; <i>Psychological Science in the Public Interest</i>, vol. 14, no. 1, pp. 4&ndash;58, 2013.</li>
  <li>B. Oakley, <i>A Mind for Numbers: How to Excel at Math and Science (Even If You Flunked Algebra)</i>, New York: TarcherPerigee, 2014.</li>
  <li>J. Hattie and H. Timperley, &ldquo;The power of feedback,&rdquo; <i>Review of Educational Research</i>, vol. 77, no. 1, pp. 81&ndash;112, 2007.</li>
  <li>H. G. Andrade, &ldquo;Using rubrics to promote thinking and learning,&rdquo; <i>Educational Leadership</i>, vol. 57, no. 5, pp. 13&ndash;18, 2000.</li>
  <li>C. S. Dweck, <i>Mindset: The New Psychology of Success</i>, New York: Random House, 2006.</li>
  <li>T. Tang and M. Wang, &ldquo;Students&rsquo; motivation for using social media in higher education,&rdquo; <i>Computers &amp; Education</i>, vol. 146, p. 103730, 2020.</li>
  <li>R. Junco, &ldquo;The relationship between frequency of social messaging and academic performance,&rdquo; <i>Computers &amp; Education</i>, vol. 59, no. 2, pp. 505&ndash;514, 2012.</li>
  <li>L. Mamykina, B. Manoim, M. Mittal, G. Hripcsak, and B. Hartmann, &ldquo;Design lessons from the success of Stack Overflow,&rdquo; in <i>Proc. SIGCHI Conf. Human Factors in Computing Systems (CHI &rsquo;11)</i>, 2011, pp. 2845&ndash;2854.</li>
  <li>S. Deterding, D. Dixon, R. Khaled, and L. Nacke, &ldquo;From game design elements to gamefulness: Defining gamification,&rdquo; in <i>Proc. 15th Int. Academic MindTrek Conf.</i>, 2011, pp. 9&ndash;15.</li>
  <li>R. S. Baker, A. T. Corbett, K. R. Koedinger, and A. Z. Wagner, &ldquo;Off-task behavior in the cognitive tutor classroom: When students &lsquo;game the system&rsquo;,&rdquo; in <i>Proc. SIGCHI Conf. Human Factors in Computing Systems (CHI &rsquo;04)</i>, 2004, pp. 383&ndash;390.</li>
  <li>K. Seaborn and D. I. Fels, &ldquo;Gamification in theory and practice: A systematic review,&rdquo; <i>International Journal of Human-Computer Studies</i>, vol. 74, pp. 14&ndash;31, 2015.</li>
</ol>

</body>
</html>
"""

html_path = os.path.abspath('d:/consta/synopsis/synopsis_source.html')
pdf_path = os.path.abspath('d:/consta/synopsis/CONSTA_Minor_Project_Synopsis.pdf')
root_pdf_path = os.path.abspath('d:/consta/CONSTA_Minor_Project_Synopsis.pdf')

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html_content)

print(f"HTML source written to {html_path}")

# Convert to PDF using Microsoft Word COM engine
word = win32com.client.Dispatch('Word.Application')
word.Visible = False

try:
    doc = word.Documents.Open(html_path)
    # 17 is wdFormatPDF
    doc.SaveAs(pdf_path, FileFormat=17)
    doc.SaveAs(root_pdf_path, FileFormat=17)
    doc.Close()
    print(f"Successfully generated PDF at: {pdf_path}")
    print(f"Successfully copied PDF to root at: {root_pdf_path}")
finally:
    word.Quit()
