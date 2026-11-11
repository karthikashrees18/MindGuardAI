import React, { useCallback, useEffect, useState } from "react";
import { Download, Megaphone, LayoutDashboard, HeartPulse, ArrowLeft } from "lucide-react";
import { Aurora, PageHeader } from "../components/ui";
import DashboardLayout from "../components/DashboardLayout";
import { GlobalStyle, DARK, LIGHT, GhostButton } from "./theme";
import { adminApi, saveAdminToken, getAdminToken, clearAdminToken } from "./api";
import AdminLogin from "./AdminLogin";
import AdminDashboard from "./AdminDashboard";
import CounselorPortal from "./CounselorPortal";

const THEME_KEY = "mg_theme";

// Section links — same set for counselors and admins (the backend enforces access per endpoint).
const NAV = [
  { key: "portal", label: "Counselor Portal", subtitle: "Live triage queue", icon: HeartPulse },
  { key: "analytics", label: "Cohort Analytics", subtitle: "Anonymized campus trends", icon: LayoutDashboard },
];

const ROLE_LABELS = { admin: "Administrator", counselor: "Counselor" };

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

  const toItem = ({ key, label, icon }) => ({ key, label, icon, active: tab === key, onSelect: () => setTab(key) });
  const current = NAV.find((n) => n.key === tab) || NAV[0];

  // Sidebar / drawer actions that sit below the section links (student Support slot).
  const staffActions = (close) => (
    <>
      <button type="button" className="mg-nav-item" onClick={() => { openBroadcast(); close?.(); }}>
        <Megaphone size={17} /> New broadcast
      </button>
      <a className="mg-nav-item" href="/#/home" style={{ textDecoration: "none" }}>
        <ArrowLeft size={17} /> Exit to student view
      </a>
    </>
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
        <DashboardLayout
          nav={NAV.map(toItem)}
          tabs={NAV.map(toItem)}
          tabbarExtra={(
            <button type="button" className="mg-tab" onClick={openBroadcast}>
              <Megaphone size={20} />Broadcast
            </button>
          )}
          sidebarActions={staffActions()}
          menuActions={(close) => staffActions(close)}
          theme={mode}
          onToggleTheme={() => setMode((m) => (m === "dark" ? "light" : "dark"))}
          account={{ initialsFrom: actor?.name, name: actor?.name, subtitle: ROLE_LABELS[actor?.role] || actor?.role }}
          onLogout={handleLogout}
          title={current.label}
          contentKey={tab}
        >
          <PageHeader
            eyebrow="Campus Wellness & Counselor Portal"
            title={current.label}
            subtitle={`${current.subtitle} · Signed in as ${actor?.name} · ${actor?.role}`}
            actions={tab === "analytics" && (
              <a href={adminApi.exportSummaryCsvUrl(period)} style={{ textDecoration: "none" }}>
                <GhostButton><Download size={14} /> Export CSV</GhostButton>
              </a>
            )}
          />
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
        </DashboardLayout>
      )}
    </div>
  );
}
