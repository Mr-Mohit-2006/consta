# build_merged_45_page_report.py
# Combines user's official front-matter template (Pages 1-4) with complete 45-page B.Tech Minor Project Report

import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls
import os
import win32com.client

print("Loading official front matter DOCX (Pages 1-4)...")
front_matter_path = os.path.abspath('d:/consta/report/user_front_matter.docx')
doc = Document(front_matter_path)

# Ensure page setup
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

# 1. Fill ACKNOWLEDGEMENT content on Page 4
print("Populating Acknowledgement on Page 4...")
# The last paragraph in doc is ACKNOWLEDGEMENT or an empty paragraph after it.
# Let's inspect paragraphs around the end:
# We ensure ACKNOWLEDGEMENT is centered and bold, followed by the text
add_p("We express our deepest gratitude and heartfelt appreciation to our project supervisor, Mr. Manoj Kumar, Assistant Professor, Department of Computer Science & Engineering, for his invaluable guidance, continuous encouragement, constructive criticism, and expert technical insights throughout the design, implementation, and evaluation of this project.", size=11.5, space_after=12)

add_p("We are profoundly thankful to the Head of the Department, Department of Computer Science & Engineering, for providing the departmental resources, laboratory infrastructure, and academic atmosphere required to carry out this project successfully.", size=11.5, space_after=12)

add_p("We also extend our sincere gratitude to the Director and Management of Greater Noida Institute of Technology (Engineering Institute), Greater Noida, for fostering an academic environment dedicated to technical rigor, research, and innovation.", size=11.5, space_after=12)

add_p("Finally, we express our warmest appreciation to our parents, family members, and classmates for their moral support, understanding, and constructive feedback throughout our engineering coursework and project development.", size=11.5, space_after=32)

ack_tbl = doc.add_table(rows=2, cols=2)
ack_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
ack_tbl.columns[0].width = Inches(3.2)
ack_tbl.columns[1].width = Inches(3.2)

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

# 2. ABSTRACT (Page 5)
add_p("ABSTRACT", align=WD_ALIGN_PARAGRAPH.CENTER, bold=True, size=14, space_after=16)

add_p("In contemporary higher education, independent learners and self-formed study cohorts frequently encounter significant friction: cognitive fatigue, severe procrastination, superficial study routines, unorganized academic conversations, and a lack of formative feedback on complex derivations and coding coursework. Existing digital productivity software relies primarily on passive elapsed-time counters (e.g., standard Pomodoro timers) that measure physical duration without validating actual knowledge acquisition or task completion. Concurrently, students frequently rely on general-purpose social messaging applications (e.g., WhatsApp, Discord, Telegram) for group study, which leads to communication fragmentation, lost homework files, unmoderated discussions, and unaddressed academic doubts.", size=11.5, space_after=10)

add_p("This project introduces CONSTA, an outcome-driven collaborative learning and personal growth platform engineered to transform unmonitored digital study hours into verifiable academic achievements. In the solo focus module, study timers are decoupled from gamified incentives; verified experience points (XP) and streak maintenance are awarded exclusively upon the confirmed completion of an interactive learning objective checklist, supplemented by a dedicated roadblock logger.", size=11.5, space_after=10)

add_p("For collaborative study, CONSTA implements role-governed cohorts where group administrators assign milestones, sub-topic checklists, and countdown deadline timers. Academic coursework is managed via an 8-stage state machine that models a continuous revision lifecycle (v1 -> v2 -> v3) featuring multi-page image and PDF uploads, changelog documentation, and structured 4-dimensional rubric scorecards (Correctness, Completeness, Clarity, Methodology) accompanied by assistive AI formative guidance.", size=11.5, space_after=10)

add_p("To eliminate cognitive bottlenecks during independent study, an integrated real-time doubt clearing hub leverages persistent bidirectional WebSockets (ws) for zero-latency message and diagram distribution, incorporating an author-endorsed \"Accepted Solution\" peer-reward mechanism (+15 XP). Furthermore, an auditable, append-only database transaction ledger (xp_transactions) records every experience point modification to prevent gamification exploits. Developed using React 19, Tailwind CSS v4, Node.js 22, Express, WebSockets, and native SQLite in Write-Ahead Logging (WAL) mode, the system is backed by a 33-suite automated regression test battery with 100% pass rates.", size=11.5, space_after=16)

p_kw = add_p("Keywords: ", bold=True, size=11, space_after=0)
p_kw.add_run("Collaborative Study, Computer-Supported Collaborative Learning (CSCL), Verifiable Learning Outcomes, Multi-Version Revisions, Formative Rubrics, WebSockets, Anti-Exploit Gamification, SQLite WAL.").font.size = Pt(10.5)

doc.add_page_break()

# 3. APPEND REMAINING CHAPTERS & APPENDICES
print("Appending complete academic chapters and appendices...")
exec(open('d:/consta/report/append_deep_chapters.py', 'r', encoding='utf-8').read())

# Save combined DOCX
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
