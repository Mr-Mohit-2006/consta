import matplotlib.pyplot as plt
import matplotlib.patches as patches
import os

fig, ax = plt.subplots(figsize=(10.5, 5.5), dpi=300)
ax.set_xlim(0, 105)
ax.set_ylim(0, 55)
ax.axis('off')

# Style helper for boxes
def draw_box(x, y, w, h, title, subtitle_lines):
    # Rounded rectangle
    box = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.2,rounding_size=1.0",
                                 facecolor="#FFFFFF", edgecolor="#000000", linewidth=1.2)
    ax.add_patch(box)
    # Title
    ax.text(x + w/2, y + h - 2.8, title, ha='center', va='top', fontfamily='serif', fontsize=10.5, fontweight='bold', color='#000000')
    # Divider line
    ax.plot([x + 1, x + w - 1], [y + h - 5.2, y + h - 5.2], color='#555555', linewidth=0.6)
    # Subtitle lines
    curr_y = y + h - 7.5
    for line in subtitle_lines:
        ax.text(x + w/2, curr_y, line, ha='center', va='top', fontfamily='serif', fontsize=8.5, color='#222222')
        curr_y -= 2.6

# Style helper for arrows
def draw_arrow(x1, y1, x2, y2, label=None, label_pos=(0, 0), ha='center', va='bottom', style='->'):
    ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle=style, color='#000000', lw=1.2, shrinkA=0, shrinkB=0))
    if label:
        lx = (x1 + x2)/2 + label_pos[0]
        ly = (y1 + y2)/2 + label_pos[1]
        ax.text(lx, ly, label, ha=ha, va=va, fontfamily='serif', fontsize=8, fontstyle='italic', color='#000000')

# Top Row - 5 Main Pipeline Stages
# Box 1: Solo Study Focus
draw_box(2, 36, 17, 16, "Solo Study Input", ["Timer Duration", "Objective Checklist", "Roadblock Logger"])

# Box 2: Cohort Governance
draw_box(23, 36, 17, 16, "Study Cohorts", ["Admin Governance", "Sub-Topic Checklists", "Deadline Timers"])

# Box 3: Multi-Version Tasks
draw_box(44, 36, 17, 16, "Task Lifecycle", ["8-Stage State Machine", "v1 -> v2 Revisions", "4-Criterion Rubric"])

# Box 4: Anti-Exploit Ledger
draw_box(65, 36, 17, 16, "Anti-Exploit Ledger", ["Append-Only Log", "Uniqueness Guards", "Verified XP Audit"])

# Box 5: Growth Dashboard
draw_box(86, 36, 17, 16, "Growth Dashboard", ["Daily Heatmap", "Level 1-10 Ranks", "Verified Metrics"])

# Top Row Connecting Arrows
draw_arrow(19, 44, 23, 44)
draw_arrow(40, 44, 44, 44)
draw_arrow(61, 44, 65, 44)
draw_arrow(82, 44, 86, 44)

# Bottom Row - 2 Key Infrastructure Systems
# Box 6: Real-Time Doubt Hub
draw_box(28, 12, 22, 16, "Real-Time Doubt Hub", ["WebSocket (ws) Channels", "Live Code/Image Uploads", "Peer Problem-Solving"])

# Box 7: Persistent SQLite Engine
draw_box(58, 12, 22, 16, "Persistence Engine", ["Native node:sqlite (WAL)", "Truncate Checkpoints", "Daily JSON Backups"])

# Interconnections:
# Cohorts -> Doubt Hub
ax.plot([31.5, 31.5], [36, 28], color='#000000', lw=1.2)
ax.annotate('', xy=(31.5, 28), xytext=(31.5, 36),
            arrowprops=dict(arrowstyle='->', color='#000000', lw=1.2))
ax.text(32.5, 32, "cohort room", fontfamily='serif', fontsize=7.5, fontstyle='italic')

# Doubt Hub -> Anti-Exploit Ledger (Accepted Solution)
ax.plot([50, 55, 55, 73.5, 73.5], [20, 20, 29, 29, 36], color='#000000', lw=1.2)
ax.annotate('', xy=(73.5, 36), xytext=(73.5, 29),
            arrowprops=dict(arrowstyle='->', color='#000000', lw=1.2))
ax.text(62, 29.8, "Accepted Solution (+15 XP)", fontfamily='serif', fontsize=7.5, fontstyle='italic', ha='center')

# Anti-Exploit Ledger -> Persistence Engine
ax.plot([73.5, 73.5, 80], [36, 20, 20], color='#000000', lw=1.2)
ax.annotate('', xy=(80, 20), xytext=(73.5, 20),
            arrowprops=dict(arrowstyle='->', color='#000000', lw=1.2))
ax.text(76, 20.8, "atomic write", fontfamily='serif', fontsize=7.5, fontstyle='italic', ha='center')

# Caption at bottom
fig.text(0.5, 0.05, "Fig. 1. Overall workflow of the proposed CONSTA Collaborative Study Platform.",
         ha='center', va='bottom', fontfamily='serif', fontsize=10.5, fontweight='normal')

plt.tight_layout()
output_img = os.path.abspath('d:/consta/synopsis/fig1_workflow.png')
plt.savefig(output_img, dpi=300, bbox_inches='tight')
plt.close()
print("Saved fig1_workflow.png to:", output_img)
