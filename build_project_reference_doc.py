"""
Builds MindGuard_AI_Project_Reference.docx - a single, self-contained description of the whole
project (facts taken from the code in this repo plus the measured results from the project report).
Upload that .docx to any AI assistant instead of the codebase when you want report / PPT edits.

    python build_project_reference_doc.py
"""
from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Pt, RGBColor, Inches

OUT = "MindGuard_AI_Project_Reference.docx"
NAVY = RGBColor(0x0F, 0x17, 0x2A)
BLUE = RGBColor(0x25, 0x63, 0xEB)

doc = Document()
sec = doc.sections[0]
sec.left_margin = sec.right_margin = Inches(0.9)
sec.top_margin = sec.bottom_margin = Inches(0.8)

st = doc.styles["Normal"]
st.font.name = "Calibri"
st.font.size = Pt(10.5)
for name, size, color in (("Heading 1", 18, NAVY), ("Heading 2", 14, BLUE), ("Heading 3", 12, NAVY)):
    s = doc.styles[name]
    s.font.name = "Calibri"
    s.font.size = Pt(size)
    s.font.bold = True
    s.font.color.rgb = color


def h1(t): doc.add_heading(t, 1)
def h2(t): doc.add_heading(t, 2)
def h3(t): doc.add_heading(t, 3)


def p(t, bold=False, italic=False):
    para = doc.add_paragraph()
    r = para.add_run(t)
    r.bold, r.italic = bold, italic
    return para


def bl(items, style="List Bullet"):
    for it in items:
        para = doc.add_paragraph(style=style)
        if isinstance(it, tuple):
            r = para.add_run(it[0])
            r.bold = True
            para.add_run(" " + it[1])
        else:
            para.add_run(it)


def code(t):
    para = doc.add_paragraph()
    r = para.add_run(t)
    r.font.name = "Consolas"
    r.font.size = Pt(9)
    para.paragraph_format.left_indent = Inches(0.2)


def shade(cell, hexcolor):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hexcolor)
    tcPr.append(shd)


def table(rows, widths=None, size=9.5):
    t = doc.add_table(rows=len(rows), cols=len(rows[0]))
    t.style = "Table Grid"
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for ri, row in enumerate(rows):
        for ci, val in enumerate(row):
            c = t.cell(ri, ci)
            c.text = ""
            run = c.paragraphs[0].add_run(str(val))
            run.font.size = Pt(size)
            if ri == 0:
                run.bold = True
                run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
                shade(c, "0F172A")
            elif ri % 2 == 0:
                shade(c, "F1F5F9")
            if widths:
                c.width = Inches(widths[ci])
    doc.add_paragraph()
    return t


# =========================================================== COVER
t = doc.add_paragraph()
t.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = t.add_run("MindGuard AI")
r.bold, r.font.size, r.font.color.rgb = True, Pt(34), NAVY
t = doc.add_paragraph()
t.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = t.add_run("Project Reference Document")
r.font.size, r.font.color.rgb = Pt(18), BLUE
t = doc.add_paragraph()
t.alignment = WD_ALIGN_PARAGRAPH.CENTER
t.add_run("Early Detection of Student Mental Wellness Issues Using Artificial Intelligence").italic = True

h1("0. How to use this document")
p("This file is the single source of truth about the project. It replaces inspecting the codebase. "
  "Give it to an AI assistant (Gemini, ChatGPT, Claude, etc.) together with the report or PPT you want changed.")
h3("Suggested prompt")
code('"The attached MindGuard_AI_Project_Reference.docx is the ONLY source of facts. '
     'Edit the [report / PPT script] as follows: <your change>. '
     'Do not invent numbers, features, datasets or results that are not in the document. '
     'Follow section 20 (claims policy). Keep the wording simple."')
h3("Ground rules for any AI using this file")
bl([
    "Every number, threshold, route, collection and feature below comes from the real code or from measured tests.",
    "If something is not in this document, say it is unknown; do not guess.",
    "Section 20 lists claims that must NOT be made (for example accuracy figures or BERT).",
    "Names, USNs and guide details are in Section 1.",
])
h3("Contents")
bl(["1 Project identity", "2 Summary, problem and objectives", "3 Existing system and drawbacks",
    "4 Proposed system and features", "5 Technology stack", "6 Architecture, flow chart and data flow diagrams",
    "7 Folder structure", "8 Database design", "9 REST API", "10 Algorithms and exact constants",
    "11 Interventions, music and wellness garden", "12 Counselor portal and admin analytics",
    "13 Security and privacy", "14 Frontend", "15 Configuration, running and demo",
    "16 Testing", "17 Results and performance", "18 Limitations", "19 Future work",
    "20 Claims policy (what not to say)", "21 Literature survey", "22 Existing report and PPT structure",
    "23 Glossary (plain words)"], "List Number")
doc.add_page_break()

# =========================================================== 1
h1("1. Project identity")
table([["Item", "Value"],
       ["Project title", "MindGuard AI: Early Detection of Student Mental Wellness Issues Using Artificial Intelligence"],
       ["Type", "8th semester Major Project, B.E. Information Science and Engineering"],
       ["University", "Visvesvaraya Technological University (VTU), Belagavi"],
       ["College", "T. John Institute of Technology (TJIT), Bengaluru"],
       ["Department", "Information Science and Engineering (ISE)"],
       ["Academic year", "2025-2026"],
       ["Project guide", "Ms. Kumudha M, Assistant Professor, Dept. of ISE, TJIT"],
       ["Project coordinator", "Dr. Doddegowda B J, Associate Professor, Dept. of ISE, TJIT"],
       ["Head of Department", "Ms. Shilpa N S, Dept. of ISE, TJIT"],
       ["Chairman / Principal", "Dr. Thomas P John (Chairman, TJGI); Dr. H P Srinivasa (Principal, TJIT)"]], [1.8, 4.9])
table([["#", "Student name", "USN"],
       ["1", "Bindu Priya N", "1TJ23IS008"], ["2", "Karthika Shree S", "1TJ23IS023"],
       ["3", "Kaveri H S", "1TJ23IS024"], ["4", "Sahana H", "1TJ23IS045"]], [0.5, 3.5, 2.7])
p("Repository folder: Mind-Guard-AI (git repo; backend, frontend, database, docker-compose.yml, render.yaml).")

# =========================================================== 2
h1("2. Summary, problem and objectives")
h2("2.1 Abstract (short)")
p("Students often miss early signs of harmful overthinking, and campus support begins only after distress becomes visible. "
  "MindGuard AI is a web-based early-detection system. Check-in, vent-box and chat text is analysed by two engines: a "
  "language-signal engine (Claude, with an offline word-list fallback) and a personalised 0-100 Rumination Score engine "
  "that uses the student's baseline, triggers and history. Rules raise early-warning flags. Students receive explainable "
  "scores, music, breathing exercises and games, and may confidentially connect to a counselor who sees only anonymous "
  "aliases. Campus-level analytics are k-anonymised. Built with React, FastAPI and MongoDB; 64 automated checks passed.")
h2("2.2 Problem statement")
p("Existing campus mental health systems intervene only after a student reaches a breaking point, and students often miss "
  "their own early signs of harmful overthinking. A usable early-detection tool must (i) detect rumination from everyday "
  "text, (ii) personalise judgement to each student, (iii) explain its verdict, (iv) respond proportionately, from a "
  "gentle nudge up to a human counselor, and (v) protect the privacy of the student throughout.")
