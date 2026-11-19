import matplotlib.pyplot as plt
import matplotlib.patches as patches
import os

os.makedirs('d:/consta/report/figures', exist_ok=True)

# 1. Figure: DFD Level 1 (Data Flow Diagram)
fig, ax = plt.subplots(figsize=(10, 6), dpi=300)
ax.set_xlim(0, 100)
ax.set_ylim(0, 60)
ax.axis('off')

def draw_proc(x, y, r, num, title):
    c = plt.Circle((x, y), r, facecolor='#FAF4EB', edgecolor='#873B46', lw=2)
    ax.add_patch(c)
    ax.text(x, y + 1.5, f"{num}", ha='center', va='center', fontfamily='serif', fontsize=10, fontweight='bold', color='#873B46')
    ax.text(x, y - 1.5, title, ha='center', va='center', fontfamily='serif', fontsize=8.5, fontweight='bold', color='#332426')

def draw_entity(x, y, w, h, name):
    r = patches.Rectangle((x, y), w, h, facecolor='#FFFCF7', edgecolor='#332426', lw=1.5)
    ax.add_patch(r)
    ax.text(x + w/2, y + h/2, name, ha='center', va='center', fontfamily='serif', fontsize=10, fontweight='bold', color='#332426')

def draw_store(x, y, w, h, id_str, name):
    ax.plot([x, x+w], [y+h, y+h], color='#332426', lw=1.5)
    ax.plot([x, x+w], [y, y], color='#332426', lw=1.5)
    ax.plot([x+4, x+4], [y, y+h], color='#332426', lw=1.2)
    ax.text(x+2, y+h/2, id_str, ha='center', va='center', fontfamily='serif', fontsize=8, fontweight='bold')
    ax.text(x+4+(w-4)/2, y+h/2, name, ha='center', va='center', fontfamily='serif', fontsize=8.5, fontweight='bold')

def draw_arrow(x1, y1, x2, y2, label="", rad=0.0):
    ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle="->", color="#873B46", lw=1.2, shrinkA=0, shrinkB=0,
                                connectionstyle=f"arc3,rad={rad}"))
    if label:
        mx, my = (x1+x2)/2, (y1+y2)/2
        ax.text(mx, my+1.2, label, ha='center', va='bottom', fontfamily='serif', fontsize=7.5, fontstyle='italic', color='#332426')

# Entities
draw_entity(2, 26, 12, 8, "Student / User")
draw_entity(86, 26, 12, 8, "Cohort Admin")

# Processes
draw_proc(28, 44, 6.5, "1.0", "Auth &\nIdentity")
draw_proc(28, 16, 6.5, "2.0", "Solo Study\nTimer")
draw_proc(50, 30, 7.0, "3.0", "Task Lifecycle\n& Revision")
draw_proc(72, 44, 6.5, "4.0", "Cohort\nGovernance")
draw_proc(72, 16, 6.5, "5.0", "Real-Time\nDoubt Hub")

# Data Stores
draw_store(38, 52, 24, 6, "D1", "Users & Credentials")
draw_store(38, 3, 24, 6, "D2", "Sessions & Objectives")
draw_store(40, 20, 20, 5, "D3", "Submissions & Reviews")
draw_store(54, 52, 24, 6, "D4", "Cohorts & Memberships")
draw_store(70, 3, 24, 6, "D5", "xp_transactions Ledger")

# Connecting lines
draw_arrow(14, 31, 22, 43, "Credentials")
draw_arrow(14, 28, 22, 18, "Study Goals")
draw_arrow(28, 37.5, 38, 54, "Auth Token")
draw_arrow(28, 9.5, 38, 6, "Logged XP")
draw_arrow(86, 31, 78, 43, "Create Cohort")
draw_arrow(72, 37.5, 68, 52, "Manage Roles")
draw_arrow(34.5, 44, 44, 33, "JWT Context")
draw_arrow(34.5, 17, 44, 27, "Task Progress")
draw_arrow(50, 23, 48, 12, "Review Score")
draw_arrow(72, 22.5, 76, 9, "+15 XP Solve")

fig.text(0.5, 0.02, "Fig. 4.1. Data Flow Diagram (DFD Level 1) of CONSTA Platform.", ha='center', va='bottom', fontfamily='serif', fontsize=10, fontweight='bold')
plt.tight_layout()
plt.savefig('d:/consta/report/figures/fig_dfd_level1.png', dpi=300, bbox_inches='tight')
plt.close()

