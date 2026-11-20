import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
import win32com.client

doc = Document()

# Page Setup: Standard A4 with 1.0-inch margins
for section in doc.sections:
    section.top_margin = Inches(0.9)
    section.bottom_margin = Inches(0.9)
    section.left_margin = Inches(1.0)
    section.right_margin = Inches(1.0)
    section.page_width = Inches(8.27)
    section.page_height = Inches(11.69)
    
    # Page numbering in footer: Right-aligned single number matching sample
    footer = section.footer
    p_ft = footer.paragraphs[0]
    p_ft.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    fldSimple = OxmlElement('w:fldSimple')
    fldSimple.set(qn('w:instr'), 'PAGE')
    p_ft._p.append(fldSimple)
    for run in p_ft.runs:
        run.font.name = 'Times New Roman'
        run.font.size = Pt(10)

def add_p(text="", align=WD_ALIGN_PARAGRAPH.JUSTIFY, bold=False, italic=False, size=11,
          space_before=0, space_after=6, line_spacing=1.15, color=(0, 0, 0)):
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

def add_bullet(text, space_after=3):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.left_indent = Inches(0.2)
    r = p.add_run("• " + text)
    r.font.name = 'Times New Roman'
    r.font.size = Pt(11)
    return p

def add_num_item(num_str, bold_prefix, text, space_after=3):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.left_indent = Inches(0.25)
    
    r_n = p.add_run(num_str + " ")
    r_n.font.name = 'Times New Roman'
    r_n.font.size = Pt(11)
    
    if bold_prefix:
        r_b = p.add_run(bold_prefix)
        r_b.font.name = 'Times New Roman'
        r_b.font.size = Pt(11)
        r_b.font.bold = False
        
    r_t = p.add_run(text)
    r_t.font.name = 'Times New Roman'
    r_t.font.size = Pt(11)
    return p

# =========================================================
# PAGE 1: TITLE & ABSTRACT
# =========================================================
add_p("CONSTA: A Smart Collaborative Learning & Personal Growth Platform",
      align=WD_ALIGN_PARAGRAPH.LEFT, bold=True, size=15, space_before=0, space_after=14)

add_p("Abstract", align=WD_ALIGN_PARAGRAPH.LEFT, bold=True, size=12, space_before=0, space_after=8)

add_p("The present invention relates to a web-based digital platform, named the CONSTA website, designed to help students manage their study and learning activities easily. Students often face difficulties in maintaining study consistency, tracking focused study hours, getting peer doubt assistance, managing group study tasks, and finding structured revision guidance and progress estimates. The proposed website brings these important learning tools and collaborative features together in one place so that the student does not have to depend on many different sources.",
      size=11, space_before=0, space_after=10)

add_p("The website provides useful features such as a student profile, solo study studio with roadblock logger, collaborative study cohorts, an 8-stage task revision manager, real-time doubt clearing chat, learning streaks heatmap, and progress analytics. The user opens the website, registers or signs in if the option is enabled, adds study goals and checklist details, records focus sessions and roadblocks, checks the available tools such as live doubt clearing or cohort tasks, and updates the records whenever required.",
      size=11, space_before=0, space_after=10)

add_p("The website is developed using HTML, which creates the structure of the web pages, CSS and Tailwind CSS, which designs the layout, and JavaScript with React, which adds interactive features. Node.js and Express handle the server-side operations, and SQLite stores the data when database functionality is enabled. Native WAL mode helps in managing concurrent access, web hosting makes the website available online, and WebSocket connections support the real-time chat and doubt features when they are connected.",
      size=11, space_before=0, space_after=10)

add_p("The main goal of the system is to make studying easier and to support better academic performance through technology. The streak tracking and peer doubt tools provide additional support when they are configured, and the website can be accessed through a web browser.",
      size=11, space_before=0, space_after=10)

