// Profile: who you are, your onboarding baseline (editable), privacy, data export, log out.
import React, { useState } from "react";
import { Check, Download, LogOut, Moon, Pencil, ShieldCheck, Sun, X } from "lucide-react";
import { api } from "../api";
import { useApp } from "../lib/store";
import { navigate } from "../lib/router";
import { COPING, GENRES, LANGUAGES, RECOVERY, TRIGGERS, YEARS, displayName } from "../lib/constants";
import { Button, Card, Modal, PageHeader } from "../components/ui";
import { BaselineWizard } from "./Onboarding";
import CustomPlaylist from "../components/CustomPlaylist";

const label = (list, key) => list.find((x) => x.key === key)?.label || key;

function Chips({ items, list }) {
  if (!items?.length) return <span className="mg-faint mg-small">Not set</span>;
  return <div className="mg-row-wrap" style={{ gap: 6 }}>{items.map((k) => <span key={k} className="mg-badge violet">{label(list, k)}</span>)}</div>;
}

function csvEscape(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function Row({ label, value, capitalize }) {
  return (
    <div className="mg-row mg-between" style={{ gap: 12, alignItems: "baseline" }}>
      <span className="mg-tiny mg-faint">{label}</span>
      <span className="mg-small" style={{ textAlign: "right", textTransform: capitalize ? "capitalize" : undefined, wordBreak: "break-word" }}>
        {value || <span className="mg-faint">Not set</span>}
      </span>
    </div>
  );
}

function DetailInput({ id, label, value, onChange, ...rest }) {
  return (
    <div>
      <label className="mg-label" htmlFor={id}>{label}</label>
      <input id={id} className="mg-input" value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
    </div>
  );
}

function ReadOnly({ label, value, note }) {
  return (
    <div>
      <div className="mg-label">{label}</div>
      <div className="mg-input" style={{ opacity: 0.7 }} aria-readonly="true">{value}</div>
      {note && <div className="mg-hint">{note}</div>}
    </div>
  );
}

export default function Profile() {
  const { user, setUser, theme, toggleTheme, signOut, toast } = useApp();
  const [editing, setEditing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  async function saveBaseline({ baseline, music }) {
    const updated = await api.saveOnboarding({ baseline, music });
    setUser(updated);
    setEditing(false);
    toast("Your profile is updated — scores and suggestions will use it from now on.");
  }

  const startEditDetails = () => {
    const pc = user.peer_contact || {};
    setDraft({
      name: user.name || "", preferred_name: user.preferred_name || "", institution: user.institution || "",
      department: user.department || "", year_of_study: user.year_of_study || "", checkin_time: user.checkin_time || "",
      privacy_consent: !!user.privacy_consent, crisis_consent: !!user.crisis_consent,
      peer_name: pc.full_name || "", peer_relationship: pc.relationship || "", peer_phone: pc.phone_number || "", peer_email: pc.email || "",
    });
    setFormError("");
    setEditingDetails(true);
  };
  const cancelEditDetails = () => { setEditingDetails(false); setDraft(null); setFormError(""); };
  const setD = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }));

  async function saveDetails() {
    const d = draft;
    if (d.name.trim().length < 2) { setFormError("Please enter your full name."); return; }
    if (!d.institution.trim()) { setFormError("Please enter your institution."); return; }
    if (d.peer_name.trim() && !d.peer_phone.trim()) { setFormError("Add a phone number for your trusted person, or clear their name."); return; }
    if (d.peer_phone.trim() && !d.peer_name.trim()) { setFormError("Add a name for your trusted person, or clear their phone number."); return; }
    setSaving(true);
    setFormError("");
    try {
      const updated = await api.saveProfile({
        name: d.name.trim(), preferred_name: d.preferred_name, institution: d.institution, department: d.department,
        year_of_study: d.year_of_study, checkin_time: d.checkin_time,
        privacy_consent: d.privacy_consent, crisis_consent: d.crisis_consent,
        peer_contact: { full_name: d.peer_name, relationship: d.peer_relationship, phone_number: d.peer_phone, email: d.peer_email },
      });
      setUser(updated);
      cancelEditDetails();
      toast("Your details are saved.");
    } catch (e) {
      setFormError(e.message);
    } finally {
      setSaving(false);
    }
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
      <PageHeader title="Profile" subtitle="Your answers below help Mind Guard understand your entries fairly — you can change them any time." />
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
              <div className="mg-h3">Your answers</div>
              <Button variant="ghost" size="sm" icon={Pencil} onClick={() => setEditing(true)}>Edit</Button>
            </div>
            <div><div className="mg-tiny mg-faint" style={{ marginBottom: 6 }}>Triggers</div><Chips items={b.triggers} list={TRIGGERS} /></div>
            <div><div className="mg-tiny mg-faint" style={{ marginBottom: 6 }}>Usual recovery time</div>
              {b.recovery ? <span className="mg-badge mild">{label(RECOVERY, b.recovery)}</span> : <span className="mg-faint mg-small">Not set</span>}</div>
            <div><div className="mg-tiny mg-faint" style={{ marginBottom: 6 }}>What helps me calm down</div><Chips items={b.coping} list={COPING} /></div>
            <hr className="mg-divider" />
            <div><div className="mg-tiny mg-faint" style={{ marginBottom: 6 }}>Music genres</div><Chips items={m.genres} list={GENRES} /></div>
            <div><div className="mg-tiny mg-faint" style={{ marginBottom: 6 }}>Languages</div><Chips items={m.languages} list={LANGUAGES} /></div>
            {Object.keys(m.playlists || {}).length > 0 && (
              <div><div className="mg-tiny mg-faint" style={{ marginBottom: 6 }}>My playlists</div>
                <div className="mg-row-wrap" style={{ gap: 6 }}>{Object.keys(m.playlists).map((k) => <span key={k} className="mg-badge calm">{k}</span>)}</div></div>
            )}
          </Card>

          <Card className="mg-stack">
            <div className="mg-row mg-between">
              <div className="mg-h3">Your details</div>
              {editingDetails ? (
                <div className="mg-row">
                  <Button variant="quiet" size="sm" icon={X} onClick={cancelEditDetails} disabled={saving}>Cancel</Button>
                  <Button variant="violet" size="sm" icon={Check} loading={saving} onClick={saveDetails}>Save Changes</Button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" icon={Pencil} onClick={startEditDetails}>Edit Profile</Button>
              )}
            </div>
            {editingDetails && draft ? (
              <div className="mg-stack">
                <DetailInput id="pf-name" label="Full name" value={draft.name} onChange={setD("name")} autoComplete="name" />
                <ReadOnly label="Email" value={user.email} note="Can't be changed" />
                <ReadOnly label="Account type" value="Student" />
                <DetailInput id="pf-pref" label="Preferred name" value={draft.preferred_name} onChange={setD("preferred_name")} />
                <DetailInput id="pf-inst" label="Institution" value={draft.institution} onChange={setD("institution")} />
                <DetailInput id="pf-dept" label="Department / major" value={draft.department} onChange={setD("department")} />
                <div>
                  <label className="mg-label" htmlFor="pf-year">Year of study</label>
                  <select id="pf-year" className="mg-select" value={draft.year_of_study} onChange={(e) => setD("year_of_study")(e.target.value)}>
                    <option value="">Prefer not to say</option>
                    {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <div className="mg-label">Preferred check-in time</div>
                  <div className="mg-row-wrap">
                    {["morning", "evening"].map((t) => (
                      <button key={t} type="button" className={`mg-chip ${draft.checkin_time === t ? "on" : ""}`} style={{ textTransform: "capitalize" }}
                        onClick={() => setD("checkin_time")(draft.checkin_time === t ? "" : t)}>{t}</button>
                    ))}
                  </div>
                </div>
                <hr className="mg-divider" />
                <div className="mg-label" style={{ marginBottom: 0 }}>Trusted person</div>
                <DetailInput id="pf-pname" label="Name" value={draft.peer_name} onChange={setD("peer_name")} />
                <DetailInput id="pf-prel" label="Relationship" value={draft.peer_relationship} onChange={setD("peer_relationship")} />
                <DetailInput id="pf-pphone" label="Phone" type="tel" value={draft.peer_phone} onChange={setD("peer_phone")} />
                <DetailInput id="pf-pmail" label="Email (optional)" type="email" value={draft.peer_email} onChange={setD("peer_email")} />
                <hr className="mg-divider" />
                <label className="mg-check-row">
                  <input type="checkbox" checked={draft.privacy_consent} onChange={(e) => setD("privacy_consent")(e.target.checked)} />
                  <span>My journal entries are private and used only to support my wellbeing.</span>
                </label>
                <label className="mg-check-row">
                  <input type="checkbox" checked={draft.crisis_consent} onChange={(e) => setD("crisis_consent")(e.target.checked)} />
                  <span>If I'm in serious distress, Mind Guard may reach out to a counselor or my trusted person.</span>
                </label>
                {formError && <div className="mg-form-error" role="alert">{formError}</div>}
              </div>
            ) : (
              <div className="mg-stack-sm">
                <Row label="Full name" value={user.name} />
                <Row label="Email" value={user.email} />
                <Row label="Account type" value="Student" />
                <Row label="Preferred name" value={user.preferred_name} />
                <Row label="Institution" value={user.institution} />
                <Row label="Department / major" value={user.department} />
                <Row label="Year of study" value={user.year_of_study} />
                <Row label="Preferred check-in time" value={user.checkin_time} capitalize />
                <Row label="Trusted person" value={user.peer_contact ? [user.peer_contact.full_name, user.peer_contact.relationship && `(${user.peer_contact.relationship})`].filter(Boolean).join(" ") : null} />
                <Row label="Trusted person's phone" value={user.peer_contact?.phone_number} />
                <Row label="Trusted person's email" value={user.peer_contact?.email} />
                <Row label="Journal privacy agreed" value={user.privacy_consent ? "Yes" : "No"} />
                <Row label="Reach out if I'm in distress" value={user.crisis_consent ? "Yes" : "No"} />
                <Row label="Member since" value={user.created_at ? new Date(user.created_at).toLocaleDateString() : null} />
              </div>
            )}
          </Card>

          <Card className="mg-stack"><CustomPlaylist /></Card>

          <Card className="mg-stack">
            <div className="mg-row"><ShieldCheck size={18} style={{ color: "var(--teal)" }} /><div className="mg-h3">Privacy</div></div>
            <ul className="mg-small mg-muted" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
              <li>Counselors see you only as an anonymous ID with scores and trends — never your words.</li>
              <li>Your name is shared only if you choose to when you ask to talk to a counselor.</li>
              <li>Campus-wide statistics are grouped so no individual can be picked out.</li>
            </ul>
            <div><Button variant="ghost" size="sm" icon={Download} loading={exporting} onClick={exportData}>Download my data (CSV)</Button></div>
          </Card>
        </div>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit your answers" width={560}>
        <BaselineWizard initialBaseline={b} initialMusic={m} submitLabel="Save changes" onSubmit={saveBaseline} onCancel={() => setEditing(false)} />
      </Modal>
    </>
  );
}
