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

# Page setup: Standard A4 with 1-inch margins
for section in doc.sections:
    section.top_margin = Inches(1.0)
    section.bottom_margin = Inches(1.0)
    section.left_margin = Inches(1.0)
    section.right_margin = Inches(1.0)
    section.page_width = Inches(8.27)
    section.page_height = Inches(11.69)

def add_p(text="", align=WD_ALIGN_PARAGRAPH.JUSTIFY, bold=False, italic=False, size=12,
          space_before=0, space_after=6, line_spacing=1.25):
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
        run.font.color.rgb = RGBColor(0, 0, 0)
    return p

def add_heading_1(text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_before = Pt(16)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(14)
    run.font.bold = True
    run.font.color.rgb = RGBColor(135, 59, 70) # Deep Burgundy
    return p

def add_heading_2(text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(12.5)
    run.font.bold = True
    run.font.color.rgb = RGBColor(51, 36, 38)
    return p

def add_heading_3(text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(11.5)
    run.font.bold = True
    run.font.italic = True
    return p

def set_cell_border(cell, **kwargs):
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = parse_xml(f'<w:tcBorders {nsdecls("w")}/>')
    for border_name in ['top', 'left', 'bottom', 'right']:
        if border_name in kwargs:
            edge = parse_xml(f'<w:{border_name} {nsdecls("w")} w:val="{kwargs[border_name].get("val", "single")}" w:sz="{kwargs[border_name].get("sz", 4)}" w:space="0" w:color="{kwargs[border_name].get("color", "000000")}"/>')
            tcBorders.append(edge)
    tcPr.append(tcBorders)

def set_cell_shading(cell, color_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>')
    tcPr.append(shd)

def add_table_data(headers, data, col_widths=None):
    tbl = doc.add_table(rows=len(data) + 1, cols=len(headers))
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    
    # Headers
    hdr_row = tbl.rows[0]
    for i, h in enumerate(headers):
        cell = hdr_row.cells[i]
        if col_widths and i < len(col_widths):
            cell.width = Inches(col_widths[i])
        set_cell_border(cell, top=dict(sz=6), bottom=dict(sz=6), left=dict(sz=4), right=dict(sz=4))
        set_cell_shading(cell, "FAF4EB")
        p = cell.paragraphs[0]
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.space_before = Pt(2)
        run = p.add_run(h)
        run.font.name = 'Times New Roman'
        run.font.size = Pt(10)
        run.font.bold = True
        run.font.color.rgb = RGBColor(135, 59, 70)
        
    # Data Rows
    for r_idx, row_values in enumerate(data):
        row = tbl.rows[r_idx + 1]
        for c_idx, val in enumerate(row_values):
            cell = row.cells[c_idx]
            if col_widths and c_idx < len(col_widths):
                cell.width = Inches(col_widths[c_idx])
            set_cell_border(cell, top=dict(sz=4), bottom=dict(sz=4), left=dict(sz=4), right=dict(sz=4))
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.line_spacing = 1.15
            run = p.add_run(str(val))
            run.font.name = 'Times New Roman'
            run.font.size = Pt(9.5)
            
    doc.add_paragraph().paragraph_format.space_after = Pt(6)

def add_code_block(code_str):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.line_spacing = 1.1
    p.paragraph_format.left_indent = Inches(0.2)
    p.paragraph_format.right_indent = Inches(0.2)
    run = p.add_run(code_str)
    run.font.name = 'Courier New'
    run.font.size = Pt(9)
    run.font.color.rgb = RGBColor(30, 30, 30)

print("Constructing 45-Page Master B.Tech Project Report...")

# ==========================================
# 1. FRONT MATTER (Pages 1 - 7)
# ==========================================
# 1. COVER PAGE
add_p("A MINOR PROJECT REPORT", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=13, space_after=4)
add_p("ON", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=11, space_after=4)
add_p("CONSTA: COLLABORATIVE STUDY & PERSONAL GROWTH PLATFORM WITH VERIFIABLE OUTCOMES", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=15, space_after=18)

add_p("Submitted in partial fulfilment for the award of the degree of", align=WD_ALIGN_PARAGRAPH.CENTER, italic=True, size=11, space_after=4)
add_p("BACHELOR OF TECHNOLOGY", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=14, space_after=2)
add_p("IN", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=10, space_after=2)
add_p("COMPUTER SCIENCE AND ENGINEERING", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=13, space_after=18)

logo_path = os.path.abspath('d:/consta/report/figures/gniot_logo.png')
if os.path.exists(logo_path):
    p_logo = doc.add_paragraph()
    p_logo.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_logo.paragraph_format.space_before = Pt(6)
    p_logo.paragraph_format.space_after = Pt(16)
    p_logo.add_run().add_picture(logo_path, width=Inches(2.6))

table = doc.add_table(rows=1, cols=2)
table.alignment = WD_TABLE_ALIGNMENT.CENTER
table.columns[0].width = Inches(3.6)
table.columns[1].width = Inches(2.7)

p_l = table.cell(0, 0).paragraphs[0]
p_l.paragraph_format.line_spacing = 1.2
p_l.add_run("Submitted by:\n\n").font.bold = True
r = p_l.add_run("MOHIT KUMAR\n")
r.font.bold = True
r.font.size = Pt(11)
p_l.add_run("University Roll No: 2201320100085\nB.Tech CSE (Final Year)\n").font.size = Pt(10.5)

p_r = table.cell(0, 1).paragraphs[0]
p_r.paragraph_format.line_spacing = 1.2
p_r.add_run("Under the Guidance of:\n\n").font.bold = True
r = p_r.add_run("PROJECT SUPERVISOR\n")
r.font.bold = True
r.font.size = Pt(11)
p_r.add_run("Assistant Professor\nDept. of Computer Science & Engg.\n").font.size = Pt(10.5)

p_sp = doc.add_paragraph()
p_sp.paragraph_format.space_before = Pt(16)

add_p("DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=12, space_after=2)
add_p("GREATER NOIDA INSTITUTE OF TECHNOLOGY (ENGINEERING INSTITUTE)", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=12, space_after=2)
add_p("DR. A.P.J. ABDUL KALAM TECHNICAL UNIVERSITY, LUCKNOW", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=11, space_after=2)
add_p("ACADEMIC SESSION: 2025 – 2026", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=11, space_after=0)

doc.add_page_break()

# 2. CERTIFICATE OF APPROVAL
add_p("GREATER NOIDA INSTITUTE OF TECHNOLOGY", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=14, space_after=2)
add_p("DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=12, space_after=16)

add_p("CERTIFICATE OF APPROVAL", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=14, space_after=18)

add_p("This is to certify that the Minor Project Report entitled \"CONSTA: Collaborative Study & Personal Growth Platform with Verifiable Outcomes\", submitted by MOHIT KUMAR (University Roll No: 2201320100085) in partial fulfilment of the requirements for the award of the degree of Bachelor of Technology in Computer Science and Engineering from Dr. A.P.J. Abdul Kalam Technical University, Lucknow, is an authentic record of the bona fide engineering work carried out by him under my supervision and guidance.", size=11.5, space_after=12)

add_p("The results embodied in this report have not been submitted to any other University or Institute for the award of any degree, diploma, or fellowship.", size=11.5, space_after=36)

sig_table = doc.add_table(rows=1, cols=2)
sig_table.alignment = WD_TABLE_ALIGNMENT.CENTER
sig_table.columns[0].width = Inches(3.2)
sig_table.columns[1].width = Inches(3.2)

p_s1 = sig_table.cell(0, 0).paragraphs[0]
p_s1.add_run("_________________________\n").font.bold = True
p_s1.add_run("Project Supervisor / Guide\n").font.bold = True
p_s1.add_run("Assistant Professor\nDept. of Computer Science & Engg.\nGNIOT, Greater Noida")

p_s2 = sig_table.cell(0, 1).paragraphs[0]
p_s2.alignment = WD_ALIGN_PARAGRAPH.RIGHT
p_s2.add_run("_________________________\n").font.bold = True
p_s2.add_run("Head of the Department (HOD)\n").font.bold = True
p_s2.add_run("Professor & Head\nDept. of Computer Science & Engg.\nGNIOT, Greater Noida")

p_dt = doc.add_paragraph()
p_dt.paragraph_format.space_before = Pt(40)
add_p("Date: ____________________\nPlace: Greater Noida", align=WD_ALIGN_PARAGRAPH.LEFT, bold=True, size=11)

doc.add_page_break()

# 3. DECLARATION BY CANDIDATE
add_p("DECLARATION", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=14, space_after=18)

add_p("I hereby declare that the minor project report titled \"CONSTA: Collaborative Study & Personal Growth Platform with Verifiable Outcomes\" is an original piece of software engineering and research work carried out by me under the supervision of my project guide at Greater Noida Institute of Technology (Engineering Institute), Greater Noida.", size=11.5, space_after=12)

add_p("I confirm that the codebase, system architecture, database schema, automated test suites, and empirical benchmarks presented in this report reflect my genuine engineering contributions. All sources of academic literature, standard algorithmic libraries, and third-party frameworks utilized in this project have been duly cited and acknowledged in the references section.", size=11.5, space_after=12)

add_p("I further declare that this report has not previously formed the basis for the award of any degree, diploma, associate-ship, or other similar title to any university or institution.", size=11.5, space_after=40)

add_p("_________________________\n", align=WD_ALIGN_PARAGRAPH.RIGHT, bold=True, size=12)
add_p("MOHIT KUMAR\nUniversity Roll No: 2201320100085\nB.Tech (CSE) 4th Year, 7th Semester\nGreater Noida Institute of Technology", align=WD_ALIGN_PARAGRAPH.RIGHT, bold=False, size=11)

doc.add_page_break()

# 4. ACKNOWLEDGEMENT
add_p("ACKNOWLEDGEMENT", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=14, space_after=18)

add_p("I express my deepest gratitude and sincere appreciation to my respected Project Guide, for their continuous guidance, insightful advice, constructive critiques, and constant encouragement throughout the formulation, design, and implementation of this minor project.", size=11.5, space_after=12)

add_p("I am profoundly thankful to the Head of the Department, Department of Computer Science & Engineering, for providing the necessary computing resources, departmental laboratory infrastructure, and academic atmosphere required to bring this project to fruition.", size=11.5, space_after=12)

add_p("I also take this opportunity to extend my heartfelt thanks to the Director and Management of Greater Noida Institute of Technology (Engineering Institute) for their visionary support and for fostering an environment committed to technological innovation and research rigor.", size=11.5, space_after=12)

add_p("Finally, I am indebted to my parents, family members, and fellow classmates who offered moral support, constructive peer reviews, and invaluable assistance during user testing and debugging phases of CONSTA.", size=11.5, space_after=30)

add_p("Mohit Kumar\n(University Roll No: 2201320100085)", align=WD_ALIGN_PARAGRAPH.RIGHT, bold=True, size=11)

doc.add_page_break()

# 5. ABSTRACT
add_p("ABSTRACT", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=14, space_after=16)

add_p("In contemporary higher education, independent learners and self-formed study cohorts frequently encounter significant friction: cognitive fatigue, severe procrastination, superficial study routines, unorganized academic conversations, and a lack of formative feedback on complex derivations and coding coursework. Existing digital productivity software relies primarily on passive elapsed-time counters (e.g., standard Pomodoro timers) that measure physical duration without validating actual knowledge acquisition or task completion. Concurrently, students frequently rely on general-purpose social messaging applications (e.g., WhatsApp, Discord, Telegram) for group study, which leads to communication fragmentation, lost homework files, unmoderated discussions, and unaddressed academic doubts.", size=11.5, space_after=10)

add_p("This project introduces CONSTA, an outcome-driven collaborative learning and personal growth platform engineered to transform unmonitored digital study hours into verifiable academic achievements. In the solo focus module, study timers are decoupled from gamified incentives; verified experience points (XP) and streak maintenance are awarded exclusively upon the confirmed completion of an interactive learning objective checklist, supplemented by a dedicated roadblock logger.", size=11.5, space_after=10)

add_p("For collaborative study, CONSTA implements role-governed cohorts where group administrators assign milestones, sub-topic checklists, and countdown deadline timers. Academic coursework is managed via an 8-stage state machine that models a continuous revision lifecycle (v1 -> v2 -> v3) featuring multi-page image and PDF uploads, changelog documentation, and structured 4-dimensional rubric scorecards (Correctness, Completeness, Clarity, Methodology) accompanied by assistive AI formative guidance.", size=11.5, space_after=10)

add_p("To eliminate cognitive bottlenecks during independent study, an integrated real-time doubt clearing hub leverages persistent bidirectional WebSockets (ws) for zero-latency message and diagram distribution, incorporating an author-endorsed \"Accepted Solution\" peer-reward mechanism (+15 XP). Furthermore, an auditable, append-only database transaction ledger (xp_transactions) records every experience point modification to prevent gamification exploits. Developed using React 19, Tailwind CSS v4, Node.js 22, Express, WebSockets, and native SQLite in Write-Ahead Logging (WAL) mode, the system is backed by a 33-suite automated regression test battery with 100% pass rates.", size=11.5, space_after=16)

p_kw = add_p("Keywords: ", bold=True, size=11, space_after=0)
p_kw.add_run("Collaborative Study, Computer-Supported Collaborative Learning (CSCL), Verifiable Learning Outcomes, Multi-Version Revisions, Formative Rubrics, WebSockets, Anti-Exploit Gamification, SQLite WAL.").font.size = Pt(10.5)

doc.add_page_break()

# (The rest of chapters will be inserted with maximum academic depth)
print("Loading core report chapters...")

# To guarantee the exact ~45 page count, we will append in-depth chapters
exec(open('d:/consta/report/append_deep_chapters.py', 'r', encoding='utf-8').read())

# Save Document
docx_out = os.path.abspath('d:/consta/report/CONSTA_Minor_Project_Report_Final.docx')
doc.save(docx_out)
print(f"Full Project Report DOCX saved to: {docx_out}")

# Convert to PDF via Word COM
word = win32com.client.Dispatch('Word.Application')
word.Visible = False

pdf_out = os.path.abspath('d:/consta/report/CONSTA_Minor_Project_Report_Final.pdf')
root_pdf_out = os.path.abspath('d:/consta/CONSTA_Minor_Project_Report_Final.pdf')

try:
    doc_word = word.Documents.Open(docx_out)
    doc_word.SaveAs(pdf_out, FileFormat=17) # 17 is wdFormatPDF
    doc_word.SaveAs(root_pdf_out, FileFormat=17)
    total_pgs = doc_word.ComputeStatistics(2)
    doc_word.Close()
    print(f"Final Report PDF generated successfully! Total Pages: {total_pgs}")
    print(f"Report PDF: {pdf_out}")
finally:
    word.Quit()
