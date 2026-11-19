# build_clean_master_report.py
# Generates a publication-grade, flawlessly aligned 45-page B.Tech Project Report
# with 100% native Word styles, exact front-matter matching user's template,
# and zero PDF-conversion artifacts.

import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn
import win32com.client

doc = Document()

# Page Setup: Standard A4 (8.27 x 11.69 inches) with 1.0-inch margins
# Available printable width: 8.27 - 2.0 = 6.27 inches
for section in doc.sections:
    section.top_margin = Inches(1.0)
    section.bottom_margin = Inches(1.0)
    section.left_margin = Inches(1.0)
    section.right_margin = Inches(1.0)
    section.page_width = Inches(8.27)
    section.page_height = Inches(11.69)
    
    # Add centered page numbering to footer
    footer = section.footer
    p_ft = footer.paragraphs[0]
    p_ft.alignment = WD_ALIGN_PARAGRAPH.CENTER
    fldSimple = OxmlElement('w:fldSimple')
    fldSimple.set(qn('w:instr'), 'PAGE')
    p_ft._p.append(fldSimple)
    for run in p_ft.runs:
        run.font.name = 'Times New Roman'
        run.font.size = Pt(10)

def add_p(text="", align=WD_ALIGN_PARAGRAPH.JUSTIFY, bold=False, italic=False, size=12,
          space_before=0, space_after=6, line_spacing=1.25, color=(0, 0, 0)):
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
    p.paragraph_format.space_before = Pt(15)
    p.paragraph_format.space_after = Pt(5)
    p.paragraph_format.keep_with_next = True
    p.paragraph_format.left_indent = Inches(0)
    run = p.add_run(text)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(14)
    run.font.bold = True
    run.font.color.rgb = RGBColor(135, 59, 70) # Deep Burgundy
    return p

