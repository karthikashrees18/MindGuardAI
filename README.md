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

Full request/response shapes are in `backend/README.md` and the
auto-generated docs at `/docs`.

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

## Data safety note

Journal entries and chat content are sensitive. In this scaffold,
entries are stored keyed by `user_id` with no other PII beyond what's
needed — see `database/README.md` for the schema and what to harden
before using this with real users.
