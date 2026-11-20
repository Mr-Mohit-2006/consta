import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn
import win32com.client

doc = Document()

# Page Setup: Standard A4 with 1.0 inch margins
for section in doc.sections:
    section.top_margin = Inches(1.0)
    section.bottom_margin = Inches(1.0)
    section.left_margin = Inches(1.0)
    section.right_margin = Inches(1.0)
    section.page_width = Inches(8.27)
    section.page_height = Inches(11.69)
    
    # Standard footer with centered page number
    footer = section.footer
    p_ft = footer.paragraphs[0]
    p_ft.alignment = WD_ALIGN_PARAGRAPH.CENTER
    fldSimple = OxmlElement('w:fldSimple')
    fldSimple.set(qn('w:instr'), 'PAGE')
    p_ft._p.append(fldSimple)
    for run in p_ft.runs:
        run.font.name = 'Times New Roman'
        run.font.size = Pt(10)

def add_p(text="", align=WD_ALIGN_PARAGRAPH.JUSTIFY, bold=False, italic=False, size=11,
          space_before=0, space_after=6, line_spacing=1.2, color=(0, 0, 0)):
    p = doc.add_paragraph()
    p.alignment = align
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = line_spacing
    if text:
        run = p.add_run(text)
        run.font.name = 'Times New Roman'
        run.font.size = Pt(size)
        run.font.bold = bold
        run.font.italic = italic
        run.font.color.rgb = RGBColor(*color)
    return p

