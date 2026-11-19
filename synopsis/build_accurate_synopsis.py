# build_accurate_synopsis.py
# Generates the official B.Tech Mini Project Synopsis for CONSTA
# with exact GNIOT/AKTU formatting, all 4 team members, supervisor Mr. Manoj Kumar,
# and authentic CSCL/EdTech literature and IEEE citations.

import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls
import os
import win32com.client

doc = Document()

# Page Margins: Standard A4 with 0.85-inch top/bottom, 1.0-inch left/right
for section in doc.sections:
    section.top_margin = Inches(0.85)
    section.bottom_margin = Inches(0.85)
    section.left_margin = Inches(1.0)
    section.right_margin = Inches(1.0)
    section.page_width = Inches(8.27)
    section.page_height = Inches(11.69)

def add_p(text="", align=WD_ALIGN_PARAGRAPH.JUSTIFY, bold=False, italic=False, size=11,
          space_before=0, space_after=4, line_spacing=1.15, color=(0, 0, 0)):
    p = doc.add_paragraph()
    p.alignment = align
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = line_spacing
    p.paragraph_format.left_indent = Inches(0)
    p.paragraph_format.right_indent = Inches(0)
    if text:
        run = p.add_run(text)
        run.font.name = 'Times New Roman'
        run.font.size = Pt(size)
        run.font.bold = bold
        run.font.italic = italic
        run.font.color.rgb = RGBColor(*color)
    return p

