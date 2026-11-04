// Thin fetch wrapper around the backend. Every backend call the student app
// makes goes through here so the base URL and auth header live in one place.
// (The counselor/admin app has its own client + token in src/admin/api.js.)

export const API_BASE = (import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? "http://localhost:8000" : "")).replace(/\/$/, "");

const TOKEN_KEY = "mga_token";

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function saveToken(token) {
  try { localStorage.setItem(TOKEN_KEY, token); } catch { /* storage blocked */ }
}
export function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* storage blocked */ }
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, options = {}) {
  const token = getToken();
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new ApiError("Can't reach the Mind Guard server. Is the backend running on " + API_BASE + "?", 0);
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = Array.isArray(body.detail)
        ? body.detail.map((d) => d.msg).join("; ")
        : body.detail || JSON.stringify(body);
    } catch { /* non-JSON error body */ }
    throw new ApiError(detail, res.status);
  }
  if (res.status === 204) return null;
  return res.json();
}

const post = (path, body) => request(path, { method: "POST", body: JSON.stringify(body ?? {}) });
const put = (path, body) => request(path, { method: "PUT", body: JSON.stringify(body ?? {}) });

export const api = {
  // ---- auth / onboarding -------------------------------------------------
  // signup payload: { name, email, password, profile?, peer_contact?, guardian_contact?,
  //                   preferences?, baseline?: {triggers, recovery, coping}, music?: {genres, languages, playlists} }
  signup: (payload) => post("/api/auth/signup", payload),
  login: (email, password) => post("/api/auth/login", { email, password }),
  me: () => request("/api/auth/me"),
  // body: { baseline?, music?, preferred_name?, checkin_time? }  -> returns the updated user
  saveOnboarding: (body) => put("/api/auth/onboarding", body),

  // ---- check-ins / journal -----------------------------------------------
  // body: { text, mood?, stress_level?, source?: "checkin"|"vent"|"reflection" }
  // -> { entry, analysis, interventions:{target_state,transition,cards[]}, early_warning:{triggered,is_new,flag,show_prompt}, garden, first_checkin_today }
  checkin: (body) => post("/api/checkins", body),
  listJournals: (limit = 50) => request(`/api/journals?limit=${limit}`),
  reportsSummary: () => request("/api/journals/reports/summary"),

  // ---- AI ------------------------------------------------------------------
  chat: (history, message) => post("/api/ai/chat", { history, message }),
  analyzeJournal: (text, mood, stress_level) => post("/api/ai/analyze-journal", { text, mood, stress_level }),

  // ---- interventions / music ------------------------------------------------
  interventions: () => request("/api/interventions/current"),
  recommendMusic: (state, mood) => {
    const q = new URLSearchParams();
    if (state) q.set("state", state);
    if (mood) q.set("mood", mood);
    return request(`/api/music/recommend?${q}`);
  },

  // ---- gamification -----------------------------------------------------------
  garden: () => request("/api/garden"),
  // game: "bubble_pop"|"reframe"|"breathing"|"pomodoro" -> { awarded, capped, daily_cap, garden }
  completeGame: (game, score = 0, duration_s = 0) => post("/api/games/complete", { game, score, duration_s }),

  // ---- escalation / support -----------------------------------------------------
  supportStatus: () => request("/api/support/status"),
  supportDismiss: () => post("/api/support/dismiss"),
  // body: { channel: "in_app"|"email"|"phone", share_identity: bool, contact_detail?, note? }
  supportConnect: (body) => post("/api/support/connect", body),
  emergencyAlert: (alertType, message) => post("/api/emergency/alert", { alert_type: alertType, message }),
  listContacts: () => request("/api/contacts"),

  // ---- demo mode ---------------------------------------------------------------------
  demoPersonas: () => request("/api/demo/personas"),
  demoLogin: (persona) => post("/api/demo/login", { persona }),
  demoReset: (persona) => post("/api/demo/reset", { persona }),
};