h2("2.3 Objectives")
bl(["Detect early signs of rumination and stress from students' free-text entries.",
    "Personalise the score to each student's baseline, triggers and recent history, and explain every score.",
    "Give a tiered response: calming interventions (music, 4-7-8 breathing, short break, mini-games, reframing prompts), then an early-warning flag, then a confidential counselor connection.",
    "Give counselors an alias-only case queue, and administrators k-anonymised campus analytics with an audit trail.",
    "Encourage consistent self-care with a no-pressure streak and wellness garden.",
    "Stay usable without external services (no API key, no Spotify, no SMS provider required)."], "List Number")
h2("2.4 Scope and limitations of what was built")
bl(["Web application analysing text that the student deliberately submits.",
    "No passive background monitoring (screen time, app usage, wearables). Not a native mobile app.",
    "Not a clinical diagnostic tool; it is a screening and support aid.",
    "SMS alerts go through Twilio only when credentials are set; otherwise they are logged (dry-run).",
    "No BERT / transformer model is part of the implementation (it was in the original proposal and is future work)."])

# =========================================================== 3
h1("3. Existing system and drawbacks")
table([["Existing approach", "How it works", "Weakness"],
       ["Counseling centers", "One-to-one sessions, fixed hours, waiting lists", "Student must recognise distress and ask first; least available at night, weekends and exams"],
       ["Meditation / wellness apps", "Guided meditation, sleep, breathing", "Self-directed; cannot tell when a user is struggling or hand over to a professional"],
       ["Helplines", "Serve acute crises", "Student must make first contact; no monitoring, personalisation or follow-up"],
       ["Periodic questionnaires (PHQ-9, GAD-7)", "Clinically validated scales", "Infrequent, self-reported; may miss early rumination"]], [1.8, 2.3, 2.6])
h3("Common limitations")
bl(["Reactive by design: each approach waits for visible distress or a request for help.",
    "No continuous or near-real-time signal between infrequent contacts.",
    "No personalisation: the same threshold for every student although recovery speed differs.",
    "Undifferentiated response: mild overthinking and acute distress get the same referral.",
    "Privacy trade-off: close monitoring exposes individuals; strict privacy leaves staff blind to trends.",
    "Limited explainability in many automated predictors, which lowers trust."], "List Number")

# =========================================================== 4
h1("4. Proposed system and features")
p("MindGuard AI is a 3-tier web app: React front end, one FastAPI backend service (split into feature packages), MongoDB database.")
table([["Feature", "What it does", "Where in code"],
       ["Sign-up and onboarding", "Account, profile, trusted contacts, baseline (triggers, recovery time, coping style), music taste, consent", "auth/, frontend pages Auth.jsx, Onboarding.jsx"],
       ["Dual-engine detection", "Engine 1 reads text signals (Claude or offline word lists); Engine 2 makes the personalised 0-100 score with itemised reasons", "ai/scoring.py, ai/analysis.py, engine/rumination.py"],
       ["Check-in / vent box / reflection / chat", "Four sources of text; all scored the same way", "journal/, ai/routes.py"],
       ["Smart interventions", "Music, 4-7-8 breathing, 5-minute break, Zen Bubble Pop, Thought Reframe, journaling prompt, ordered by the student's coping preferences", "interventions/engine.py, music/catalog.py, frontend components"],
       ["Early-warning escalation", "Flag on a critical entry or persistent rumination; one-tap confidential connect to a counselor", "escalation/"],
       ["Counselor portal", "Alias-only risk queue (Critical / Moderate / Stable), trends, schedule / outreach / resolve actions; never shows journal text", "counselor/, frontend admin/CounselorPortal.jsx"],
       ["Campus analytics (admin)", "k-anonymised cohort KPIs, trends, department breakdown, stress factors, resource use, broadcasts, CSV export, audit log", "admin/"],
       ["Wellness garden", "Streak and growth points; no-pressure design (rest day forgiven, game points capped per day)", "wellness/"],
       ["Trusted-contact / counselor SMS", "Emergency alert by SMS (Twilio) or logged in dry-run", "notifications/"],
       ["Demo mode", "Seeds counselor/admin logins, mock cohort and two demo students; persona switcher and reset", "demo/"]], [1.6, 3.2, 1.9], 9)

# =========================================================== 5
h1("5. Technology stack")
table([["Layer", "Technology", "Version / note"],
       ["Frontend", "React", "^18.3.1"], ["", "Vite (build + dev server)", "^5.4.6; student app index.html and staff app admin.html"],
       ["", "Recharts (charts), lucide-react (icons)", "^2.12.7, ^0.383.0"],
       ["Backend", "FastAPI + Uvicorn", "0.115.0, 0.30.6"], ["", "Pydantic (validation)", "2.9.2 (with email)"],
       ["", "httpx (calls Claude API)", "0.27.2"],
       ["Database", "MongoDB (docker image mongo:7; tested on 6.0.8)", "Motor 3.5.1 + PyMongo 4.8.0 (pinned together)"],
       ["Security", "python-jose (JWT, HS256, 7-day expiry), passlib 1.7.4 + bcrypt 4.0.1 (pinned together)", ""],
       ["AI", "Claude Messages API (optional); default model id claude-sonnet-5-5", "25 s timeout, then offline fallback"],
       ["Integrations", "Twilio 9.3.2 (SMS), Spotify (embedded public playlists), browser Web Audio", "All optional"],
       ["DevOps", "Docker Compose (database, backend, frontend), render.yaml for Render deployment", "Python 3.11, Node 18+"]], [1.2, 3.5, 2.0])

# =========================================================== 6
h1("6. Architecture, flow chart and data flow diagrams")
h2("6.1 Architecture")
p("Student browser (React, port 5173)  ->  FastAPI backend (port 8000, JSON over HTTP)  ->  MongoDB (port 27017). "
  "The backend is one deployable service, internally split into packages: auth, journal, ai, engine, escalation, "
  "interventions, music, counselor, admin, wellness, notifications, demo. CORS origins come from ALLOWED_ORIGINS. "
  "On start-up the backend creates indexes and, when DEMO_MODE=1, seeds demo data. GET /health reports status.")
h2("6.2 Flow chart: what happens to one check-in (POST /api/checkins)")
bl(["Student writes text (optionally mood emoji and a 0-100 stress slider) and submits.",
    "Server checks the login token (get_current_user) and validates the input (text 1-5000 chars, slider 0-100, source in checkin / vent / reflection / chat).",
    "Loads the student's baseline and their last 6 scores.",
    "Engine 1 reads the text: Claude if a key is set, otherwise offline word lists. Crisis check always also runs locally.",
    "Engine 2 builds the personalised 0-100 score and the list of reasons (factors).",
    "The entry is saved in the journals collection.",
    "Early-warning rules look at the newest score plus history; one open flag per student is created or updated.",
    "Intervention cards are built (music, breathing, break, games, reframe prompt, counselor card).",
    "Garden state (streak, points, stage) is recalculated.",
    "Response returns: entry, analysis (score, category, reasons, highlighted phrases, summary), interventions, early-warning status, garden."], "List Number")
h2("6.3 Data flow diagram - Level 0 (context)")
table([["External entity", "Sends to system", "Receives from system"],
       ["Student", "Sign-up details, baseline, check-in / vent / chat text, stress slider, game results, connect request", "Score with reasons, highlighted phrases, calming activities, garden status, counselor updates"],
       ["Counselor", "Case actions (reviewed, schedule, outreach, resolve)", "Alias-only case queue with scores, trends and flags (no journal text)"],
       ["Admin", "Period and filter choices, broadcast messages", "k-anonymised campus statistics, CSV export, audit log"]], [1.3, 2.7, 2.7])