def add_heading_main(text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(16)
    p.paragraph_format.space_after = Pt(8)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(13)
    run.font.bold = True
    return p

def add_heading_sub(text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(11.5)
    run.font.bold = True
    return p

def add_num_item(num_str, text, space_after=4):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.2
    p.paragraph_format.left_indent = Inches(0.35)
    p.paragraph_format.first_line_indent = Inches(-0.35)
    r_n = p.add_run(num_str + " ")
    r_n.font.name = 'Times New Roman'
    r_n.font.size = Pt(11)
    r_n.font.bold = True
    r_t = p.add_run(text)
    r_t.font.name = 'Times New Roman'
    r_t.font.size = Pt(11)
    return p

# =========================================================
# FORM 2 - PATENT COVER & SPECIFICATION HEADER
# =========================================================
add_p("FORM 2", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=14, space_before=0, space_after=2)
add_p("THE PATENTS ACT, 1970", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=12, space_before=0, space_after=2)
add_p("(39 of 1970)", align=WD_ALIGN_PARAGRAPH.CENTER, bold=False, size=10, space_before=0, space_after=2)
add_p("&", align=WD_ALIGN_PARAGRAPH.CENTER, bold=False, size=10, space_before=0, space_after=2)
add_p("THE PATENTS RULES, 2003", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=12, space_before=0, space_after=2)
add_p("COMPLETE SPECIFICATION", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=13, space_before=0, space_after=2)
add_p("(See Section 10 and Rule 13)", align=WD_ALIGN_PARAGRAPH.CENTER, italic=True, size=10, space_before=0, space_after=14)

add_p("1. TITLE OF THE INVENTION", align=WD_ALIGN_PARAGRAPH.LEFT, bold=True, size=11, space_before=8, space_after=3)
add_p("AN OUTCOME-VERIFIED COLLABORATIVE LEARNING PLATFORM WITH REVISION GOVERNANCE AND ANTI-EXPLOIT TRANSACTION LEDGER",
      align=WD_ALIGN_PARAGRAPH.JUSTIFY, bold=True, size=12, space_before=0, space_after=14, color=(135, 59, 70))

add_p("2. APPLICANTS DETAILS", align=WD_ALIGN_PARAGRAPH.LEFT, bold=True, size=11, space_before=6, space_after=4)

# Applicants Table
app_table = doc.add_table(rows=5, cols=3)
app_table.alignment = WD_TABLE_ALIGNMENT.CENTER
app_table.columns[0].width = Inches(1.8)
app_table.columns[1].width = Inches(1.1)
app_table.columns[2].width = Inches(3.37)

headers = ["Name of Applicant", "Nationality", "Address"]
for i, h in enumerate(headers):
    c = app_table.rows[0].cells[i]
    p = c.paragraphs[0]
    r = p.add_run(h)
    r.font.name = 'Times New Roman'
    r.font.bold = True
    r.font.size = Pt(10)

applicants_data = [
    ("MOHIT KUMAR", "Indian", "Greater Noida Institute of Technology (GNIOT), Plot No. 7, Knowledge Park II, Greater Noida, UP - 201310"),
    ("ABHIJIT KUMAR SINGH", "Indian", "Greater Noida Institute of Technology (GNIOT), Plot No. 7, Knowledge Park II, Greater Noida, UP - 201310"),
    ("ABHISHEK KUMAR", "Indian", "Greater Noida Institute of Technology (GNIOT), Plot No. 7, Knowledge Park II, Greater Noida, UP - 201310"),
    ("ADITYA RAJ", "Indian", "Greater Noida Institute of Technology (GNIOT), Plot No. 7, Knowledge Park II, Greater Noida, UP - 201310")
]

for row_idx, data in enumerate(applicants_data):
    row = app_table.rows[row_idx + 1]
    for col_idx, val in enumerate(data):
        c = row.cells[col_idx]
        p = c.paragraphs[0]
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        r = p.add_run(val)
        r.font.name = 'Times New Roman'
        r.font.size = Pt(9.5)
        if col_idx == 0:
            r.font.bold = True

add_p("3. PREAMBLE TO THE DESCRIPTION", align=WD_ALIGN_PARAGRAPH.LEFT, bold=True, size=11, space_before=14, space_after=3)
add_p("The following specification particularly describes the invention and the manner in which it is to be performed:",
      align=WD_ALIGN_PARAGRAPH.JUSTIFY, italic=True, size=11, space_before=0, space_after=14)

doc.add_page_break()

# =========================================================
# PATENT SPECIFICATION BODY
# =========================================================
add_heading_main("DESCRIPTION OF THE INVENTION")

add_heading_sub("FIELD OF THE INVENTION")
add_p("The present invention generally relates to the field of educational technology, computer-supported collaborative learning (CSCL), and distributed web platforms. More particularly, the invention relates to an outcome-verified collaborative learning system and computing method that decouples study duration counters from reward mechanisms, establishes an 8-stage coursework revision finite state machine, delivers sub-100 millisecond peer doubt resolution over bidirectional WebSockets, and maintains an auditable, append-only database transaction ledger to prevent gamification exploits.")

add_heading_sub("BACKGROUND OF THE INVENTION AND PRIOR ART")
add_p("In contemporary higher education, engineering students and self-directed learners experience severe academic friction, including cognitive fatigue, procrastination, superficial study routines, communication fragmentation across social messaging apps, and a lack of formative feedback during derivation and coding coursework. Traditional digital productivity applications (e.g., standard Pomodoro timers) quantify academic productivity strictly through elapsed physical time. However, measuring elapsed time duration without validating objective learning comprehension creates a fallacy of productivity, enabling users to remain idle while timers increment.")

add_p("Furthermore, conventional Learning Management Systems (LMS) enforce rigid, top-down instructor architectures that fail to accommodate agile, student-formed study cohorts. When students turn to commercial communication platforms (e.g., WhatsApp, Discord, Telegram) for academic discussions, homework files and derivations become buried beneath casual messages, questions remain unmoderated, and high-quality explanations are lost. Most critically, conventional educational gamification platforms rely on client-side state manipulation or direct database counter increments (e.g., raw SQL updates), leaving leaderboards vulnerable to point-farming exploits, duplicate submissions, and artificial streak inflation.")

add_p("Consequently, there exists an acute technological need for an outcome-driven collaborative learning platform that verifies actual learning achievements, structures iterative coursework revisions, facilitates real-time doubt clearing with authenticated peer endorsements, and guarantees absolute ledger integrity through an append-only audit trail.")

add_heading_sub("OBJECTS OF THE INVENTION")
add_p("It is a primary object of the present invention to provide an outcome-verified collaborative learning architecture where experience points (XP) and streak maintenance are awarded exclusively upon the confirmed completion of measurable learning objectives and roadblock logging, rather than passive time counters.")

add_p("It is another object of the present invention to provide an 8-stage deterministic task finite state machine that governs multi-version coursework submissions (v1 → v2 → v3) with 4-dimensional rubric scorecards and structured changelog documentation.")

add_p("It is yet another object of the present invention to provide a persistent bidirectional WebSocket communication hub that enables sub-100ms real-time doubt broadcasting with an author-marked 'Accepted Solution' peer reward mechanism (+15 XP).")

add_p("It is still another object of the present invention to provide an immutable, append-only database transaction ledger (`xp_transactions`) that logs every credit or debit with foreign-key constraints to permanently prevent duplicate point awards and gamification tampering.")

add_p("It is a further object of the present invention to provide a high-concurrency, lightweight persistence architecture using native SQLite in Write-Ahead Logging (WAL) mode with automated checkpoint truncation, guaranteeing complete crash recovery on cold restarts.")

add_heading_sub("SUMMARY OF THE INVENTION")
add_p("The present invention provides an outcome-verified collaborative learning system, known as CONSTA. The platform comprises a client interface layer engineered with React 19 and Tailwind CSS v4, an asynchronous backend application layer powered by Node.js 22 LTS and Express.js, a real-time messaging multiplexer utilizing native WebSockets (`ws`), and a high-concurrency relational data store configured on native SQLite in Write-Ahead Logging (WAL) mode.")

add_p("In the solo focus subsystem, the user interface renders an active session controller containing an interactive objective checklist builder and qualitative roadblock logger. Gamification incentives are cryptographically decoupled from the countdown clock; database write operations credit experience points and increment study streaks only when a verification ratio threshold is satisfied.")

add_p("In the collaborative cohort subsystem, unique join codes and administrative role models govern peer workspaces. Academic coursework is evaluated across eight distinct lifecycle states (not_started, in_progress, submitted, under_review, revision_requested, approved, rejected, completed). Iterative resubmissions increment version counters while preserving prior file attachments and rubric scorecards.")

add_p("In the real-time doubt subsystem, cohort message channels are multiplexed over persistent WebSocket connections. When a student query is resolved, the question author executes an atomic API request designating the peer response as the 'Accepted Solution', immediately dispatching an auditable +15 XP transaction to the solving student and broadcasting an accepted badge to all active room clients.")

add_p("Every point delta across the system is recorded in an append-only database ledger (`xp_transactions`) containing the user identifier, delta amount, source category, reference key, and server timestamp. Database triggers reject direct UPDATE and DELETE operations on the ledger, guaranteeing absolute tamper resistance.")

doc.add_page_break()

# =========================================================
# DRAWINGS & DETAILED DESCRIPTION
# =========================================================
add_heading_sub("BRIEF DESCRIPTION OF THE ACCOMPANYING DRAWINGS")
add_p("The features and advantages of the present invention will become more apparent from the following detailed description taken in conjunction with the accompanying drawings, wherein:")

add_p("Figure 1 illustrates the overall system architecture and multi-tier processing pipeline of the CONSTA platform according to an embodiment of the present invention.")
add_p("Figure 2 illustrates the Data Flow Diagram (DFD Level 1) decomposing the core functional services, process engines, and data stores of the platform.")
add_p("Figure 3 illustrates the Entity-Relationship (ER) relational database schema normalized to Boyce-Codd Normal Form (BCNF).")
add_p("Figure 4 illustrates the deterministic Finite State Machine governing the 8-stage iterative task submission and revision lifecycle.")
add_p("Figure 5 illustrates the comprehensive platform operational workflow and module interaction pipeline according to an embodiment of the present invention.")

add_heading_sub("DETAILED DESCRIPTION OF THE PREFERRED EMBODIMENTS")
add_p("Referring now to the drawings in detail, and initially to Figure 1, there is shown an exemplary multi-tier architecture of the CONSTA collaborative learning platform. The system is structurally partitioned into a Client Presentation Tier (100), an Application Service Tier (200), a Real-Time Communication Tier (300), and an Auditable Data Persistence Tier (400).")

add_p("1. Stateless Identity Guard and Session Controller:")
add_p("User authentication is mediated through a stateless JSON Web Token (JWT) architecture. Upon user onboarding, credentials (username, email, password) are processed by Express middleware. Passwords are cryptographically salted and hashed using Bcrypt with a work factor of 10 rounds prior to database insertion. Upon verified credential matching, a cryptographically signed HMAC-SHA256 JWT containing the user ID, username, and role is issued with an expiration lifetime of 7 days. Incoming HTTP requests are intercepted by an authentication guard middleware that extracts and validates the Bearer token in the Authorization header. Requests lacking valid signatures are immediately terminated with HTTP 401/403 status codes.")

add_p("2. Outcome-Driven Solo Focus Engine and Roadblock Logger:")
add_p("Unlike conventional timer software that rewards users simply for allowing a clock to elapse, the solo focus engine enforces verifiable learning outcome confirmation. Prior to starting a session, the student formulates a set of N concrete learning objectives via the client checklist builder. As the countdown timer executes, the student logs qualitative conceptual obstacles (e.g., mathematical derivation bottlenecks, compilation errors) in an active roadblock logger. Upon session conclusion, the student reviews and marks completed objectives. An outcome verification routine computes a verification ratio R = C / N, where C represents confirmed objectives. Experience points (XP) are awarded conditionally: if R >= 1.0, 25 XP and streak increment are granted; if 0.5 <= R < 1.0, 10 XP is granted; if R < 0.5, only 5 baseline focus XP is granted without streak increment. This prevents users from idling while maintaining active streak records.")

add_p("3. Administrative Cohort Governance and Dynamic Channel Multiplexing:")
add_p("Collaborative cohorts are created through relational schemas enforcing unique, case-insensitive group identifiers. The cohort creator is automatically granted administrative privileges, allowing task publication, deadline countdown meter configuration, member moderation, and access mode toggling (public vs private). Cohort rooms are discoverable via 6-character unique alphanumeric join codes, enabling instant peer enrollment without administrative bottleneck.")

add_p("4. 8-Stage Task State Machine and Multi-Version Revision Engine:")
add_p("As illustrated in Figure 4, academic coursework is governed by an 8-stage deterministic finite state machine (FSM). When completing an assignment, the student uploads handwritten derivations, code repository links, or PDF documents (up to 15MB) via Multer multipart middleware, transitioning the task from `in_progress` to `submitted (v1)`. The cohort administrator or assigned peer reviewers initiate an evaluation, moving the state to `under_review`. Reviewers score the submission across an objective 4-dimensional rubric: Correctness (30%), Completeness (30%), Clarity (20%), and Methodology (20%). If the composite score falls below 70%, the submission transitions to `revision_requested`. The student modifies their solution, logs changelog notes, and resubmits, incrementing the version counter (`v2`). Once rubric mastery is achieved, the task transitions to `approved` and subsequently `completed`, unlocking a +50 XP milestone award.")

add_p("5. Real-Time Bidirectional Doubt Resolution Hub with Accepted Solution Transfer:")
add_p("The platform incorporates a persistent WebSocket (`ws`) server multiplexed with the primary HTTP server. Client connections join room-specific channels keyed by cohort ID. Academic questions, diagram attachments, and code snippets are broadcasted across active cohort clients with sub-100 millisecond latency. Crucially, the original question author possesses exclusive authorization to mark any peer response as the 'Accepted Solution'. This action executes an atomic database transaction transferring +15 XP directly to the solving peer and displaying a verified solution badge across all client viewports.")

add_p("6. Immutable Append-Only XP Transaction Ledger and Anti-Exploit Enforcement:")
add_p("To eliminate gamification tampering, user point balances are never updated through raw SQL arithmetic. Instead, every adjustment triggers an isolated transaction in the `xp_transactions` ledger table, capturing `user_id`, `amount`, `source_type`, `reference_id`, and `created_at`. Unique composite indices reject duplicate awards for identical session or task IDs. Database triggers (`BEFORE UPDATE`, `BEFORE DELETE`) raise SQL exceptions if manual alterations are attempted, preserving absolute ledger auditability.")

add_p("7. SQLite Write-Ahead Logging (WAL) Concurrency and Durability:")
add_p("Database persistence is achieved using native Node.js SQLite (`node:sqlite`) configured with `PRAGMA journal_mode = WAL` and `PRAGMA synchronous = NORMAL`. Readers do not block writers, and writers do not block readers, enabling high concurrent throughput. A background checkpoint service worker executes `PRAGMA wal_checkpoint(TRUNCATE)` every 3600 seconds, maintaining minimal disk footprint and guaranteeing 100% crash durability upon server restarts.")

doc.add_page_break()

# =========================================================
# CLAIMS (CRITICAL LEGAL SECTION)
# =========================================================
add_heading_main("WE CLAIM:")

claims = [
    ("1.", "An outcome-verified collaborative learning computing platform, comprising:\n"
           "a client presentation layer executable on a web browser, rendering an interactive study controller, collaborative cohorts, and an auditable learning dashboard;\n"
           "an application service tier configured on a runtime server, comprising a stateless authentication guard, a solo focus verification engine, an 8-stage coursework revision controller, and an anti-exploit gamification dispatcher;\n"
           "a real-time communication tier multiplexing persistent bidirectional WebSocket channels for instantaneous doubt discussion and diagram exchange; and\n"
           "a relational database tier operating in Write-Ahead Logging (WAL) mode, comprising an immutable append-only transaction ledger storing timestamped experience point adjustments with foreign-key referential constraints."),
           
    ("2.", "The platform as claimed in claim 1, wherein the solo focus verification engine decouples elapsed physical timer duration from incentive award calculations, wherein study experience points and streak increments are conditionally granted only upon user confirmation of pre-formulated objective checklist items and qualitative roadblock documentation."),
    
    ("3.", "The platform as claimed in claim 1, wherein the coursework revision controller executes an 8-stage finite state machine comprising states of not_started, in_progress, submitted, under_review, revision_requested, approved, rejected, and completed, wherein requesting revision triggers multi-version tracking incrementing a version counter from v1 to v2 while preserving historical file uploads, reviewer comments, and changelog notes."),
    
    ("4.", "The platform as claimed in claim 3, wherein coursework evaluation is standardized across a four-dimensional weighted rubric scorecard comprising Correctness (30%), Completeness (30%), Clarity (20%), and Methodology (20%), wherein composite scores below a predetermined threshold trigger the revision_requested state."),
    
    ("5.", "The platform as claimed in claim 1, wherein the real-time communication tier multiplexes client connections by cohort room identifiers with sub-100 millisecond message distribution latency, and wherein an original question author holds exclusive cryptographic authorization to endorse a peer response as an Accepted Solution, triggering an automated peer reward transfer of +15 experience points."),
    
    ("6.", "The platform as claimed in claim 1, wherein the relational database tier maintains an immutable ledger table (xp_transactions) configured with database triggers preventing UPDATE and DELETE operations, and wherein duplicate award transactions sharing identical source categories and entity reference keys are rejected at the database constraint level."),
    
    ("7.", "A computer-implemented method for outcome-verified collaborative learning and coursework revision, comprising the steps of:\n"
           "authenticating a student client via cryptographically signed bearer tokens issued by an authentication middleware;\n"
           "initializing a focused solo study session on the student client by receiving a pre-defined set of measurable learning objectives;\n"
           "recording conceptual roadblocks during execution of a countdown timer block;\n"
           "verifying objective checklist completion upon session termination and computing an objective completion ratio;\n"
           "conditionally inserting an auditable reward record into an append-only database transaction ledger based on said objective completion ratio; and\n"
           "advancing coursework submissions across an 8-stage revision state machine supporting multi-version file attachments and weighted rubric evaluations."),
           
    ("8.", "The method as claimed in claim 7, further comprising broadcasting real-time academic queries over persistent WebSocket channels multiplexed by cohort identifiers, and transferring an accepted solution reward to an answering peer client upon author endorsement."),
    
    ("9.", "The method as claimed in claim 7, wherein database concurrency and cold-restart durability are maintained by executing SQLite in Write-Ahead Logging mode with automated background truncation checkpoints."),
    
    ("10.", "A non-transitory computer-readable storage medium storing executable instructions that, when executed by one or more processors, cause the processors to execute the collaborative learning, outcome verification, revision state machine, and tamper-resistant transaction ledger methods of claims 7 to 9.")
]

for c_num, c_text in claims:
    add_num_item(c_num, c_text, space_after=8)

doc.add_page_break()

# =========================================================
# ABSTRACT OF THE INVENTION (IPO FORMAT)
# =========================================================
add_heading_main("ABSTRACT OF THE INVENTION")
add_p("AN OUTCOME-VERIFIED COLLABORATIVE LEARNING PLATFORM WITH REVISION GOVERNANCE AND ANTI-EXPLOIT TRANSACTION LEDGER",
      align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=11, space_before=0, space_after=10, color=(135, 59, 70))

add_p("The present invention discloses an outcome-verified collaborative learning platform (CONSTA) that transforms unmonitored digital study into verifiable academic achievement. In a solo focus module, study timers are decoupled from gamified incentives; experience points (XP) and streak maintenance are awarded exclusively upon confirmed completion of interactive objective checklists, supplemented by a qualitative roadblock logger. Academic coursework is managed through an 8-stage finite state machine governing multi-version revisions (v1 → v2 → v3) with 4-dimensional rubric scorecards. A real-time doubt clearing hub multiplexes WebSocket channels with sub-100ms latency, featuring an author-endorsed 'Accepted Solution' peer reward transfer (+15 XP). An immutable, append-only database transaction ledger (`xp_transactions`) records all point adjustments to permanently eliminate gamification exploits, supported by high-concurrency native SQLite Write-Ahead Logging (WAL) architecture.",
      size=11, space_before=0, space_after=14)

add_p("(Figure 1)", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=11, space_before=6, space_after=20)

# Formal Signature Table
sig_table = doc.add_table(rows=2, cols=2)
sig_table.alignment = WD_TABLE_ALIGNMENT.CENTER
sig_table.columns[0].width = Inches(3.1)
sig_table.columns[1].width = Inches(3.1)

p_d = sig_table.cell(0, 0).paragraphs[0]
p_d.add_run("Date: 20th November 2026\nPlace: Greater Noida, Uttar Pradesh").font.size = Pt(10)

p_s = sig_table.cell(0, 1).paragraphs[0]
p_s.alignment = WD_ALIGN_PARAGRAPH.RIGHT
p_s.add_run("Signature of Applicants:\n\n_______________________________\nMohit Kumar\n(For and on behalf of all Applicants)").font.size = Pt(10)

doc.add_page_break()

# =========================================================
# DRAWING SHEETS (FIGURES 1 TO 5)
# =========================================================
add_heading_main("SHEET 1 OF 3: DRAWINGS")

fig1_p = os.path.abspath('d:/consta/report/figures/fig1_workflow.png')
if os.path.exists(fig1_p):
    p_f = doc.add_paragraph()
    p_f.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_f.paragraph_format.space_before = Pt(10)
    p_f.paragraph_format.space_after = Pt(4)
    p_f.add_run().add_picture(fig1_p, width=Inches(6.0))
    add_p("FIGURE 1: Overall System Architecture and Multi-Tier Processing Pipeline.",
          align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=10, space_before=0, space_after=16)

fig2_p = os.path.abspath('d:/consta/report/figures/fig_dfd_level1.png')
if os.path.exists(fig2_p):
    p_f2 = doc.add_paragraph()
    p_f2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_f2.paragraph_format.space_before = Pt(10)
    p_f2.paragraph_format.space_after = Pt(4)
    p_f2.add_run().add_picture(fig2_p, width=Inches(6.0))
    add_p("FIGURE 2: Data Flow Diagram (DFD Level 1) of Core Functional Services.",
          align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=10, space_before=0, space_after=16)

doc.add_page_break()

add_heading_main("SHEET 2 OF 3: DRAWINGS")

fig3_p = os.path.abspath('d:/consta/report/figures/fig_er_diagram.png')
if os.path.exists(fig3_p):
    p_f3 = doc.add_paragraph()
    p_f3.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_f3.paragraph_format.space_before = Pt(10)
    p_f3.paragraph_format.space_after = Pt(4)
    p_f3.add_run().add_picture(fig3_p, width=Inches(6.0))
    add_p("FIGURE 3: Entity-Relationship (ER) Schema of Relational Database.",
          align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=10, space_before=0, space_after=16)

fig4_p = os.path.abspath('d:/consta/report/figures/fig_task_state_machine.png')
if os.path.exists(fig4_p):
    p_f4 = doc.add_paragraph()
    p_f4.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_f4.paragraph_format.space_before = Pt(10)
    p_f4.paragraph_format.space_after = Pt(4)
    p_f4.add_run().add_picture(fig4_p, width=Inches(6.0))
    add_p("FIGURE 4: Finite State Machine for 8-Stage Iterative Task Submission.",
          align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=10, space_before=0, space_after=16)

doc.add_page_break()

add_heading_main("SHEET 3 OF 3: DRAWINGS")

fig5_p = os.path.abspath('d:/consta/synopsis/consta_proposed_workflow_p5.png')
if os.path.exists(fig5_p):
    p_f5 = doc.add_paragraph()
    p_f5.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_f5.paragraph_format.space_before = Pt(10)
    p_f5.paragraph_format.space_after = Pt(4)
    p_f5.add_run().add_picture(fig5_p, width=Inches(6.25))
    add_p("FIGURE 5: Overall Platform Workflow and Module Interaction Pipeline.",
          align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=10, space_before=0, space_after=16)

# Save Document
out_docx = os.path.abspath('d:/consta/patent/CONSTA_Patent_Draft_Complete_Specification.docx')
doc.save(out_docx)
print(f"Patent Draft DOCX saved to: {out_docx}")

# Convert to PDF via Word COM
word = win32com.client.Dispatch('Word.Application')
word.Visible = False

out_pdf = os.path.abspath('d:/consta/patent/CONSTA_Patent_Draft_Complete_Specification.pdf')
root_pdf = os.path.abspath('d:/consta/CONSTA_Patent_Draft_Complete_Specification.pdf')
root_docx = os.path.abspath('d:/consta/CONSTA_Patent_Draft_Complete_Specification.docx')

try:
    doc_word = word.Documents.Open(out_docx)
    doc_word.SaveAs(out_pdf, FileFormat=17) # 17 is wdFormatPDF
    doc_word.SaveAs(root_pdf, FileFormat=17)
    total_pgs = doc_word.ComputeStatistics(2)
    doc_word.Close()
    
    # Also copy docx to root
    doc.save(root_docx)
    print(f"Patent Draft PDF generated successfully! Total Pages: {total_pgs}")
    print(f"Patent PDF: {out_pdf}")
finally:
    word.Quit()