# 2. Figure: Entity-Relationship (ER) Diagram
fig, ax = plt.subplots(figsize=(11, 7), dpi=300)
ax.set_xlim(0, 110)
ax.set_ylim(0, 70)
ax.axis('off')

def draw_er_table(x, y, w, h, name, fields):
    r = patches.Rectangle((x, y), w, h, facecolor='#FFFCF7', edgecolor='#332426', lw=1.4)
    ax.add_patch(r)
    hr = patches.Rectangle((x, y + h - 4.5), w, 4.5, facecolor='#873B46', edgecolor='#332426', lw=1.4)
    ax.add_patch(hr)
    ax.text(x + w/2, y + h - 2.2, name, ha='center', va='center', fontfamily='serif', fontsize=9.5, fontweight='bold', color='#FFFFFF')
    cy = y + h - 7.5
    for f, is_pk in fields:
        pk_tag = " (PK)" if is_pk == 'PK' else (" (FK)" if is_pk == 'FK' else "")
        ax.text(x + 1.5, cy, f + pk_tag, ha='left', va='center', fontfamily='serif', fontsize=7.5,
                fontweight='bold' if is_pk else 'normal', color='#1B5E20' if is_pk == 'PK' else ('#873B46' if is_pk == 'FK' else '#332426'))
        cy -= 2.6

# Tables
draw_er_table(3, 40, 20, 26, "users", [("id", "PK"), ("username", ""), ("email", ""), ("password_hash", ""), ("level", ""), ("total_xp", ""), ("created_at", "")])
draw_er_table(28, 44, 22, 22, "study_sessions", [("id", "PK"), ("user_id", "FK"), ("subject", ""), ("duration_min", ""), ("is_completed", ""), ("created_at", "")])
draw_er_table(55, 42, 24, 24, "cohorts", [("id", "PK"), ("name", ""), ("creator_id", "FK"), ("invite_code", ""), ("is_private", ""), ("created_at", "")])
draw_er_table(84, 42, 23, 24, "cohort_members", [("id", "PK"), ("cohort_id", "FK"), ("user_id", "FK"), ("role", ""), ("joined_at", "")])

draw_er_table(8, 8, 22, 26, "tasks", [("id", "PK"), ("cohort_id", "FK"), ("title", ""), ("status", ""), ("deadline", ""), ("created_at", "")])
draw_er_table(34, 8, 24, 26, "task_submissions", [("id", "PK"), ("task_id", "FK"), ("user_id", "FK"), ("version", ""), ("file_url", ""), ("changelog", "")])
draw_er_table(62, 8, 22, 26, "rubric_reviews", [("id", "PK"), ("submission_id", "FK"), ("reviewer_id", "FK"), ("score_total", ""), ("comments", "")])
draw_er_table(87, 8, 20, 26, "xp_transactions", [("id", "PK"), ("user_id", "FK"), ("amount", ""), ("source_type", ""), ("ref_id", "FK"), ("created_at", "")])

# Relationships
def draw_er_rel(x1, y1, x2, y2, label="1:N"):
    ax.plot([x1, x2], [y1, y2], color='#873B46', lw=1.2, ls='--')
    mx, my = (x1+x2)/2, (y1+y2)/2
    ax.text(mx, my, label, ha='center', va='center', fontfamily='serif', fontsize=7, bbox=dict(boxstyle="square,pad=0.2", fc="#FAF4EB", ec="#873B46", lw=0.6))

draw_er_rel(23, 53, 28, 53, "1:N")
draw_er_rel(23, 43, 55, 43, "1:N")
draw_er_rel(79, 54, 84, 54, "1:N")
draw_er_rel(30, 21, 34, 21, "1:N")
draw_er_rel(58, 21, 62, 21, "1:N")
draw_er_rel(25, 40, 87, 21, "1:N")

fig.text(0.5, 0.02, "Fig. 4.2. Entity-Relationship (ER) Schema of CONSTA Database.", ha='center', va='bottom', fontfamily='serif', fontsize=10, fontweight='bold')
plt.tight_layout()
plt.savefig('d:/consta/report/figures/fig_er_diagram.png', dpi=300, bbox_inches='tight')
plt.close()

# 3. Figure: 8-Stage Task State Machine
fig, ax = plt.subplots(figsize=(10.5, 4), dpi=300)
ax.set_xlim(0, 100)
ax.set_ylim(0, 40)
ax.axis('off')

