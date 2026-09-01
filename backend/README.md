# backend

A single FastAPI service, port `8000`, organized internally by feature
so your team can still divide ownership without running five separate
deployables.

```
backend/
├── requirements.txt
├── Dockerfile
└── app/
    ├── main.py           — creates the app, mounts every router, /health
    ├── config.py         — every env var the backend reads, in one place
    ├── database.py       — the one shared Mongo client + collection handles
    ├── auth/              — signup/login/JWT
    │   ├── models.py
    │   ├── utils.py       — password hashing, JWT create/verify, get_current_user
    │   └── routes.py
    ├── journal/           — journal CRUD + reports aggregation
    │   ├── models.py
    │   └── routes.py
    ├── ai/                — Claude-powered chat + rumination/sentiment scoring
    │   ├── models.py
    │   ├── scoring.py     — keyword-based fallback when no API key is set
    │   └── routes.py
    └── notifications/     — emergency SMS escalation (Twilio, dry-run by default)
        ├── models.py
        └── routes.py
```

## Suggested ownership

| Owner | Module | Endpoints |
|---|---|---|
| A | `app/auth/` | `/api/auth/signup`, `/login`, `/me` |
| B | `app/journal/` | `/api/journals`, `/api/journals/{id}`, `/api/journals/reports/summary` |
| C | `app/ai/` | `/api/ai/chat`, `/api/ai/analyze-journal` |
| D | `app/notifications/` | `/api/emergency/alert`, `/api/contacts` |

Each module only touches its own collection(s) in `app/database.py` and
its own router — two people can work in `app/auth/` and `app/journal/`
at the same time with near-zero merge conflicts.

## Run locally

```bash
pip install -r requirements.txt
export MONGO_URI=mongodb://localhost:27017
export JWT_SECRET=dev-secret
export ANTHROPIC_API_KEY=sk-ant-...   # optional — ai/ falls back to keyword scoring without it
uvicorn app.main:app --reload --port 8000
```

Docs at http://localhost:8000/docs — every route from every module
shows up there together.

## API summary

| Method | Path | Module |
|---|---|---|
| POST | `/api/auth/signup` | auth |
| POST | `/api/auth/login` | auth |
| GET | `/api/auth/me` | auth |
| POST | `/api/journals` | journal |
| GET | `/api/journals?user_id=` | journal |
| GET | `/api/journals/reports/summary?user_id=` | journal |
| GET | `/api/journals/{id}` | journal |
| POST | `/api/ai/chat` | ai |
| POST | `/api/ai/analyze-journal` | ai |
| POST | `/api/emergency/alert` | notifications |
| POST | `/api/contacts` | notifications |
| GET | `/api/contacts?user_id=` | notifications |
| POST | `/api/music/playlist` | music |
| GET | `/api/music/health` | music |
| GET | `/health` | — |

## Notes

- `bcrypt==4.0.1` and `pymongo==4.8.0` are pinned deliberately — newer
  releases of both break `passlib`/`motor` respectively. Don't bump
  these without testing signup/login and any Mongo query afterward.
- If your project write-up wants a "true microservices" story instead,
  this same code splits cleanly along the module boundaries above —
  each folder could become its own FastAPI app with its own Dockerfile.