h2("6.4 Data flow diagram - Level 1 (processes and data stores)")
table([["Process", "Reads", "Writes", "Output"],
       ["1 Sign in and profile", "users", "users, contacts", "Login token, profile"],
       ["2 Read and score text", "users (baseline), journals (recent scores)", "journals", "Score, reasons, mood"],
       ["3 Check warning rules", "journals (recent scores), warning_flags", "warning_flags", "Warning prompt for student"],
       ["4 Suggest help", "journals, users (preferences)", "game_events (after games)", "Intervention cards, garden"],
       ["5 Show cases and trends", "warning_flags, journals (scores only), users", "audit_logs, warning_flags (actions), broadcasts", "Counselor queue, admin analytics"]], [1.6, 2.0, 1.7, 1.4])
p("Data stores: D1 users, D2 journals, D3 warning_flags (plus contacts, game_events, broadcasts, audit_logs, engagement_events).", italic=True)

# =========================================================== 7
h1("7. Folder structure")
code("""Mind-Guard-AI/
  backend/
    app/
      main.py            FastAPI app, router wiring, start-up (indexes + demo seed), /health
      config.py          all environment-driven settings and score thresholds
      database.py        Motor client, collections, ensure_indexes()
      auth/              signup, login, /me, onboarding; JWT + bcrypt; require_role()
      journal/           /api/checkins, journals, reports summary; process_entry() pipeline
      ai/                scoring.py (Engine 1 word lists), analysis.py (Claude + fallback), routes.py (chat, analyze)
      engine/            rumination.py (Engine 2 personalised score)
      escalation/        early-warning rules, alias, student connect/dismiss
      interventions/     engine.py (builds activity cards)
      music/             catalog.py (tracks, transitions), routes.py
      counselor/         alias-only case API
      admin/             aggregation.py (k-anonymity), routes.py, models.py
      wellness/          streak and garden, game points
      notifications/     Twilio SMS, trusted contacts, engagement counters
      demo/              seed.py (personas, cohort), routes.py
    scripts/             smoke_test.py (43 checks), calibrate_engine.py, seed_admin_dashboard.py
    Dockerfile, requirements.txt
  frontend/
    index.html (student app), admin.html (counselor + admin app)
    src/ App.jsx, api.js, pages/ (12 pages + games/), components/, lib/ (audio, router, store, dictation, constants), admin/ (dashboard, portal, charts)
    Dockerfile, package.json
  database/init/init-mongo.js   collections and indexes (first boot)
  docker-compose.yml, render.yaml, .env.example, README.md, RUN_AND_SETUP.md""")

# =========================================================== 8
h1("8. Database design")
p("MongoDB database name: mindguard. Eight collections. _id values are string UUIDs; timestamps are ISO-8601 UTC strings. "
  "Validation is done by Pydantic at the API; the database itself enforces only the unique email index.")
table([["Collection", "Main fields", "Index"],
       ["users", "_id, name, email, password_hash (bcrypt), created_at, profile {preferred_name, date_of_birth, gender_identity, gender_custom, institution, department, year_of_study}, preferences {checkin_time (morning/evening), privacy_consent, crisis_consent}, baseline {triggers, recovery, coping}, music {genres, languages, playlists{uplifting, calming, focus}}, onboarding_complete, role (student/counselor/admin; always student on signup), is_demo", "email unique"],
       ["journals", "_id, user_id, text (1-5000 chars; only place free text is stored), mood (emoji), stress_level (0-100 slider), rumination_score (0-100), risk_level (Low/Moderate/High), category (calm/mild/critical), mood_label, sentiment, stress_intensity, triggers_detected, source (checkin/vent/reflection/chat), created_at", "(user_id, created_at desc)"],
       ["contacts", "user_id, name, phone_number, email, relationship, role (peer/guardian)", "user_id"],
       ["warning_flags", "_id, user_id, status (active/in_progress/resolved), severity (critical/moderate), reason, scores (last up to 5), created_at, updated_at, prompt_dismissed_until, self_requested, connect {requested_at, channel, share_identity, contact_detail, note}, actions [{id, type, note, scheduled_for, by_id, by_name, at}]", "(user_id, status)"],
       ["game_events", "_id, user_id, game, score, points, created_at", "(user_id, created_at desc)"],
       ["broadcasts", "_id, title, message, target_group, created_by, created_at", "created_at desc"],
       ["audit_logs", "_id, actor_id, actor_name, endpoint, params, created_at", "created_at desc"],
       ["engagement_events", "alert_type, created_at (deliberately NO user id)", "created_at desc, alert_type"]], [1.2, 4.3, 1.2], 9)
h3("Option values")
bl([("Triggers:", "exam_pressure, deadlines, low_marks, public_speaking, social_conflict."),
    ("Recovery time:", "lt_1h (less than 1 hour), few_hours, full_day, multiple_days."),
    ("Coping style:", "music, breathing, mini_games, journaling."),
    ("Music state:", "calming, grounded, focus, uplifting.")])

# =========================================================== 9
h1("9. REST API")
p("All routes need a bearer token unless noted. Staff routes need role admin or counselor (student token gets 403).")
table([["Method", "Path", "Module", "Purpose"],
       ["POST", "/api/auth/signup", "auth", "Create student account; returns token (public)"],
       ["POST", "/api/auth/login", "auth", "Returns access_token (public)"],
       ["GET", "/api/auth/me", "auth", "Current user"],
       ["PUT", "/api/auth/onboarding", "auth", "Save baseline, music preferences, preferred name, check-in time"],
       ["POST", "/api/checkins", "journal", "Main pipeline: score, interventions, early warning, garden"],
       ["POST", "/api/journals", "journal", "Legacy raw save (own user only)"],
       ["GET", "/api/journals", "journal", "List own entries (limit up to 200)"],
       ["GET", "/api/journals/reports/summary", "journal", "Own reports: average, trend (easing/steady/rising), category counts, top triggers, best hour"],
       ["GET", "/api/journals/{id}", "journal", "One own entry"],
       ["POST", "/api/ai/chat", "ai", "Companion chat reply + score (token optional; personalised if signed in)"],
       ["POST", "/api/ai/analyze-journal", "ai", "Stateless analysis, nothing stored"],
       ["GET", "/api/ai/health", "ai", "Shows claude or keyword-fallback"],
       ["GET", "/api/interventions/current", "interventions", "Cards for the latest score"],
       ["GET", "/api/music/recommend?state=", "music", "Tracks for calming / grounded / focus / uplifting"],
       ["POST", "/api/music/playlist", "music", "Spotify playlist search (needs Spotify credentials; optional)"],
       ["GET", "/api/garden", "wellness", "Streak, points, stage"],
       ["POST", "/api/games/complete", "wellness", "Award points (capped at 30 per day)"],
       ["GET", "/api/support/status", "escalation", "Student's own warning status"],
       ["POST", "/api/support/connect", "escalation", "Student asks to connect with a counselor (can share identity)"],
       ["POST", "/api/support/dismiss", "escalation", "Snooze the prompt for 6 hours"],
       ["GET", "/api/counselor/summary", "counselor", "Counts: critical, moderate, stable, connect requests, monitored"],
       ["GET", "/api/counselor/cases", "counselor", "Alias-only case list (optional risk filter)"],
       ["GET", "/api/counselor/cases/{alias}", "counselor", "One case: trend, category counts, top triggers, privacy note"],
       ["POST", "/api/counselor/cases/{alias}/actions", "counselor", "reviewed / schedule (needs date) / outreach / resolve"],
       ["POST", "/api/emergency/alert", "notifications", "alert_type helpline / counselor / trusted_contact"],
       ["POST/GET", "/api/contacts", "notifications", "Add / list own trusted contacts"],
       ["GET", "/api/admin/aggregate-stats?period=", "admin", "KPIs, 4-tier risk distribution, anomaly alerts"],
       ["GET", "/api/admin/cohort-trends?period=", "admin", "Daily campus mood trend"],
       ["GET", "/api/admin/department-breakdown?period=&group_by=", "admin", "Distress by department / year, k-anonymised"],
       ["GET", "/api/admin/stress-factors?period=", "admin", "Top stress factor tags, k-anonymised"],
       ["GET", "/api/admin/resource-utilization?period=", "admin", "Helpline / counselor / trusted-contact tap counts"],
       ["POST/GET", "/api/admin/broadcast-resource", "admin", "Publish / list anonymous campus-wide wellness nudges"],
       ["GET", "/api/admin/export/summary.csv?period=", "admin", "PII-free CSV"],
       ["GET", "/api/admin/audit-log", "admin only", "Who queried what and when"],
       ["GET/POST", "/api/demo/personas, /login, /reset", "demo", "Persona switcher (DEMO_MODE only)"],
       ["GET", "/health", "main", "Service status (public)"]], [0.8, 2.6, 1.0, 2.3], 9)
