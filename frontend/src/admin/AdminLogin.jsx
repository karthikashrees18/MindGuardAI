import React, { useState } from "react";
import { ShieldCheck, Sparkles } from "lucide-react";
import { Button, Field } from "../components/ui";

export default function AdminLogin({ onLogin, onDemoLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const [demoOffered, setDemoOffered] = useState(true); // hidden if the backend reports demo mode off

  async function submit(e) {
    e?.preventDefault();
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

  async function demo() {
    setError("");
    setDemoBusy(true);
    try {
      await onDemoLogin();
    } catch (err) {
      if (err.status === 404) setDemoOffered(false);
      else setError(err.message || "Demo login failed — is the backend running?");
    } finally {
      setDemoBusy(false);
    }
  }

  return (
    <div className="mg-center-page">
      <div className="mg-glass-panel mg-fade-up" style={{ width: "100%", maxWidth: 400 }}>
        <div className="mg-stack-sm" style={{ alignItems: "center", marginBottom: 20, textAlign: "center" }}>
          <div className="mg-hero-orb" style={{ width: 60, height: 60, borderRadius: 19 }}>
            <ShieldCheck size={28} color="#fff" />
          </div>
          <div className="mg-h2">Mind Guard AI</div>
          <div className="mg-small mg-muted">Counselor portal and cohort analytics</div>
        </div>

        <form className="mg-stack-sm" onSubmit={submit}>
          <Field label="Work email">
            <input className="mg-input" type="email" autoComplete="username" placeholder="you@university.edu" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password" error={error}>
            <input className="mg-input" type="password" autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Button type="submit" block loading={busy}>Sign in</Button>
        </form>

        {demoOffered && (
          <div style={{ marginTop: 14 }}>
            <Button variant="ghost" block icon={Sparkles} loading={demoBusy} onClick={demo} type="button">
              Use demo counselor login
            </Button>
            <div className="mg-tiny mg-faint" style={{ textAlign: "center", marginTop: 8 }}>
              Seeded account: counselor@mindguard.ai / Counselor@123
            </div>
          </div>
        )}

        <div className="mg-tiny mg-faint" style={{ textAlign: "center", marginTop: 18, lineHeight: 1.5 }}>
          Access is restricted to counselor and admin accounts. Student accounts cannot sign in here.
        </div>
      </div>
    </div>
  );
}