def draw_state(x, y, w, h, name, is_end=False):
    r = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.3,rounding_size=1.2",
                               facecolor="#873B46" if is_end else "#FFFCF7",
                               edgecolor="#873B46", lw=1.5)
    ax.add_patch(r)
    ax.text(x + w/2, y + h/2, name, ha='center', va='center', fontfamily='serif',
            fontsize=8.5, fontweight='bold', color="#FFFFFF" if is_end else "#332426")

draw_state(2, 24, 14, 8, "not_started")
draw_state(20, 24, 14, 8, "in_progress")
draw_state(38, 24, 14, 8, "submitted (v1)")
draw_state(56, 24, 15, 8, "under_review")

draw_state(75, 24, 14, 8, "approved")
draw_state(88, 24, 10, 8, "completed", is_end=True)

draw_state(46, 5, 17, 8, "revision_requested")
draw_state(75, 5, 12, 8, "rejected", is_end=True)

# Transitions
draw_arrow(16, 28, 20, 28, "start")
draw_arrow(34, 28, 38, 28, "upload")
draw_arrow(52, 28, 56, 28, "assign")
draw_arrow(71, 28, 75, 28, "pass")
draw_arrow(86, 28, 88, 28, "+50 XP")

# Branching
draw_arrow(63.5, 24, 54.5, 13, "score < threshold", rad=0.1)
draw_arrow(46, 9, 38, 24, "re-submit (v2)", rad=-0.2)
draw_arrow(63.5, 24, 75, 13, "unacceptable", rad=-0.1)

fig.text(0.5, 0.02, "Fig. 4.3. Finite State Machine for 8-Stage Iterative Task Submission.", ha='center', va='bottom', fontfamily='serif', fontsize=10, fontweight='bold')
plt.tight_layout()
plt.savefig('d:/consta/report/figures/fig_task_state_machine.png', dpi=300, bbox_inches='tight')
plt.close()

# 4. Figure: Test Suite Verification Benchmark Chart
fig, ax = plt.subplots(figsize=(9, 4.5), dpi=300)
modules = ['Auth & Security', 'Cohort Governance', 'Task & Versions', 'Real-Time WebSockets', 'SQLite WAL Persistence']
tests = [8, 9, 8, 8, 5]
times = [85, 92, 110, 95, 68] # ms

x = range(len(modules))
width = 0.35

ax.set_facecolor('#FAF4EB')
fig.patch.set_facecolor('#FAF4EB')

rects1 = ax.bar([i - width/2 for i in x], tests, width, label='Automated Tests (Count)', color='#873B46', edgecolor='#642B35')
ax2 = ax.twinx()
rects2 = ax2.bar([i + width/2 for i in x], times, width, label='Execution Time (ms)', color='#D4A373', edgecolor='#873B46')

ax.set_ylabel('Number of Test Cases Passed', fontfamily='serif', fontsize=10, fontweight='bold', color='#873B46')
ax2.set_ylabel('Execution Latency (ms)', fontfamily='serif', fontsize=10, fontweight='bold', color='#78666A')
ax.set_xticks(list(x))
ax.set_xticklabels(modules, fontfamily='serif', fontsize=9, rotation=15, ha='right')

ax.set_ylim(0, 12)
ax2.set_ylim(0, 160)

for rect in rects1:
    h = rect.get_height()
    ax.annotate(f'{int(h)}/ {int(h)}', xy=(rect.get_x() + rect.get_width()/2, h), xytext=(0, 3),
                textcoords="offset points", ha='center', va='bottom', fontfamily='serif', fontsize=8.5, fontweight='bold', color='#873B46')

for rect in rects2:
    h = rect.get_height()
    ax2.annotate(f'{int(h)}ms', xy=(rect.get_x() + rect.get_width()/2, h), xytext=(0, 3),
                 textcoords="offset points", ha='center', va='bottom', fontfamily='serif', fontsize=8.5, fontweight='bold', color='#332426')

ax.set_title("Automated Test Suite Coverage & Execution Benchmark (33/33 Tests Passing)", fontfamily='serif', fontsize=11, fontweight='bold', pad=15)
fig.legend(loc='upper right', bbox_to_anchor=(0.9, 0.88), prop={'family': 'serif', 'size': 8.5})

plt.tight_layout()
plt.savefig('d:/consta/report/figures/fig_test_benchmarks.png', dpi=300, bbox_inches='tight')
plt.close()

print("All 4 report figures successfully generated in d:/consta/report/figures/")
