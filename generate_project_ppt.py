"""
Builds Major_Project_Presentation.pptx for MindGuard AI.

All technical content (routes, files, thresholds, weights, test counts, latency numbers)
is taken from this repository: backend/app/*, database/init/init-mongo.js, README.md and the
measured results recorded in MINDGUARD_AI_VTU_MAJOR_PROJECT_REPORT.md.

    python generate_project_ppt.py
"""
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_CONNECTOR, MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Inches, Pt
from lxml import etree

OUT = "Major_Project_Presentation.pptx"

# ---------------------------------------------------------------- palette
NAVY = RGBColor(0x0F, 0x17, 0x2A)
BLUE = RGBColor(0x25, 0x63, 0xEB)
TEAL = RGBColor(0x0D, 0x94, 0x88)
BG = RGBColor(0xF8, 0xFA, 0xFC)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
SLATE = RGBColor(0x47, 0x55, 0x69)
LINE = RGBColor(0xE2, 0xE8, 0xF0)
PALE_BLUE = RGBColor(0xDB, 0xEA, 0xFE)
PALE_TEAL = RGBColor(0xCC, 0xFB, 0xF1)
AMBER = RGBColor(0xD9, 0x77, 0x06)
RED = RGBColor(0xDC, 0x26, 0x26)
GREEN = RGBColor(0x16, 0xA3, 0x4A)
FONT = "Calibri"

W, H = Inches(13.333), Inches(7.5)
TOTAL = 14

prs = Presentation()
prs.slide_width, prs.slide_height = W, H
BLANK = prs.slide_layouts[6]


# ---------------------------------------------------------------- helpers
def rect(slide, x, y, w, h, fill=WHITE, line=None, shape=MSO_SHAPE.RECTANGLE, radius=None):
    s = slide.shapes.add_shape(shape, x, y, w, h)
    s.fill.solid()
    s.fill.fore_color.rgb = fill
    if line is None:
        s.line.fill.background()
    else:
        s.line.color.rgb = line
        s.line.width = Pt(1)
    s.shadow.inherit = False
    if radius is not None and shape == MSO_SHAPE.ROUNDED_RECTANGLE:
        s.adjustments[0] = radius
    return s


def style_run(run, size, color=NAVY, bold=False, italic=False, font=FONT):
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    run.font.name = font
    run.font.color.rgb = color


def text(slide, x, y, w, h, s, size=14, color=NAVY, bold=False, align=PP_ALIGN.LEFT,
         anchor=MSO_ANCHOR.TOP, italic=False, font=FONT):
    tb = slide.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    tf.margin_left = tf.margin_right = Inches(0.05)
    tf.margin_top = tf.margin_bottom = Inches(0.03)
    lines = s if isinstance(s, list) else [s]
    for i, ln in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        r = p.add_run()
        r.text = ln
        style_run(r, size, color, bold, italic, font)
    return tb


def shape_text(shape, lines, size=12, color=WHITE, bold=False, align=PP_ALIGN.CENTER, font=FONT):
    tf = shape.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    tf.margin_left = tf.margin_right = Inches(0.06)
    tf.margin_top = tf.margin_bottom = Inches(0.03)
    lines = lines if isinstance(lines, list) else [lines]
    for i, ln in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        r = p.add_run()
        if isinstance(ln, tuple):  # (text, size, bold, color)
            r.text = ln[0]
            style_run(r, ln[1], ln[3] if len(ln) > 3 else color, ln[2], font=font)
        else:
            r.text = ln
            style_run(r, size, color, bold, font=font)


def bullets(slide, x, y, w, h, items, size=15, gap=7, color=NAVY, key_color=BLUE):
    """items: list of (bold keyphrase, rest) tuples. Rendered as '- KEY  rest'."""
    tb = slide.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = Inches(0.05)
    for i, (key, rest) in enumerate(items):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.space_after = Pt(gap)
        r0 = p.add_run()
        r0.text = "■  "
        style_run(r0, size - 5, TEAL)
        r1 = p.add_run()
        r1.text = key
        style_run(r1, size, key_color, bold=True)
        r2 = p.add_run()
        r2.text = ("  " + rest) if rest else ""
        style_run(r2, size, color)
    return tb


def card(slide, x, y, w, h, heading=None, accent=BLUE, fill=WHITE):
    c = rect(slide, x, y, w, h, fill, LINE, MSO_SHAPE.ROUNDED_RECTANGLE, 0.03)
    rect(slide, x, y + Inches(0.12), Inches(0.07), h - Inches(0.24), accent)
    if heading:
        text(slide, x + Inches(0.2), y + Inches(0.08), w - Inches(0.3), Inches(0.4), heading,
             size=14, color=accent, bold=True)
    return c


def arrow(slide, x1, y1, x2, y2, color=SLATE, width=1.75):
    ln = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, x1, y1, x2, y2)
    ln.line.color.rgb = color
    ln.line.width = Pt(width)
    lnxml = ln.line._get_or_add_ln()
    tail = etree.SubElement(lnxml, qn("a:tailEnd"))
    tail.set("type", "triangle")
    tail.set("w", "med")
    tail.set("len", "med")
    return ln


def base_slide(n, title, subtitle=None):
    s = prs.slides.add_slide(BLANK)
    bg = s.background.fill
    bg.solid()
    bg.fore_color.rgb = BG
    rect(s, 0, 0, W, Inches(1.05), NAVY)
    rect(s, 0, Inches(1.05), W, Inches(0.05), TEAL)
    text(s, Inches(0.55), Inches(0.14), Inches(10.5), Inches(0.6), title, size=30, color=WHITE,
         bold=True, anchor=MSO_ANCHOR.MIDDLE)
    if subtitle:
        text(s, Inches(0.55), Inches(0.66), Inches(11.5), Inches(0.35), subtitle, size=13,
             color=RGBColor(0x94, 0xA3, 0xB8))
    badge = rect(s, Inches(12.2), Inches(0.27), Inches(0.62), Inches(0.5), TEAL,
                 shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.25)
    shape_text(badge, f"{n:02d}", size=16, bold=True)
    # footer
    text(s, Inches(0.55), Inches(7.08), Inches(9), Inches(0.3),
         "MindGuard AI  |  Major Project 2025-26  |  Dept. of ISE, TJIT, Bengaluru",
         size=10, color=SLATE)
    text(s, Inches(11.6), Inches(7.08), Inches(1.2), Inches(0.3), f"{n} / {TOTAL}", size=10,
         color=SLATE, align=PP_ALIGN.RIGHT)
    return s


