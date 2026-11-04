# Mind Guard AI

An AI-powered system for early detection of student mental wellness
issues and overthinking/rumination — a classic 3-tier architecture:

```
┌─────────────────┐        ┌──────────────────────┐        ┌───────────────┐
│    frontend       │  ───▶  │       backend          │  ───▶  │    database     │
│  React (Vite)      │  JSON  │  FastAPI, port 8000    │  Mongo │  MongoDB        │
│  port 5173         │        │  organized into        │  wire  │  port 27017     │
│  all 10 screens    │        │  auth / journal / ai /  │        │  protocol       │
│                    │        │  notifications modules │        │                 │
└─────────────────┘        └──────────────────────┘        └───────────────┘
```

The **backend** is one deployable FastAPI service, but internally split
into four feature modules (`app/auth`, `app/journal`, `app/ai`,
`app/notifications`) — each with its own models/routes file — so
different teammates can own a module with minimal merge conflicts, the
way you would in a microservices setup, without the deployment
overhead of running five separate containers.

## What the system does

| Area | Where |
|---|---|
| **Onboarding & baseline profile** - triggers, recovery time, coping preferences, music taste (genres, languages, pasted Spotify playlists per target state) | `frontend/src/pages/Auth.jsx`, `Onboarding.jsx` -> `PUT /api/auth/onboarding` |
| **Dual-engine detection** - Engine 1 reads sentiment / stress / rumination markers (Claude if `ANTHROPIC_API_KEY` is set, otherwise an offline NLP lexicon); Engine 2 turns that into a personalised 0-100 score using the baseline, triggers and recent history. Bands: 0-40 Calm, 41-70 Mild Overthinking, 71-100 Critical. Every adjustment is returned so the UI can explain the score | `backend/app/ai/scoring.py`, `ai/analysis.py`, `engine/rumination.py` |
| **Smart interventions** - mood-shifting music ("From Overthinking to Grounded"), 4-7-8 breathing animation, 5-min Pomodoro reset, journaling reframes, ordered by the student's coping preferences | `backend/app/interventions`, `music/catalog.py`, `frontend/src/components/*` |
| **Music** - built-in Web Audio soundscapes (432 Hz ambient, theta binaural, lo-fi, rain) that always play, plus embedded Spotify playlists | `frontend/src/lib/audio.js` |
| **Gamification** - Zen Bubble Pop, Thought Reframe, Streak & Wellness Garden (no-pressure: rest days forgiven, points capped daily) | `frontend/src/pages/games`, `backend/app/wellness` |
| **Escalation** - early-warning flag on a critical entry or persistent rumination; 1-click confidential counselor connect | `backend/app/escalation` |
| **Counselor portal** - alias-only risk queue (Critical / Moderate / Stable), trends, schedule / message / resolve actions; never shows journal text | `backend/app/counselor`, `frontend/src/admin/CounselorPortal.jsx` |
| **Cohort analytics** - k-anonymised campus metrics (existing) | `backend/app/admin` |

## Presentation guide (Monday)

```bash
docker compose up --build        # or run backend + frontend manually (below)
```
`DEMO_MODE=1` (default) seeds everything on first boot. Open http://localhost:5173 and use the
**Demo** pill (bottom-right) - it appears on every screen.

1. **Student A - High Rumination**: Demo -> Student A. Home shows a rising trend.
   Check-in -> *Presentation shortcut* -> **High rumination** -> Analyze. Show: score 100 / Critical,
   "Why this score?" breakdown, highlighted phrases, music transition + Play (built-in 432 Hz works offline),
   4-7-8 breathing, the **Connect with a counselor** prompt - click it.
2. Play **Zen Bubble Pop** or **Thought Reframe**, then open **Wellness garden** to show points.
3. **Counselor**: Demo -> *Open counselor portal*. The new case appears under an anonymous ID with a
   "Connect request" pill; open it, **Schedule intervention**. Back in Student A's app the counselor update appears.
