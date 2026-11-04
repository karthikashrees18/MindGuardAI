// Same pattern as ../api.js — one place for base URL + auth header, this
// time for the admin/counselor-only endpoints under /api/admin/*.

export const API_BASE = (import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? "http://localhost:8000" : "")).replace(/\/$/, "");

function authHeaders() {
  const token = localStorage.getItem("mga_admin_token");
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
    const err = new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

export const adminApi = {
  // auth — shared with the student app's /api/auth/* routes. Access to
  // everything below is enforced server-side by role, not by this file.
  login: (email, password) =>
    request("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => request("/api/auth/me"),
  // Presentation shortcut; 404 when the backend runs with demo mode off.
  demoLogin: () =>
    request("/api/demo/login", { method: "POST", body: JSON.stringify({ persona: "counselor" }) }),

  // admin-service
  aggregateStats: (period) => request(`/api/admin/aggregate-stats?period=${period}`),
  cohortTrends: (period) => request(`/api/admin/cohort-trends?period=${period}`),
  departmentBreakdown: (period, groupBy) =>
    request(`/api/admin/department-breakdown?period=${period}&group_by=${groupBy}`),
  stressFactors: (period) => request(`/api/admin/stress-factors?period=${period}`),
  resourceUtilization: (period) => request(`/api/admin/resource-utilization?period=${period}`),
  listBroadcasts: () => request("/api/admin/broadcast-resource"),
  createBroadcast: (payload) =>
    request("/api/admin/broadcast-resource", { method: "POST", body: JSON.stringify(payload) }),
  exportSummaryCsvUrl: (period) => `${API_BASE}/api/admin/export/summary.csv?period=${period}`,
};

export const counselorApi = {
  summary: () => request("/api/counselor/summary"),
  cases: (risk) => request(`/api/counselor/cases${risk ? `?risk=${encodeURIComponent(risk)}` : ""}`),
  caseDetail: (alias) => request(`/api/counselor/cases/${encodeURIComponent(alias)}`),
  action: (alias, body) =>
    request(`/api/counselor/cases/${encodeURIComponent(alias)}/actions`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

export function saveAdminToken(token) {
  localStorage.setItem("mga_admin_token", token);
}

export function clearAdminToken() {
  localStorage.removeItem("mga_admin_token");
}

export function getAdminToken() {
  return localStorage.getItem("mga_admin_token");
}