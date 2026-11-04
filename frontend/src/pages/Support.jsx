// Emergency / support: helplines, confidential counselor connect, trusted contact.
import React, { useEffect, useState } from "react";
import { HeartHandshake, PhoneCall, Users } from "lucide-react";
import { api } from "../api";
import { useApp } from "../lib/store";
import { HELPLINES } from "../lib/constants";
import { Button, Card, PageHeader } from "../components/ui";
import { ConnectModal, EarlyWarningBanner } from "../components/EarlyWarning";

const GROUNDING = [
  ["5", "things you can see"],
  ["4", "things you can touch"],
  ["3", "things you can hear"],
  ["2", "things you can smell"],
  ["1", "thing you can taste"],
];

export default function Support() {
  const { supportFlag, refreshSupport, toast } = useApp();
  const [connectOpen, setConnectOpen] = useState(false);
  const [contacts, setContacts] = useState(null);
  const [busy, setBusy] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    refreshSupport();
    api.listContacts().then(setContacts).catch(() => setContacts([]));
  }, [refreshSupport]);

  async function logHelpline() {
    // anonymous counter for the admin "resource utilisation" tile; best effort
    try { await api.emergencyAlert("helpline"); } catch { /* ignore */ }
  }

  async function alertContacts() {
    setBusy("trusted");
    setStatus("");
    try {
      const res = await api.emergencyAlert("trusted_contact");
      const msg = res.dry_run ? `${res.detail} (demo mode — no real SMS was sent)` : res.detail;
      setStatus(msg);
      toast(msg, { type: res.status === "skipped" ? "warn" : "ok" });
    } catch (e) {
      setStatus(e.message);
    } finally {
      setBusy("");
    }
  }

  const requested = supportFlag?.connect_requested;

  return (
    <>
      <PageHeader title="Support" subtitle="You don't have to go through this alone. Pick whatever feels easiest right now." />
      <div className="mg-stack">
        <Card tint="coral" glow>
          <div className="mg-row" style={{ flexWrap: "wrap", gap: 16 }}>
            <div className="mg-icon-tile coral" style={{ width: 52, height: 52 }}><PhoneCall size={24} /></div>
            <div className="mg-grow" style={{ minWidth: 200 }}>
              <div className="mg-h2">If you're in immediate danger</div>
              <p className="mg-muted mg-small">Call your local emergency number. For free, confidential emotional support, these lines are open now:</p>
            </div>
          </div>
          <div className="mg-grid mg-grid-3" style={{ marginTop: 16 }}>
            {HELPLINES.map((h) => (
              <a key={h.number} href={`tel:${h.number.replace(/[^0-9+]/g, "")}`} onClick={logHelpline} className="mg-card lift" style={{ textDecoration: "none", color: "var(--text)", padding: 14 }}>
                <div className="mg-small mg-muted">{h.name}</div>
                <div className="mg-h2" style={{ marginTop: 2 }}>{h.number}</div>
                <div className="mg-tiny" style={{ color: "var(--coral)", marginTop: 4 }}>Tap to call</div>
              </a>
            ))}
          </div>
        </Card>

        <EarlyWarningBanner />

        <div className="mg-grid mg-grid-2">
          <Card>
            <div className="mg-row" style={{ alignItems: "flex-start" }}>
              <div className="mg-icon-tile teal"><HeartHandshake size={20} /></div>
              <div className="mg-grow">
                <div className="mg-h3">Talk to a campus counselor</div>
                <p className="mg-muted mg-small" style={{ margin: "3px 0 12px" }}>
                  Confidential. You choose whether they see your name, and they never see what you wrote.
                </p>
                <Button variant="teal" icon={HeartHandshake} onClick={() => setConnectOpen(true)} disabled={requested}>
                  {requested ? "Request sent" : "Send a connect request"}
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <div className="mg-row" style={{ alignItems: "flex-start" }}>
              <div className="mg-icon-tile violet"><Users size={20} /></div>
              <div className="mg-grow">
                <div className="mg-h3">Reach your trusted contacts</div>
                <p className="mg-muted mg-small" style={{ margin: "3px 0 8px" }}>
                  {contacts === null ? "Loading…" : contacts.length
                    ? `We'll text ${contacts.map((c) => c.name).join(" and ")} to let them know you could use support.`
                    : "You haven't added a trusted contact yet."}
                </p>
                <Button variant="violet" loading={busy === "trusted"} onClick={alertContacts} disabled={!contacts?.length}>Alert trusted contact</Button>
                {status && <p className="mg-small mg-muted" style={{ marginTop: 8 }}>{status}</p>}
              </div>
            </div>
          </Card>
        </div>

        <Card>
          <div className="mg-h3" style={{ marginBottom: 4 }}>A 60-second grounding exercise</div>
          <p className="mg-muted mg-small" style={{ marginBottom: 12 }}>Slowly name, out loud or in your head:</p>
          <div className="mg-grid mg-grid-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
            {GROUNDING.map(([n, t]) => (
              <div key={n} className="mg-card" style={{ padding: 14, textAlign: "center", background: "var(--surface-2)" }}>
                <div className="mg-gradient-text" style={{ fontSize: 30, fontWeight: 800 }}>{n}</div>
                <div className="mg-small mg-muted">{t}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <ConnectModal open={connectOpen} onClose={() => setConnectOpen(false)} />
    </>
  );
}