def add_heading_2(text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_before = Pt(11)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.keep_with_next = True
    p.paragraph_format.left_indent = Inches(0)
    run = p.add_run(text)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(12)
    run.font.bold = True
    run.font.color.rgb = RGBColor(51, 36, 38) # Charcoal Burgundy
    return p

def add_heading_3(text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_before = Pt(9)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.keep_with_next = True
    p.paragraph_format.left_indent = Inches(0)
    run = p.add_run(text)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(11)
    run.font.bold = True
    run.font.italic = True
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

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def add_table_data(headers, data, col_widths=None):
    tbl = doc.add_table(rows=len(data) + 1, cols=len(headers))
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    
    # Table wide properties
    for i, row in enumerate(tbl.rows):
        trPr = row._tr.get_or_add_trPr()
        trPr.append(parse_xml(f'<w:cantSplit {nsdecls("w")}/>'))
        if i == 0:
            trPr.append(parse_xml(f'<w:tblHeader {nsdecls("w")}/>'))
    
    # Headers
    hdr_row = tbl.rows[0]
    for i, h in enumerate(headers):
        cell = hdr_row.cells[i]
        if col_widths and i < len(col_widths):
            cell.width = Inches(col_widths[i])
        set_cell_border(cell, top=dict(sz=6, color="873B46"), bottom=dict(sz=6, color="873B46"),
                              left=dict(sz=4, color="E7D8CE"), right=dict(sz=4, color="E7D8CE"))
        set_cell_shading(cell, "FAF4EB")
        set_cell_margins(cell, top=120, bottom=120, left=140, right=140)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.space_before = Pt(2)
        run = p.add_run(h)
        run.font.name = 'Times New Roman'
        run.font.size = Pt(9.5)
        run.font.bold = True
        run.font.color.rgb = RGBColor(135, 59, 70)
        
    # Data Rows
    for r_idx, row_values in enumerate(data):
        row = tbl.rows[r_idx + 1]
        bg_col = "FFFFFF" if r_idx % 2 == 0 else "FFFCF7"
        for c_idx, val in enumerate(row_values):
            cell = row.cells[c_idx]
            if col_widths and c_idx < len(col_widths):
                cell.width = Inches(col_widths[c_idx])
            set_cell_border(cell, top=dict(sz=3, color="E7D8CE"), bottom=dict(sz=3, color="E7D8CE"),
                                  left=dict(sz=3, color="E7D8CE"), right=dict(sz=3, color="E7D8CE"))
            set_cell_shading(cell, bg_col)
            set_cell_margins(cell, top=80, bottom=80, left=120, right=120)
            p = cell.paragraphs[0]
            # If short text or numbers, center; otherwise left align
            val_str = str(val).strip()
            if len(val_str) <= 10 or val_str.isdigit() or val_str.endswith('%') or val_str.endswith('ms') or val_str in ['PASS', 'Critical', 'High']:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            else:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.line_spacing = 1.15
            run = p.add_run(val_str)
            run.font.name = 'Times New Roman'
            run.font.size = Pt(9)
            if val_str == 'PASS':
                run.font.bold = True
                run.font.color.rgb = RGBColor(34, 139, 34)
            
    doc.add_paragraph().paragraph_format.space_after = Pt(4)

def add_code_block(code_str):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(3)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing = 1.05
    p.paragraph_format.left_indent = Inches(0.2)
    p.paragraph_format.right_indent = Inches(0.2)
    run = p.add_run(code_str)
    run.font.name = 'Courier New'
    run.font.size = Pt(8.0)

# =========================================================
# PAGE 1: TITLE PAGE (Native, Flawless Centering & Spacing)
# =========================================================
print("Building Page 1: Title Page...")
add_p("A PROJECT REPORT", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=15, space_before=10, space_after=2)
add_p("ON", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=11, space_before=0, space_after=6)
add_p("CONSTA : COLLABORATIVE STUDY &\nPERSONAL GROWTH PLATFORM", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=15, space_before=0, space_after=14, color=(135, 59, 70))

add_p("Submitted in partial fulfilment of the requirements for the Mini Project of", align=WD_ALIGN_PARAGRAPH.CENTER, italic=True, size=10.5, space_before=0, space_after=3)
add_p("BACHELOR OF TECHNOLOGY", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=13.5, space_before=0, space_after=1)
add_p("in", align=WD_ALIGN_PARAGRAPH.CENTER, bold=False, size=10.5, space_before=0, space_after=1)
add_p("COMPUTER SCIENCE & ENGINEERING", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=13, space_before=0, space_after=12)

add_p("BY", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=11, space_before=0, space_after=4)

add_p("MOHIT KUMAR (2601306)\n"
      "ABHIJIT KUMAR SINGH (2601307)\n"
      "ABHISHEK KUMAR (2601295)\n"
      "ADITYA RAJ (2601313)", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=11, space_before=0, space_after=10, line_spacing=1.3)

add_p("UNDER THE SUPERVISION OF", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=10.5, space_before=0, space_after=2)
add_p("MR. MANOJ KUMAR", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=12, space_before=0, space_after=10, color=(51, 36, 38))

# Logos
logo_gniot_path = os.path.abspath('d:/consta/report/extracted_logos/logo_2.jpg')
logo_aktu_path = os.path.abspath('d:/consta/report/extracted_logos/logo_1.jpg')

p_logos = doc.add_paragraph()
p_logos.alignment = WD_ALIGN_PARAGRAPH.CENTER
p_logos.paragraph_format.space_before = Pt(2)
p_logos.paragraph_format.space_after = Pt(10)
if os.path.exists(logo_gniot_path):
    p_logos.add_run().add_picture(logo_gniot_path, width=Inches(2.4))
if os.path.exists(logo_aktu_path):
    r_sp = p_logos.add_run("   ")
    p_logos.add_run().add_picture(logo_aktu_path, width=Inches(0.95))

add_p("DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=11.5, space_before=0, space_after=2)
add_p("GREATER NOIDA INSTITUTE OF TECHNOLOGY, GREATER NOIDA", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=11.5, space_before=0, space_after=2)
add_p("DR. A.P.J. ABDUL KALAM TECHNICAL UNIVERSITY, LUCKNOW", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=11, space_before=0, space_after=2)
add_p("NOVEMBER 2026", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=11, space_before=0, space_after=0)

doc.add_page_break()

# =========================================================
# PAGE 2: PROJECT COMPLETION CERTIFICATE
# =========================================================
print("Building Page 2: Completion Certificate...")
# Top Header Banner
header_banner_path = os.path.abspath('d:/consta/report/extracted_logos/logo_0.jpg')
if os.path.exists(header_banner_path):
    p_hb = doc.add_paragraph()
    p_hb.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_hb.paragraph_format.space_before = Pt(0)
    p_hb.paragraph_format.space_after = Pt(14)
    p_hb.add_run().add_picture(header_banner_path, width=Inches(6.2))

add_p("PROJECT COMPLETION CERTIFICATE", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=14, space_before=0, space_after=2, color=(135, 59, 70))
add_p("Department of Computer Science and Engineering", align=WD_ALIGN_PARAGRAPH.CENTER, bold=False, size=11.5, space_before=0, space_after=1)
add_p("Greater Noida Institute of Technology, Greater Noida", align=WD_ALIGN_PARAGRAPH.CENTER, bold=False, size=11.5, space_before=0, space_after=2)
add_p("Academic Batch: 2026–2027", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=11, space_before=0, space_after=10)

add_p("Date: ____________________", align=WD_ALIGN_PARAGRAPH.RIGHT, bold=True, size=11, space_before=0, space_after=10)

add_p("This is to certify that Mohit Kumar (2601306), Abhijit Kumar Singh (2601307), Abhishek Kumar (2601295), and Aditya Raj (2601313), students of Bachelor of Technology in Computer Science and Engineering at Greater Noida Institute of Technology, have undertaken the mini project entitled “CONSTA : COLLABORATIVE STUDY & PERSONAL GROWTH PLATFORM” under the supervision of Mr. Manoj Kumar.", size=11.5, space_before=0, space_after=10, line_spacing=1.25)

add_p("The work presented in this report is a record of the project carried out by the students during the academic session. To the best of our knowledge, the work has not been submitted elsewhere for the award of any other degree or diploma.", size=11.5, space_before=0, space_after=26, line_spacing=1.25)

# Signature Table
sig_table = doc.add_table(rows=2, cols=2)
sig_table.alignment = WD_TABLE_ALIGNMENT.CENTER
sig_table.columns[0].width = Inches(3.1)
sig_table.columns[1].width = Inches(3.1)

# Header Row
p_s1 = sig_table.cell(0, 0).paragraphs[0]
p_s1.add_run("Project Supervisor").font.bold = True
set_cell_shading(sig_table.cell(0, 0), "FAF4EB")
set_cell_border(sig_table.cell(0, 0), top=dict(sz=4, color="873B46"), bottom=dict(sz=4, color="873B46"),
                                      left=dict(sz=4, color="CCCCCC"), right=dict(sz=4, color="CCCCCC"))
set_cell_margins(sig_table.cell(0, 0), top=80, bottom=80, left=120, right=120)

p_s2 = sig_table.cell(0, 1).paragraphs[0]
p_s2.add_run("Head of Department").font.bold = True
set_cell_shading(sig_table.cell(0, 1), "FAF4EB")
set_cell_border(sig_table.cell(0, 1), top=dict(sz=4, color="873B46"), bottom=dict(sz=4, color="873B46"),
                                      left=dict(sz=4, color="CCCCCC"), right=dict(sz=4, color="CCCCCC"))
set_cell_margins(sig_table.cell(0, 1), top=80, bottom=80, left=120, right=120)

# Signatures Row
p_s3 = sig_table.cell(1, 0).paragraphs[0]
p_s3.paragraph_format.line_spacing = 1.3
p_s3.add_run("MR. MANOJ KUMAR\nAssistant Professor, CSE\n\nSignature: __________________")
set_cell_border(sig_table.cell(1, 0), bottom=dict(sz=4, color="CCCCCC"),
                                      left=dict(sz=4, color="CCCCCC"), right=dict(sz=4, color="CCCCCC"))
set_cell_margins(sig_table.cell(1, 0), top=100, bottom=100, left=120, right=120)

p_s4 = sig_table.cell(1, 1).paragraphs[0]
p_s4.paragraph_format.line_spacing = 1.3
p_s4.add_run("DR. NIKHIL GOVIL\nHead Of Department, CSE\n\nSignature: __________________")
set_cell_border(sig_table.cell(1, 1), bottom=dict(sz=4, color="CCCCCC"),
                                      left=dict(sz=4, color="CCCCCC"), right=dict(sz=4, color="CCCCCC"))
set_cell_margins(sig_table.cell(1, 1), top=100, bottom=100, left=120, right=120)

# Footer Banner
footer_banner_path = os.path.abspath('d:/consta/report/extracted_logos/logo_3.jpg')
if os.path.exists(footer_banner_path):
    p_fb = doc.add_paragraph()
    p_fb.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_fb.paragraph_format.space_before = Pt(36)
    p_fb.paragraph_format.space_after = Pt(0)
    p_fb.add_run().add_picture(footer_banner_path, width=Inches(5.6))

doc.add_page_break()

# =========================================================
# PAGE 3: DECLARATION
# =========================================================
print("Building Page 3: Declaration...")
add_p("DECLARATION", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=14, space_before=10, space_after=18, color=(135, 59, 70))

add_p("We hereby declare that the project report entitled “CONSTA : COLLABORATIVE STUDY & PERSONAL GROWTH PLATFORM”, submitted to the Department of Computer Science and Engineering, Greater Noida Institute of Technology, Greater Noida, is an original record of the work carried out by us under the guidance of Mr. Manoj Kumar.", size=11.5, space_before=0, space_after=12, line_spacing=1.25)

add_p("We further declare that the work embodied in this report has not been submitted, either in part or in full, to any other university or institute for the award of any degree, diploma or similar qualification. All sources of information used in preparing this report have been acknowledged in the References section.", size=11.5, space_before=0, space_after=24, line_spacing=1.25)

# Declaration Student Table
dec_headers = ["Roll No.", "Name of Student", "Signature"]
dec_data = [
    ["2601306", "Mohit Kumar", "__________________"],
    ["2601307", "Abhijit Kumar Singh", "__________________"],
    ["2601295", "Abhishek Kumar", "__________________"],
    ["2601313", "Aditya Raj", "__________________"]
]
add_table_data(dec_headers, dec_data, [1.4, 2.8, 2.0])

# Date & Place Table (clean, borderless 2-column)
dt_tbl = doc.add_table(rows=1, cols=2)
dt_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
dt_tbl.columns[0].width = Inches(3.1)
dt_tbl.columns[1].width = Inches(3.1)
p_dt1 = dt_tbl.cell(0, 0).paragraphs[0]
p_dt1.paragraph_format.space_before = Pt(16)
p_dt1.add_run("Date: ____________________").font.bold = True

p_dt2 = dt_tbl.cell(0, 1).paragraphs[0]
p_dt2.alignment = WD_ALIGN_PARAGRAPH.RIGHT
p_dt2.paragraph_format.space_before = Pt(16)
p_dt2.add_run("Place: Greater Noida").font.bold = True

doc.add_page_break()

# =========================================================
# PAGE 4: ACKNOWLEDGEMENT
# =========================================================
print("Building Page 4: Acknowledgement...")
add_p("ACKNOWLEDGEMENT", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=14, space_before=10, space_after=18, color=(135, 59, 70))

add_p("We express our deepest gratitude and heartfelt appreciation to our project supervisor, Mr. Manoj Kumar, Assistant Professor, Department of Computer Science & Engineering, for his invaluable guidance, continuous encouragement, constructive criticism, and expert technical insights throughout the design, implementation, and evaluation of this project.", size=11.5, space_before=0, space_after=12, line_spacing=1.25)

add_p("We are profoundly thankful to Dr. Nikhil Govil, Head of the Department, Department of Computer Science & Engineering, for providing the departmental resources, laboratory infrastructure, and academic atmosphere required to carry out this project successfully.", size=11.5, space_before=0, space_after=12, line_spacing=1.25)

add_p("We also extend our sincere gratitude to the Director Mr. Dhiraj Gupta and Management of Greater Noida Institute of Technology (Engineering Institute), Greater Noida, for fostering an academic environment dedicated to technical rigor, research, and innovation.", size=11.5, space_before=0, space_after=12, line_spacing=1.25)

add_p("Finally, we express our warmest appreciation to our parents, family members, and classmates for their moral support, understanding, and constructive feedback throughout our engineering coursework and project development.", size=11.5, space_before=0, space_after=30, line_spacing=1.25)

# Student Names Box
ack_tbl = doc.add_table(rows=2, cols=2)
ack_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
ack_tbl.columns[0].width = Inches(3.1)
ack_tbl.columns[1].width = Inches(3.1)

p_a1 = ack_tbl.cell(0, 0).paragraphs[0]
p_a1.add_run("Mohit Kumar (2601306)\n").font.bold = True
p_a1.add_run("B.Tech CSE, GNIOT").font.size = Pt(10)

p_a2 = ack_tbl.cell(0, 1).paragraphs[0]
p_a2.alignment = WD_ALIGN_PARAGRAPH.RIGHT
p_a2.add_run("Abhijit Kumar Singh (2601307)\n").font.bold = True
p_a2.add_run("B.Tech CSE, GNIOT").font.size = Pt(10)

p_a3 = ack_tbl.cell(1, 0).paragraphs[0]
p_a3.paragraph_format.space_before = Pt(8)
p_a3.add_run("Abhishek Kumar (2601295)\n").font.bold = True
p_a3.add_run("B.Tech CSE, GNIOT").font.size = Pt(10)

p_a4 = ack_tbl.cell(1, 1).paragraphs[0]
p_a4.paragraph_format.space_before = Pt(8)
p_a4.alignment = WD_ALIGN_PARAGRAPH.RIGHT
p_a4.add_run("Aditya Raj (2601313)\n").font.bold = True
p_a4.add_run("B.Tech CSE, GNIOT").font.size = Pt(10)

doc.add_page_break()

# =========================================================
# PAGE 5: ABSTRACT
# =========================================================
print("Building Page 5: Abstract...")
add_p("ABSTRACT", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=14, space_before=10, space_after=16, color=(135, 59, 70))

add_p("In contemporary higher education, independent learners and self-formed study cohorts frequently encounter significant friction: cognitive fatigue, severe procrastination, superficial study routines, unorganized academic conversations, and a lack of formative feedback on complex derivations and coding coursework. Existing digital productivity software relies primarily on passive elapsed-time counters (e.g., standard Pomodoro timers) that measure physical duration without validating actual knowledge acquisition or task completion. Concurrently, students frequently rely on general-purpose social messaging applications (e.g., WhatsApp, Discord, Telegram) for group study, which leads to communication fragmentation, lost homework files, unmoderated discussions, and unaddressed academic doubts.", size=11.5, space_before=0, space_after=10, line_spacing=1.25)

add_p("This project introduces CONSTA, an outcome-driven collaborative learning and personal growth platform engineered to transform unmonitored digital study hours into verifiable academic achievements. In the solo focus module, study timers are decoupled from gamified incentives; verified experience points (XP) and streak maintenance are awarded exclusively upon the confirmed completion of an interactive learning objective checklist, supplemented by a dedicated roadblock logger.", size=11.5, space_before=0, space_after=10, line_spacing=1.25)

add_p("For collaborative study, CONSTA implements role-governed cohorts where group administrators assign milestones, sub-topic checklists, and countdown deadline timers. Academic coursework is managed via an 8-stage state machine that models a continuous revision lifecycle (v1 -> v2 -> v3) featuring multi-page image and PDF uploads, changelog documentation, and structured 4-dimensional rubric scorecards (Correctness, Completeness, Clarity, Methodology) accompanied by assistive AI formative guidance.", size=11.5, space_before=0, space_after=10, line_spacing=1.25)

add_p("To eliminate cognitive bottlenecks during independent study, an integrated real-time doubt clearing hub leverages persistent bidirectional WebSockets (ws) for zero-latency message and diagram distribution, incorporating an author-endorsed \"Accepted Solution\" peer-reward mechanism (+15 XP). Furthermore, an auditable, append-only database transaction ledger (xp_transactions) records every experience point modification to prevent gamification exploits. Developed using React 19, Tailwind CSS v4, Node.js 22, Express, WebSockets, and native SQLite in Write-Ahead Logging (WAL) mode, the system is backed by a 33-suite automated regression test battery with 100% pass rates.", size=11.5, space_before=0, space_after=16, line_spacing=1.25)

p_kw = add_p("Keywords: ", bold=True, size=11, space_before=0, space_after=0)
p_kw.add_run("Collaborative Study, Computer-Supported Collaborative Learning (CSCL), Verifiable Learning Outcomes, Multi-Version Revisions, Formative Rubrics, WebSockets, Anti-Exploit Gamification, SQLite WAL.").font.size = Pt(10.5)

doc.add_page_break()

# =========================================================
# APPEND CORE CHAPTERS (Pages 6 - 45)
# =========================================================
print("Appending complete academic chapters and appendices...")
exec(open('d:/consta/report/append_deep_chapters.py', 'r', encoding='utf-8').read())

# Save clean DOCX
docx_out = os.path.abspath('d:/consta/report/CONSTA_Minor_Project_Report_Final.docx')
doc.save(docx_out)
print(f"Flawless Project Report DOCX saved to: {docx_out}")

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