p("Period values for admin routes: 7d, 30d, semester (rolling 16 weeks).", italic=True)

# =========================================================== 10
h1("10. Algorithms and exact constants")
h2("10.1 Engine 1 - reading the text (ai/scoring.py, ai/analysis.py)")
p("Pure function: text in, three signals plus evidence out. If an Anthropic key is set, Claude returns the same signals as JSON "
  "(sentiment, stress_intensity, rumination_markers_score, mood, crisis, quoted phrases, a short summary). If the call fails or "
  "times out (25 s), the offline word-list result is used. The local crisis check is always kept as a safety net, so an AI miss cannot hide a crisis.")
table([["Signal", "How it is calculated"],
       ["Sentiment (-1 to +1)", "positive and negative word lists with weights 1 or 2; negation (not, never, can't ... within 2 words before) flips the meaning (negated negative counts 0.5 x weight as positive; negated positive counts 0.8 x weight as negative). polarity = (pos - neg) / (pos + neg + 1.5), clamped to -1..1"],
       ["Stress intensity (0-100)", "stress word weights (for example exam 1.3, deadline 1.2, overwhelmed 1.6, panic 1.8, can't breathe 1.8), each word counted up to 3 times; stress = raw x 12 + intensifiers x 3 + exclamation marks (max 5) x 2.5 + capital-letter ratio x 25 + negative polarity x 18; clamped 0-100"],
       ["Rumination markers (0-100)", "18 per thought-loop phrase + 12 per catastrophising phrase + 13 per helplessness phrase + 11 per self-blame phrase + 4 per absolutist word (max 3) + 30 x lexical repetition + 14 x negative-sentence share (only if negative words exist); clamped 0-100"],
       ["Lexical repetition", "share of repeated content words (length > 3, not stop words) x 2.2 + 0.15 per repeated word pair; needs at least 6 content words; max 1.0"],
       ["Crisis", "any phrase such as kill myself, suicide, end it all, hurt myself, self harm, want to disappear, end my life -> crisis = true"],
       ["Mood label", "Distressed (crisis); Overwhelmed or Ruminating (markers >= 60, depending on stress >= 50); Anxious (markers >= 35 or stress >= 55); Low (polarity <= -0.35); Hopeful / Content (polarity >= 0.4); Calm (>= 0.1); else Neutral"]], [1.6, 5.1], 9)
p("Example phrase lists: thought loops (over and over, can't stop thinking, spiralling, on repeat); catastrophising (what if, worst case, going to fail, it's over); "
  "helplessness (hopeless, no way out, what's the point, giving up, can't cope); self-blame (my fault, I'm a failure, I should have, not good enough); "
  "absolutist words (always, never, nothing, everything, everyone, forever).")
h2("10.2 Engine 2 - personalised 0-100 score (engine/rumination.py)")
bl(["text signal = 0.55 x rumination markers + 0.30 x stress intensity + 0.15 x negativity (negativity = max(0, -sentiment) x 100).",
    "If sentiment >= 0.3 and markers < 10 (positive, settled tone): text signal x 0.6.",
    "If the student moved the stress slider: base = 0.75 x text signal + 0.25 x slider. Otherwise base = text signal.",
    "Recovery factor (only if score > 20): lt_1h x 0.93, few_hours x 1.00, full_day x 1.08, multiple_days x 1.16.",
    "Trigger bonus (only if score > 20): +5 per declared trigger found in the text, maximum +10. Trigger words: exam/test/viva/quiz...; deadline/due/assignment/project...; marks/grade/backlog/cgpa...; presentation/seminar/speech...; friend/argument/roommate/breakup....",
    "Repetition bonus (only if score > 30): +4 for each of the last 4 entries that was above 40, maximum +12.",
    "Crisis floor: if crisis language is detected, score = max(score, 95).",
    "Final score rounded and clamped to 0-100. Every step is returned as a 'factor' so the UI can show why."], "List Number")
table([["Score", "Category", "Risk level"],
       ["0 - 40", "Normal / Calm", "Low"], ["41 - 70", "Mild Overthinking", "Moderate"], ["71 - 100", "Critical / High Distress", "High"]], [1.5, 3, 2])
p("Thresholds live in config.py: SCORE_CALM_MAX = 40, SCORE_MILD_MAX = 70.", italic=True)
h2("10.3 Early-warning rules (escalation/service.py)")
bl([("CRITICAL:", "newest score >= 71, or 2 of the last 3 scores >= 71."),
    ("MODERATE:", "last 3 scores all > 40 and their average >= 55 (rumination that persists even if no single entry is extreme)."),
    ("One open flag per student:", "a repeat trigger updates the open flag (score trail of up to 5, severity upgrade) instead of creating a duplicate. Upgrading to critical re-shows the prompt."),
    ("Privacy:", "a flag stores only scores, a reason, the student's connect request and counselor actions, never journal text."),
    ("Alias:", "'MG-' + first 5 characters (upper-case) of SHA-256(JWT_SECRET + ':' + user_id). One-way and stable."),
    ("Student prompt:", "shown while the flag is open, no connect request has been sent and the prompt is not snoozed (dismiss snoozes 6 hours).")])
h2("10.4 Counselor risk grouping (counselor/routes.py)")
bl(["critical: open critical flag, or at least 2 recent entries with last-3 average >= 71.",
    "moderate: any open flag, or at least 3 entries with last-3 average >= 56.",
    "stable: otherwise.",
    "Window: last 30 days. Sparkline: last 14 days. Trend: rising / easing if the second half average differs by more than 5; 'new' with fewer than 4 entries.",
    "Case order: risk (critical first), then connect-request cases, then highest latest score."])
h2("10.5 Student report trend (journal/routes.py)")
p("Uses the last 30 scored entries; compares first-half and second-half averages: easing if second < first - 3, rising if second > first + 3, otherwise steady. 'Best hour' is the most common hour of calm entries (score <= 40).")

