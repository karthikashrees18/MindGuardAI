// Global app state: auth, theme, toasts, and the "live wellness" state that
// several screens share (latest check-in result, garden, early-warning flag).
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api, clearToken, getToken, saveToken } from "../api";

const AppContext = createContext(null);

const THEME_KEY = "mg_theme";
const ADMIN_TOKEN_KEY = "mga_admin_token"; // read by the counselor/admin app (src/admin/api.js)

function readTheme() {
  try { return localStorage.getItem(THEME_KEY) || "dark"; } catch { return "dark"; }
}

export function AppProvider({ children }) {
  const [theme, setThemeState] = useState(readTheme);
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(() => !!getToken());
  const [staffAccount, setStaffAccount] = useState(null); // set if a counselor/admin signs in on the student app
  const [garden, setGarden] = useState(null);
  const [supportFlag, setSupportFlag] = useState(null);
  const [latest, setLatest] = useState(null); // last check-in result { analysis, interventions, early_warning, entry }
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(0);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ }
  }, [theme]);

  const toggleTheme = useCallback(() => setThemeState((t) => (t === "dark" ? "light" : "dark")), []);

  const toast = useCallback((message, { type = "ok", ms = 4200 } = {}) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, message, type }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ms);
  }, []);

  const refreshGarden = useCallback(async () => {
    try { setGarden(await api.garden()); } catch { /* non-fatal */ }
  }, []);

  const refreshSupport = useCallback(async () => {
    try { setSupportFlag((await api.supportStatus()).flag); } catch { /* non-fatal */ }
  }, []);

  const resetLive = useCallback(() => {
    setGarden(null);
    setSupportFlag(null);
    setLatest(null);
  }, []);

  const adopt = useCallback((u) => {
    // Counselor/admin accounts belong in the staff portal, not the student app.
    if (u.role !== "student") {
      clearToken();
      setUser(null);
      setStaffAccount(u);
      return false;
    }
    setStaffAccount(null);
    setUser(u);
    return true;
  }, []);

  // Restore a session on load.
  useEffect(() => {
    if (!getToken()) return;
    let alive = true;
    api.me()
      .then((u) => alive && adopt(u))
      .catch(() => { clearToken(); })
      .finally(() => alive && setBooting(false));
    return () => { alive = false; };
  }, [adopt]);

  // Load shared live state whenever a student is signed in.
  useEffect(() => {
    if (user) { refreshGarden(); refreshSupport(); }
  }, [user?.id, refreshGarden, refreshSupport]); // eslint-disable-line react-hooks/exhaustive-deps

  const finishAuth = useCallback(async (tokenResponse) => {
    saveToken(tokenResponse.access_token);
    resetLive();
    const u = tokenResponse.user || (await api.me());
    return adopt(u) ? u : null;
  }, [adopt, resetLive]);

  const value = useMemo(() => ({
    theme, toggleTheme,
    user, setUser, booting, staffAccount, setStaffAccount,
    garden, setGarden, refreshGarden,
    supportFlag, setSupportFlag, refreshSupport,
    latest, setLatest,
    toast, toasts,

    async signIn(email, password) {
      return finishAuth(await api.login(email, password));
    },
    async signUp(payload) {
      return finishAuth(await api.signup(payload));
    },
    async demoSignIn(persona) {
      return finishAuth(await api.demoLogin(persona));
    },
    async demoReset(persona) {
      return finishAuth(await api.demoReset(persona));
    },
    /** Counselor demo: hand the token to the staff app (separate storage key) and open it. */
    async openCounselorPortal() {
      const res = await api.demoLogin("counselor");
      try { localStorage.setItem(ADMIN_TOKEN_KEY, res.access_token); } catch { /* ignore */ }
      window.open("/admin.html", "_blank", "noopener");
    },
    signOut() {
      clearToken();
      setUser(null);
      resetLive();
    },
    /** Feed a /api/checkins (or chat) result into shared state. */
    recordCheckin(result) {
      setLatest(result);
      if (result.garden) setGarden(result.garden);
      if (result.early_warning?.flag !== undefined) setSupportFlag(result.early_warning.flag);
    },
  }), [theme, toggleTheme, user, booting, staffAccount, garden, supportFlag, latest, toast, toasts,
       refreshGarden, refreshSupport, finishAuth, resetLive]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}
