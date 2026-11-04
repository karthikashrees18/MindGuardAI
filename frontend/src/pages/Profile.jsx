// Profile: who you are, your onboarding baseline (editable), privacy, data export, log out.
import React, { useState } from "react";
import { Download, LogOut, Moon, Pencil, ShieldCheck, Sun } from "lucide-react";
import { api } from "../api";
import { useApp } from "../lib/store";
import { navigate } from "../lib/router";
import { COPING, GENRES, LANGUAGES, RECOVERY, TRIGGERS, displayName } from "../lib/constants";
import { Button, Card, Modal, PageHeader } from "../components/ui";
import { BaselineWizard } from "./Onboarding";

const label = (list, key) => list.find((x) => x.key === key)?.label || key;

function Chips({ items, list }) {
  if (!items?.length) return <span className="mg-faint mg-small">Not set</span>;
  return <div className="mg-row-wrap" style={{ gap: 6 }}>{items.map((k) => <span key={k} className="mg-badge violet">{label(list, k)}</span>)}</div>;
}

function csvEscape(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function Profile() {
  const { user, setUser, theme, toggleTheme, signOut, toast } = useApp();
  const [editing, setEditing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [timeBusy, setTimeBusy] = useState(false);

  async function saveBaseline({ baseline, music }) {
    const updated = await api.saveOnboarding({ baseline, music });
    setUser(updated);
    setEditing(false);
    toast("Your profile is updated — scores and suggestions will use it from now on.");
  }

  async function setCheckinTime(t) {
    setTimeBusy(true);
    try { setUser(await api.saveOnboarding({ checkin_time: t })); } catch (e) { toast(e.message, { type: "error" }); } finally { setTimeBusy(false); }
  }

  async function exportData() {
    setExporting(true);
    try {
      const rows = await api.listJournals(200);
      const header = "date,mood,score,category,stress_slider,text";
      const lines = rows.map((r) => [r.created_at, r.mood_label || r.mood, r.rumination_score, r.category, r.stress_level, r.text].map(csvEscape).join(","));
      const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "mind-guard-my-data.csv";
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      toast(e.message, { type: "error" });
    } finally {
      setExporting(false);
    }
  }

  const b = user.baseline || {};
  const m = user.music || {};
  const initials = (user.name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <>
      <PageHeader title="Profile" subtitle="Your baseline helps Mind Guard read your entries fairly — you can change it any time." />
      <div className="mg-grid mg-grid-main-r" style={{ alignItems: "start" }}>
        <Card className="mg-stack" style={{ alignItems: "center", textAlign: "center" }}>
          <div className="mg-hero-orb" style={{ width: 78, height: 78, borderRadius: 24, fontSize: 26, fontWeight: 800, animation: "none" }}>{initials}</div>
          <div>
            <div className="mg-h2">{displayName(user)}{user.preferred_name && user.name !== user.preferred_name ? <span className="mg-faint" style={{ fontWeight: 500 }}> · {user.name}</span> : null}</div>
            <div className="mg-muted mg-small">{user.email}</div>
            {user.institution && <div className="mg-faint mg-small">{user.institution}</div>}
          </div>
          <div className="mg-row-wrap" style={{ justifyContent: "center" }}>
            <Button variant="ghost" size="sm" icon={theme === "dark" ? Sun : Moon} onClick={toggleTheme}>{theme === "dark" ? "Light mode" : "Dark mode"}</Button>
            <Button variant="coral" size="sm" icon={LogOut} onClick={() => { signOut(); navigate("/"); }}>Log out</Button>
          </div>
        </Card>

        <div className="mg-stack">
          <Card className="mg-stack">
            <div className="mg-row mg-between">
              <div className="mg-h3">Your baseline</div>
              <Button variant="ghost" size="sm" icon={Pencil} onClick={() => setEditing(true)}>Edit</Button>
            </div>
            <div><div className="mg-tiny mg-faint" style={{ marginBottom: 6 }}>Triggers</div><Chips items={b.triggers} list={TRIGGERS} /></div>
            <div><div className="mg-tiny mg-faint" style={{ marginBottom: 6 }}>Usual recovery time</div>
              {b.recovery ? <span className="mg-badge mild">{label(RECOVERY, b.recovery)}</span> : <span className="mg-faint mg-small">Not set</span>}</div>
            <div><div className="mg-tiny mg-faint" style={{ marginBottom: 6 }}>What helps me ground</div><Chips items={b.coping} list={COPING} /></div>
            <hr className="mg-divider" />
            <div><div className="mg-tiny mg-faint" style={{ marginBottom: 6 }}>Music genres</div><Chips items={m.genres} list={GENRES} /></div>
            <div><div className="mg-tiny mg-faint" style={{ marginBottom: 6 }}>Languages</div><Chips items={m.languages} list={LANGUAGES} /></div>
            {Object.keys(m.playlists || {}).length > 0 && (
              <div><div className="mg-tiny mg-faint" style={{ marginBottom: 6 }}>My playlists</div>
                <div className="mg-row-wrap" style={{ gap: 6 }}>{Object.keys(m.playlists).map((k) => <span key={k} className="mg-badge calm">{k}</span>)}</div></div>
            )}
          </Card>

          <Card className="mg-stack">
            <div className="mg-h3">Check-in reminder</div>
            <div className="mg-row-wrap">
              {["morning", "evening"].map((t) => (
                <button key={t} className={`mg-chip ${user.checkin_time === t ? "on" : ""}`} onClick={() => setCheckinTime(t)} disabled={timeBusy} style={{ textTransform: "capitalize" }}>{t}</button>
              ))}
            </div>
          </Card>

          <Card className="mg-stack">
            <div className="mg-row"><ShieldCheck size={18} style={{ color: "var(--teal)" }} /><div className="mg-h3">Privacy</div></div>
            <ul className="mg-small mg-muted" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
              <li>Counselors see you only as an anonymous ID with scores and trends — never your words.</li>
              <li>Your name is shared only if you choose to when you send a connect request.</li>
              <li>Campus-wide statistics are grouped so no individual can be picked out.</li>
            </ul>
            <div><Button variant="ghost" size="sm" icon={Download} loading={exporting} onClick={exportData}>Download my data (CSV)</Button></div>
          </Card>
        </div>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit your baseline" width={560}>
        <BaselineWizard initialBaseline={b} initialMusic={m} submitLabel="Save changes" onSubmit={saveBaseline} onCancel={() => setEditing(false)} />
      </Modal>
    </>
  );
}