# =========================================================== 11
h1("11. Interventions, music and wellness garden")
h2("11.1 Intervention engine (interventions/engine.py)")
bl(["Target music state: critical -> calming; mild -> focus (if exam or deadline trigger hit) else grounded; calm -> uplifting if mood is low/sad/tired, else focus if a trigger was hit, else uplifting.",
    "Music transition labels: calming 'From Overwhelmed to Calm'; grounded 'From Overthinking to Grounded'; focus 'From Anxious to Focused'; uplifting is the fourth state.",
    "Cards for mild or critical: music, 4-7-8 breathing (inhale 4, hold 7, exhale 8, 4 rounds), 5-minute reset break, Zen Bubble Pop, Thought Reframe, journaling prompt.",
    "Cards for calm: music and Zen Bubble Pop only.",
    "Counselor card ('Talk to a campus counselor', confidential one-tap connect) for critical scores or when an early warning prompt shows; always sorted first.",
    "Remaining cards are ordered by the student's coping preferences (music, breathing, mini_games, journaling), then default priority.",
    "Journaling prompts are chosen by the trigger hit (exam, deadline, marks, public speaking, social conflict) with a default prompt otherwise."])
h2("11.2 Music (music/catalog.py)")
bl(["Built-in tracks generated in the browser with Web Audio (work offline): 432 Hz Ambient Soundscape, Theta Binaural Calm (6 Hz), Lo-Fi Chill Pad, Soft Rain & Brown Noise, Sunrise Arpeggio.",
    "Embedded public Spotify playlists: Lofi Beats, Peaceful Piano, Deep Focus, Ambient Relaxation, Classical Essentials, Mood Booster, Happy Hits.",
    "Language/genre search links: Chill Indie, Feel-Good Indie Pop, Hindi Lo-Fi, Tamil Melodies, Telugu Soft Hits, Kannada Chill.",
    "A student's own pasted Spotify playlist (per state) is shown first. An offline built-in track is always included."])
h2("11.3 Wellness garden and streak (wellness/service.py)")
bl(["Growth points = 10 per distinct check-in day + game points. Points never decrease.",
    "Game points are capped at 30 per day.",
    "Stages by growth points: Seed 0, Sprout 10, Sapling 40, In bloom 90, Flourishing tree 170.",
    "Streak: a gap of 1 missed day is forgiven (rest day); a gap of 3 or more days resets the chain. Current streak is alive only if the last check-in was within 2 days. Days are counted in UTC.",
    "Games: Zen Bubble Pop (pop anxious thoughts into calm affirmations) and Thought Reframe (match each distortion to a realistic reframe)."])

# =========================================================== 12
h1("12. Counselor portal and admin analytics")
h2("12.1 Counselor portal")
bl(["Students appear only under an alias (MG-XXXXX). Only scores, trends and trigger tags are shown, never journal or chat text.",
    "Name and contact are revealed only if the student ticked 'share my identity' in their connect request.",
    "Actions: reviewed, schedule (date required), outreach (in-app message), resolve. Student sees schedule/outreach updates in their app.",
    "Every call is written to the audit log."])
h2("12.2 Admin / cohort analytics (admin/aggregation.py)")
bl(["Only Mongo $group / $bucket / $facet / $avg pipelines; no route returns a raw journal document.",
    "Four campus risk tiers by each student's average score: Normal 0-25, Mild 26-50, Moderate 51-75, High distress 76-100.",
    "Campus Wellness Index = 100 - average rumination score.",
    "k-anonymity: any department / year bucket with fewer than K = 5 students (K_ANONYMITY_THRESHOLD) is folded into 'Other / Insufficient Data'.",
    "Stress factor tags from keyword sets: Academic Workload, Exam Anxiety, Sleep Disruption, Social Isolation, Family Pressure, Financial Stress, Placement / Career Anxiety (counts only).",
    "Anomaly alert threshold: ANOMALY_CHANGE_THRESHOLD_PERCENT = 20 (% change versus the previous period).",
    "Resource utilization (helpline / counselor / trusted-contact taps) comes from engagement_events, which has no user id.",
    "Admin can broadcast an anonymous wellness nudge, export a PII-free CSV, and (admin only) read the audit log."])

# =========================================================== 13
h1("13. Security and privacy")
bl([("Authentication:", "JWT (HS256), 7-day expiry; passwords hashed with bcrypt; never stored in plain text."),
    ("Roles:", "student, counselor, admin. Signup always creates a student; staff accounts are created by seed scripts. require_role() guards staff routes."),
    ("Data isolation:", "students can only read or write their own journals, contacts and alerts (other user id -> 403 / 404)."),
    ("Counselor privacy:", "alias only, no text, identity opt-in, audit log."),
    ("Admin privacy:", "aggregates only, k-anonymity, audit log, anonymous engagement counters."),
    ("Offline safety net:", "crisis phrases are detected locally even when Claude is used."),
    ("Dependency pins:", "pymongo 4.8.0 with motor 3.5.1; bcrypt 4.0.1 with passlib 1.7.4 (newer versions break them).")])

# =========================================================== 14
h1("14. Frontend")
bl([("Two entry points:", "index.html (student app, port 5173) and admin.html (counselor portal + cohort analytics)."),
    ("Student pages:", "Landing, Auth, Onboarding, Home, CheckIn, Chat, CalmSpace, Games, GardenPage, Reports, Support, Profile; games: BubblePop, Reframe."),
    ("Components:", "BreathingWidget (4-7-8), PomodoroWidget (5-min reset), MusicPlayer, Interventions, EarlyWarning (prompt), Garden, DemoDock (Demo pill), Shell, onboarding steps."),
    ("Staff app:", "AdminLogin, AdminDashboard (metric cards, risk distribution, department bar chart, stress factors, trends line chart, anomaly banner, broadcast modal), CounselorPortal (case rows, case drawer)."),
    ("Libraries/lib:", "audio.js (Web Audio soundscapes), dictation.js (voice input, Chrome/Edge), router.js, store.jsx, constants.js."),
    ("Check-in screen:", "text box, mood emoji, stress slider, voice input, 'Presentation shortcut' sample entries (High rumination, Calm), result card with 'Why this score?', highlighted phrases, engine badge (On-device NLP or Claude)."),
    ("Performance (production build):", "2,352 modules; initial student JS about 87 kB gzipped; chart library (about 106 kB gzipped) loads only on chart pages; games and reports are lazy-loaded.")])

# =========================================================== 15
h1("15. Configuration, running and demo")
h2("15.1 Environment variables")
table([["Variable", "Purpose", "Default / if unset"],
       ["MONGO_URI / MONGO_DB", "Database connection and name", "mongodb://localhost:27017 / mindguard"],
       ["JWT_SECRET", "Signs tokens and salts aliases", "dev-secret-change-me (insecure; change for real use)"],
       ["ANTHROPIC_API_KEY / ANTHROPIC_MODEL", "Claude reading and chat replies", "Offline engine; model default claude-sonnet-5-5"],
       ["SPOTIFY_CLIENT_ID / SECRET", "Live playlist search (optional)", "Built-in curated catalog"],
       ["TWILIO_ACCOUNT_SID / AUTH_TOKEN / FROM_NUMBER, COUNSELOR_PHONE_NUMBER", "Real SMS", "Dry-run: logged only"],
       ["ALLOWED_ORIGINS", "CORS origins", "*"],
       ["K_ANONYMITY_THRESHOLD", "Minimum group size", "5"],
       ["ANOMALY_CHANGE_THRESHOLD_PERCENT", "Admin anomaly alert", "20"],
       ["DEMO_MODE", "Seed demo data and enable Demo pill", "1 (set 0 for real use)"],
       ["VITE_API_BASE", "Frontend -> backend URL (build time)", "http://localhost:8000"]], [2.2, 2.3, 2.2], 9)
