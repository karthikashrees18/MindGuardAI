import React, { useState } from "react";
import { X, Send, Megaphone } from "lucide-react";
import { Card, GhostButton, PrimaryButton, inputStyle } from "../theme";

const TARGET_PRESETS = ["All Students", "1st Year Students", "2nd Year Students", "3rd Year Students", "4th Year Students", "CSE Department", "ISE Department", "ECE Department"];

export default function BroadcastModal({ t, onClose, onSubmit }) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetGroup, setTargetGroup] = useState(TARGET_PRESETS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!title.trim() || !message.trim()) {
      setError("Please add a title and a message.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      await onSubmit({ title: title.trim(), message: message.trim(), target_group: targetGroup });
    } catch (err) {
      setError(err.message || "Couldn't publish the broadcast.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 40, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 480 }}>
        <Card t={t} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: t.lavenderSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Megaphone size={16} color={t.lavenderDeep} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: t.textPrimary }}>Publish a wellness broadcast</div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: t.textFaint, cursor: "pointer" }}>
              <X size={18} />
            </button>
          </div>

          <div style={{ fontSize: 11.5, color: t.textSecondary, lineHeight: 1.5, background: t.tealSoft, borderRadius: 10, padding: 10 }}>
            This is a non-targeted, anonymized nudge — it goes out to whoever matches the group you pick below.
            You never select or see individual students here.
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary, marginBottom: 6 }}>Target group</div>
            <select value={targetGroup} onChange={(e) => setTargetGroup(e.target.value)} style={inputStyle(t)}>
              {TARGET_PRESETS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary, marginBottom: 6 }}>Title</div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Upcoming Exam Stress Management Workshop" style={inputStyle(t)} />
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: t.textSecondary, marginBottom: 6 }}>Message</div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Join us Thursday 5pm for a guided session on managing exam stress..."
              style={{ ...inputStyle(t), minHeight: 100, resize: "vertical" }}
            />
          </div>

          {error && <div style={{ fontSize: 11.5, color: t.coralDeep }}>{error}</div>}

          <div style={{ display: "flex", gap: 10 }}>
            <GhostButton t={t} onClick={onClose} style={{ flex: 1 }}>Cancel</GhostButton>
            <PrimaryButton grad={t.lavenderGrad} shadowColor="rgba(179,157,219,0.4)" onClick={submit} disabled={busy} style={{ flex: 1 }}>
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Send size={14} /> {busy ? "Publishing…" : "Publish broadcast"}
              </span>
            </PrimaryButton>
          </div>
        </Card>
      </div>
    </div>
  );
}