def notes(slide, body):
    slide.notes_slide.notes_text_frame.text = body.strip()


def table(slide, x, y, w, col_w, rows, size=11, header_fill=NAVY, row_h=0.4, bold_first_col=False):
    nrows, ncols = len(rows), len(rows[0])
    gt = slide.shapes.add_table(nrows, ncols, x, y, w, Inches(row_h * nrows))
    tbl = gt.table
    # remove default style banding look by explicit fills
    for ci, cw in enumerate(col_w):
        tbl.columns[ci].width = Inches(cw)
    for ri, row in enumerate(rows):
        tbl.rows[ri].height = Inches(row_h)
        for ci, val in enumerate(row):
            cell = tbl.cell(ri, ci)
            cell.margin_left = cell.margin_right = Inches(0.08)
            cell.margin_top = cell.margin_bottom = Inches(0.03)
            cell.vertical_anchor = MSO_ANCHOR.MIDDLE
            cell.fill.solid()
            if ri == 0:
                cell.fill.fore_color.rgb = header_fill
            else:
                cell.fill.fore_color.rgb = WHITE if ri % 2 else RGBColor(0xF1, 0xF5, 0xF9)
            tf = cell.text_frame
            tf.word_wrap = True
            p = tf.paragraphs[0]
            r = p.add_run()
            r.text = str(val)
            if ri == 0:
                style_run(r, size, WHITE, True)
            else:
                style_run(r, size, NAVY, bold=(bold_first_col and ci == 0))
    return tbl