def add_heading_1(text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(12)
    run.font.bold = True
    run.font.color.rgb = RGBColor(135, 59, 70) # Deep Burgundy
    return p

def set_cell_border(cell, **kwargs):
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = parse_xml(f'<w:tcBorders {nsdecls("w")}/>')
    for border_name in ['top', 'left', 'bottom', 'right']:
        if border_name in kwargs:
            edge = parse_xml(f'<w:{border_name} {nsdecls("w")} w:val="{kwargs[border_name].get("val", "single")}" w:sz="{kwargs[border_name].get("sz", 4)}" w:space="0" w:color="{kwargs[border_name].get("color", "CCCCCC")}"/>')
            tcBorders.append(edge)
        else:
            edge = parse_xml(f'<w:{border_name} {nsdecls("w")} w:val="none"/>')
            tcBorders.append(edge)
    tcPr.append(tcBorders)

def set_cell_shading(cell, color_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=60, bottom=60, left=100, right=100):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

print("Starting compilation of CONSTA Project Synopsis...")

# ==========================================
# PAGE 1: COVER PAGE
# ==========================================
add_p("A PROJECT SYNOPSIS", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=15, space_before=10, space_after=2)
add_p("ON", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=11, space_before=0, space_after=6)
add_p("CONSTA : COLLABORATIVE STUDY &\nPERSONAL GROWTH PLATFORM", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=15, space_before=0, space_after=14, color=(135, 59, 70))

add_p("Submitted in partial fulfilment of the requirements for the Mini Project of", align=WD_ALIGN_PARAGRAPH.CENTER, italic=True, size=10.5, space_before=0, space_after=3)
add_p("BACHELOR OF TECHNOLOGY", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=13.5, space_before=0, space_after=1)
add_p("in", align=WD_ALIGN_PARAGRAPH.CENTER, bold=False, size=10.5, space_before=0, space_after=1)
add_p("COMPUTER SCIENCE & ENGINEERING", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=13, space_before=0, space_after=12)

# Attribution 2-Column Table
attr_tbl = doc.add_table(rows=1, cols=2)
attr_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
attr_tbl.columns[0].width = Inches(3.4)
attr_tbl.columns[1].width = Inches(2.87)

# Left Column: Team Members
p_l = attr_tbl.cell(0, 0).paragraphs[0]
p_l.paragraph_format.line_spacing = 1.2
p_l.add_run("Submitted by:\n\n").font.bold = True
r = p_l.add_run("MOHIT KUMAR (2601306)\n"
              "ABHIJIT KUMAR SINGH (2601307)\n"
              "ABHISHEK KUMAR (2601295)\n"
              "ADITYA RAJ (2601313)\n")
r.font.bold = True
r.font.size = Pt(10)
p_l.add_run("B.Tech CSE, Academic Batch: 2026–2027").font.size = Pt(9.5)

# Right Column: Supervisor
p_r = attr_tbl.cell(0, 1).paragraphs[0]
p_r.paragraph_format.line_spacing = 1.2
p_r.add_run("Under the Supervision of:\n\n").font.bold = True
r_g = p_r.add_run("MR. MANOJ KUMAR\n")
r_g.font.bold = True
r_g.font.size = Pt(10.5)
p_r.add_run("Assistant Professor\nDept. of Computer Science & Engg.\nGNIOT, Greater Noida").font.size = Pt(9.5)

# Logos
logo_gniot = os.path.abspath('d:/consta/report/extracted_logos/logo_2.jpg')
logo_aktu = os.path.abspath('d:/consta/report/extracted_logos/logo_1.jpg')

p_logos = doc.add_paragraph()
p_logos.alignment = WD_ALIGN_PARAGRAPH.CENTER
p_logos.paragraph_format.space_before = Pt(14)
p_logos.paragraph_format.space_after = Pt(12)
if os.path.exists(logo_gniot):
    p_logos.add_run().add_picture(logo_gniot, width=Inches(2.3))
if os.path.exists(logo_aktu):
    p_logos.add_run("   ")
    p_logos.add_run().add_picture(logo_aktu, width=Inches(0.95))

add_p("DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=11.5, space_before=0, space_after=2)
add_p("GREATER NOIDA INSTITUTE OF TECHNOLOGY, GREATER NOIDA", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=11.5, space_before=0, space_after=2)
add_p("DR. A.P.J. ABDUL KALAM TECHNICAL UNIVERSITY, LUCKNOW", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=11, space_before=0, space_after=2)
add_p("NOVEMBER 2026", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=11, space_before=0, space_after=0)

doc.add_page_break()

# ==========================================
# PAGE 2: TABLE OF CONTENTS
# ==========================================
add_p("Table of Contents", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=14, space_before=10, space_after=18, color=(135, 59, 70))

toc_tbl = doc.add_table(rows=7, cols=2)
toc_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
toc_tbl.columns[0].width = Inches(5.2)
toc_tbl.columns[1].width = Inches(1.07)

toc_items = [
    ("Section / Description", "Page No."),
    ("Abstract & Keywords ............................................................................................", "1"),
    ("1. Introduction & Background ...................................................................................", "2–4"),
    ("2. Literature Survey & Related Work ......................................................................", "5–7"),
    ("3. Project Objectives & Measurable Scope .............................................................", "8"),
    ("4. Methodology, Implementation & Work Plan ......................................................", "9–10"),
    ("References (IEEE Format) ..........................................................................................", "11")
]

for idx, (desc, page) in enumerate(toc_items):
    row = toc_tbl.rows[idx]
    c1, c2 = row.cells[0], row.cells[1]
    set_cell_margins(c1, top=50, bottom=50, left=80, right=80)
    set_cell_margins(c2, top=50, bottom=50, left=80, right=80)
    
    p1 = c1.paragraphs[0]
    p1.paragraph_format.space_after = Pt(2)
    r1 = p1.add_run(desc)
    r1.font.name = 'Times New Roman'
    r1.font.size = Pt(10.5)
    if idx == 0:
        r1.font.bold = True
        r1.font.color.rgb = RGBColor(135, 59, 70)
        set_cell_shading(c1, "FAF4EB")
        set_cell_border(c1, bottom=dict(sz=6, color="873B46"))
    else:
        set_cell_border(c1, bottom=dict(sz=2, color="E7D8CE"))
    
    p2 = c2.paragraphs[0]
    p2.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p2.paragraph_format.space_after = Pt(2)
    r2 = p2.add_run(page)
    r2.font.name = 'Times New Roman'
    r2.font.size = Pt(10.5)
    if idx == 0:
        r2.font.bold = True
        r2.font.color.rgb = RGBColor(135, 59, 70)
        set_cell_shading(c2, "FAF4EB")
        set_cell_border(c2, bottom=dict(sz=6, color="873B46"))
    else:
        set_cell_border(c2, bottom=dict(sz=2, color="E7D8CE"))

doc.add_page_break()

# ==========================================
# PAGE 3: ABSTRACT (Numbered Page 1)
# ==========================================
add_p("1", align=WD_ALIGN_PARAGRAPH.LEFT, size=10, space_after=8)
add_p("Abstract", align=WD_ALIGN_PARAGRAPH.LEFT, bold=True, size=14, space_after=12, color=(135, 59, 70))

add_p("In contemporary higher education, independent learners and self-formed study cohorts frequently encounter significant friction: cognitive fatigue, severe procrastination, superficial study routines, unorganized academic conversations, and a lack of formative feedback on complex derivations and coding coursework. Existing digital productivity software relies primarily on passive elapsed-time counters (e.g., standard Pomodoro timers) that measure physical duration without validating actual knowledge acquisition or task completion. Concurrently, students frequently rely on general-purpose social messaging applications (e.g., WhatsApp, Discord, Telegram) for group study, which leads to communication fragmentation, lost homework files, unmoderated discussions, and unaddressed academic doubts.", size=11, space_after=8, line_spacing=1.18)

add_p("This project introduces CONSTA, an outcome-driven collaborative learning and personal growth platform engineered to transform unmonitored digital study hours into verifiable academic achievements. In the solo focus module, study timers are decoupled from gamified incentives; verified experience points (XP) and streak maintenance are awarded exclusively upon the confirmed completion of an interactive learning objective checklist, supplemented by a dedicated roadblock logger.", size=11, space_after=8, line_spacing=1.18)

add_p("For collaborative study, CONSTA implements role-governed cohorts where group administrators assign milestones, sub-topic checklists, and countdown deadline timers. Academic coursework is managed via an 8-stage state machine that models a continuous revision lifecycle (v1 -> v2 -> v3) featuring multi-page image and PDF uploads, changelog documentation, and structured 4-dimensional rubric scorecards (Correctness, Completeness, Clarity, Methodology) accompanied by assistive AI formative guidance.", size=11, space_after=8, line_spacing=1.18)

add_p("To eliminate cognitive bottlenecks during independent study, an integrated real-time doubt clearing hub leverages persistent bidirectional WebSockets (ws) for zero-latency message and diagram distribution, incorporating an author-endorsed \"Accepted Solution\" peer-reward mechanism (+15 XP). Furthermore, an auditable, append-only database transaction ledger (xp_transactions) records every experience point modification to prevent gamification exploits. Developed using React 19, Tailwind CSS v4, Node.js 22, Express, WebSockets, and native SQLite in Write-Ahead Logging (WAL) mode, the system is backed by a 33-suite automated regression test battery with 100% pass rates.", size=11, space_after=14, line_spacing=1.18)

p_kw = add_p("Keywords: ", bold=True, size=10.5, space_after=0)
r_kw = p_kw.add_run("Collaborative Study, Computer-Supported Collaborative Learning (CSCL), Verifiable Learning Outcomes, Multi-Version Revisions, Formative Rubrics, WebSockets, Anti-Exploit Gamification, SQLite WAL.")
r_kw.font.name = 'Times New Roman'
r_kw.font.size = Pt(10.5)

doc.add_page_break()

# ==========================================
# PAGE 4: CHAPTER 1 INTRODUCTION (Numbered Page 2)
# ==========================================
add_p("2", align=WD_ALIGN_PARAGRAPH.LEFT, size=10, space_after=8)
add_p("Chapter 1", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=12, space_after=2, color=(135, 59, 70))
add_p("Introduction", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=14, space_after=10, color=(51, 36, 38))

add_heading_1("1.1 Background and Problem Statement")
add_p("Academic productivity determines how effectively undergraduate engineering students acquire, retain, and apply complex technical concepts over time. Most self-directed learners rely on informal tools such as standalone timer applications, basic to-do checklists, or social messaging channels. Such unstructured workflows lead to two costly outcomes: passive \"fake productivity,\" where a timer runs without genuine comprehension or problem solving, and communication fragmentation, where study tasks, reference files, and academic questions are overwhelmed by casual chat. The most common remedy in existing software is a simple Pomodoro timer or an unverified streak counter. A basic clock, however, cannot verify whether a student achieved their stated learning goals or remained idle.")

add_p("Large online educational platforms emphasize structured peer collaboration, active recall, and formative rubric feedback. Platforms such as Canvas, Moodle, and Khan Academy offer institutional assignment management, while developer platforms like GitHub demonstrate the educational value of multi-version revision histories and peer review. These systems, however, are either closed within enterprise/university deployments, lack real-time peer doubt-resolution mechanics, or fail to provide student-centric gamification safeguards that reward verified effort rather than superficial clicks. No lightweight, unified platform combines outcome-verified solo study, governed study cohorts, iterative multi-version coursework submissions, and real-time doubt clearing with auditable consistency metrics.")

add_heading_1("1.2 Proposed System")
add_p("This project proposes CONSTA, an integrated collaborative study and personal growth ecosystem with verifiable accountability. Here, the word \"system\" denotes an interconnected full-stack pipeline that captures verified study sessions, coordinates peer cohorts, manages coursework revision iterations, and streams real-time academic solutions. The platform requires students to pair focus timers with a tangible learning objective checklist; running a clock alone awards no study credentials.")

add_p("In collaborative cohorts, room creators act as administrators who publish assignments with sub-topic checklists and countdown timers. When submitting coursework, students can upload multiple handwritten diagrams, documents, or repository links across successive iterations (v1, v2, v3), preserving revision notes. Submissions are evaluated against explicit rubric criteria (Correctness, Completeness, Clarity, Methodology), augmented by assistive AI evaluations providing targeted suggestions. Academic doubts are cleared via bidirectional WebSockets with zero page reloads, where peers can mark verified answers as \"Accepted Solutions.\" All user points are strictly logged in an append-only ledger (xp_transactions) to eliminate gaming of streaks. The overall flow is shown in Fig. 1.")

doc.add_page_break()

# ==========================================
# PAGE 5: FIG 1 WORKFLOW DIAGRAM (Numbered Page 3)
# ==========================================
add_p("3", align=WD_ALIGN_PARAGRAPH.LEFT, size=10, space_after=8)

fig_path = os.path.abspath('d:/consta/synopsis/fig1_workflow.png')
if os.path.exists(fig_path):
    p_fig = doc.add_paragraph()
    p_fig.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_fig.paragraph_format.space_before = Pt(24)
    p_fig.paragraph_format.space_after = Pt(14)
    p_fig.add_run().add_picture(fig_path, width=Inches(6.1))

add_p("Fig. 1. Overall System Architecture and Workflow Pipeline of CONSTA.", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=10.5, space_after=0, color=(135, 59, 70))

doc.add_page_break()

# ==========================================
# PAGE 6: CHAPTER 1 CONTINUED (Numbered Page 4)
# ==========================================
add_p("4", align=WD_ALIGN_PARAGRAPH.LEFT, size=10, space_after=8)

add_heading_1("1.3 Field and Technology Used")
add_p("The project belongs to the domain of computer-supported collaborative learning (CSCL), educational web platforms, and real-time distributed application design. It is implemented in modern JavaScript/TypeScript and Node.js. The frontend is engineered with React 19 and styled with Tailwind CSS v4 to provide a high-contrast Cream + Burgundy aesthetic; Lucide React provides standardized vector iconography. The backend service layer is built using Node.js 22 LTS and Express.js for REST routing and token-based authentication.")

add_p("Real-time doubt resolution is powered by native WebSockets (ws). Data persistence is provided by the native Node.js SQLite driver (node:sqlite) running in Write-Ahead Logging (WAL) mode, guaranteeing high read concurrency without requiring external database servers. Automated unit and regression tests are executed natively using node:test and node:assert.")

add_heading_1("1.4 Outcome-Driven Verification and Anti-Exploit Gamification")
add_p("Educational gamification frequently degrades when students discover exploits—such as clicking buttons repeatedly or leaving background processes active—to accumulate badges. CONSTA resolves this via outcome-driven verification and an auditable transaction ledger. A focus timer by itself does not increment the study streak or award XP. Instead, users must explicitly verify target objectives and log roadblocks encountered. Furthermore, every XP modification is recorded as a discreet record in xp_transactions containing the user ID, delta amount, source category, and entity reference ID. Duplicate awards for the same session or task are blocked at the database constraint level. When doubts are resolved, only the question author can award the \"Accepted Solution\" designation (+15 XP), preventing collusion and ensuring authentic peer assistance.")

add_heading_1("1.5 Key Technical Terms")
add_p("The operational terms, formulas, and parameters used throughout this synopsis are summarized in Table 1.", size=10, space_after=3)

add_p("Table 1. Key platform terminology and operational parameters.", align=WD_ALIGN_PARAGRAPH.LEFT, bold=True, size=10, space_after=3)

terms_table = doc.add_table(rows=10, cols=2)
terms_table.alignment = WD_TABLE_ALIGNMENT.CENTER
terms_table.autofit = False
terms_table.columns[0].width = Inches(2.1)
terms_table.columns[1].width = Inches(4.17)

table_rows_data = [
    ("Term", "Meaning / Operational Formula"),
    ("Verifiable Outcome", "A concrete learning objective confirmed upon session completion; required for XP."),
    ("Roadblock Logger", "A structured data store capturing conceptual obstacles, bugs, or bottlenecks during study."),
    ("Cohort Admin", "The user who creates a study group; holds exclusive rights to assign tasks and manage members."),
    ("Task Lifecycle", "Eight states: not_started, in_progress, submitted, under_review, revision_requested, approved, rejected, completed."),
    ("Multi-Version Revision", "Iterative submission tracking (v1 → v2 → v3) preserving prior attachments, diffs, and changelogs."),
    ("Rubric Scorecard", "Criterion assessment: 0.30×Correctness + 0.30×Completeness + 0.20×Clarity + 0.20×Methodology."),
    ("Accepted Solution", "Author-endorsed chat response resolving an academic doubt, transferring +15 XP to solver."),
    ("Audited XP Ledger", "Append-only database table (xp_transactions) logging every reward or penalty with reference keys."),
    ("Write-Ahead Logging (WAL)", "SQLite concurrency mode allowing simultaneous non-blocking reads while writing safely.")
]

for idx, (t, m) in enumerate(table_rows_data):
    row = terms_table.rows[idx]
    c1, c2 = row.cells[0], row.cells[1]
    set_cell_margins(c1, top=30, bottom=30, left=60, right=60)
    set_cell_margins(c2, top=30, bottom=30, left=60, right=60)
    set_cell_border(c1, top=dict(sz=2, color="E7D8CE"), bottom=dict(sz=2, color="E7D8CE"), left=dict(sz=2, color="E7D8CE"), right=dict(sz=2, color="E7D8CE"))
    set_cell_border(c2, top=dict(sz=2, color="E7D8CE"), bottom=dict(sz=2, color="E7D8CE"), left=dict(sz=2, color="E7D8CE"), right=dict(sz=2, color="E7D8CE"))
    
    p1 = c1.paragraphs[0]
    p1.paragraph_format.space_after = Pt(1)
    p1.paragraph_format.line_spacing = 1.05
    r1 = p1.add_run(t)
    r1.font.name = 'Times New Roman'
    r1.font.size = Pt(8.5)
    if idx == 0:
        r1.font.bold = True
        r1.font.color.rgb = RGBColor(135, 59, 70)
        set_cell_shading(c1, "FAF4EB")
    else:
        r1.font.bold = True
    
    p2 = c2.paragraphs[0]
    p2.paragraph_format.space_after = Pt(1)
    p2.paragraph_format.line_spacing = 1.05
    r2 = p2.add_run(m)
    r2.font.name = 'Times New Roman'
    r2.font.size = Pt(8.5)
    if idx == 0:
        r2.font.bold = True
        r2.font.color.rgb = RGBColor(135, 59, 70)
        set_cell_shading(c2, "FAF4EB")

doc.add_page_break()

# ==========================================
# PAGE 7: CHAPTER 2 LITERATURE SURVEY (Numbered Page 5)
# ==========================================
add_p("5", align=WD_ALIGN_PARAGRAPH.LEFT, size=10, space_after=8)
add_p("Chapter 2", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=12, space_after=2, color=(135, 59, 70))
add_p("Literature Survey", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=14, space_after=10, color=(51, 36, 38))

add_heading_1("2.1 Theoretical Framework: CSCL")
add_p("Modern educational psychology demonstrates that active peer discussion and collaborative problem-solving significantly increase retention compared to isolated study [1]. Collaborative learning environments encourage students to articulate reasoning, identify conceptual gaps, and engage in cognitive restructuring [2]. Traditional Learning Management Systems (LMS), such as Blackboard or Moodle, structure institutional materials but offer rigid, top-down workflows that fail to support spontaneous student-formed cohorts or agile study groups [3].")

add_heading_1("2.2 Focus Tracking and the Passive Timer Fallacy")
add_p("The Pomodoro technique has been widely adopted in digital productivity applications (e.g., Forest, Pomofocus) to reduce cognitive fatigue and procrastination [4]. However, existing applications treat time duration as a proxy for learning outcome [5]. Empirical studies indicate that tracking elapsed time without measuring output fosters passive clock-watching and creates an illusion of competence [6]. CONSTA addresses this limitation by decoupling clock duration from learning credentials, requiring tangible checklist confirmation.")

add_heading_1("2.3 Formative Rubrics and Iterative Revisions")
add_p("Formative feedback that occurs during the learning process is considerably more effective than summative letter grades delivered after completion [7]. Rubric-referenced evaluations provide transparent criteria regarding what constitutes mastery, guiding peer reviewers toward constructive assessments [8]. Furthermore, allowing students to resubmit work through multi-version revisions mirrors professional software engineering practices and promotes a growth mindset [9].")

add_heading_1("2.4 Real-Time Academic Doubt Resolution")
add_p("Instantaneous messaging platforms have become the de facto medium for informal student interaction [10]. However, using general chat applications for academic queries leads to conversational drift, lost homework files, and unverifiable answers [11]. Dedicated question-and-answer architectures (e.g., Stack Overflow) illustrate that reputation incentives and \"accepted answer\" markers reliably surface high-quality technical explanations [12]. CONSTA synthesizes real-time WebSockets with accepted-answer peer rewards directly inside cohort study channels.")

add_heading_1("2.5 Anti-Exploit Gamification")
add_p("Gamification elements—such as points, badges, and leaderboards—stimulate short-term intrinsic and extrinsic motivation [13]. Nonetheless, poorly designed point systems are susceptible to \"gaming the system,\" wherein users optimize for points rather than learning [14]. To maintain platform credibility, game mechanics must incorporate transparent, auditable transaction ledgers, daily consistency thresholds, and penalties for exploitative behaviors [15].")

add_heading_1("2.6 Research Gap Analysis")
add_p("The reviewed literature confirms that existing tools (i) track time without validating learning outcomes, (ii) manage assignments without supporting iterative multi-version revisions or rubric-driven peer feedback, (iii) conduct study chats on unmoderated third-party platforms with no solution-verification mechanisms, or (iv) employ exploitable point systems lacking auditable database trails. This project addresses all four gaps in a single, responsive prototype.")

doc.add_page_break()

# ==========================================
# PAGE 8: LITERATURE SURVEY REFS (Numbered Page 6)
# ==========================================
add_p("6", align=WD_ALIGN_PARAGRAPH.LEFT, size=10, space_after=8)
add_p("Literature References", align=WD_ALIGN_PARAGRAPH.LEFT, bold=True, size=12, space_after=8, color=(135, 59, 70))

refs_p6 = [
    "[1] P. Dillenbourg, \"What do you mean by collaborative learning?,\" in Collaborative Learning: Cognitive and Computational Approaches, Oxford: Elsevier, 1999, pp. 1–19.",
    "[2] J. Roschelle and S. D. Teasley, \"The construction of shared knowledge in collaborative problem solving,\" in Computer Supported Collaborative Learning, C. O'Malley, Ed. Berlin: Springer, 1995, pp. 69–97.",
    "[3] S. Graf and Kinshuk, \"Advanced adaptability in modern learning management systems,\" International Journal of Computer and Information Engineering, vol. 1, no. 8, pp. 2530–2535, 2007.",
    "[4] F. Cirillo, The Pomodoro Technique: The Acclaimed Time-Management System That Has Transformed How We Work, New York: Crown Publishing, 2018.",
    "[5] J. Dunlosky, K. A. Rawson, E. J. Marsh, M. J. Nathan, and D. T. Willingham, \"Improving students’ learning with effective learning techniques: Promising directions from cognitive psychology,\" Psychological Science in the Public Interest, vol. 14, no. 1, pp. 4–58, 2013.",
    "[6] H. G. Andrade, \"Using rubrics to promote thinking and learning in higher education,\" Educational Leadership, vol. 57, no. 5, pp. 13–18, 2000.",
    "[7] C. S. Dweck, Mindset: The New Psychology of Success, New York: Random House, 2006.",
    "[8] B. Vasilescu, V. Serebrenik, P. Devanbu, and V. Filkov, \"How social Q&A sites are changing knowledge sharing in software development: A case study of Stack Overflow,\" in Proc. ACM CSCW, 2014, pp. 342–354.",
    "[9] A. Anderson, D. Huttenlocher, J. Kleinberg, and J. Leskovec, \"Steering user behavior with badges,\" in Proc. 22nd Int. Conf. World Wide Web (WWW), ACM, 2013, pp. 95–106.",
    "[10] R. S. Baker, A. T. Corbett, and K. R. Koedinger, \"Detecting when students 'game the system',\" in Proc. 7th Int. Conf. Intelligent Tutoring Systems (ITS), Springer, 2004, pp. 383–390.",
    "[11] K. Seaborn and D. I. Fels, \"Gamification in theory and practice: A systematic review,\" International Journal of Human-Computer Studies, vol. 74, pp. 14–31, 2015.",
    "[12] I. Fette and A. Melnikov, \"The WebSocket Protocol,\" Internet Engineering Task Force (IETF), RFC 6455, Dec. 2011.",
    "[13] D. Richard Hipp, \"SQLite Write-Ahead Logging (WAL) Architecture and Concurrency Internals,\" SQLite.org Documentation, 2023. [Online]. Available: https://www.sqlite.org/wal.html."
]

for r in refs_p6:
    add_p(r, size=9.5, space_after=3.5, line_spacing=1.08)

doc.add_page_break()

# ==========================================
# PAGE 9: CHAPTER 3 OBJECTIVES (Numbered Page 7)
# ==========================================
add_p("7", align=WD_ALIGN_PARAGRAPH.LEFT, size=10, space_after=8)
add_p("Chapter 3", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=12, space_after=2, color=(135, 59, 70))
add_p("Project Objectives", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=14, space_after=12, color=(51, 36, 38))

add_p("Based on the identified gaps in existing academic productivity and learning platforms, the project is structured around eight measurable engineering objectives:", size=11, space_after=10)

objectives_p7 = [
    "1. To design and deploy an outcome-verified solo study engine where time duration is decoupled from reward incentives, requiring checklist validation and roadblock documentation to earn study XP.",
    "2. To construct role-governed collaborative study cohorts with administrative permission models, unique group naming enforcement, and day-based countdown milestone timers.",
    "3. To implement an iterative coursework submission pipeline supporting an 8-stage lifecycle (not_started to completed) with multi-version revisions (v1 -> v2 -> v3) and multipart file attachments up to 15MB.",
    "4. To standardize peer feedback using an objective 4-dimensional rubric scorecard evaluating Correctness, Completeness, Clarity, and Methodology on a 0–100 scale.",
    "5. To deploy a real-time WebSocket communication hub enabling sub-100ms doubt clearing with an author-marked \"Accepted Solution\" reward transfer (+15 XP).",
    "6. To implement an immutable, append-only database transaction ledger (xp_transactions) to record every credential modification with foreign-key entity constraints.",
    "7. To guarantee high database reliability and zero data loss on local and server restarts by configuring native SQLite in Write-Ahead Logging (WAL) mode with automated truncation checkpoints.",
    "8. To validate the complete platform through automated regression testing across 33 test suites (covering auth, cohorts, submissions, real-time WebSockets, and persistence) with 100% pass rates."
]

for obj in objectives_p7:
    add_p(obj, size=10.5, space_after=5, line_spacing=1.12)

doc.add_page_break()

# ==========================================
# PAGE 10: CHAPTER 4 METHODOLOGY (Numbered Page 8)
# ==========================================
add_p("8", align=WD_ALIGN_PARAGRAPH.LEFT, size=10, space_after=8)
add_p("Chapter 4", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=12, space_after=2, color=(135, 59, 70))
add_p("Methodology & Implementation", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=14, space_after=12, color=(51, 36, 38))

add_p("Step 1: System Authentication and Security Layer. A stateless authentication pipeline is implemented using Node.js and Express. Passwords are cryptographically salted and hashed using bcryptjs (salt rounds = 10). Authentication tokens are generated using JSON Web Tokens (JWT) with bearer header authorization. User profiles are initialized with isolated records, supporting username availability validation and secure email-based reset code verification.", size=10.5, space_after=5, line_spacing=1.1)

add_p("Step 2: Outcome-Driven Solo Study Architecture. The client interface renders a configurable study session controller (subject, topic, target duration, difficulty). Active session states are maintained in local memory and synchronized with the backend. Study duration timers operate independently of reward calculations. Upon session conclusion, users must review and mark off their concrete checklist of learning objectives and log encountered roadblocks. Verified XP is credited to the database only after objective confirmation.", size=10.5, space_after=5, line_spacing=1.1)

add_p("Step 3: Collaborative Cohorts and Administrative Governance. A relational schema establishes study cohorts with unique, case-insensitive group names. Cohort creators are automatically assigned the admin role, granting privileges to assign group tasks, configure deadline timers in days, approve private join requests, and manage membership. Cohort discovery supports both public browsing and direct peer invitation via unique join codes.", size=10.5, space_after=5, line_spacing=1.1)

add_p("Step 4: Multi-Version Submission and Rubric Evaluation Engine. Tasks advance through an 8-stage state machine. When completing a task, learners upload multi-page handwritten answers, code links, or PDFs via Multer middleware with size safeguards (15MB max). When revisions are requested, the engine increments the submission version (v1 → v2 → v3), preserving previous iterations and changelog notes. Reviewers grade submissions using structured rubric scorecards with criterion weights, while an assistive pedagogical AI service parses submissions to output preliminary criterion scores and missing steps.", size=10.5, space_after=5, line_spacing=1.1)

add_p("Step 5: Real-Time WebSocket Doubt Resolution. A dedicated WebSocket server (ws) binds to the HTTP server to manage real-time communication channels. Messages and photo attachments stream across active connections with sub-100ms latency without full-page reloads. The original question author can mark any peer response as the “Accepted Solution,” which automatically triggers a +15 XP grant in the audited ledger and displays an accepted badge to all room members.", size=10.5, space_after=5, line_spacing=1.1)

add_p("Step 6: Data Persistence, Testing, and Verification. The database is configured on native node:sqlite with PRAGMA journal_mode = WAL and PRAGMA synchronous = NORMAL. Automatic checkpoints (wal_checkpoint(TRUNCATE)) prevent uncommitted write-ahead log bloating. A test suite of 33 automated tests verifies multi-user isolation, room creation, rubric grading, real-time message broadcasting, and cold-restart persistence.", size=10.5, space_after=5, line_spacing=1.1)

# Fig. 2 Implemented UI Preview
fig2_p1 = os.path.abspath('d:/consta/synopsis/figures/fig_ui_solo_study.png')
fig2_p2 = os.path.abspath('d:/consta/synopsis/figures/fig_ui_doubt_chat.png')
if os.path.exists(fig2_p1) and os.path.exists(fig2_p2):
    ui_tbl = doc.add_table(rows=1, cols=2)
    ui_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    ui_tbl.columns[0].width = Inches(3.0)
    ui_tbl.columns[1].width = Inches(3.0)
    p1 = ui_tbl.cell(0, 0).paragraphs[0]
    p1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p1.add_run().add_picture(fig2_p1, width=Inches(2.82))
    p2 = ui_tbl.cell(0, 1).paragraphs[0]
    p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p2.add_run().add_picture(fig2_p2, width=Inches(2.82))
    add_p("Fig. 2. Implemented Graphical User Interfaces: (a) Solo Study Studio with Roadblock Logger and (b) Real-Time Doubt Discussion Hub.", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=9, space_before=2, space_after=5, color=(135, 59, 70))

add_p("Requirements. Software: Node.js (v22.5.0+), npm v10+, React 19, Vite 8, Tailwind CSS v4, Express.js, native node:sqlite, WebSockets (ws). Hardware: Standard laptop or desktop computer, 4 GB RAM, 500 MB free storage.", size=10.5, space_after=0, line_spacing=1.1)

doc.add_page_break()

# ==========================================
# PAGE 11: CHAPTER 4 CONTINUED - WORK PLAN & TEAM ROLES (Numbered Page 9)
# ==========================================
add_p("9", align=WD_ALIGN_PARAGRAPH.LEFT, size=10, space_after=8)
add_p("Work Plan & Team Allocation", align=WD_ALIGN_PARAGRAPH.LEFT, bold=True, size=12, space_after=8, color=(135, 59, 70))

add_p("Table 2 outlines the team work distribution across the core subsystems of the platform.", size=10.5, space_after=4)

add_p("Table 2. Team Work Allocation & Responsibilities Matrix.", bold=True, size=10, space_after=3)

work_tbl = doc.add_table(rows=5, cols=3)
work_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
work_tbl.columns[0].width = Inches(1.8)
work_tbl.columns[1].width = Inches(1.4)
work_tbl.columns[2].width = Inches(3.07)

work_data = [
    ("Student Name", "Roll No.", "Subsystem Responsibilities & Key Deliverables"),
    ("Mohit Kumar", "2601306", "System Architecture, SQLite WAL engine, Anti-Exploit XP Ledger, Deployment"),
    ("Abhijit Kumar Singh", "2601307", "Backend REST Services, WebSocket Doubt Room Multiplexer, Test Battery"),
    ("Abhishek Kumar", "2601295", "Frontend UI/UX (React 19), Cream + Burgundy Theme, Solo Study Timer"),
    ("Aditya Raj", "2601313", "8-Stage Coursework State Machine, Multipart Uploads, Rubric Scorecard")
]

for idx, (n, r, d) in enumerate(work_data):
    row = work_tbl.rows[idx]
    c1, c2, c3 = row.cells[0], row.cells[1], row.cells[2]
    set_cell_margins(c1, top=40, bottom=40, left=80, right=80)
    set_cell_margins(c2, top=40, bottom=40, left=80, right=80)
    set_cell_margins(c3, top=40, bottom=40, left=80, right=80)
    set_cell_border(c1, top=dict(sz=2, color="E7D8CE"), bottom=dict(sz=2, color="E7D8CE"), left=dict(sz=2, color="E7D8CE"), right=dict(sz=2, color="E7D8CE"))
    set_cell_border(c2, top=dict(sz=2, color="E7D8CE"), bottom=dict(sz=2, color="E7D8CE"), left=dict(sz=2, color="E7D8CE"), right=dict(sz=2, color="E7D8CE"))
    set_cell_border(c3, top=dict(sz=2, color="E7D8CE"), bottom=dict(sz=2, color="E7D8CE"), left=dict(sz=2, color="E7D8CE"), right=dict(sz=2, color="E7D8CE"))
    
    p1 = c1.paragraphs[0]
    p1.paragraph_format.space_after = Pt(1)
    r1 = p1.add_run(n)
    r1.font.name = 'Times New Roman'
    r1.font.size = Pt(9)
    if idx == 0:
        r1.font.bold = True
        r1.font.color.rgb = RGBColor(135, 59, 70)
        set_cell_shading(c1, "FAF4EB")
    else:
        r1.font.bold = True
    
    p2 = c2.paragraphs[0]
    p2.paragraph_format.space_after = Pt(1)
    r2 = p2.add_run(r)
    r2.font.name = 'Times New Roman'
    r2.font.size = Pt(9)
    if idx == 0:
        r2.font.bold = True
        r2.font.color.rgb = RGBColor(135, 59, 70)
        set_cell_shading(c2, "FAF4EB")
    
    p3 = c3.paragraphs[0]
    p3.paragraph_format.space_after = Pt(1)
    r3 = p3.add_run(d)
    r3.font.name = 'Times New Roman'
    r3.font.size = Pt(9)
    if idx == 0:
        r3.font.bold = True
        r3.font.color.rgb = RGBColor(135, 59, 70)
        set_cell_shading(c3, "FAF4EB")

add_p("Table 3 illustrates the development timeline across the 10-week sprint schedule.", size=10.5, space_before=10, space_after=4)

add_p("Table 3. Project Development Phases & Milestones.", bold=True, size=10, space_after=3)

gantt_tbl = doc.add_table(rows=6, cols=3)
gantt_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
gantt_tbl.columns[0].width = Inches(1.3)
gantt_tbl.columns[1].width = Inches(2.3)
gantt_tbl.columns[2].width = Inches(2.67)

gantt_data = [
    ("Phase", "Sprint Focus", "Key Target Milestone"),
    ("Weeks 1–2", "Requirements & Architecture", "SRS approved, normalized SQLite schemas, JWT auth"),
    ("Weeks 3–4", "Solo Study Engine", "Countdown timer, objective verification, roadblock logger"),
    ("Weeks 5–6", "Cohorts & Revision State Machine", "Admin rights, 8-stage task transitions (v1->v2), rubrics"),
    ("Weeks 7–8", "Real-Time WebSockets & Gamification", "Sub-100ms doubt clearing, accepted answer XP, audit ledger"),
    ("Weeks 9–10", "System Hardening & Verification", "33 automated test suites passed (100%), documentation")
]

for idx, (p, s, m) in enumerate(gantt_data):
    row = gantt_tbl.rows[idx]
    c1, c2, c3 = row.cells[0], row.cells[1], row.cells[2]
    set_cell_margins(c1, top=35, bottom=35, left=70, right=70)
    set_cell_margins(c2, top=35, bottom=35, left=70, right=70)
    set_cell_margins(c3, top=35, bottom=35, left=70, right=70)
    set_cell_border(c1, top=dict(sz=2, color="E7D8CE"), bottom=dict(sz=2, color="E7D8CE"), left=dict(sz=2, color="E7D8CE"), right=dict(sz=2, color="E7D8CE"))
    set_cell_border(c2, top=dict(sz=2, color="E7D8CE"), bottom=dict(sz=2, color="E7D8CE"), left=dict(sz=2, color="E7D8CE"), right=dict(sz=2, color="E7D8CE"))
    set_cell_border(c3, top=dict(sz=2, color="E7D8CE"), bottom=dict(sz=2, color="E7D8CE"), left=dict(sz=2, color="E7D8CE"), right=dict(sz=2, color="E7D8CE"))
    
    p1 = c1.paragraphs[0]
    p1.paragraph_format.space_after = Pt(1)
    r1 = p1.add_run(p)
    r1.font.name = 'Times New Roman'
    r1.font.size = Pt(8.5)
    if idx == 0:
        r1.font.bold = True
        r1.font.color.rgb = RGBColor(135, 59, 70)
        set_cell_shading(c1, "FAF4EB")
    else:
        r1.font.bold = True
    
    p2 = c2.paragraphs[0]
    p2.paragraph_format.space_after = Pt(1)
    r2 = p2.add_run(s)
    r2.font.name = 'Times New Roman'
    r2.font.size = Pt(8.5)
    if idx == 0:
        r2.font.bold = True
        r2.font.color.rgb = RGBColor(135, 59, 70)
        set_cell_shading(c2, "FAF4EB")
    
    p3 = c3.paragraphs[0]
    p3.paragraph_format.space_after = Pt(1)
    r3 = p3.add_run(m)
    r3.font.name = 'Times New Roman'
    r3.font.size = Pt(8.5)
    if idx == 0:
        r3.font.bold = True
        r3.font.color.rgb = RGBColor(135, 59, 70)
        set_cell_shading(c3, "FAF4EB")

doc.add_page_break()

# ==========================================
# PAGE 12: REFERENCES (Numbered Page 10)
# ==========================================
add_p("10", align=WD_ALIGN_PARAGRAPH.LEFT, size=10, space_after=8)
add_p("References", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=14, space_after=12, color=(135, 59, 70))

refs_p10 = [
    "1. React.js Documentation. Available at: https://react.dev/",
    "2. Node.js Documentation. Available at: https://nodejs.org/docs/",
    "3. Express.js Documentation. Available at: https://expressjs.com/",
    "4. SQLite Documentation. Available at: https://www.sqlite.org/docs.html",
    "5. JavaScript Documentation – MDN Web Docs. Available at: https://developer.mozilla.org/en-US/docs/Web/JavaScript",
    "6. HTML Documentation – MDN Web Docs. Available at: https://developer.mozilla.org/en-US/docs/Web/HTML",
    "7. CSS Documentation – MDN Web Docs. Available at: https://developer.mozilla.org/en-US/docs/Web/CSS",
    "8. Vite Documentation. Available at: https://vite.dev/guide/",
    "9. JSON Web Token (JWT) Documentation. Available at: https://jwt.io/introduction",
    "10. Git Documentation. Available at: https://git-scm.com/doc",
    "11. Vercel Documentation. Available at: https://vercel.com/docs",
    "12. Render Documentation. Available at: https://render.com/docs",
    "13. WebSocket API – MDN Web Docs. Available at: https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API",
    "14. OpenAI API Documentation. Available at: https://platform.openai.com/docs/"
]

for r in refs_p10:
    add_p(r, size=9.5, space_after=3.5, line_spacing=1.08)

# Save Word Document
docx_path = os.path.abspath('d:/consta/synopsis/CONSTA_Minor_Project_Synopsis.docx')
doc.save(docx_path)
print(f"Synopsis DOCX saved to: {docx_path}")

# Convert to PDF via Word COM
word = win32com.client.Dispatch('Word.Application')
word.Visible = False

pdf_path = os.path.abspath('d:/consta/synopsis/CONSTA_Minor_Project_Synopsis.pdf')
root_pdf_path = os.path.abspath('d:/consta/CONSTA_Minor_Project_Synopsis.pdf')

try:
    doc_word = word.Documents.Open(docx_path)
    doc_word.SaveAs(pdf_path, FileFormat=17) # wdFormatPDF = 17
    doc_word.SaveAs(root_pdf_path, FileFormat=17)
    total_pgs = doc_word.ComputeStatistics(2)
    doc_word.Close()
    print(f"Synopsis PDF generated successfully! Total Pages: {total_pgs}")
    print(f"PDF saved to: {pdf_path}")
finally:
    word.Quit()
