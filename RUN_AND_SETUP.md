# Mind Guard AI - Run & Setup Guide

Everything you need to start the project, open the student and counselor dashboards, and set up the optional extras (Spotify, Groq AI, SMS).

---

## 1. Prerequisites

| Need | Check |
|---|---|
| MongoDB running on `localhost:27017` | `Get-Service MongoDB*` should say **Running** |
| Python 3.11 | `python --version` |
| Node.js 18+ | `node --version` |

If MongoDB is not running: `net start MongoDB` (run PowerShell as Administrator), or use Docker (see section 5).

---

## 2. Start the project (two terminals)

### Terminal 1 - Backend
```powershell
cd C:\Users\vigneshs\Desktop\Mindguard\Mind-Guard-AI\backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --port 8000
```
Wait for `Application startup complete`. On the very first start the backend seeds the demo data (counselor/admin logins, about 60 mock students, two demo students). The cohort part takes around 20 seconds in the background.

Check it: open http://localhost:8000/health. You should see `"status": "ok"`. API docs are at http://localhost:8000/docs.

> If `Activate.ps1` is blocked, run once: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`
> If the `venv` folder doesn't work on your machine: `python -m venv venv`, activate it, then `pip install -r requirements.txt`.

### Terminal 2 - Frontend
```powershell
cd C:\Users\vigneshs\Desktop\Mindguard\Mind-Guard-AI\frontend
npm install        # only the first time
npm run dev
```
It serves on http://localhost:5173.

---

## 3. Open the dashboards

| Dashboard | URL | How to sign in |
|---|---|---|
| **Student app** | http://localhost:5173 | Click the **Demo** pill (bottom-right) and pick a student, or sign up with a new account |
| **Counselor portal** | http://localhost:5173/admin.html | Click **Use demo counselor login**, or sign in with `counselor@mindguard.ai` / `Counselor@123` |
| **Admin (cohort analytics)** | http://localhost:5173/admin.html | `admin@mindguard.ai` / `Admin@123456` |

Demo student logins (password for both: `Demo@12345`):
- `aarav.demo@mindguard.ai` - Student A, high rumination
- `meera.demo@mindguard.ai` - Student B, calm state

Shortcut: in the student app, **Demo -> Open counselor portal** opens the counselor dashboard in a new tab already signed in.

The counselor portal has two tabs: **Counselor Portal** (individual case queue, shown under anonymous IDs) and **Cohort Analytics** (campus-wide, privacy-grouped charts).

---

## 4. Presentation walkthrough (Monday)

1. **Before you start:** Demo -> Student A -> **Reset Student A to pre-demo state**.
2. **Detection:** Check-in -> *Presentation shortcut* -> **High rumination** -> **Analyze & save**. Show the score (Critical band), the "Why this score?" breakdown, and the highlighted phrases.
3. **Music and calming tools:** scroll to "Picked for you" -> press Play on **432 Hz Ambient Soundscape** (use headphones or speakers). Try the 4-7-8 breathing pacer.
4. **Escalation:** click **Connect with a counselor**.
5. **Counselor view:** Demo -> **Open counselor portal**. The new case appears at the top under an anonymous ID with a "Connect request" pill. Open it, then **Schedule intervention**.
6. **Close the loop:** go back to Student A's tab. The counselor's scheduled session shows on Home / Check-in.
7. **Gamification:** Mini-games -> **Zen Bubble Pop** or **Thought Reframe**, then **Wellness garden**.
8. **Calm state:** Demo -> Student B -> Check-in -> **Calm** shortcut. No warning is raised and the garden grows.

> Rehearse once, then use the **Reset** button so the demo starts clean.

---

## 5. Run with Docker instead (optional)

```powershell
cd C:\Users\vigneshs\Desktop\Mindguard\Mind-Guard-AI
copy .env.example .env
docker compose up --build
```
Frontend: http://localhost:5173. Backend: http://localhost:8000. Docker reads the `.env` file automatically. Stop any locally running backend or MongoDB service first, because the ports clash.

---

## 6. Setting environment variables (important)

When you run the backend manually (section 2), it does **not** read the `.env` file. Set variables in the same PowerShell window **before** `uvicorn`:

```powershell
$env:GROQ_API_KEY = "gsk_..."
$env:SPOTIFY_CLIENT_ID = "..."
$env:SPOTIFY_CLIENT_SECRET = "..."
uvicorn app.main:app --port 8000
```
(With Docker, put the same values in `.env` instead.)

| Variable | Purpose | If not set |
|---|---|---|
| `GROQ_API_KEY` | Groq LLM reads the text and writes the AI companion's replies | Offline analysis engine is used for scoring; the companion says it is not configured |
| `GROQ_MODEL` / `GROQ_FALLBACK_MODEL` | Override the chat models (defaults `llama-3.3-70b-versatile` / `llama-3.1-8b-instant`) | Defaults are used |
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | Live Spotify playlist search (optional) | Built-in curated catalog is used |
| `TWILIO_*`, `COUNSELOR_PHONE_NUMBER` | Real SMS to counselor / trusted contacts | Dry-run: SMS is only logged, nothing is sent |
| `JWT_SECRET` | Signs login tokens | Insecure dev default; change it for any real use |
| `DEMO_MODE` | `1` seeds demo data and enables the Demo pill | `0` turns demo mode off |

---

## 7. Spotify setup

There are **three separate things**; only the first one needs manual work.

### 7a. Check the built-in Spotify playlists (do this before Monday)
The app embeds Spotify's own public playlists. I couldn't check offline that every playlist ID is still live, so check each one once.

1. Sign in to Spotify in the same browser you'll present with (a free account is fine).
2. Student app -> **Calm space** -> pick each destination chip (Calm down, Ground myself, Focus, Lift my mood).
3. Click the Play button on each **Spotify** row. A small Spotify player should appear.
4. If one shows "unavailable" or an error, replace it:
   - Open Spotify -> find a similar public playlist -> **Share -> Copy link to playlist**.
   - The link looks like `https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn?si=...`. The ID is the 22 characters after `/playlist/`.
   - Open `backend/app/music/catalog.py`, find the entry (for example `"sp-lofi"`), and replace its `spotify_id` value.
   - Restart the backend.

> Without being signed in to Spotify in the browser, embeds play only 30-second previews. Sign in for full tracks.
> The **built-in tracks** (432 Hz, Theta Binaural, Lo-Fi, Rain, Sunrise) need no Spotify and no internet, so they are the safe fallback on stage.

### 7b. Students adding their own playlist (no code)
1. In Spotify, open a playlist -> **Share -> Copy link to playlist**.
2. In the app, either:
   - at signup, on the **Music** step, paste it under Uplifting / Calming / Focus; or
   - **Profile -> Your baseline -> Edit -> Music**, paste it, then **Save changes**.
3. That playlist now appears first in the music card whenever that mood is triggered.

The link must contain `open.spotify.com/playlist/...` or be `spotify:playlist:...`. Make sure the playlist is **public**.

### 7c. Spotify API credentials (optional, only for live playlist search)
Only the old `/api/music/playlist` search endpoint uses these. The app works fully without them.

1. Go to https://developer.spotify.com/dashboard -> **Create app** (any name; redirect URI `http://localhost:5173`).
2. Copy the **Client ID** and **Client Secret**.
3. Set `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` as in section 6, then restart the backend.