def stat_tile(slide, x, y, w, h, big, small, accent=BLUE):
    rect(slide, x, y, w, h, WHITE, LINE, MSO_SHAPE.ROUNDED_RECTANGLE, 0.06)
    rect(slide, x + Inches(0.15), y, w - Inches(0.3), Inches(0.06), accent)
    text(slide, x, y + Inches(0.12), w, h * 0.55, big, size=28, color=accent, bold=True,
         align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    text(slide, x + Inches(0.08), y + h * 0.62, w - Inches(0.16), h * 0.36, small, size=11,
         color=SLATE, align=PP_ALIGN.CENTER)


def flow_box(slide, x, y, w, h, title, sub=None, fill=BLUE):
    b = rect(slide, x, y, w, h, fill, None, MSO_SHAPE.ROUNDED_RECTANGLE, 0.12)
    lines = [(title, 13, True, WHITE)]
    if sub:
        lines.append((sub, 10, False, RGBColor(0xE2, 0xE8, 0xF0)))
    shape_text(b, lines)
    return b


# ================================================================ 1. TITLE
s = prs.slides.add_slide(BLANK)
s.background.fill.solid()
s.background.fill.fore_color.rgb = NAVY
rect(s, 0, 0, Inches(0.35), H, TEAL)
rect(s, Inches(9.6), 0, Inches(3.733), H, RGBColor(0x13, 0x1E, 0x38))
text(s, Inches(0.9), Inches(0.55), Inches(8), Inches(0.4),
     "VISVESVARAYA TECHNOLOGICAL UNIVERSITY, BELAGAVI  |  MAJOR PROJECT PRESENTATION  |  2025-26",
     size=11, color=RGBColor(0x94, 0xA3, 0xB8), bold=True)
text(s, Inches(0.9), Inches(1.25), Inches(8.5), Inches(1.0), "MindGuard AI", size=54, color=WHITE, bold=True)
rect(s, Inches(0.95), Inches(2.3), Inches(1.4), Inches(0.07), TEAL)
text(s, Inches(0.9), Inches(2.5), Inches(8.5), Inches(1.2),
     "Early Detection of Student Mental Wellness Issues Using Artificial Intelligence",
     size=24, color=RGBColor(0xCB, 0xD5, 0xE1))
text(s, Inches(0.9), Inches(4.0), Inches(4), Inches(0.35), "SUBMITTED BY", size=11, color=TEAL, bold=True)
team = [("Bindu Priya N", "1TJ23IS008"), ("Karthika Shree S", "1TJ23IS023"),
        ("Kaveri H S", "1TJ23IS024"), ("Sahana H", "1TJ23IS045")]
for i, (n, u) in enumerate(team):
    yy = Inches(4.4 + i * 0.42)
    text(s, Inches(0.9), yy, Inches(3.2), Inches(0.4), n, size=16, color=WHITE, bold=True)
    text(s, Inches(4.0), yy, Inches(2.2), Inches(0.4), u, size=16, color=RGBColor(0x94, 0xA3, 0xB8))
text(s, Inches(6.6), Inches(4.0), Inches(3), Inches(0.35), "DEPARTMENT", size=11, color=TEAL, bold=True)
text(s, Inches(6.6), Inches(4.4), Inches(3.0), Inches(1.6),
     ["Information Science", "& Engineering", "B.E., 8th Semester"], size=15, color=WHITE)
text(s, Inches(9.95), Inches(1.3), Inches(3.1), Inches(0.35), "COLLEGE", size=11, color=TEAL, bold=True)
text(s, Inches(9.95), Inches(1.7), Inches(3.1), Inches(1.2),
     ["T. John Institute", "of Technology", "Bengaluru"], size=18, color=WHITE, bold=True)
text(s, Inches(9.95), Inches(3.4), Inches(3.1), Inches(0.35), "PROJECT GUIDE", size=11, color=TEAL, bold=True)
text(s, Inches(9.95), Inches(3.8), Inches(3.1), Inches(0.9),
     ["Ms. Kumudha M", "Assistant Professor, Dept. of ISE"], size=14, color=WHITE)
text(s, Inches(9.95), Inches(5.0), Inches(3.1), Inches(0.35), "COORDINATOR  |  HOD", size=11, color=TEAL, bold=True)
text(s, Inches(9.95), Inches(5.4), Inches(3.1), Inches(1.0),
     ["Dr. Doddegowda B J", "Ms. Shilpa N S"], size=14, color=WHITE)
notes(s, """
Good morning respected guide, coordinator and panel members.
We are presenting our 8th-semester major project, "MindGuard AI: Early Detection of Student Mental Wellness Issues Using Artificial Intelligence".
The team is Bindu Priya N, Karthika Shree S, Kaveri H S and Sahana H, from the Department of ISE, T. John Institute of Technology, working under the guidance of Ms. Kumudha M.
Transition: Let me quickly take you through what we will cover.
""")

# ================================================================ 2. AGENDA
s = base_slide(2, "Agenda", "What this presentation covers")
items = ["Introduction", "Existing System", "Problem Statement", "Proposed System",
         "Flow Chart & Data Flow Diagram", "Literature Review", "Implementation",
         "Algorithm / Core Logic", "Results & Performance", "Future Enhancements", "Conclusion"]
for i, label in enumerate(items):
    col, row = (0, i) if i < 6 else (1, i - 6)
    x = Inches(0.7 + col * 6.2)
    y = Inches(1.55 + row * 0.9)
    rect(s, x, y, Inches(5.7), Inches(0.75), WHITE, LINE, MSO_SHAPE.ROUNDED_RECTANGLE, 0.15)
    b = rect(s, x + Inches(0.12), y + Inches(0.12), Inches(0.52), Inches(0.52),
             BLUE if i % 2 == 0 else TEAL, shape=MSO_SHAPE.OVAL)
    shape_text(b, f"{i + 1}", size=15, bold=True)
    text(s, x + Inches(0.85), y, Inches(4.7), Inches(0.75), label, size=19, color=NAVY, bold=True,
         anchor=MSO_ANCHOR.MIDDLE)
rect(s, Inches(6.9), Inches(6.05), Inches(5.7), Inches(0.75), PALE_TEAL, TEAL, MSO_SHAPE.ROUNDED_RECTANGLE, 0.15)
text(s, Inches(7.1), Inches(6.05), Inches(5.3), Inches(0.75), "Live demo after the slides", size=17, color=NAVY,
     bold=True, anchor=MSO_ANCHOR.MIDDLE)
notes(s, """
We start with the problem and the existing systems, then our solution, how data flows through it, and the literature review. After that we explain how it is built, the main logic, the results, future work and conclusion.
We have a demo mode, so after the slides we can show a stressed student and a calm student end to end.
""")

# ================================================================ 3. INTRODUCTION
s = base_slide(3, "Introduction", "Background and motivation")
card(s, Inches(0.55), Inches(1.4), Inches(8.1), Inches(5.45), "WHY THIS MATTERS")
bullets(s, Inches(0.8), Inches(1.9), Inches(7.7), Inches(4.9), [
    ("Student stress is rising:", "exams, deadlines and marks weigh on many students."),
    ("Overthinking", "means worrying about the same thing again and again. It can grow into anxiety or depression."),
    ("Students often do not notice it;", "help usually starts only after things get bad."),
    ("Support is hardest to reach at night", "and in exam weeks, when stress is highest."),
    ("Our idea:", "use what students already write to spot trouble early, privately, and with a clear reason."),
], size=16, gap=11)
stat_tile(s, Inches(9.0), Inches(1.4), Inches(3.8), Inches(1.65), "0 - 100", "a stress score for every entry", BLUE)
stat_tile(s, Inches(9.0), Inches(3.3), Inches(3.8), Inches(1.65), "3 levels", "self-help, early warning, counselor", TEAL)
stat_tile(s, Inches(9.0), Inches(5.2), Inches(3.8), Inches(1.65), "Private", "counselors see no names or diary text", BLUE)
notes(s, """
Overthinking means getting stuck in the same worries. It often leads to anxiety and depression, and students rarely notice it building up.
Campus counseling normally starts only when the student asks for help, and it is hardest to reach at night and during exams.
Our idea is simple: read what students already write, give an early and explainable score, suggest calming activities, and involve a counselor only when needed, while keeping the student's identity private.
""")

# ================================================================ 4. EXISTING SYSTEM
s = base_slide(4, "Existing System", "Current methods and their drawbacks")
text(s, Inches(0.55), Inches(1.3), Inches(6), Inches(0.35), "CURRENT METHODS", size=13, color=TEAL, bold=True)
approaches = [("Counseling centers", "fixed hours, waiting lists; student must ask first"),
              ("Meditation apps", "self-guided; cannot tell when someone is struggling"),
              ("Helplines", "only for emergencies; student must call"),
              ("Questionnaires (PHQ-9, GAD-7)", "accurate but filled rarely")]
for i, (k, v) in enumerate(approaches):
    y = Inches(1.7 + i * 1.28)
    card(s, Inches(0.55), y, Inches(5.6), Inches(1.15), accent=BLUE if i % 2 == 0 else TEAL)
    text(s, Inches(0.8), y + Inches(0.08), Inches(5.2), Inches(0.4), k, size=16, color=NAVY, bold=True)
    text(s, Inches(0.8), y + Inches(0.5), Inches(5.2), Inches(0.6), v, size=13, color=SLATE)
text(s, Inches(6.6), Inches(1.3), Inches(6), Inches(0.35), "DRAWBACKS", size=13, color=RED, bold=True)
card(s, Inches(6.6), Inches(1.7), Inches(6.2), Inches(5.0), accent=RED)
bullets(s, Inches(6.85), Inches(1.95), Inches(5.8), Inches(4.7), [
    ("Too late:", "help starts only after the student is already struggling."),
    ("No regular check:", "nobody notices changes between visits."),
    ("Same for everyone:", "no allowance for how each student feels and recovers."),
    ("One-size response:", "mild worry and serious distress get the same advice."),
    ("Privacy vs. awareness:", "watching students closely risks their privacy; scores are often unexplained."),
], size=15, gap=11, key_color=RED)
notes(s, """
Left: the four usual approaches. Counseling centers need the student to ask first. Meditation apps are self-guided. Helplines are for emergencies. Questionnaires are accurate but done rarely.
Right: the common drawbacks. Help comes late, nobody tracks changes in between, every student is treated the same, the response is not matched to how serious the situation is, and there is a trade-off between privacy and awareness.
These gaps shaped our requirements.
""")

# ================================================================ 5. PROBLEM STATEMENT
s = base_slide(5, "Problem Statement", "What this project solves")
rect(s, Inches(0.55), Inches(1.45), Inches(12.2), Inches(1.7), NAVY, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.06)
text(s, Inches(0.9), Inches(1.5), Inches(11.5), Inches(1.6),
     "“Students often do not notice harmful overthinking, and campus help starts only after a "
     "breakdown. We need a simple way to spot it early from everyday writing, explain the result, "
     "suggest the right help, and keep the student's privacy safe.”",
     size=20, color=WHITE, anchor=MSO_ANCHOR.MIDDLE, italic=True)
text(s, Inches(0.55), Inches(3.4), Inches(8), Inches(0.35), "WHAT THE SYSTEM MUST DO", size=13, color=TEAL, bold=True)
reqs = [("1", "Spot", "overthinking in what students write"),
        ("2", "Personalise", "for each student's habits"),
        ("3", "Explain", "why the score is what it is"),
        ("4", "Help", "step by step, up to a counselor"),
        ("5", "Protect", "the student's privacy")]
cw = 2.3
for i, (n, k, v) in enumerate(reqs):
    x = Inches(0.55 + i * (cw + 0.175))
    card(s, x, Inches(3.85), Inches(cw), Inches(2.6), accent=BLUE if i % 2 == 0 else TEAL)
    b = rect(s, x + Inches(0.25), Inches(4.05), Inches(0.55), Inches(0.55),
             BLUE if i % 2 == 0 else TEAL, shape=MSO_SHAPE.OVAL)
    shape_text(b, n, size=16, bold=True)
    text(s, x + Inches(0.2), Inches(4.75), Inches(cw - 0.3), Inches(0.45), k, size=20, color=NAVY, bold=True)
    text(s, x + Inches(0.2), Inches(5.25), Inches(cw - 0.3), Inches(1.1), v, size=14, color=SLATE)
notes(s, """
The problem: students often miss their own early signs of overthinking, and campus help starts late.
From this we set five goals: spot overthinking in text, personalise to each student, explain the score, help step by step up to a counselor, and protect privacy.
Everything you will see next ties back to these five goals.
""")

# ================================================================ 6. PROPOSED SYSTEM
s = base_slide(6, "Proposed System", "Overview, objectives, advantages and tools used")
card(s, Inches(0.55), Inches(1.4), Inches(7.4), Inches(3.55), "HOW IT HELPS")
bullets(s, Inches(0.8), Inches(1.85), Inches(7.0), Inches(3.1), [
    ("Two-step check:", "first read the writing, then give a personal 0-100 score."),
    ("Clear reasons:", "the student sees why the score is high or low."),
    ("Step-by-step help:", "music, breathing, games, then an early warning and a counselor."),
    ("Private by design:", "counselors see only a code, never names or diary text."),
    ("Works offline:", "no paid service is needed to run it."),
], size=14, gap=6)
card(s, Inches(0.55), Inches(5.15), Inches(7.4), Inches(1.75), "OBJECTIVES", accent=TEAL)
bullets(s, Inches(0.8), Inches(5.55), Inches(7.0), Inches(1.4), [
    ("Spot early", "signs of stress and overthinking"),
    ("Guide students", "to calm down and reach a counselor"),
    ("Keep it kind", "a garden that grows with daily check-ins"),
], size=13, gap=3, key_color=TEAL)
text(s, Inches(8.3), Inches(1.35), Inches(4.5), Inches(0.35), "TOOLS USED", size=13, color=TEAL, bold=True)
stack = [("Student app", "React (web pages)", BLUE),
         ("Server", "Python FastAPI", TEAL),
         ("Storage", "MongoDB database", BLUE),
         ("Login", "Secure passwords and tokens", TEAL),
         ("AI reading", "Claude AI, or built-in word lists", BLUE),
         ("Extras", "SMS alerts, music playlists", TEAL),
         ("Setup", "Docker (one-command start)", BLUE)]
for i, (k, v, c) in enumerate(stack):
    y = Inches(1.75 + i * 0.73)
    rect(s, Inches(8.3), y, Inches(1.35), Inches(0.62), c, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.15)
    text(s, Inches(8.3), y, Inches(1.35), Inches(0.62), k, size=12, color=WHITE, bold=True,
         align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
    rect(s, Inches(9.7), y, Inches(3.1), Inches(0.62), WHITE, LINE, MSO_SHAPE.ROUNDED_RECTANGLE, 0.15)
    text(s, Inches(9.78), y, Inches(3.0), Inches(0.62), v, size=12, color=NAVY, anchor=MSO_ANCHOR.MIDDLE)
notes(s, """
MindGuard AI is a web application with three parts: what the student sees, a server that does the work, and a database.
The core is a two-step check. Step one reads the student's writing for stress and overthinking, using the Claude AI if a key is set, or built-in word lists otherwise. Step two turns that into a personal score from 0 to 100 and lists the reasons.
Advantages: clear reasons, help that matches the situation, privacy built in, and it works without paid services.
""")

# ================================================================ 7. FLOW CHART
s = base_slide(7, "Flow Chart", "What happens when a student submits a check-in")
text(s, Inches(0.55), Inches(1.25), Inches(8), Inches(0.3), "MAIN FLOW", size=12, color=TEAL, bold=True)
r1 = [("Student writes", "check-in or vent box", NAVY),
      ("Login check", "is this a valid student?", BLUE),
      ("Read the text", "stress and overthinking\nsigns", TEAL),
      ("Personal score", "0-100, with reasons", BLUE),
      ("Warning check", "is the score high or\nstaying high?", TEAL),
      ("Suggest help", "music, breathing,\ngames", BLUE)]
bw, bh, gap = 1.85, 1.05, 0.22
y1 = Inches(1.6)
for i, (t, sub, c) in enumerate(r1):
    x = Inches(0.55 + i * (bw + gap))
    flow_box(s, x, y1, Inches(bw), Inches(bh), t, sub, c)
    if i < len(r1) - 1:
        arrow(s, x + Inches(bw), y1 + Inches(bh / 2), x + Inches(bw + gap), y1 + Inches(bh / 2))
db = rect(s, Inches(0.55), Inches(3.35), Inches(12.2), Inches(0.62), NAVY, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.2)
shape_text(db, [("Database  -  saves users, entries, warnings, games and counselor actions", 13, True, WHITE)])
for i in (1, 3, 4):
    x = Inches(0.55 + i * (bw + gap) + bw / 2)
    arrow(s, x, y1 + Inches(bh), x, Inches(3.35), color=RGBColor(0x94, 0xA3, 0xB8), width=1.25)
text(s, Inches(0.55), Inches(4.2), Inches(8), Inches(0.3), "WHERE THE RESULT GOES", size=12, color=TEAL, bold=True)
outs = [("Student sees", "score, reasons and\ncalming activities", BLUE, 0.55),
        ("Early warning", "if score is 71+ or stays\nhigh over 3 entries", TEAL, 4.7),
        ("Counselor sees", "an anonymous case code,\nnot the student's name", BLUE, 8.85)]
for t, sub, c, xx in outs:
    flow_box(s, Inches(xx), Inches(4.55), Inches(3.9), Inches(1.0), t, sub, c)
arrow(s, Inches(4.45), Inches(5.05), Inches(4.7), Inches(5.05))
arrow(s, Inches(8.6), Inches(5.05), Inches(8.85), Inches(5.05))
flow_box(s, Inches(0.55), Inches(5.85), Inches(3.9), Inches(0.95), "Wellness garden", "grows with each check-in", TEAL)
arrow(s, Inches(2.5), Inches(5.55), Inches(2.5), Inches(5.85))
flow_box(s, Inches(4.7), Inches(5.85), Inches(3.9), Inches(0.95), "Alert message", "SMS to counselor or trusted person", BLUE)
arrow(s, Inches(6.65), Inches(5.55), Inches(6.65), Inches(5.85))
flow_box(s, Inches(8.85), Inches(5.85), Inches(3.9), Inches(0.95), "Campus dashboard", "group trends only, no individuals", TEAL)
arrow(s, Inches(10.8), Inches(5.55), Inches(10.8), Inches(5.85))
notes(s, """
This is the flow for one check-in.
The student writes something. The system checks they are logged in, reads the text for signs of stress and overthinking, and gives a personal score with reasons. Then it checks whether a warning is needed and suggests activities. Everything is saved in the database.
Three results come out. The student sees the score, reasons and calming activities. If the score is 71 or more, or stays high over three entries, an early warning is raised and the student is invited to talk to a counselor. The counselor sees only an anonymous code. The campus dashboard shows group trends only, never individuals.
""")

# ================================================================ 8. DATA FLOW DIAGRAM
s = base_slide(8, "Data Flow Diagram", "How information moves between people, steps and stored data")
text(s, Inches(0.55), Inches(1.25), Inches(4.5), Inches(0.3), "LEVEL 0  -  THE BIG PICTURE", size=12, color=TEAL, bold=True)
text(s, Inches(5.6), Inches(1.25), Inches(7), Inches(0.3), "LEVEL 1  -  INSIDE THE SYSTEM", size=12, color=TEAL, bold=True)
rect(s, Inches(5.3), Inches(1.3), Inches(0.02), Inches(5.5), LINE)


def ext(x, y, w, h, label, c=NAVY):
    b = rect(s, Inches(x), Inches(y), Inches(w), Inches(h), c)
    shape_text(b, label, size=13, bold=True)
    return b


def proc(x, y, w, h, label, c=BLUE, size=12):
    b = rect(s, Inches(x), Inches(y), Inches(w), Inches(h), c, shape=MSO_SHAPE.OVAL)
    shape_text(b, label, size=size, bold=True)
    return b


def store(x, y, w, h, label):
    rect(s, Inches(x), Inches(y), Inches(w), Inches(h), WHITE, SLATE)
    rect(s, Inches(x), Inches(y), Inches(0.1), Inches(h), SLATE)
    text(s, Inches(x + 0.12), Inches(y), Inches(w - 0.12), Inches(h), label, size=12, color=NAVY,
         bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)


def label(x, y, w, t, align=PP_ALIGN.LEFT, size=10):
    text(s, Inches(x), Inches(y), Inches(w), Inches(0.3), t, size=size, color=SLATE, italic=True, align=align)


# --- Level 0
ext(0.6, 1.75, 1.5, 0.7, "Student")
ext(3.4, 1.75, 1.5, 0.7, "Counselor", TEAL)
ext(2.0, 5.7, 1.5, 0.7, "Admin", TEAL)
proc(1.3, 3.4, 2.6, 1.6, [("MindGuard AI", 15, True, WHITE), ("system", 11, False, WHITE)], BLUE)
arrow(s, Inches(1.0), Inches(2.45), Inches(1.7), Inches(3.55))
arrow(s, Inches(2.0), Inches(3.5), Inches(1.6), Inches(2.45))
label(0.55, 2.75, 1.0, "writes")
label(1.9, 2.75, 1.3, "score, tips", size=10)
arrow(s, Inches(3.4), Inches(3.55), Inches(3.9), Inches(2.45))
arrow(s, Inches(4.5), Inches(2.45), Inches(3.7), Inches(3.7))
label(3.4, 3.05, 1.4, "alert")
label(4.35, 3.05, 1.0, "reply")
arrow(s, Inches(2.75), Inches(5.0), Inches(2.75), Inches(5.7))
label(2.9, 5.2, 2.2, "group trends only")
text(s, Inches(0.55), Inches(6.5), Inches(4.5), Inches(0.5),
     "Box = person   |   Oval = step   |   Open bar = stored data", size=10, color=SLATE)

# --- Level 1
ext(5.6, 1.85, 1.3, 0.8, "Student")
proc(7.3, 1.7, 1.6, 1.1, "1. Sign in", BLUE)
proc(9.3, 1.7, 1.6, 1.1, "2. Read & score text", TEAL, 11)
proc(11.2, 1.7, 1.6, 1.1, "3. Check warning", BLUE)
arrow(s, Inches(6.9), Inches(2.25), Inches(7.3), Inches(2.25))
arrow(s, Inches(8.9), Inches(2.25), Inches(9.3), Inches(2.25))
arrow(s, Inches(10.9), Inches(2.25), Inches(11.2), Inches(2.25))
label(5.6, 2.7, 1.8, "check-in text")
store(7.3, 3.6, 1.6, 0.6, "Users")
store(9.3, 3.6, 1.6, 0.6, "Journal entries")
store(11.2, 3.6, 1.6, 0.6, "Warnings")
for x in (8.1, 10.1, 12.0):
    arrow(s, Inches(x), Inches(2.8), Inches(x), Inches(3.6))
proc(9.3, 4.95, 1.6, 1.2, "4. Suggest help", TEAL, 11)
proc(11.2, 4.95, 1.6, 1.2, "5. Show cases & trends", BLUE, 11)
arrow(s, Inches(10.1), Inches(4.2), Inches(10.1), Inches(4.95))
arrow(s, Inches(12.0), Inches(4.2), Inches(12.0), Inches(4.95))
label(5.6, 4.95, 3.5, "Step 4 sends score and tips back to the student.")
label(5.6, 5.3, 3.5, "Step 5 shows counselors anonymous cases")
label(5.6, 5.6, 3.5, "and admins group trends.")
notes(s, """
A data flow diagram shows how information moves. Boxes are people, ovals are steps, and open bars are stored data.
Level 0, on the left, is the big picture. The student sends writing in and gets a score and tips back. The counselor receives anonymous alerts and can reply. The admin sees group trends only.
Level 1, on the right, opens up the system into five steps. Step 1 signs the student in and reads the Users data. Step 2 reads the text, gives a score and saves it in Journal entries. Step 3 checks the warning rules and saves any warning. Step 4 reads the saved entries and suggests help back to the student. Step 5 reads warnings and shows counselors anonymous cases and admins group trends.
""")

# ================================================================ 9. LITERATURE REVIEW (blank on purpose)
s = base_slide(9, "Literature Review")
notes(s, "Literature review content to be added.")

# ================================================================ 10. IMPLEMENTATION
s = base_slide(10, "Implementation", "How the project is built")
card(s, Inches(0.55), Inches(1.35), Inches(4.0), Inches(5.55), "PROJECT PARTS", accent=BLUE)
bullets(s, Inches(0.75), Inches(1.85), Inches(3.7), Inches(5.0), [
    ("Login:", "sign up, sign in, three roles (student, counselor, admin)"),
    ("Check-ins:", "write, save and review entries"),
    ("AI reading:", "finds stress and overthinking"),
    ("Scoring:", "makes the personal 0-100 score"),
    ("Warnings:", "decides when to alert"),
    ("Activities:", "music, breathing, games"),
    ("Counselor and admin views", "with privacy rules"),
    ("Garden:", "streaks and points"),
], size=13, gap=7)
card(s, Inches(4.75), Inches(1.35), Inches(4.2), Inches(2.95), "MAIN FEATURES (PAGES & ACTIONS)", accent=TEAL)
bullets(s, Inches(4.95), Inches(1.85), Inches(3.9), Inches(2.4), [
    ("Sign up / sign in", ""),
    ("Set up profile:", "triggers, recovery time, coping style"),
    ("Daily check-in", "and get a score"),
    ("Reports", "of past scores and mood"),
    ("Counselor cases", "and admin trends"),
], size=13, gap=5, key_color=TEAL)
card(s, Inches(4.75), Inches(4.45), Inches(4.2), Inches(2.45), "WHAT THE DATABASE KEEPS", accent=BLUE)
bullets(s, Inches(4.95), Inches(4.9), Inches(3.9), Inches(2.0), [
    ("Users:", "profile and preferences"),
    ("Journal entries:", "text, score, mood"),
    ("Warnings:", "score history and counselor actions"),
    ("Also:", "contacts, game points, broadcasts, audit log"),
], size=13, gap=4)
card(s, Inches(9.15), Inches(1.35), Inches(3.65), Inches(5.55), "EXTRA SERVICES & SAFETY", accent=TEAL)
bullets(s, Inches(9.3), Inches(1.85), Inches(3.4), Inches(5.0), [
    ("Claude AI:", "optional; built-in word lists are used if it is off"),
    ("SMS alerts:", "to a counselor or trusted person"),
    ("Music:", "playlists plus built-in calming sounds"),
    ("Safe login:", "passwords are scrambled; roles limit access"),
    ("Privacy:", "no names or diary text for counselors"),
    ("Easy start:", "runs with Docker"),
], size=13, gap=8, key_color=TEAL)
notes(s, """
The project is one server split into clear parts: login, check-ins, AI reading, scoring, warnings, activities, counselor and admin views, and the garden. The student side is a React web app.
The database keeps users, journal entries, warnings and a few smaller records like game points and an audit log.
Extra services are all optional. If the AI key is missing, built-in word lists are used. If SMS is not set up, alerts are only logged.
For safety, passwords are stored scrambled, access depends on role, and counselors never see names or diary text.
""")

# ================================================================ 11. ALGORITHM
s = base_slide(11, "Algorithm / Core Logic", "How a score is calculated and when a warning is raised")
steps = [("1  Read text", "looks for stress words,\nnegative tone and\nrepeated worries", TEAL),
         ("2  Mix signals", "55% overthinking\n30% stress\n15% negative tone", BLUE),
         ("3  Add slider", "75% text +\n25% the student's own\nstress slider", TEAL),
         ("4  Personalise", "slow to recover: higher\nknown trigger: + up to 10\nrecent high days: + up to 12", BLUE),
         ("5  Safety rule", "crisis words: score\nis at least 95\nkeep within 0-100", TEAL)]
bw = 2.3
for i, (t, sub, c) in enumerate(steps):
    x = Inches(0.55 + i * (bw + 0.175))
    flow_box(s, x, Inches(1.35), Inches(bw), Inches(1.35), t, sub, c)
    if i < 4:
        arrow(s, x + Inches(bw), Inches(2.02), x + Inches(bw + 0.175), Inches(2.02))
card(s, Inches(0.55), Inches(2.95), Inches(6.0), Inches(3.95), "WHAT COUNTS AS OVERTHINKING", accent=TEAL)
bullets(s, Inches(0.8), Inches(3.4), Inches(5.65), Inches(3.5), [
    ("Worry loops:", "\"can't stop thinking\", \"over and over\"."),
    ("Worst-case thoughts:", "\"what if I fail\"."),
    ("Helpless or self-blaming words:", "\"hopeless\", \"my fault\"."),
    ("Repeating the same words", "again and again."),
    ("Crisis words", "are always caught, even without the AI."),
], size=13, gap=7, key_color=TEAL)
rows = [["Score", "Level", "Meaning"], ["0 - 40", "Calm", "Steady"],
        ["41 - 70", "Mild overthinking", "Needs a break"], ["71 - 100", "Critical", "High distress"]]
table(s, Inches(6.75), Inches(2.95), Inches(6.05), [1.4, 2.65, 2.0], rows, size=12, row_h=0.4)
card(s, Inches(6.75), Inches(4.7), Inches(6.05), Inches(2.2), "WHEN A WARNING IS RAISED", accent=RED)
bullets(s, Inches(7.0), Inches(5.15), Inches(5.7), Inches(1.75), [
    ("Serious:", "one entry of 71 or more, or two of the last three."),
    ("Moderate:", "last three entries all above 40, averaging 55 or more."),
    ("Only one open warning", "per student, no repeat alerts."),
], size=13, gap=5, key_color=RED)
notes(s, """
Here is how the score works, step by step.
Step 1: the system reads the text and looks for stress words, negative tone and signs of overthinking such as worry loops, worst-case thoughts, helpless or self-blaming words and repeated phrases.
Step 2: it mixes these: 55 percent overthinking, 30 percent stress, 15 percent negative tone.
Step 3: if the student moved the stress slider, it counts for 25 percent.
Step 4: it personalises. Students who recover slowly get a slightly higher score; a known trigger such as exams adds up to 10 points; recent high entries add up to 12.
Step 5: safety rule. If crisis words appear, the score is at least 95. The final score is kept between 0 and 100.
Warnings: one entry of 71 or more, or two of the last three, gives a serious warning. Three entries in a row above 40 with an average of 55 or more gives a moderate warning. Each student has only one open warning at a time.
Every adjustment is shown as a reason, which is why the score is explainable.
""")

# ================================================================ 12. RESULTS
s = base_slide(12, "Results & Performance", "Tested on one laptop with the built-in word lists")
tiles = [("64 / 64", "automated tests passed", TEAL),
         ("14 ms", "to process one check-in", BLUE),
         ("0.24 ms", "to calculate a score", TEAL),
         ("87 kB", "initial page download", BLUE)]
for i, (b, sm, c) in enumerate(tiles):
    stat_tile(s, Inches(0.55 + i * 3.08), Inches(1.4), Inches(2.9), Inches(1.65), b, sm, c)
text(s, Inches(0.55), Inches(3.25), Inches(6), Inches(0.3), "SAMPLE SCORES", size=12, color=TEAL, bold=True)
rows = [["Sample entry", "Basic", "Personal", "Level"],
        ["Heavy overthinking", "87", "100", "Critical"],
        ["Panic before presentation", "76", "90", "Critical"],
        ["Crisis words", "95", "95", "Critical"],
        ["Worried about a deadline", "44", "60", "Mild"],
        ["Good day", "2", "2", "Calm"]]
table(s, Inches(0.55), Inches(3.6), Inches(5.9), [2.6, 0.9, 1.1, 1.3], rows, size=12, row_h=0.4)
card(s, Inches(6.7), Inches(3.25), Inches(6.1), Inches(3.65), "WHAT WE ACHIEVED", accent=BLUE)
bullets(s, Inches(6.95), Inches(3.7), Inches(5.7), Inches(3.2), [
    ("Complete journey works:", "check-in, score, activities, warning, counselor action."),
    ("Demo data:", "62 cases shown: 3 critical, 8 moderate, 51 stable."),
    ("Privacy tests passed:", "students cannot open counselor pages; exports have no personal data."),
    ("Fast:", "everything responds in under 0.2 seconds, except login (0.36 s, on purpose for safety)."),
], size=13, gap=6)
text(s, Inches(0.55), Inches(6.15), Inches(5.9), Inches(0.8),
     "Note: we have not measured accuracy, as no labelled data exists yet. "
     "Results show the system works as designed, not that it is clinically proven.",
     size=11, color=AMBER, italic=True)
notes(s, """
These numbers come from one laptop with the built-in word lists, so they show behaviour, not large-scale capacity.
64 automated tests passed. They cover login, access control, input checks, privacy, the crisis safety rule, the daily game points cap and data export.
Processing a full check-in takes about 14 milliseconds, and the score calculation itself about a quarter of a millisecond, so reading the text is not a bottleneck. Login takes 0.36 seconds because password checking is deliberately slow for safety.
The sample table shows personalisation: a worried-about-deadline entry rises from 44 to 60 and moves into the Mild level for a student with exam triggers and recent high days. Good-day text stays low and crisis words always give 95.
The demo data shows 62 cases: 3 critical, 8 moderate and 51 stable.
Be upfront: we did not measure accuracy because we have no labelled data. This is a support aid, not a diagnosis tool.
""")

# ================================================================ 13. FUTURE
s = base_slide(13, "Future Enhancements", "What we plan to improve next")
cols = [
    ("NEXT", "Prove and protect", BLUE, [
        ("Accuracy study:", "test with real, consented student data."),
        ("Stronger security:", "encrypt diary text, safer login sessions, password reset."),
        ("Speed:", "make large-campus reports faster."),
    ]),
    ("LATER", "Smarter and wider", TEAL, [
        ("Better AI model:", "train a model to read text more accurately."),
        ("More languages", "and voice input."),
        ("Mobile app", "that works offline."),
    ]),
    ("LONG TERM", "Bigger picture", BLUE, [
        ("Wearable data:", "sleep and activity, with consent."),
        ("College portal link:", "such as Moodle."),
        ("Campus pilot:", "run for a full semester and measure impact."),
    ]),
]
for i, (tag, head, c, its) in enumerate(cols):
    x = Inches(0.55 + i * 4.12)
    rect(s, x, Inches(1.4), Inches(3.95), Inches(0.95), c, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.1)
    text(s, x + Inches(0.1), Inches(1.45), Inches(3.75), Inches(0.35), tag, size=11, color=RGBColor(0xE2, 0xE8, 0xF0), bold=True)
    text(s, x + Inches(0.1), Inches(1.78), Inches(3.75), Inches(0.5), head, size=19, color=WHITE, bold=True)
    card(s, x, Inches(2.5), Inches(3.95), Inches(4.35), accent=c)
    bullets(s, x + Inches(0.2), Inches(2.7), Inches(3.65), Inches(4.1), its, size=15, gap=14, key_color=c)
    if i < 2:
        arrow(s, x + Inches(3.95), Inches(1.87), x + Inches(4.12), Inches(1.87), color=SLATE)
notes(s, """
Our future work comes from the limits we found.
Next: test accuracy with real, consented data, strengthen security (encrypt diary text, safer sessions, password reset) and make campus reports faster for large numbers of students.
Later: a better AI model, more languages and voice input, and a mobile app.
Long term: wearable data with consent, links to the college portal, and a full-semester campus pilot to measure real impact.
""")

# ================================================================ 14. CONCLUSION
s = base_slide(14, "Conclusion", "What we delivered and the final verdict")
card(s, Inches(0.55), Inches(1.4), Inches(7.6), Inches(5.45), "WHAT WE DELIVERED")
bullets(s, Inches(0.8), Inches(1.9), Inches(7.2), Inches(4.9), [
    ("A complete early-help journey:", "student writes, gets a score with reasons, calming activities, then a counselor if needed."),
    ("Personal and explainable", "scoring that also works offline."),
    ("Privacy first:", "anonymous cases for counselors, group-only reports for admins."),
    ("Tested:", "64 automated tests passed; about 14 ms per check-in."),
    ("Kind engagement:", "a wellness garden that never punishes a missed day."),
], size=15, gap=11)
rect(s, Inches(8.4), Inches(1.4), Inches(4.4), Inches(2.6), NAVY, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.05)
text(s, Inches(8.6), Inches(1.5), Inches(4.0), Inches(0.35), "REAL-WORLD IMPACT", size=12, color=TEAL, bold=True)
text(s, Inches(8.6), Inches(1.9), Inches(4.0), Inches(2.0),
     "Earlier help, less stigma, and counselors can focus on students who need them most.", size=17, color=WHITE)
rect(s, Inches(8.4), Inches(4.2), Inches(4.4), Inches(2.65), PALE_TEAL, TEAL, MSO_SHAPE.ROUNDED_RECTANGLE, 0.05)
text(s, Inches(8.6), Inches(4.3), Inches(4.0), Inches(0.35), "FINAL VERDICT", size=12, color=TEAL, bold=True)
text(s, Inches(8.6), Inches(4.7), Inches(4.0), Inches(2.1),
     "A working, privacy-minded prototype. It supports students but does not replace professional care; "
     "testing with real data is the next step.", size=15, color=NAVY)
notes(s, """
To conclude: MindGuard AI shows that a complete early-help journey can be built with simple tools. Students write, get an explained score and calming activities, and are connected to a counselor when needed. Counselors see anonymous cases and admins see only group trends.
It passed 64 automated tests and processes a check-in in about 14 milliseconds.
Our verdict: a working, privacy-minded prototype. It supports students but does not replace professional care, and real-data testing is the next step.
Thank you. We are happy to take questions and run the live demo.
""")

assert len(prs.slides) == TOTAL
prs.save(OUT)
print(f"Saved {OUT} with {len(prs.slides)} slides")
