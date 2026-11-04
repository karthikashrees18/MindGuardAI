// Early-warning UI: the gentle in-app prompt, the 1-click confidential counselor
// connect request, and the status card showing counselor follow-ups.
//
//   <EarlyWarningBanner />   zero props — reads/writes the shared supportFlag in the store
//   <ConnectModal open onClose />   customise what is shared before sending
import React, { useState } from "react";
import { CalendarClock, HeartHandshake, Lock, MessageCircle, Phone, Mail, ShieldCheck } from "lucide-react";
import { api } from "../api";
import { useApp } from "../lib/store";
import { Button, Card, Field, Modal } from "./ui";

const CHANNELS = [
  { key: "in_app", label: "In-app message", icon: MessageCircle, hint: "Replies appear here" },
  { key: "email", label: "Email", icon: Mail, hint: "Counselor emails you" },
  { key: "phone", label: "Phone call", icon: Phone, hint: "Counselor calls you" },
];

export function ConnectModal({ open, onClose }) {
  const { setSupportFlag, toast } = useApp();
  const [channel, setChannel] = useState("in_app");
  const [share, setShare] = useState(false);
  const [detail, setDetail] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const needsDetail = share && channel !== "in_app";

  async function send() {
    if (needsDetail && !detail.trim()) {
      setError(channel === "email" ? "Add the email address to use." : "Add the phone number to use.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await api.supportConnect({
        channel,
        share_identity: share,
        contact_detail: needsDetail ? detail.trim() : null,
        note: note.trim() || null,
      });
      setSupportFlag(res.flag);
      toast(res.message, { type: "ok", ms: 6000 });
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Talk to a campus counselor"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="teal" loading={busy} onClick={send} icon={HeartHandshake}>Send confidential request</Button>
        </>
      }
    >
      <div className="mg-stack">
        <div className="mg-row" style={{ alignItems: "flex-start", background: "var(--teal-soft)", borderRadius: 14, padding: 12 }}>
          <Lock size={16} style={{ color: "var(--teal)", flexShrink: 0, marginTop: 2 }} />
          <p className="mg-small mg-muted">
            You're in control. Unless you tick the box below, the counselor sees you only as an anonymous
            ID — never your name, and never what you wrote.
          </p>
        </div>

        <Field label="How would you like to be reached?">
          <div className="mg-row-wrap">
            {CHANNELS.map(({ key, label, icon: Icon }) => (
              <button key={key} type="button" className={`mg-chip ${channel === key ? "on" : ""}`} onClick={() => setChannel(key)}>
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>
        </Field>

        <label className="mg-row" style={{ cursor: "pointer", alignItems: "flex-start" }}>
          <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} style={{ marginTop: 3, accentColor: "var(--violet)" }} />
          <span className="mg-small">
            <b>Share my name and contact detail</b> so the counselor can reach me directly.
            <span className="mg-faint"> (Optional — you can stay anonymous and use in-app messages.)</span>
          </span>
        </label>

        {needsDetail && (
          <Field label={channel === "email" ? "Email to use" : "Phone number to use"}>
            <input className="mg-input" value={detail} onChange={(e) => setDetail(e.target.value)}
              placeholder={channel === "email" ? "you@university.edu" : "+91 …"} inputMode={channel === "email" ? "email" : "tel"} />
          </Field>
        )}

        <Field label="Anything you'd like them to know? (optional)">
          <textarea className="mg-textarea" style={{ minHeight: 84 }} maxLength={500} value={note}
            onChange={(e) => setNote(e.target.value)} placeholder="A sentence or two is plenty." />
        </Field>
        {error && <div className="mg-error" role="alert">{error}</div>}
      </div>
    </Modal>
  );
}

function fmtWhen(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function EarlyWarningBanner() {
  const { supportFlag, setSupportFlag, toast } = useApp();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState("");

  if (!supportFlag) return null;

  async function quickConnect() {
    setBusy("connect");
    try {
      const res = await api.supportConnect({ channel: "in_app", share_identity: false });
      setSupportFlag(res.flag);
      toast(res.message, { ms: 6000 });
    } catch (e) {
      toast(e.message, { type: "error" });
    } finally {
      setBusy("");
    }
  }

  async function snooze() {
    setBusy("dismiss");
    try {
      const res = await api.supportDismiss();
      setSupportFlag(res.flag);
    } catch (e) {
      toast(e.message, { type: "error" });
    } finally {
      setBusy("");
    }
  }

  if (supportFlag.connect_requested) {
    const updates = supportFlag.counselor_updates || [];
    return (
      <Card tint="teal" className="mg-fade-up">
        <div className="mg-row" style={{ alignItems: "flex-start" }}>
          <div className="mg-icon-tile teal"><ShieldCheck size={20} /></div>
          <div className="mg-grow">
            <div className="mg-h3">Your confidential request is with the counselor</div>
            <p className="mg-muted mg-small" style={{ marginTop: 3 }}>
              {updates.length ? "They've left you an update:" : "You'll hear back here — keep using the app in the meantime."}
            </p>
            {updates.map((u, i) => (
              <div key={i} className="mg-row" style={{ marginTop: 10, background: "var(--surface-2)", borderRadius: 12, padding: "10px 12px", alignItems: "flex-start" }}>
                {u.type === "schedule" ? <CalendarClock size={16} style={{ color: "var(--teal)", flexShrink: 0, marginTop: 2 }} /> : <MessageCircle size={16} style={{ color: "var(--lavender)", flexShrink: 0, marginTop: 2 }} />}
                <div>
                  <div className="mg-small"><b>{u.type === "schedule" ? `Session scheduled · ${fmtWhen(u.scheduled_for)}` : "Message from your counselor"}</b></div>
                  {u.note && <div className="mg-small mg-muted">“{u.note}”</div>}
                  <div className="mg-tiny mg-faint">{u.by}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (!supportFlag.show_prompt) return null;
  const critical = supportFlag.severity === "critical";
  return (
    <>
      <Card tint="coral" className="mg-fade-up">
        <div className="mg-row" style={{ alignItems: "flex-start" }}>
          <div className="mg-icon-tile coral"><HeartHandshake size={20} /></div>
          <div className="mg-grow">
            <div className="mg-h3">{critical ? "This feels like a lot right now — you don't have to carry it alone" : "Things have felt heavy for a few days"}</div>
            <p className="mg-muted mg-small" style={{ marginTop: 4 }}>
              A campus counselor can check in with you, completely confidentially. One tap sends a request —
              they won't see your name or anything you wrote unless you choose to share it.
            </p>
            <div className="mg-row-wrap" style={{ marginTop: 14 }}>
              <Button variant="coral" loading={busy === "connect"} onClick={quickConnect} icon={HeartHandshake} className="pulse">
                Connect with a counselor
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>Choose what's shared</Button>
              <Button variant="quiet" size="sm" loading={busy === "dismiss"} onClick={snooze}>Not now</Button>
            </div>
          </div>
        </div>
      </Card>
      <ConnectModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