h2("15.2 How to run")
bl([("Docker:", "copy .env.example to .env, then docker compose up --build. Frontend http://localhost:5173, backend http://localhost:8000 (docs at /docs), MongoDB 27017."),
    ("Manual backend:", "cd backend, activate venv, uvicorn app.main:app --port 8000 (does not read .env; set variables in the same shell)."),
    ("Manual frontend:", "cd frontend, npm install, npm run dev."),
    ("Staff app:", "http://localhost:5173/admin.html"),
    ("Checks:", "python -m scripts.smoke_test and python -m scripts.calibrate_engine (backend running).")])
h2("15.3 Demo accounts (DEMO_MODE=1)")
table([["Role", "Login", "Password"],
       ["Counselor", "counselor@mindguard.ai", "Counselor@123"], ["Admin", "admin@mindguard.ai", "Admin@123456"],
       ["Student A (high rumination, Aarav Menon)", "aarav.demo@mindguard.ai", "Demo@12345"],
       ["Student B (calm, Meera)", "meera.demo@mindguard.ai", "Demo@12345"]], [2.8, 2.4, 1.5])
p("Demo seed: about 60 mock students plus the two personas. Student A has 11 days of rising stress; Student B has an 11-day streak and a blooming garden.")
h2("15.4 Presentation walkthrough")
bl(["Reset Student A (Demo -> Reset to pre-demo state).",
    "Check-in -> Presentation shortcut -> High rumination -> Analyze. Show Critical score, 'Why this score?', highlighted phrases.",
    "Play the built-in 432 Hz soundscape; try 4-7-8 breathing.",
    "Click 'Connect with a counselor'.",
    "Open counselor portal: new case appears under an anonymous ID with a Connect-request pill; schedule an intervention.",
    "Back in Student A's app, the counselor update appears.",
    "Play Zen Bubble Pop or Thought Reframe; open the Wellness garden.",
    "Switch to Student B, Calm shortcut: no warning, garden grows."], "List Number")

# =========================================================== 16
h1("16. Testing")
p("64 automated checks passed: 43 assertions in scripts/smoke_test.py and 21 documented test cases (below).")
table([["TC", "Area", "What was tested", "Result"],
       ["01", "Auth", "Valid signup returns a token", "200, token"],
       ["02", "Auth", "Duplicate email rejected", "409"],
       ["03", "Validation", "Short password rejected", "422"],
       ["04", "Auth", "Wrong password rejected", "401"],
       ["05", "Auth", "Valid login", "200, bearer token"],
       ["06", "JWT", "Missing / tampered token rejected", "401, 401"],
       ["07", "RBAC", "Role injection on signup ignored", "role stays student"],
       ["08", "RBAC", "Student blocked from admin and counselor APIs", "403, 403"],
       ["09", "Validation", "Empty text, 5001 chars, stress 101, bad source", "422 x4"],
       ["10", "Engines / escalation", "High-rumination text scores Critical with factors and warning", "score 98, warning raised"],
       ["11", "Engines", "Calm text scores Normal, no warning", "score 4"],
       ["12", "Safety", "Crisis phrase floor", "score 95, crisis true, counselor card first"],
       ["13", "Data isolation", "Other student's journal blocked", "403, 404"],
       ["14", "Gamification", "Daily game-point cap of 30", "capped"],
       ["15", "Validation", "Invalid game payloads", "422 x3"],
       ["16", "RBAC / audit", "Audit log is admin-only", "403 (counselor), 200 (admin)"],
       ["17", "Privacy", "k-anonymity with K = 5", "every shown group has 5+ students; 1 student folded into Other"],
       ["18", "Counselor", "Schedule needs a date; unknown alias", "422, 404"],
       ["19", "Notifications", "Dry-run and no-contact handling", "skipped, dry_run true"],
       ["20", "Music", "Valid and invalid state; offline track present", "fallback to grounded"],
       ["21", "Admin export", "CSV is an attachment and has no '@' (no emails)", "pass"]], [0.5, 1.4, 3.3, 1.5], 9)
p("TC10 scored 98 while the smoke test scored 100 for a similar text because the engine is history-aware and the TC10 account had no earlier entries.", italic=True)

# =========================================================== 17
h1("17. Results and performance")
p("Conditions: one machine (Intel Core i5-1335U, 15.7 GB RAM, Windows 11), MongoDB 6.0.8, Python 3.11.5; 67 users, 919 journal entries, 248 audit rows; "
  "serial client on localhost, 40 requests per endpoint (15 for login); offline word-list engine (no Claude key). These show relative cost, not production capacity.")
table([["Endpoint", "Mean ms", "p95 ms", "Bytes"],
       ["GET /health", "1.9", "2.6", "66"], ["POST /api/auth/login (bcrypt)", "356.9", "365.9", "229"],
       ["GET /api/auth/me", "4.2", "5.0", "312"], ["POST /api/checkins (full pipeline)", "14.4", "18.7", "6,637"],
       ["POST /api/ai/analyze-journal", "7.7", "9.4", "1,553"], ["GET /api/journals/reports/summary", "9.5", "12.1", "3,202"],
       ["GET /api/garden", "8.8", "10.2", "586"], ["GET /api/interventions/current", "9.6", "11.1", "3,541"],
       ["GET /api/music/recommend", "5.8", "7.7", "2,014"], ["GET /api/admin/aggregate-stats", "42.7", "55.0", "397"],
       ["GET /api/admin/cohort-trends", "18.7", "23.6", "1,497"], ["GET /api/admin/department-breakdown", "18.4", "23.0", "869"],
       ["GET /api/admin/stress-factors", "142.9", "152.6", "321"], ["GET /api/counselor/cases (62 cases)", "32.9", "36.1", "18,522"],
       ["GET /api/counselor/summary", "29.4", "33.1", "75"]], [3.3, 1.1, 1.1, 1.2])
bl(["Login is about 357 ms by design (bcrypt is deliberately slow). Every other student-facing request took 2-15 ms.",
    "Slowest endpoint: stress-factors (about 143 ms) because it runs 7 case-insensitive regex searches over all journal text with no index.",
    "Scoring engines (Engine 1 + 2) in-process: 2,000 runs on a 44-word entry, mean 0.238 ms, median 0.218, p95 0.411, p99 0.599. No BERT benchmark exists because no BERT is used. Claude path latency was not measured.",
    "Database: user's journals use the (user_id, created_at) index (15 examined / 15 returned); admin range on created_at alone is a collection scan (919 / 919); average document 320 bytes. Recommended: index on journals.created_at.",
    "Frontend build: 2,352 modules in 15.1 s. Raw / gzip sizes: main 120,268 / 34,975; ui 160,902 / 51,645; AreaChart (Recharts) 386,203 / 106,236; admin 81,567 / 23,081; Reports 9,989 / 3,688; BubblePop 13,153 / 5,527; Reframe 13,912 / 5,608. Initial student download about 87 kB gzipped JS plus 7 kB CSS. No Lighthouse / paint timing was measured."])