add_p("The proposed system aims to help students organise their personal study details, task revision records, and academic doubts, and to manage important collaborative learning activities through one single digital platform.",
      size=11, space_before=0, space_after=0)

doc.add_page_break()

# =========================================================
# PAGE 2: PROPOSED METHODOLOGY (3.1, 3.2, 3.3)
# =========================================================
add_p("PROPOSED METHODOLOGY", align=WD_ALIGN_PARAGRAPH.LEFT, bold=True, size=13, space_before=0, space_after=12)

add_p("3.1 Overview of the Proposed System", align=WD_ALIGN_PARAGRAPH.LEFT, bold=True, size=11.5, space_before=0, space_after=6)
add_p("The CONSTA website is a digital platform designed to help students manage their learning activities easily. It provides useful features such as solo study tracking, cohort management, task revision tracking, real-time doubt clearing, streak monitoring, and learning analytics. The application aims to bring important academic tools and information together in one place.",
      size=11, space_before=0, space_after=8)
add_p("The CONSTA website provides a web-based platform to simplify study management. The main goal of the system is to make studying easier and to support better academic outcomes through technology.",
      size=11, space_before=0, space_after=8)
add_p("The major modules of the proposed system include the student profile, solo study studio, group cohorts, study tasks tracker, real-time doubt chat, XP and level system, and progress analytics. Each module performs a specific function within the overall study management platform.",
      size=11, space_before=0, space_after=12)

add_p("3.2 Problem Addressed by the System", align=WD_ALIGN_PARAGRAPH.LEFT, bold=True, size=11.5, space_before=0, space_after=6)
add_p("Students often face difficulties in managing their daily academic activities. The main problems faced by students are as follows:",
      size=11, space_before=0, space_after=6)

add_bullet("Study focus: Students find it difficult to maintain structured daily focus.")
add_bullet("Roadblocks: Students face problems in identifying and logging study obstacles.")
add_bullet("Doubts: Students need easy access to fast peer doubt resolution.")
add_bullet("Task tracking: Students find it difficult to track multi-version assignments.")
add_bullet("Motivation: Students need continuous habit tracking and consistency rewards.")

add_p("Students therefore need one platform to manage important study activities easily. To address this problem, the proposed website brings all these tools together on a single platform.",
      size=11, space_before=6, space_after=12)

add_p("3.3 Objectives of the System", align=WD_ALIGN_PARAGRAPH.LEFT, bold=True, size=11.5, space_before=0, space_after=6)
add_p("The main objectives of the proposed system are as follows:", size=11, space_before=0, space_after=6)
add_bullet("To manage study goals and daily focus sessions.")
add_bullet("To track study roadblocks and task progress easily.")
add_bullet("To provide real-time peer doubt clearing assistance.")
add_bullet("To access collaborative study cohorts and group tasks.")
add_bullet("To record study consistency through streaks and analytics.")

add_p("The main objective is to make study management easier through a single digital platform.",
      size=11, space_before=6, space_after=0)

doc.add_page_break()

# =========================================================
# PAGE 3: 3.4, 3.5, 3.6, 3.7 (Part 1)
# =========================================================
add_p("3.4 Proposed Solution", align=WD_ALIGN_PARAGRAPH.LEFT, bold=True, size=11.5, space_before=0, space_after=6)
add_p("The CONSTA website provides a web-based platform to simplify study management. The proposed solution includes the following:",
      size=11, space_before=0, space_after=6)

add_bullet("Develop a web-based platform to help students manage study activities.")
add_bullet("Manage study goals and objective checklist information.")
add_bullet("Maintain records of study roadblocks and focus sessions.")
add_bullet("Provide real-time doubt clearing assistance.")
add_bullet("Display collaborative cohorts and group tasks.")
add_bullet("Track learning streaks and performance analytics.")
add_bullet("Bring all important study tools together on a single platform.")

add_p("In this way, the important study activities can be managed through one platform.",
      size=11, space_before=6, space_after=12)

