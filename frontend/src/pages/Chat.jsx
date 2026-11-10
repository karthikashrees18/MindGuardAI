// AI companion chat. Every message is scored by the same two-engine pipeline
// as check-ins, so the live wellness signal here matches the rest of the app.
import React, { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Send } from "lucide-react";
import { api } from "../api";
import { useApp } from "../lib/store";
import { useDictation } from "../lib/dictation";
import { navigate } from "../lib/router";
import { Button, CategoryBadge, Card, PageHeader, ScoreRing, Sparkline } from "../components/ui";
import { EarlyWarningBanner } from "../components/EarlyWarning";
import InterventionCards from "../components/Interventions";

const STARTERS = [
  "I can't stop thinking about my exam",
  "I feel behind on everything",
  "Today was actually a good day",
];

export default function Chat() {
  const { user, setSupportFlag, refreshGarden } = useApp();
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi, I'm here to check in with you. How are you feeling today?" },
  ]);
  const [history, setHistory] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [signal, setSignal] = useState(null);   // last AnalysisResult
  const [scores, setScores] = useState([]);
  const [cards, setCards] = useState([]);
  const endRef = useRef(null);
  const dictation = useDictation((spoken) => setDraft((d) => (d ? d.replace(/\s*$/, " ") : "") + spoken));

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, loading]);

  async function send(raw) {
    const text = raw.trim();
    if (!text || loading) return;
    if (dictation.listening) dictation.stop();
    setError("");
    setMessages((m) => [...m, { role: "user", text }]);
    setDraft("");
    setLoading(true);
    try {
      const res = await api.chat(history, text);
      if (res.llm_error) {
        // The server couldn't get an AI answer. Show the notice, but keep it out of the
        // conversation history so the model never sees (or echoes) its own error text.
        setMessages((m) => [...m, { role: "assistant", text: res.reply, notice: true }]);
      } else {
        setHistory((h) => [...h, { role: "user", content: text }, { role: "assistant", content: res.reply }]);
        setMessages((m) => [...m, { role: "assistant", text: res.reply }]);
      }
      setSignal(res);
      setScores((s) => [...s.slice(-11), res.rumination_score]);
      setCards((res.interventions || []).filter((c) => ["music", "breathing", "counselor"].includes(c.type)).slice(0, 2));
      if (res.early_warning) { api.supportStatus().then((s) => setSupportFlag(s.flag)).catch(() => {}); }
      refreshGarden();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const cat = signal?.category?.key;

  return (
    <>
      <PageHeader title="AI companion" subtitle="Talk it through. Your companion reads mood and overthinking as you chat." />
      <div className="mg-grid mg-grid-main" style={{ alignItems: "start" }}>
        <Card flush style={{ display: "flex", flexDirection: "column", height: "min(680px, calc(100vh - 190px))", minHeight: 460 }}>
          <div className="mg-scroll" style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 10 }} aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={`mg-bubble ${m.role === "user" ? "user" : "ai"}`} style={m.notice ? { fontStyle: "italic", opacity: 0.85 } : undefined}>{m.text}</div>
            ))}
            {loading && <div className="mg-bubble ai"><span className="mg-typing" aria-label="Typing"><i /><i /><i /></span></div>}
            {error && <div className="mg-error" role="alert">{error}</div>}
            <div ref={endRef} />
          </div>

          {messages.length === 1 && (
            <div className="mg-row-wrap" style={{ padding: "0 16px 10px" }}>
              {STARTERS.map((s) => <button key={s} className="mg-chip" onClick={() => send(s)}>{s}</button>)}
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); send(draft); }} style={{ padding: 14, borderTop: "1px solid var(--border)" }}>
            <div className="mg-row">
              <input className="mg-input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type a message…" aria-label="Message" disabled={loading} maxLength={2000} />
              {dictation.supported && (
                <Button type="button" variant="ghost" onClick={dictation.listening ? dictation.stop : dictation.start} aria-label={dictation.listening ? "Stop voice input" : "Start voice input"} style={{ padding: 12 }}>
                  {dictation.listening ? <MicOff size={17} /> : <Mic size={17} />}
                </Button>
              )}
              <Button type="submit" variant="teal" disabled={!draft.trim()} loading={loading} aria-label="Send" style={{ padding: 12 }}>
                {!loading && <Send size={17} />}
              </Button>
            </div>
          </form>
        </Card>

        <div className="mg-stack">
          <EarlyWarningBanner />
          <Card>
            <div className="mg-h3" style={{ marginBottom: 12 }}>Live wellness signal</div>
            {!signal ? (
              <p className="mg-muted mg-small">Say something to get started — your score updates with every message.</p>
            ) : (
              <>
                <div className="mg-row" style={{ gap: 16 }}>
                  <ScoreRing score={signal.rumination_score} size={104} stroke={9} label="SCORE" />
                  <div>
                    <CategoryBadge category={cat} />
                    <div className="mg-small mg-muted" style={{ marginTop: 8 }}>Mood: <b style={{ color: "var(--text)" }}>{signal.mood}</b></div>
                  </div>
                </div>
                {scores.length > 1 && <div style={{ marginTop: 14 }}><Sparkline values={scores} bands height={52} /></div>}
                <p className="mg-small mg-muted" style={{ marginTop: 12 }}>{signal.suggestion}</p>
                {cat === "critical" && <Button variant="coral" block style={{ marginTop: 12 }} onClick={() => navigate("/support")}>Get support now</Button>}
              </>
            )}
          </Card>
          {cards.length > 0 && <InterventionCards cards={cards} />}
          <Card tint="teal">
            <p className="mg-small mg-muted">
              {user?.name ? `${user.preferred_name || user.name.split(" ")[0]}, this` : "This"} chat is supportive AI, not professional care. Messages count toward your trends and garden.
              In a crisis, use <a href="#/support">Support</a>.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
