import React, { useEffect, useState } from "react";
import { GlobalStyle, LIGHT } from "./theme";
import { adminApi, saveAdminToken, getAdminToken, clearAdminToken } from "./api";
import AdminLogin from "./AdminLogin";
import AdminDashboard from "./AdminDashboard";

export default function AdminApp() {
  const t = LIGHT; // the admin surface is kept single-theme for now; flip to DARK/LIGHT toggle later if wanted
  const [stage, setStage] = useState("checking"); // checking | login | forbidden | app
  const [actor, setActor] = useState(null);

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
          setActor(me);
          setStage("app");
        } else {
          clearAdminToken();
          setStage("forbidden");
        }
      })
      .catch(() => {
        clearAdminToken();
        setStage("login");
      });
  }, []);

  async function handleLogin(email, password) {
    const result = await adminApi.login(email, password);
    saveAdminToken(result.access_token);
    const me = await adminApi.me();
    if (me.role !== "admin" && me.role !== "counselor") {
      clearAdminToken();
      setStage("forbidden");
      throw new Error("This account doesn't have admin or counselor access.");
    }
    setActor(me);
    setStage("app");
  }

  function handleLogout() {
    clearAdminToken();
    setActor(null);
    setStage("login");
  }

  return (
    <div style={{ fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <GlobalStyle />
      {stage === "checking" && (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: t.textSecondary, fontSize: 13 }}>
          Loading…
        </div>
      )}
      {stage === "login" && <AdminLogin t={t} onLogin={handleLogin} />}
      {stage === "forbidden" && (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 20, textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: t.textPrimary }}>Admin or counselor access required</div>
          <div style={{ fontSize: 13, color: t.textSecondary, maxWidth: 360 }}>
            That account doesn't have permission to view the analytics dashboard. Sign in with a counselor or admin account.
          </div>
          <button onClick={() => setStage("login")} style={{ marginTop: 8, background: "none", border: "none", color: t.teal, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
            Back to sign in
          </button>
        </div>
      )}
      {stage === "app" && <AdminDashboard t={t} actor={actor} onLogout={handleLogout} />}
    </div>
  );
}