add_p("3.5 Methodology of Development", align=WD_ALIGN_PARAGRAPH.LEFT, bold=True, size=11.5, space_before=0, space_after=6)
add_p("The development of the CONSTA website consists of the following steps:", size=11, space_before=0, space_after=6)
add_num_item("1.", "Requirement analysis: ", "Identify the needs of students and define the website and its main features.")
add_num_item("2.", "Website design: ", "Plan the page layout, navigation, and a user-friendly interface.")
add_num_item("3.", "Development: ", "Build the interface with HTML, CSS, and JavaScript, and use Node.js and SQLite where implemented.")
add_num_item("4.", "Feature implementation: ", "Develop study session tracking and doubt clearing, and configure optional services when available.")
add_num_item("5.", "Testing: ", "Check the page layout, navigation, forms, and enabled features.")
add_num_item("6.", "Deployment: ", "Host the website for access through a web browser.")

add_p("3.6 Main Features and Modules", align=WD_ALIGN_PARAGRAPH.LEFT, bold=True, size=11.5, space_before=6, space_after=6)
add_p("The major features and modules of the proposed website include:", size=11, space_before=0, space_after=6)
add_bullet("Student profile: Manage student details.")
add_bullet("Solo study studio: Record focus sessions and roadblocks.")
add_bullet("Group cohorts: Join and manage collaborative study groups.")
add_bullet("Tasks manager: Track assignment submissions and revisions.")
add_bullet("Doubt clearing chat: Resolve doubts with real-time peer help.")
add_bullet("Streak tracker: Monitor daily learning consistency.")
add_bullet("Analytics: View focus time and study progress summaries.")

add_p("3.7 Workflow of the Website", align=WD_ALIGN_PARAGRAPH.LEFT, bold=True, size=11.5, space_before=6, space_after=6)
add_p("The process of using the CONSTA website consists of the following steps:", size=11, space_before=0, space_after=6)
add_num_item("1.", "Open the website: ", "The user visits the CONSTA website.")
add_num_item("2.", "Register or sign in: ", "The user enters account details, if enabled.")
add_num_item("3.", "Add study information: ", "The user enters study goals and checklist items.")

doc.add_page_break()

# =========================================================
# PAGE 4: 3.7 (Part 2), 3.8, 3.9, 3.10
# =========================================================
add_num_item("4.", "Record study sessions: ", "The user logs focus time and conceptual roadblocks.")
add_num_item("5.", "Check available tools: ", "The user views group tasks or uses the doubt clearing chat, if configured.")
add_num_item("6.", "Update records: ", "The user reviews and updates the study and task information.")

add_p("In this way, the workflow is: enter details, manage records, check available tools, and update information.",
      size=11, space_before=4, space_after=12)

add_p("3.8 Technology Stack", align=WD_ALIGN_PARAGRAPH.LEFT, bold=True, size=11.5, space_before=0, space_after=6)
add_p("The technologies used in the proposed system are as follows:", size=11, space_before=0, space_after=6)
add_bullet("HTML: Creates the structure of the web pages.")
add_bullet("CSS: Designs the website layout.")
add_bullet("JavaScript: Adds interactive features.")
add_bullet("Node.js: Handles server-side operations.")
add_bullet("SQLite: Stores data, if database functionality is enabled.")
add_bullet("Express.js: Helps manage routing and backend APIs.")
add_bullet("Web hosting: Makes the website available online.")
add_bullet("WebSockets: Support real-time messaging and doubt clearing when connected.")

add_p("3.9 Future Scope", align=WD_ALIGN_PARAGRAPH.LEFT, bold=True, size=11.5, space_before=6, space_after=6)
add_p("The proposed system can be improved in the future in the following ways:", size=11, space_before=0, space_after=6)
add_bullet("Add Hindi and regional language support.")
add_bullet("Provide downloadable study reports and summaries.")
add_bullet("Introduce mobile application support for Android and iOS.")
add_bullet("Add daily study habit reminders and notifications.")
add_bullet("Improve automated doubt screening and recommendations.")
add_bullet("Add charts and dashboard performance summaries.")