h2("Scoring calibration (seven sample texts)")
p("Personalised = recovery 'a full day', trigger 'exam pressure', previous scores 60 and 55.")
table([["Sample", "Mood", "Sentiment", "Stress", "Rumination markers", "Plain score", "Personalised", "Band"],
       ["High rumination", "Overwhelmed", "-0.769", "67.2", "100.0", "87", "100", "Critical"],
       ["Panic", "Overwhelmed", "-0.667", "75.2", "78.4", "76", "90", "Critical"],
       ["Mild", "Anxious", "-0.667", "86.0", "14.0", "44", "60", "Mild"],
       ["Calm", "Content", "0.800", "10.5", "0.0", "2", "2", "Calm"],
       ["Neutral", "Neutral", "0.000", "0.8", "0.0", "0", "0", "Calm"],
       ["Crisis", "Distressed", "0.000", "1.6", "0.0", "95", "95", "Critical"],
       ["Low but okay", "Neutral", "-0.314", "6.2", "14.0", "14", "14", "Calm"]], [1.2, 1.0, 0.7, 0.6, 0.9, 0.7, 0.8, 0.7], 8.5)
p("Personalisation raises scores for texts touching the student's triggers and history (Mild moves 44 -> 60 and crosses into the Mild band), "
  "leaves calm and neutral text unchanged, and the crisis floor holds.")
h2("Demo data (seeded)")
p("Counselor summary: 62 monitored cases = 3 critical, 8 moderate, 51 stable; 3 open connect requests. Department breakdown (semester): "
  "ISE 14, CSE 13, Mechanical 12, ECE 12, Civil 12; 1 student folded into 'Other / Insufficient Data'. Aarav's sample entry scored 100 (Critical); Meera's scored 4 (Calm).")
h2("Comparison with typical existing approaches")
table([["Aspect", "Typical existing approach", "MindGuard AI"],
       ["Detection", "Periodic questionnaires or student-initiated referral", "Every submitted entry is scored; escalation by rule"],
       ["Transparency", "Opaque score or single questionnaire total", "Itemised factors and highlighted phrases"],
       ["Personalisation", "One threshold for all", "Recovery time, triggers and history change the score"],
       ["Dependence on cloud AI", "Fully dependent on a remote model", "Optional; offline engine about 0.24 ms; crisis check always local"],
       ["Privacy", "No oversight, or full record visibility", "Alias-only counselor view, opt-in identity, k-anonymity, audit log"],
       ["Motivation", "Penalising streak mechanics", "Rest-day-forgiving streak, capped points, no fail states"],
       ["Operations", "Separate ML service and several components", "One deployable service"]], [1.4, 2.6, 2.7], 9)

# =========================================================== 18
h1("18. Limitations")
bl(["No accuracy, precision, recall or comparison with PHQ-9 / GAD-7 has been measured: the repository has no labelled dataset. The accuracy figures in the literature belong to other studies.",
    "The word-list engine is English-only and misses sarcasm and context; the Claude path was not measured.",
    "Default JWT secret and permissive CORS are insecure unless configured; the same secret salts aliases, so changing it relabels every alias.",
    "Journal text is stored without encryption at rest.",
    "Stress-factor analytics read journal text on the server (only counts are returned).",
    "Tokens are kept in browser local storage; no refresh, revocation, rate limiting or password reset.",
    "Timestamps are strings and days are bucketed in UTC.",
    "Duplicate open flags are theoretically possible under concurrent requests.",
    "The leftover 'Other' analytics bucket can be smaller than K.",
    "In-process aggregation is fine at about a thousand entries but needs an index, caching and background jobs for campus scale."])

# =========================================================== 19
h1("19. Future work")
bl(["Validation study with consented, labelled data (PHQ-9, GAD-7) to measure accuracy, precision, recall and false alarms; tune thresholds.",
    "Fine-tune a BERT-family model for rumination and distress; benchmark against the word-list and Claude engines.",
    "Passive and wearable signals (sleep, activity, device usage) with explicit consent.",
    "Mobile app (Flutter / React Native) or progressive web app with offline capture.",
    "Multilingual support (regional languages) and voice input.",
    "Security hardening: field-level encryption of journal text, token refresh and revocation, rate limiting, password reset, secure cookies, secret management.",
    "Scalability: index on journals.created_at, cached or pre-computed aggregates, atomic flag creation (unique partial index), stricter k-anonymity for the residual bucket.",
    "Integration with learning systems (Moodle, Blackboard).",
    "Longitudinal campus pilot over one or more semesters with a control group.",
    "Formal data-protection review (GDPR-style retention and deletion policies) before real-user deployment."], "List Number")

# =========================================================== 20
h1("20. Claims policy (what NOT to say)")
bl(["Do not state any accuracy, precision, recall, F1 or AUC for MindGuard AI. None was measured.",
    "Do not say a BERT / transformer / deep-learning model is used. The engines are Claude (optional) and word lists plus weighted rules.",
    "Do not say it diagnoses anything. It is a screening and support aid.",
    "Do not say it monitors phone usage or wearables. It analyses only text the student submits.",
    "Do not present numbers from the literature survey as results of this project.",
    "Performance numbers apply only to the stated single-laptop localhost setup.",
    "Do not claim counselors can see student names or diary text. They see aliases and scores; identity only if the student opts in.",
    "Do not claim SMS was sent to real people during testing; SMS ran in dry-run mode unless Twilio credentials are set."])

# =========================================================== 21
h1("21. Literature survey (12 studies)")
p("Summaries below are as recorded in the project report. Reference numbers [1]-[12] match the report. The full reference list "
  "(authors, venue, year) is not stored in this document; add it here if needed.", italic=True)
