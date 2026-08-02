# frontend

The Mind Guard AI web app — React + Vite. All 10 screens from the
original spec, with light/dark theme, a responsive sidebar/dashboard
layout on desktop that collapses to a mobile top bar + bottom tabs, and
an AI chatbot with a live mood/rumination signal panel.

This service talks to exactly one backend URL (`VITE_API_BASE`, default
`http://localhost:8000`) — see `src/api.js`, the only place `fetch()`
calls to the backend live.

## Run locally

```bash
npm install
npm run dev
```

Requires the `backend` (and `database`) to be running — see the root
README for `docker compose up`.

## File layout

```
src/
  main.jsx   — mounts <App />
  App.jsx    — all 10 screens + shell/navigation/theme (single file by
               design for now; see "splitting this up" below)
  api.js     — the only place fetch() calls to the backend live
```

## What's wired to the backend vs. still static

| Screen | Status |
|---|---|
| Login / Signup | ✅ calls `backend/app/auth` |
| Journal (Save, Analyze with AI) | ✅ calls `backend/app/journal` + `backend/app/ai` |
| AI Analysis | ✅ shows the real `ai` module result |
| AI Chat | ✅ calls the `ai` module on every message |
| Reports | ✅ calls `journal`'s reports summary |
| Emergency Support | ✅ helpline/counselor/trusted-contact buttons call `notifications`; "Book appointment" is still a visual placeholder |
| Home dashboard | ✅ reflects the live AI signal once you've chatted or analyzed a journal entry; the weekly bar chart is still static sample data |
| Splash, Profile | Static (no backend data needed yet) |

## Splitting this up further

`App.jsx` is intentionally one file to keep the initial handoff simple,
but it's organized in clearly commented sections (design tokens, shared
primitives, one function per screen). If your team wants to split
ownership within the frontend itself, the natural cut points are:

- `src/theme.js` — the `LIGHT`/`DARK` token objects
- `src/components/` — `Card`, `PrimaryButton`, `GhostButton`, `Sidebar`, `MobileTopBar`, `MobileTabBar`, `MobileMenu`
- `src/pages/` — one file per screen (`HomePage.jsx`, `JournalPage.jsx`, etc.)

## Notes

- Auth token is stored in `localStorage` (`mga_token`) and sent as a
  Bearer token automatically by `api.js`.
- If a backend call fails, screens show an inline error message rather
  than crashing — check that `backend` (and `database`) are running.