add_p("3.10 Conclusion", align=WD_ALIGN_PARAGRAPH.LEFT, bold=True, size=11.5, space_before=6, space_after=6)
add_p("The CONSTA website provides a digital platform for academic and study information. It helps organise student details, focus sessions, and task records.",
      size=11, space_before=0, space_after=8)
add_p("Real-time chat and analytics tools can provide additional support when configured. The project aims to make study management easier to handle, and future improvements can make the platform more useful for students.",
      size=11, space_before=0, space_after=0)

doc.add_page_break()

# =========================================================
# PAGE 5: DISPLAY IMAGE / DIAGRAM & APPLICANT DETAILS
# =========================================================
add_p("Display Image/Diagram", align=WD_ALIGN_PARAGRAPH.LEFT, bold=True, size=13, space_before=0, space_after=3)
add_p("Proposed System Workflow", align=WD_ALIGN_PARAGRAPH.LEFT, bold=True, size=12, space_before=0, space_after=8)

# Insert the diagram
diag_path = os.path.abspath('d:/consta/synopsis/consta_proposed_workflow_p5.png')
if os.path.exists(diag_path):
    p_img = doc.add_paragraph()
    p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_img.paragraph_format.space_before = Pt(0)
    p_img.paragraph_format.space_after = Pt(10)
    p_img.add_run().add_picture(diag_path, width=Inches(6.25))

add_p("Name of Applicant:", align=WD_ALIGN_PARAGRAPH.LEFT, bold=True, size=11.5, space_before=2, space_after=4)

applicants = [
    "1. Mohit Kumar",
    "2. Abhijit Kumar Singh",
    "3. Abhishek Kumar",
    "4. Aditya Raj"
]

for app in applicants:
    p_a = doc.add_paragraph()
    p_a.paragraph_format.space_before = Pt(0)
    p_a.paragraph_format.space_after = Pt(1.5)
    p_a.paragraph_format.left_indent = Inches(0.2)
    r = p_a.add_run(app)
    r.font.name = 'Times New Roman'
    r.font.size = Pt(10.5)

add_p("GREATER NOIDA INSTITUTE OF TECHNOLOGY (ENGINEERING INSTITUTE)",
      align=WD_ALIGN_PARAGRAPH.LEFT, bold=True, size=10.5, space_before=8, space_after=2)

add_p("Student, GREATER NOIDA INSTITUTE OF TECHNOLOGY (GNIOT), PLOT NO. 7, KNOWLEDGE PARK II, GREATER NOIDA, UTTAR PRADESH – 201310",
      align=WD_ALIGN_PARAGRAPH.LEFT, bold=False, size=9.5, space_before=0, space_after=0)

# Save Document
out_docx = os.path.abspath('d:/consta/synopsis/CONSTA_Patent_Synopsis_5_Pages.docx')
doc.save(out_docx)

# Convert to PDF via Word COM
word = win32com.client.Dispatch('Word.Application')
word.Visible = False

out_pdf = os.path.abspath('d:/consta/synopsis/CONSTA_Patent_Synopsis_5_Pages.pdf')
root_pdf = os.path.abspath('d:/consta/CONSTA_Patent_Synopsis_5_Pages.pdf')

try:
    doc_word = word.Documents.Open(out_docx)
    doc_word.SaveAs(out_pdf, FileFormat=17) # wdFormatPDF
    doc_word.SaveAs(root_pdf, FileFormat=17)
    total_pgs = doc_word.ComputeStatistics(2)
    doc_word.Close()
    print(f"5-Page Synopsis PDF generated successfully! Total Pages: {total_pgs}")
finally:
    word.Quit()
