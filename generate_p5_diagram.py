import os
from PIL import Image, ImageDraw, ImageFont

# Generate a high-resolution workflow diagram matching Page 5 of Smart Farmer sample
W, H = 2400, 1600
img = Image.new("RGB", (W, H), "#FFFFFF")
draw = ImageDraw.Draw(img)

# Try loading standard Windows fonts
try:
    font_title = ImageFont.truetype("arialbd.ttf", 46)
    font_subtitle = ImageFont.truetype("arialbd.ttf", 36)
    font_box_title = ImageFont.truetype("arialbd.ttf", 30)
    font_box_desc = ImageFont.truetype("arial.ttf", 24)
    font_step_num = ImageFont.truetype("arialbd.ttf", 26)
    font_pipeline = ImageFont.truetype("arialbd.ttf", 28)
except:
    font_title = ImageFont.load_default()
    font_subtitle = font_title
    font_box_title = font_title
    font_box_desc = font_title
    font_step_num = font_title
    font_pipeline = font_title

# 1. Top Title Pill
# "CONSTA: Collaborative Study & Personal Growth Platform"
title_text = "CONSTA: Collaborative Study & Personal Growth Platform"
pill_w, pill_h = 1500, 80
pill_x0 = (W - pill_w) // 2
pill_y0 = 50
draw.rounded_rectangle([pill_x0, pill_y0, pill_x0 + pill_w, pill_y0 + pill_h], radius=40, fill="#1B365D")
bbox = draw.textbbox((0, 0), title_text, font=font_title)
tw = bbox[2] - bbox[0]
th = bbox[3] - bbox[1]
draw.text((pill_x0 + (pill_w - tw) // 2, pill_y0 + (pill_h - th) // 2 - 4), title_text, fill="#FFFFFF", font=font_title)

# 2. Section 1: Proposed System Workflow
# Outer dashed boundary
draw.rectangle([60, 160, W - 60, 830], outline="#6BA4B8", width=3)

# Subtitle pill: "Proposed System Workflow"
sub1_text = "Proposed System Workflow"
sub_w, sub_h = 560, 56
sub_x0 = (W - sub_w) // 2
sub_y0 = 132
draw.rounded_rectangle([sub_x0, sub_y0, sub_x0 + sub_w, sub_y0 + sub_h], radius=28, fill="#FFFFFF", outline="#3A8FB7", width=3)
bbox = draw.textbbox((0, 0), sub1_text, font=font_subtitle)
tw = bbox[2] - bbox[0]
th = bbox[3] - bbox[1]
draw.text((sub_x0 + (sub_w - tw) // 2, sub_y0 + (sub_h - th) // 2 - 3), sub1_text, fill="#1B365D", font=font_subtitle)

# 6 Workflow Step Cards
step_data = [
    ("1", "Open Platform", "Visit the CONSTA web application via any standard browser.", "#E6F4FA", "#2B82BA"),
    ("2", "Register / Sign In", "Authenticate securely via JWT tokens or create a new student account.", "#EAF7EB", "#2E8B57"),
    ("3", "Solo Focus Studio", "Define measurable goals, run focus timer, and log qualitative roadblocks.", "#FFF8E7", "#D48806"),
    ("4", "Join Cohorts & Tasks", "Collaborate in subject cohorts and submit multi-version coursework.", "#F5EDF9", "#8E44AD"),
    ("5", "Real-Time Doubt Hub", "Clear doubts with live WebSockets and earn +15 XP for accepted answers.", "#FDEEE9", "#D35400"),
    ("6", "XP & Analytics", "Audit tamper-resistant XP transactions and review 90-day heatmaps.", "#FDF2F4", "#C0392B")
]

card_w = 340
card_h = 480
card_y = 220
spacing = 38
start_x = (W - (6 * card_w + 5 * spacing)) // 2

for i, (num, heading, desc, bg_col, stroke_col) in enumerate(step_data):
    cx = start_x + i * (card_w + spacing)
    # Card outline & fill
    draw.rounded_rectangle([cx, card_y, cx + card_w, card_y + card_h], radius=24, fill=bg_col, outline=stroke_col, width=3)
    
    # Step Number Badge
    nb_r = 30
    nb_cx = cx + card_w // 2
    nb_cy = card_y + 45
    draw.ellipse([nb_cx - nb_r, nb_cy - nb_r, nb_cx + nb_r, nb_cy + nb_r], fill=stroke_col)
    bbox = draw.textbbox((0, 0), num, font=font_step_num)
    nw = bbox[2] - bbox[0]
    nh = bbox[3] - bbox[1]
    draw.text((nb_cx - nw // 2, nb_cy - nh // 2 - 2), num, fill="#FFFFFF", font=font_step_num)
    
    # Heading
    bbox = draw.textbbox((0, 0), heading, font=font_box_title)
    hw = bbox[2] - bbox[0]
    draw.text((cx + (card_w - hw) // 2, card_y + 95), heading, fill="#1B365D", font=font_box_title)
    
    # Decorative Icon Box
    ib_w, ib_h = 100, 75
    ib_x = cx + (card_w - ib_w) // 2
    ib_y = card_y + 160
    draw.rounded_rectangle([ib_x, ib_y, ib_x + ib_w, ib_y + ib_h], radius=16, fill="#FFFFFF", outline=stroke_col, width=2)
    # Simple icon pattern inside
    draw.rectangle([ib_x + 18, ib_y + 16, ib_x + ib_w - 18, ib_y + ib_h - 16], fill=bg_col)
    
    # Description text wrapped
    # Simple word wrap
    words = desc.split()
    lines = []
    cur_line = []
    for w in words:
        cur_line.append(w)
        test_str = " ".join(cur_line)
        bbox = draw.textbbox((0, 0), test_str, font=font_box_desc)
        if bbox[2] - bbox[0] > card_w - 40:
            cur_line.pop()
            lines.append(" ".join(cur_line))
            cur_line = [w]
    if cur_line:
        lines.append(" ".join(cur_line))
    
    text_y = card_y + 265
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font_box_desc)
        lw = bbox[2] - bbox[0]
        draw.text((cx + (card_w - lw) // 2, text_y), line, fill="#333333", font=font_box_desc)
        text_y += 34

    # Arrow to next card
    if i < 5:
        arrow_x = cx + card_w + 8
        arrow_y = card_y + card_h // 2
        draw.polygon([(arrow_x, arrow_y - 12), (arrow_x + 22, arrow_y), (arrow_x, arrow_y + 12)], fill="#1B365D")

# Bottom summary banner inside section 1
sum_pill_w = W - 200
sum_pill_h = 56
sum_pill_x = 100
sum_pill_y = card_y + card_h + 35
draw.rounded_rectangle([sum_pill_x, sum_pill_y, sum_pill_x + sum_pill_w, sum_pill_y + sum_pill_h], radius=28, fill="#E6FAF0", outline="#27AE60", width=2)
pipeline_text = "Workflow: Access Platform  →  Set Focus Goals  →  Collaborate in Cohorts  →  Resolve Doubts  →  Track Verified Progress"
bbox = draw.textbbox((0, 0), pipeline_text, font=font_pipeline)
pw = bbox[2] - bbox[0]
ph = bbox[3] - bbox[1]
draw.text((sum_pill_x + (sum_pill_w - pw) // 2, sum_pill_y + (sum_pill_h - ph) // 2 - 2), pipeline_text, fill="#196F3D", font=font_pipeline)

# 3. Section 2: Main Features and Modules
draw.rectangle([60, 900, W - 60, 1530], outline="#6BA4B8", width=3)

# Subtitle pill: "Main Features and Modules"
sub2_text = "Main Features and Modules"
sub_w, sub_h = 560, 56
sub_x0 = (W - sub_w) // 2
sub_y0 = 872
draw.rounded_rectangle([sub_x0, sub_y0, sub_x0 + sub_w, sub_y0 + sub_h], radius=28, fill="#FFFFFF", outline="#3A8FB7", width=3)
bbox = draw.textbbox((0, 0), sub2_text, font=font_subtitle)
tw = bbox[2] - bbox[0]
th = bbox[3] - bbox[1]
draw.text((sub_x0 + (sub_w - tw) // 2, sub_y0 + (sub_h - th) // 2 - 3), sub2_text, fill="#1B365D", font=font_subtitle)

# 7 Feature Cards
features = [
    ("Student Profile", "Manage identity, level rank, & privacy mode.", "#EAF2F8", "#2980B9"),
    ("Solo Study Studio", "Objective checklist & roadblock tracker.", "#E8F8F5", "#16A085"),
    ("Study Cohorts", "Subject-specific rooms & admin tools.", "#FEF9E7", "#F39C12"),
    ("Coursework Tasks", "8-stage state machine with multi-versioning.", "#F4ECF7", "#8E44AD"),
    ("Real-Time Doubts", "Sub-100ms WebSocket chat & +15 XP answer.", "#FDEDEC", "#E74C3C"),
    ("XP & Level Ledger", "Auditable, tamper-resistant transaction trail.", "#EBF5FB", "#3498DB"),
    ("Analytics & Heatmap", "90-day consistency heatmap & outcomes.", "#EAFAF1", "#2ECC71")
]

feat_w = 295
feat_h = 480
feat_y = 960
f_spacing = 28
f_start_x = (W - (7 * feat_w + 6 * f_spacing)) // 2

for i, (f_name, f_desc, f_bg, f_stroke) in enumerate(features):
    fx = f_start_x + i * (feat_w + f_spacing)
    draw.rounded_rectangle([fx, feat_y, fx + feat_w, feat_y + feat_h], radius=20, fill=f_bg, outline=f_stroke, width=2)
    
    # Icon square
    is_w, is_h = 90, 90
    is_x = fx + (feat_w - is_w) // 2
    is_y = feat_y + 40
    draw.rounded_rectangle([is_x, is_y, is_x + is_w, is_y + is_h], radius=20, fill="#FFFFFF", outline=f_stroke, width=2)
    draw.rounded_rectangle([is_x + 16, is_y + 16, is_x + is_w - 16, is_y + is_h - 16], radius=10, fill=f_stroke)
    
    # Title
    words = f_name.split()
    if len(words) > 1:
        t1 = words[0]
        t2 = " ".join(words[1:])
        bbox1 = draw.textbbox((0, 0), t1, font=font_box_title)
        bbox2 = draw.textbbox((0, 0), t2, font=font_box_title)
        draw.text((fx + (feat_w - (bbox1[2] - bbox1[0])) // 2, feat_y + 165), t1, fill="#1B365D", font=font_box_title)
        draw.text((fx + (feat_w - (bbox2[2] - bbox2[0])) // 2, feat_y + 205), t2, fill="#1B365D", font=font_box_title)
    else:
        bbox = draw.textbbox((0, 0), f_name, font=font_box_title)
        draw.text((fx + (feat_w - (bbox[2] - bbox[0])) // 2, feat_y + 180), f_name, fill="#1B365D", font=font_box_title)
        
    # Divider line
    draw.line([(fx + 30, feat_y + 265), (fx + feat_w - 30, feat_y + 265)], fill=f_stroke, width=2)
    
    # Description
    words = f_desc.split()
    lines = []
    cur_line = []
    for w in words:
        cur_line.append(w)
        test_str = " ".join(cur_line)
        bbox = draw.textbbox((0, 0), test_str, font=font_box_desc)
        if bbox[2] - bbox[0] > feat_w - 30:
            cur_line.pop()
            lines.append(" ".join(cur_line))
            cur_line = [w]
    if cur_line:
        lines.append(" ".join(cur_line))
        
    ty = feat_y + 295
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font_box_desc)
        lw = bbox[2] - bbox[0]
        draw.text((fx + (feat_w - lw) // 2, ty), line, fill="#444444", font=font_box_desc)
        ty += 34

out_dir = r"d:\consta\synopsis"
os.makedirs(out_dir, exist_ok=True)
out_path = os.path.join(out_dir, "consta_proposed_workflow_p5.png")
img.save(out_path, format="PNG")
print(f"Workflow diagram saved to: {out_path}")