table([["#", "Title", "Objective", "Advantages", "Disadvantages"],
       ["1", "Mental Wellness ChatBot for Students using NLP", "Empathetic real-time AI chatbot; sentiment analysis and early distress detection to reduce stigma", "Real-time safety alerts via Twilio; mood-based music via Spotify; two-step validation limits false alerts", "Depends on third-party APIs (Gemini, Spotify, Twilio); keyword detection may give false positives"],
       ["2", "Algorithm Driven Early Warning and Intervention System for Mental Health of College Students", "Identify at-risk students from social, academic and digital-activity indicators", "Moves beyond reactive counseling; holistic real-time monitor; anonymised", "Relies on campus platform data (privacy concerns); may not generalise"],
       ["3", "Student Wellness Monitoring Using Sparse Autoencoder in University Mental Health Support Systems", "DBHP-DSCN framework for latent patterns in behavioural data", "92% accuracy, 90% precision, 88% recall vs 78% for statistical methods", "Computationally intensive; hard in real time for small institutions"],
       ["4", "Early Mental Health Detection through Random Forests", "Anonymous web screening with PHQ-9 / GAD-7 and a Random Forest", "Anonymity reduces stigma; instant results; Fernet-encrypted storage", "Self-reported scales; may miss nuance"],
       ["5", "Novel Ensemble ML Algorithm for Health Early Warning for College Students", "Hybrid SVM + Random Forest + ELM ensemble", "97.8% accuracy, 97.3% F1, AUC-ROC 0.986", "Single dataset; heavy and hard to interpret"],
       ["6", "AI in Mental Health: Student Depression Diagnosis and Intervention", "Review of AI/ML for detecting and predicting depression", "Broad overview; multimodal ML 91%, text NLP 88%, behavioural 87%", "Review only; no system validated"],
       ["7", "BeHealthy: Blockchain-Powered AI for Student Health Risk Detection", "MLP on lifestyle data; results stored on Ethereum Sepolia", "Integrity and immutability; JWT/CORS; dashboards", "Testnet only; gas cost; limited inputs"],
       ["8", "Blockchain-Powered Mental Health Prediction and Secure Record Management", "Random Forest with verifiable records on Ethereum Sepolia", "98% accuracy, 97.5% precision (controlled data); feature importance", "Controlled dataset; depends on honest self-report"],
       ["9", "Ensemble and Deep Learning for Screening Anxiety, Depression and Burnout in Medical Students", "DNN vs RF + Naive Bayes + LightGBM on 886 students", "DNN best; accuracies 81.4%, 76.65%, 73.59%; Information Gain feature selection", "Small, imbalanced, cross-sectional data"],
       ["10", "Centralized Digital Framework for Monitoring and Supporting Student Mental Wellness", "Predictive support with ensemble ML, hybrid recommendation, NLP chatbot", "87.3% accuracy; detection-to-intervention cut from 48 h to under 6 h; RBAC", "Weaker for graduate students (about 72% vs 87%); one-semester pilot"],
       ["11", "Machine Learning based Prediction of Psychiatric Disorder", "Post-COVID impact on student mental health, binary classifiers, 1,182 students", "Compares classifiers; five-stage data-to-action pathway", "Limited region; online-form bias; no follow-up"],
       ["12", "Sparse Autoencoder Signal Analysis for Student Wellness Monitoring", "DB-HPSO-tuned sparse autoencoder to flag anomalies", "98.2% accuracy, 97.5% precision, 96.8% recall", "Depends on training-data quality; high compute cost"]], [0.3, 1.6, 1.7, 1.7, 1.4], 8)
h3("Research gap and positioning")
bl(["Language analysis and structured questionnaires complement each other.",
    "Judging a student against their own baseline is better than using population averages.",
    "Rare severe cases are hardest to learn, so safeguards independent of the model are needed (our crisis floor).",
    "Privacy, explainability and human oversight are recurring requirements.",
    "Most high accuracies come from offline datasets; few studies describe a complete working loop from detection to explanation to counselor response with privacy built in. MindGuard AI implements that loop."])

# =========================================================== 22
h1("22. Existing report and PPT structure")
h2("22.1 Project report (VTU format) - chapter list")
p("Title: MindGuard AI: Early Detection of Student Mental Wellness Issues Using Artificial Intelligence. Front matter: certificate, declaration, "
  "acknowledgement, abstract, list of abbreviations, contents, list of figures and tables.")
table([["Chapter", "Title", "Main content"],
       ["1", "Introduction", "Problem statement, technologies used, objectives, scope and limitations, report organisation"],
       ["2", "Literature Survey", "12 studies, consolidated table, research gap"],
       ["3", "Existing System and Limitations", "Counseling centers, wellness apps, helplines, questionnaires, limitations, proposed response"],
       ["4", "Proposed System and Architecture", "Overview, architectural style, rumination pipeline (Engine 1 and 2), early warning, interventions, privacy, gamification, deployment, implemented scope vs original proposal"],
       ["5", "Software and Hardware Requirements", "Hardware, software, packages, environment variables, functional and non-functional requirements"],
       ["6", "Design and Implementation", "DFD level 0 and 1, database design, REST API, authentication sequence, core workflow, module summary, front-end design"],
       ["7", "Source Code", "JWT and role guard, Engine 2 combination, repetition bonus and crisis floor, early-warning classification, k-anonymity, Engine 1 with fallback, forgiving streak"],
       ["8", "Testing and Test Cases", "Approach, verification scripts, 21 test cases, client-side validation, limits of testing"],
       ["9", "Results and UI Workflows", "Student workflow, counselor portal and cohort dashboard, sample API response, measured dashboard data"],
       ["10", "Performance Analysis", "Latency, engine speed, database queries, client bundle, scoring behaviour, comparison, known limitations"],
       ["11", "Conclusion and Future Work", "Conclusion and 10 future-work items"],
       ["12", "References", "Reference list"]], [0.7, 2.2, 3.8], 9)
p("Note: the earlier report files and figures (architecture, DFD 0 / 1, ER, sequence, workflow, latency charts) were generated separately and may no longer be in the repository folder; "
  "this document contains all their facts.", italic=True)
h2("22.2 Presentation (Major_Project_Presentation.pptx, built by generate_project_ppt.py)")
p("16:9, palette navy #0F172A, blue #2563EB, teal #0D9488, background #F8FAFC, Calibri, speaker notes on every slide. Wording is deliberately simple (little technical jargon).")
table([["Slide", "Title", "Content"],
       ["1", "Title", "Project title, four students and USNs, ISE, TJIT, guide, coordinator, HOD"],
       ["2", "Agenda", "11 topics + live demo note"],
       ["3", "Introduction", "Why student stress matters; overthinking; idea; tiles: 0-100 score, 3 levels, private"],
       ["4", "Existing System", "4 current methods, 5 drawbacks"],
       ["5", "Problem Statement", "Quote of the problem + 5 requirements (spot, personalise, explain, help, protect)"],
       ["6", "Proposed System", "How it helps, objectives, tools used"],
       ["7", "Flow Chart", "Main flow of a check-in, database, three result paths, garden, alert message, campus dashboard"],
       ["8", "Data Flow Diagram", "Level 0 and Level 1 diagrams"],
       ["9", "Literature Review", "Title only (to be filled)"],
       ["10", "Implementation", "Project parts, features, what the database keeps, extra services and safety"],
       ["11", "Algorithm / Core Logic", "5-step score calculation, what counts as overthinking, score bands, warning rules"],
       ["12", "Results & Performance", "64/64 tests, 14 ms check-in, 0.24 ms score, 87 kB; sample score table; achievements; honesty note"],
       ["13", "Future Enhancements", "Next / Later / Long term (grouping is presentation wording, not from a project plan)"],
       ["14", "Conclusion", "Delivered, impact, verdict"]], [0.6, 2.0, 4.1], 9)

# =========================================================== 23
h1("23. Glossary (plain words)")
table([["Term", "Plain meaning"],
       ["Rumination / overthinking", "Worrying about the same thing again and again"],
       ["Rumination score", "0-100 number showing how strong the overthinking and stress look in a piece of writing"],
       ["Engine 1", "The step that reads the text for stress, tone and overthinking signs"],
       ["Engine 2", "The step that turns those signs into the personal 0-100 score"],
       ["Baseline", "What the student told us at set-up: triggers, how fast they recover, how they like to cope"],
       ["Trigger", "A topic that usually stresses the student (exams, deadlines, low marks, public speaking, social conflict)"],
       ["Factor", "One reason behind the score, shown to the student"],
       ["Early-warning flag", "An alert opened when scores are critical or stay high"],
       ["Alias", "An anonymous case code such as MG-1A2B3 shown to counselors instead of a name"],
       ["k-anonymity", "A group is shown in a chart only if it has at least 5 students"],
       ["RBAC", "Role-based access control: each role (student, counselor, admin) can open only its own pages"],
       ["JWT", "A login token the browser sends with every request"],
       ["DFD", "Data flow diagram: shows how information moves between people, steps and stored data"],
       ["Dry-run", "SMS is written to the log instead of really being sent"]], [1.9, 4.8])

doc.save(OUT)
print("Saved", OUT)
