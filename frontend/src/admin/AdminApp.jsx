import React, { useCallback, useEffect, useState } from "react";
import { ShieldCheck, Download, Megaphone, Sun, Moon, LogOut, LayoutDashboard, HeartPulse, ArrowLeft } from "lucide-react";
import { Aurora } from "../components/ui";
import { GlobalStyle, DARK, LIGHT, GhostButton, PrimaryButton } from "./theme";
import { adminApi, saveAdminToken, getAdminToken, clearAdminToken } from "./api";
import AdminLogin from "./AdminLogin";
import AdminDashboard from "./AdminDashboard";
import CounselorPortal from "./CounselorPortal";

const THEME_KEY = "mg_theme";

function readTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
  } catch (_) {
    return "dark";
  }
}

export default function AdminApp() {
  const [mode, setMode] = useState(readTheme);
  const t = mode === "light" ? LIGHT : DARK; // stable module-level objects
  const [stage, setStage] = useState("checking"); // checking | login | forbidden | app
  const [actor, setActor] = useState(null);
  const [tab, setTab] = useState("portal"); // portal | analytics
  const [period, setPeriod] = useState("7d");
  const [showBroadcast, setShowBroadcast] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", mode);
    try {
      localStorage.setItem(THEME_KEY, mode);
    } catch (_) {
      /* storage unavailable — theme just won't persist */
    }
  }, [mode]);

  const enter = useCallback((me) => {
    setActor(me);
    setTab(me.role === "admin" ? "analytics" : "portal");
    setStage("app");
  }, []);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      setStage("login");
      return;
    }
    adminApi
      .me()
      .then((me) => {
        if (me.role === "admin" || me.role === "counselor") {
          enter(me);
        } else {
          clearAdminToken();
          setStage("forbidden");
        }
      })
      .catch(() => {
        clearAdminToken();
        setStage("login");
      });
  }, [enter]);

  async function finishLogin(result) {
    saveAdminToken(result.access_token);
    const me = await adminApi.me();
    if (me.role !== "admin" && me.role !== "counselor") {
      clearAdminToken();
      setStage("forbidden");
      throw new Error("This account doesn't have admin or counselor access.");
    }
    enter(me);
  }

  const handleLogin = async (email, password) => finishLogin(await adminApi.login(email, password));
  const handleDemoLogin = async () => finishLogin(await adminApi.demoLogin());

  const handleLogout = useCallback(() => {
    clearAdminToken();
    setActor(null);
    setShowBroadcast(false);
    setStage("login");
  }, []);

  const openBroadcast = () => {
    setTab("analytics");
    setShowBroadcast(true);
  };

  const themeToggle = (
    <button
      type="button"
      className="mga-icon-btn"
      onClick={() => setMode((m) => (m === "dark" ? "light" : "dark"))}
      aria-label={mode === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      title={mode === "dark" ? "Light theme" : "Dark theme"}
    >
      {mode === "dark" ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );

  return (
    <div className="mga-root">
      <GlobalStyle />
      <Aurora />
      {stage === "checking" && (
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: t.textSecondary, fontSize: 13 }}>
          Loading…
        </div>
      )}
      {stage === "login" && <AdminLogin onLogin={handleLogin} onDemoLogin={handleDemoLogin} />}
      {stage === "forbidden" && (
        <div className="mg-center-page">
          <div className="mg-glass-panel mg-stack-sm" style={{ maxWidth: 420, textAlign: "center", alignItems: "center" }}>
            <div className="mg-h2">Admin or counselor access required</div>
            <div className="mg-small mg-muted" style={{ maxWidth: 340 }}>
              That account doesn't have permission to view this portal. Sign in with a counselor or admin account.
            </div>
            <button type="button" className="mg-btn quiet" onClick={() => setStage("login")}>
              Back to sign in
            </button>
          </div>
        </div>
      )}
      {stage === "app" && (
        <div className="mga-shell">
          <header className="mga-header">
            <div className="brand">
              <div className="brand-mark"><ShieldCheck size={20} /></div>
              <div style={{ minWidth: 0 }}>
                <div className="mg-h2">MindGuard AI — Campus Wellness &amp; Counselor Portal</div>
                <div className="mg-small mg-muted">{tab === "portal" ? "Triage queue" : "Cohort analytics"} · Signed in as {actor?.name} · {actor?.role}</div>
              </div>
            </div>
            <div className="actions">
              {tab === "analytics" && (
                <a href={adminApi.exportSummaryCsvUrl(period)} style={{ textDecoration: "none" }}>
                  <GhostButton><Download size={14} /> Export CSV</GhostButton>
                </a>
              )}
              <PrimaryButton grad={t.lavenderGrad} onClick={openBroadcast} style={{ padding: "8px 14px", fontSize: 12.5 }}>
                <Megaphone size={14} /> New broadcast
              </PrimaryButton>
              {themeToggle}
              <a href="/#/home" style={{ textDecoration: "none" }}>
                <GhostButton><ArrowLeft size={14} /> Exit to Student View</GhostButton>
              </a>
              <GhostButton onClick={handleLogout}><LogOut size={14} /> Log out</GhostButton>
            </div>
          </header>

          <nav className="mga-nav" aria-label="Sections">
            <button type="button" className={tab === "portal" ? "on" : ""} aria-current={tab === "portal" ? "page" : undefined} onClick={() => setTab("portal")}>
              <HeartPulse size={15} /> Counselor Portal
            </button>
            <button type="button" className={tab === "analytics" ? "on" : ""} aria-current={tab === "analytics" ? "page" : undefined} onClick={() => setTab("analytics")}>
              <LayoutDashboard size={15} /> Cohort Analytics
            </button>
          </nav>

          {tab === "portal" ? (
            <CounselorPortal onUnauthorized={handleLogout} />
          ) : (
            <AdminDashboard
              t={t}
              period={period}
              setPeriod={setPeriod}
              showBroadcastModal={showBroadcast}
              setShowBroadcastModal={setShowBroadcast}
            />
          )}
        </div>
      )}
    </div>
  );
}
