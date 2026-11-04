import React, { useEffect, useRef, useState } from "react";
import { Clapperboard, Lightbulb, RotateCcw, ShieldCheck, UserRound, X } from "lucide-react";
import { api } from "../api";
import { useApp } from "../lib/store";
import { navigate } from "../lib/router";
import { Card } from "./ui";
import "../styles/auth.css";

function activeKey(user) {
  const email = user?.email || "";
  if (email.startsWith("aarav.demo")) return "high";
  if (email.startsWith("meera.demo")) return "calm";
  return null;
}

export default function DemoDock() {
  const { user, demoSignIn, demoReset, openCounselorPortal, toast } = useApp();
  const [personas, setPersonas] = useState(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    let alive = true;
    api.demoPersonas()
      .then((res) => { if (alive) setPersonas(res?.personas || []); })
      .catch(() => { if (alive) setPersonas(null); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!personas || !personas.length) return null;

  const students = personas.filter((p) => p.role === "student");
  const counselors = personas.filter((p) => p.role === "counselor");
  const current = activeKey(user);
  const currentPersona = students.find((p) => p.key === current);

  const run = async (id, fn) => {
    if (busy) return;
    setBusy(id);
    try { await fn(); } catch (e) { toast(e?.message || "Demo action failed", { type: "error" }); } finally { setBusy(""); }
  };

  const signInAs = (p) => run(p.key, async () => {
    await demoSignIn(p.key);
    navigate("/home");
    toast(`Signed in as ${p.name || p.label}`);
    setOpen(false);
  });

  const reset = () => run("reset", async () => {
    await demoReset(currentPersona.key);
    navigate("/home");
    toast(`${currentPersona.label.split(" — ")[0]} reset to pre-demo state`);
    setOpen(false);
  });

  return (
    <div className="mg-demo-dock" ref={ref}>
      {open && (
        <Card className="mg-demo-panel" role="dialog" aria-label="Presentation mode">
          <div className="mg-row mg-between" style={{ marginBottom: 12 }}>
            <h3 className="mg-h3">Presentation mode</h3>
            <button type="button" className="mg-btn quiet" style={{ padding: 4 }} onClick={() => setOpen(false)} aria-label="Close"><X size={16} /></button>
          </div>
          <div className="mg-stack" style={{ gap: 8 }}>
            {students.map((p) => (
              <button key={p.key} type="button" className={`mg-demo-row ${current === p.key ? "active" : ""}`}
                onClick={() => signInAs(p)} disabled={!!busy} aria-pressed={current === p.key}>
                <span className="mg-icon-tile violet" style={{ width: 34, height: 34 }}><UserRound size={16} /></span>
                <span style={{ flex: 1 }}>
                  <b>{p.label}</b>
                  <span className="sub">{p.tagline}</span>
                </span>
                {busy === p.key && <span className="mg-spinner" />}
              </button>
            ))}
            {counselors.map((p) => (
              <button key={p.key} type="button" className="mg-demo-row" disabled={!!busy}
                onClick={() => run(p.key, async () => { await openCounselorPortal(); setOpen(false); })}>
                <span className="mg-icon-tile teal" style={{ width: 34, height: 34 }}><ShieldCheck size={16} /></span>
                <span style={{ flex: 1 }}>
                  <b>Open counselor portal</b>
                  <span className="sub">{p.name} - {p.tagline}</span>
                </span>
                {busy === p.key && <span className="mg-spinner" />}
              </button>
            ))}
            {currentPersona && (
              <button type="button" className="mg-btn ghost sm block" onClick={reset} disabled={!!busy}>
                {busy === "reset" ? <span className="mg-spinner" /> : <RotateCcw size={14} />}
                Reset {currentPersona.label.split(" — ")[0]} to pre-demo state
              </button>
            )}
          </div>
          <p className="mg-faint mg-small" style={{ marginTop: 12, display: "flex", gap: 6 }}>
            <Lightbulb size={13} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>Tip: on the Check-in page, use "Load sample entry" for a quick live demo.</span>
          </p>
        </Card>
      )}
      <button type="button" className="mg-btn ghost sm" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Presentation mode">
        <Clapperboard size={15} /> Demo
      </button>
    </div>
  );
}
