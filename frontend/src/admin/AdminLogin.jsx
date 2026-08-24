import React, { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { PrimaryButton, inputStyle } from "./theme";

export default function AdminLogin({ t, onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError("");
    setBusy(true);
    try {
      await onLogin(email.trim(), password);
    } catch (err) {
      setError(err.message || "Something went wrong — is the backend running?");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: t.heroGrad, padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 380, background: t.surface, borderRadius: 20, padding: 32, boxShadow: t.shadow }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 22 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: t.tealGrad, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ShieldCheck size={26} color="#fff" />
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: t.textPrimary }}>Mind Guard AI</div>
          <div style={{ fontSize: 12.5, color: t.textSecondary, textAlign: "center" }}>Admin & Counselor Analytics Dashboard</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            placeholder="Work email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle(t)}
            aria-label="Email"
          />
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            style={inputStyle(t)}
            aria-label="Password"
          />
          {error && <div style={{ fontSize: 11.5, color: t.coralDeep }}>{error}</div>}
          <PrimaryButton grad={t.tealGrad} shadowColor="rgba(77,182,172,0.35)" onClick={submit} disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </PrimaryButton>
        </div>

        <div style={{ fontSize: 11, color: t.textFaint, textAlign: "center", marginTop: 18, lineHeight: 1.5 }}>
          Access is restricted to counselor and admin accounts. Student accounts cannot sign in here.
        </div>
      </div>
    </div>
  );
}