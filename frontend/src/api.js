// Thin fetch wrapper around the backend. Every backend call the
// frontend makes should go through here so the base URL and auth header
// live in exactly one place. Points directly at the backend service
// (there's no separate gateway in the 3-tier layout).

export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

function authHeaders() {
  const token = localStorage.getItem("mga_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || JSON.stringify(body);
    } catch (_) {
      /* ignore */
    }
    throw new Error(detail);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // auth-service
  signup: (name, email, password) =>
    request("/api/auth/signup", { method: "POST", body: JSON.stringify({ name, email, password }) }),
  login: (email, password) =>
    request("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => request("/api/auth/me"),

  // ai-service
  chat: (history, message) =>
    request("/api/ai/chat", { method: "POST", body: JSON.stringify({ history, message }) }),
  analyzeJournal: (text, mood, stress_level) =>
    request("/api/ai/analyze-journal", { method: "POST", body: JSON.stringify({ text, mood, stress_level }) }),

  // journal-service
  createJournal: (entry) => request("/api/journals", { method: "POST", body: JSON.stringify(entry) }),
  listJournals: (userId) => request(`/api/journals?user_id=${encodeURIComponent(userId)}`),
  reportsSummary: (userId) => request(`/api/journals/reports/summary?user_id=${encodeURIComponent(userId)}`),

  // notification-service
  emergencyAlert: (userId, userName, alertType, message) =>
    request("/api/emergency/alert", {
      method: "POST",
      body: JSON.stringify({ user_id: userId, user_name: userName, alert_type: alertType, message }),
    }),
};

export function saveToken(token) {
  localStorage.setItem("mga_token", token);
}

export function clearToken() {
  localStorage.removeItem("mga_token");
}

export function getStoredUserId() {
  return localStorage.getItem("mga_user_id") || "demo-user";
}

export function setStoredUserId(id) {
  localStorage.setItem("mga_user_id", id);
}