---

## 8. Optional: Groq (AI text analysis and chat replies)
1. Get a key at https://console.groq.com/keys .
2. Set `GROQ_API_KEY` (free key at https://console.groq.com/keys) as in section 6 and restart the backend.
3. Check: http://localhost:8000/api/ai/health should say `"ai_backend": "groq"`. On the check-in result screen the badge changes from "On-device NLP" to "Groq AI".

If the call fails (no network, bad key), the app silently falls back to the offline engine, so the demo never breaks.

---

## 9. Troubleshooting

| Problem | Fix |
|---|---|
| Student app says "Can't reach the Mind Guard server" | Backend isn't running, or isn't on port 8000 |
| Demo pill doesn't appear | `DEMO_MODE` is off, or backend isn't running |
| Counselor list is empty right after first start | Wait about 20 seconds for the cohort seed, then refresh |
| `Address already in use` on 8000 or 5173 | Another copy is running; close it, or use `--port 8001` and set `VITE_API_BASE=http://localhost:8001` |
| MongoDB connection error | Start the MongoDB service (section 1) |
| Student A is stuck in "request sent" state | Demo -> **Reset Student A to pre-demo state** |
| No sound from built-in music | Click once on the page first (browsers block audio until a click) and check the volume slider |
| Mic button missing | Voice input works in Chrome / Edge only |
| Want a totally fresh database | In `mongosh`: `use mindguard` then `db.dropDatabase()`, then restart the backend |

---

## 10. Quick self-test (backend running)
```powershell
cd backend
.\venv\Scripts\Activate.ps1
python -m scripts.smoke_test       # walks the whole story, prints PASS/FAIL
python -m scripts.calibrate_engine # shows how sample texts score
```
The smoke test changes Student A's state (adds a counselor request); reset Student A afterwards.