4. **Student B - Calm State**: Demo -> Student B. Calm check-in (shortcut -> Calm) -> garden grows, no warning.
5. Reset Student A any time: Demo -> *Reset ... to pre-demo state*.

Seeded logins: counselor@mindguard.ai / Counselor@123 - admin@mindguard.ai / Admin@123456 -
aarav.demo@mindguard.ai and meera.demo@mindguard.ai / Demo@12345.

Verification scripts (backend running): `python -m scripts.calibrate_engine`, `python -m scripts.smoke_test`.

## Suggested team split (5–6 people)

| Owner | Area | What you'll build |
|---|---|---|
| 1 | `frontend` | React UI, all 10 screens, calling the backend |
| 2 | `backend/app/auth` | signup/login, password hashing, JWT |
| 3 | `backend/app/journal` | journal CRUD, mood/stress storage, reports aggregation |
| 4 | `backend/app/ai` | chat endpoint (Claude API), rumination/sentiment scoring |
| 5 | `backend/app/notifications` | Twilio SMS, counselor/trusted-contact escalation |
| 6 (optional) | `database` | schema/index design, data-safety review, seeding demo data |

## Running everything locally

```bash
cp .env.example .env        # fill in ANTHROPIC_API_KEY, TWILIO_* (optional), JWT_SECRET
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend + API docs: http://localhost:8000/docs
- Mongo: localhost:27017 (connect with `mongosh` or MongoDB Compass)

Running the backend on its own while developing:

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export MONGO_URI=mongodb://localhost:27017
uvicorn app.main:app --reload --port 8000
```

## API contract

| Method | Path | Module | Purpose |
|---|---|---|---|
| POST | `/api/auth/signup` | auth | create account |
| POST | `/api/auth/login` | auth | returns `{access_token}` |
| GET | `/api/auth/me` | auth | current user (JWT required) |
| POST | `/api/journals` | journal | create journal entry |
| GET | `/api/journals?user_id=` | journal | list entries |
| GET | `/api/journals/reports/summary?user_id=` | journal | reports dashboard data |
| POST | `/api/ai/chat` | ai | AI chatbot reply + mood/rumination score |
| POST | `/api/ai/analyze-journal` | ai | sentiment/overthinking analysis of a journal entry |
| POST | `/api/emergency/alert` | notifications | trigger SMS to counselor/trusted contact |
| PUT | `/api/auth/onboarding` | auth | save baseline profile + music preferences |
| POST | `/api/checkins` | journal | check-in / vent / reflection -> score, interventions, early warning, garden |
| GET | `/api/interventions/current` | interventions | cards for the latest score |
| GET | `/api/music/recommend?state=` | music | curated tracks for calming / grounded / focus / uplifting |
| GET | `/api/garden` | wellness | streak + garden state |
| POST | `/api/games/complete` | wellness | award (daily-capped) garden points |
| GET/POST | `/api/support/status` `/connect` `/dismiss` | escalation | student side of the early-warning flow |
| GET/POST | `/api/counselor/summary` `/cases` `/cases/{alias}` `/cases/{alias}/actions` | counselor | alias-only case management |
| GET/POST | `/api/demo/personas` `/login` `/reset` | demo | persona switcher (DEMO_MODE only) |
| GET | `/api/admin/aggregate-stats?period=` | admin | KPI banner + risk-tier distribution + anomaly alerts |
| GET | `/api/admin/cohort-trends?period=` | admin | daily campus mood trendline |
| GET | `/api/admin/department-breakdown?period=&group_by=` | admin | distress severity by department/year, k-anonymized |
| GET | `/api/admin/stress-factors?period=` | admin | top reported stress-factor tags, k-anonymized |
| GET | `/api/admin/resource-utilization?period=` | admin | helpline/counselor/trusted-contact tap counts |
| POST | `/api/admin/broadcast-resource` | admin | publish an anonymized cohort-wide wellness nudge |
| GET | `/api/admin/broadcast-resource` | admin | list recent broadcasts |
| GET | `/api/admin/export/summary.csv?period=` | admin | zero-PII CSV for accreditation reporting |
| GET | `/api/admin/audit-log` | admin (admin role only) | who queried what analytics, and when |

Full request/response shapes are in `backend/README.md` and the
auto-generated docs at `/docs`.

## Admin & Counselor Analytics Dashboard

A second, separately-authenticated surface for counselors/admins to see
**cohort-level, k-anonymized** wellness metrics — never an individual
student's name, journal text, or contacts.

```bash
cd frontend && npm run dev
# student app:  http://localhost:5173/index.html
# admin dashboard: http://localhost:5173/admin.html
```

**Seeding demo data** (mock students + journal history + a counselor
and an admin login, so the dashboard has something to show immediately):

```bash
cd backend
python -m scripts.seed_admin_dashboard
```

This prints two logins:

| Role | Email | Password |
|---|---|---|
| Counselor | `counselor@mindguard.ai` | `Counselor@123` |
| Admin | `admin@mindguard.ai` | `Admin@123456` |

Sign in with either at `/admin.html` — there is deliberately no
self-serve signup for these roles (see `backend/app/auth/routes.py`);
every account created through `/api/auth/signup` is a student.

### Privacy-by-design, concretely

- **Zero-PII payloads.** Every `backend/app/admin/*` endpoint only ever
  runs `$group` / `$bucket` / `$facet` / `$avg` Mongo pipelines. No admin
  route imports `journals.find_one` or returns a raw document — see the
  module docstring in `app/admin/aggregation.py`.
- **K-anonymity (K=5, configurable via `K_ANONYMITY_THRESHOLD`).** Any
  department/year bucket or stress-factor tag backed by fewer than 5
  students is folded into "Other / Insufficient Data" or hidden
  entirely (`app/admin/aggregation.py::suppress_small_groups`).
- **RBAC.** `require_role("admin", "counselor")` in `app/auth/utils.py`
  gates every `/api/admin/*` route; a valid student JWT gets a 403.
- **Audit trail.** Every aggregate query an admin/counselor makes is
  logged (actor, endpoint, params, timestamp) to `audit_logs` —
  `GET /api/admin/audit-log` (admin-only) reviews it.
- **Anonymous engagement counters.** Crisis-helpline/counselor/trusted-
  contact taps are logged to `engagement_events` with *no user_id at
  all* — see `_log_engagement` in `app/notifications/routes.py` — so
  "Resource Utilization" can be counted without being traceable to a
  student even by someone with direct DB access.

## Environment variables

See `.env.example`. Key ones:

- `ANTHROPIC_API_KEY` — used by the `ai` module for chat + scoring;
  falls back to a lightweight keyword-based scorer if unset, so the app
  still runs without a key.
- `JWT_SECRET` — signs and verifies auth tokens.
- `MONGO_URI` — connection string to the `database` service.
- `TWILIO_*` — optional; `notifications` runs in "dry run" mode (logs
  instead of sending) if not set.

## Known dependency pins (don't remove these without testing)

- `pymongo==4.8.0` alongside `motor==3.5.1` — newer pymongo removes a
  private API `motor` 3.5.1 relies on internally.
- `bcrypt==4.0.1` alongside `passlib==1.7.4` — newer bcrypt removed a
  version attribute `passlib`'s backend probe reads, which breaks
  signup/login entirely if bumped.

## Security notes

Journal, contacts and alert endpoints now require a bearer token and only act on the signed-in student
(previously any caller could pass any `user_id`). Counselor endpoints are role-gated and audit-logged.
Set `DEMO_MODE=0` and a real `JWT_SECRET` outside the demo.

## Data safety note

Journal entries and chat content are sensitive. In this scaffold,
entries are stored keyed by `user_id` with no other PII beyond what's
needed — see `database/README.md` for the schema and what to harden
before using this with real users.