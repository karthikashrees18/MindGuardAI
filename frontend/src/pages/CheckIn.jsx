// Daily check-in / venting box / reflection -> two-engine analysis -> explainable
// result + intervention cards + early warning.
import React, { useEffect, useMemo, useState } from "react";
import { Brain, Info, Mic, MicOff, Sparkles, Wand2 } from "lucide-react";
import { api } from "../api";
import { useApp } from "../lib/store";
import { useDictation } from "../lib/dictation";
import { CATEGORY_META, MOODS, SAMPLE_TEXTS } from "../lib/constants";
import { Button, CategoryBadge, Card, PageHeader, ScoreRing } from "../components/ui";
import { EarlyWarningBanner } from "../components/EarlyWarning";
import InterventionCards from "../components/Interventions";

const MODES = [
  { key: "checkin", label: "Daily check-in", placeholder: "How are you really doing today? Write whatever is on your mind…" },
  { key: "vent", label: "Vent box", placeholder: "Let it all out. No judgement, no filter — just type." },
  { key: "reflection", label: "Reflection", placeholder: "Take a minute to look back on today…" },
];

const REFLECTION_PROMPTS = [
  "What took the most energy from you today?",
  "What is one thing that went okay, even if small?",
  "What is a worry you keep coming back to?",
  "What would you tell a friend feeling this way?",
];

/** Wrap detected marker phrases in <mark> so students can see *what* the engine noticed. */
function highlight(text, markers) {
  const phrases = [
    ...(markers?.thought_loops || []), ...(markers?.catastrophizing || []),
    ...(markers?.helplessness || []), ...(markers?.self_blame || []),
  ].filter((p) => p && p.length > 2);
  if (!phrases.length) return text;
  const escaped = phrases.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).sort((a, b) => b.length - a.length);
  const re = new RegExp(`(${escaped.join("|")})`, "gi");
  return text.split(re).map((part, i) =>
    i % 2 === 1
      ? <mark key={i} style={{ background: "var(--amber-soft)", color: "var(--amber)", borderRadius: 4, padding: "0 2px" }}>{part}</mark>
      : <React.Fragment key={i}>{part}</React.Fragment>);
}

function Meter({ label, value, text, tone = "var(--violet)" }) {
  return (
    <div>
      <div className="mg-row mg-between mg-small" style={{ marginBottom: 5 }}>
        <span className="mg-muted">{label}</span><b>{text}</b>
      </div>
      <div className="mg-progress"><i style={{ width: `${Math.max(3, Math.min(100, value))}%`, background: tone }} /></div>
    </div>
  );
}

function MarkerGroup({ title, items, tone }) {
  if (!items?.length) return null;
  return (
    <div>
      <div className="mg-tiny mg-faint" style={{ marginBottom: 5 }}>{title}</div>
      <div className="mg-row-wrap" style={{ gap: 6 }}>
        {items.map((m) => <span key={m} className={`mg-badge ${tone}`} style={{ fontWeight: 600 }}>{m}</span>)}
      </div>
    </div>
  );
}

function Result({ result, text, onAgain }) {
  const a = result.analysis;
  const cat = a.category.key;
  const m = a.markers || {};
  const sentimentPct = (a.sentiment + 1) * 50;
  const hasMarkers = [m.thought_loops, m.catastrophizing, m.helplessness, m.self_blame, m.absolutist_language, m.repeated_words]
    .some((x) => x?.length);

  return (
    <div className="mg-stack">
      <EarlyWarningBanner />

      <div className="mg-grid mg-grid-main">
        <Card glow tint={cat === "critical" ? "coral" : cat === "mild" ? "amber" : "teal"}>
          <div className="mg-row" style={{ gap: 20, flexWrap: "wrap" }}>
            <ScoreRing score={a.rumination_score} size={150} label="RUMINATION" />
            <div className="mg-grow" style={{ minWidth: 220 }}>
              <div className="mg-row-wrap" style={{ marginBottom: 8 }}>
                <CategoryBadge category={cat} />
                <span className="mg-badge violet">Mood: {a.mood}</span>
                <span className="mg-badge violet" title="Which engine read your text">
                  <Brain size={12} /> {a.engine === "claude" ? "Claude + scoring engine" : "On-device NLP + scoring engine"}
                </span>
              </div>
              <p style={{ fontSize: 15, lineHeight: 1.6 }}>{a.summary}</p>
              <p className="mg-muted mg-small" style={{ marginTop: 8 }}>{a.suggestion}</p>
            </div>
          </div>
          {result.first_checkin_today && (
            <div className="mg-row" style={{ marginTop: 16, background: "var(--teal-soft)", padding: "10px 14px", borderRadius: 14 }}>
              <Sparkles size={16} style={{ color: "var(--teal)" }} />
              <span className="mg-small">
                Garden watered — streak <b>{result.garden.streak}</b> {result.garden.streak === 1 ? "day" : "days"} · {result.garden.stage_label}
              </span>
            </div>
          )}
        </Card>

        <Card>
          <div className="mg-h3" style={{ marginBottom: 12 }}>Dual-engine signals</div>
          <div className="mg-stack-sm">
            <Meter label="Sentiment" value={sentimentPct} text={a.sentiment > 0.15 ? "Positive" : a.sentiment < -0.15 ? "Negative" : "Neutral"} tone={a.sentiment < -0.15 ? "var(--coral)" : "var(--teal)"} />
            <Meter label="Stress intensity" value={a.stress_intensity} text={`${a.stress_intensity}/100`} tone="var(--amber)" />
            <Meter label="Rumination markers" value={a.overthinking_percent ?? 0} text={`${a.overthinking_percent ?? 0}%`} tone="var(--violet)" />
          </div>
          <hr className="mg-divider" style={{ margin: "14px 0" }} />
          <div className="mg-tiny mg-faint" style={{ marginBottom: 8 }}>
            Score bands: {Object.entries(CATEGORY_META).map(([, v]) => `${v.range} ${v.label}`).join(" · ")}
          </div>
        </Card>
      </div>

      <div className="mg-grid mg-grid-2">
        <Card>
          <div className="mg-row" style={{ marginBottom: 12 }}>
            <Info size={16} style={{ color: "var(--lavender)" }} />
            <div className="mg-h3">Why this score?</div>
          </div>
          <div className="mg-stack-sm">
            {a.factors.map((f, i) => (
              <div key={i} className="mg-row mg-between mg-small">
                <span className="mg-muted">{f.label}</span>
                {f.delta != null && (
                  <b style={{ color: f.key === "text" ? "var(--text)" : f.delta > 0 ? "var(--coral)" : "var(--teal)" }}>
                    {f.key === "text" ? f.delta : f.delta > 0 ? `+${f.delta}` : f.delta}
                  </b>
                )}
              </div>
            ))}
            <div className="mg-row mg-between" style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
              <b>Final score</b><b style={{ color: CATEGORY_META[cat].color }}>{a.rumination_score} / 100</b>
            </div>
          </div>
          {a.triggers_hit?.length > 0 && (
            <p className="mg-small mg-muted" style={{ marginTop: 10 }}>
              This touches {a.triggers_hit.length > 1 ? "triggers" : "a trigger"} you told us about, so it carries a little extra weight.
            </p>
          )}
        </Card>

        <Card>
          <div className="mg-h3" style={{ marginBottom: 12 }}>What the engine noticed</div>
          {hasMarkers ? (
            <div className="mg-stack-sm">
              <MarkerGroup title="Thought loops" items={m.thought_loops} tone="mild" />
              <MarkerGroup title="Catastrophising" items={m.catastrophizing} tone="critical" />
              <MarkerGroup title="Helplessness" items={m.helplessness} tone="critical" />
              <MarkerGroup title="Self-blame" items={m.self_blame} tone="mild" />
              <MarkerGroup title="Absolutist words" items={m.absolutist_language} tone="violet" />
              <MarkerGroup title="Repeated words" items={m.repeated_words} tone="violet" />
              <MarkerGroup title="Triggers detected" items={(a.triggers_detected || []).map((t) => t.replace(/_/g, " "))} tone="violet" />
            </div>
          ) : (
            <p className="mg-muted mg-small">No rumination markers — your writing reads steady and open. Nice.</p>
          )}
          <hr className="mg-divider" style={{ margin: "14px 0" }} />
          <div className="mg-tiny mg-faint" style={{ marginBottom: 6 }}>Your words, with the phrases that mattered highlighted</div>
          <p className="mg-small" style={{ lineHeight: 1.75, maxHeight: 150, overflow: "auto" }} >{highlight(text, m)}</p>
        </Card>
      </div>

      <div>
        <div className="mg-row mg-between" style={{ marginBottom: 12 }}>
          <div>
            <div className="mg-h2">Picked for you</div>
            <div className="mg-muted mg-small">{result.interventions.transition.label} — ordered by what you said helps you</div>
          </div>
          <Button variant="ghost" onClick={onAgain}>New entry</Button>
        </div>
        <InterventionCards cards={result.interventions.cards} />
      </div>
    </div>
  );
}

export default function CheckIn() {
  const { user, recordCheckin, toast } = useApp();
  const [mode, setMode] = useState("checkin");
  const [text, setText] = useState("");
  const [mood, setMood] = useState(2);
  const [stress, setStress] = useState(40);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [submittedText, setSubmittedText] = useState("");

  // a journal prompt can be handed over by an intervention card
  useEffect(() => {
    try {
      const p = sessionStorage.getItem("mg_prompt");
      if (p) { setText((t) => t || `${p}\n\n`); sessionStorage.removeItem("mg_prompt"); }
    } catch { /* storage blocked */ }
  }, []);

  const dictation = useDictation((spoken) => setText((t) => (t ? t.replace(/\s*$/, " ") : "") + spoken));
  const modeMeta = useMemo(() => MODES.find((m) => m.key === mode), [mode]);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  async function submit() {
    if (!text.trim() || busy) return;
    if (dictation.listening) dictation.stop();
    setBusy(true);
    setError("");
    try {
      const res = await api.checkin({
        text: text.trim(), mood: MOODS[mood].emoji, stress_level: Number(stress), source: mode,
      });
      recordCheckin(res);
      setSubmittedText(text.trim());
      setResult(res);
      if (res.early_warning?.is_new) toast("We noticed you're carrying a lot — support is one tap away below.", { type: "warn", ms: 6000 });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function again() {
    setResult(null);
    setText("");
    setStress(40);
    setMood(2);
  }

  if (result) {
    return (
      <>
        <PageHeader title="Your check-in" subtitle="Here's what we read from your entry, and what might help right now." />
        <Result result={result} text={submittedText} onAgain={again} />
      </>
    );
  }

  return (
    <>
      <PageHeader title="How are you, really?" subtitle="Write freely. Two engines read your words for mood, stress and overthinking — privately." />
      <div className="mg-grid mg-grid-main">
        <Card className="mg-stack">
          <div className="mg-row-wrap" role="tablist" aria-label="Entry type">
            {MODES.map((m) => (
              <button key={m.key} role="tab" aria-selected={mode === m.key} className={`mg-chip ${mode === m.key ? "on" : ""}`} onClick={() => setMode(m.key)}>
                {m.label}
              </button>
            ))}
          </div>

          <div>
            <textarea className="mg-textarea" style={{ minHeight: 230 }} value={text} onChange={(e) => setText(e.target.value)}
              placeholder={modeMeta.placeholder} aria-label="Your entry" maxLength={5000} />
            <div className="mg-row mg-between mg-tiny mg-faint" style={{ marginTop: 6 }}>
              <span>{words} {words === 1 ? "word" : "words"}</span>
              <span>Only you can read this. Counselors never see your text.</span>
            </div>
          </div>

          {mode === "reflection" && (
            <div className="mg-row-wrap">
              {REFLECTION_PROMPTS.map((p) => (
                <button key={p} className="mg-chip" onClick={() => setText((t) => (t ? `${t}\n\n${p}\n` : `${p}\n`))}>{p}</button>
              ))}
            </div>
          )}

          <div>
            <label className="mg-label">Mood right now</label>
            <div className="mg-row" style={{ gap: 8 }}>
              {MOODS.map((m, i) => (
                <button key={m.emoji} type="button" onClick={() => setMood(i)} aria-label={m.label} aria-pressed={mood === i}
                  style={{ fontSize: 26, width: 52, height: 52, borderRadius: 16, border: `1px solid ${mood === i ? "var(--violet)" : "var(--border)"}`,
                    background: mood === i ? "var(--violet-soft)" : "var(--surface)", cursor: "pointer", transform: mood === i ? "scale(1.08)" : "none", transition: "all .15s" }}>
                  {m.emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mg-row mg-between"><label className="mg-label" htmlFor="stress">Stress level</label><b className="mg-small">{stress}/100</b></div>
            <input id="stress" className="mg-range" type="range" min="0" max="100" value={stress} onChange={(e) => setStress(e.target.value)} />
          </div>

          {error && <div className="mg-error" role="alert">{error}</div>}

          <div className="mg-row-wrap">
            {dictation.supported && (
              <Button variant="ghost" icon={dictation.listening ? MicOff : Mic} onClick={dictation.listening ? dictation.stop : dictation.start}>
                {dictation.listening ? "Stop listening" : "Voice"}
              </Button>
            )}
            <Button variant="" size="lg" loading={busy} disabled={!text.trim()} onClick={submit} icon={Wand2} className="mg-grow">
              {busy ? "Reading your entry…" : "Analyze & save"}
            </Button>
          </div>
          {dictation.error && <div className="mg-error">{dictation.error}</div>}
        </Card>

        <div className="mg-stack">
          {user?.is_demo && (
            <Card tint="violet">
              <div className="mg-h3" style={{ marginBottom: 4 }}>Presentation shortcut</div>
              <p className="mg-small mg-muted" style={{ marginBottom: 10 }}>Load a ready-made entry to demo each band live.</p>
              <div className="mg-row-wrap">
                <Button size="sm" variant="coral" onClick={() => { setText(SAMPLE_TEXTS.high); setStress(85); setMood(4); }}>High rumination</Button>
                <Button size="sm" variant="ghost" onClick={() => { setText(SAMPLE_TEXTS.mild); setStress(55); setMood(3); }}>Mild</Button>
                <Button size="sm" variant="teal" onClick={() => { setText(SAMPLE_TEXTS.calm); setStress(10); setMood(1); }}>Calm</Button>
              </div>
            </Card>
          )}
          <Card>
            <div className="mg-h3" style={{ marginBottom: 8 }}>What happens next</div>
            <ol className="mg-small mg-muted" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
              <li><b>Engine 1</b> reads sentiment, stress and rumination markers.</li>
              <li><b>Engine 2</b> personalises a 0–100 score using your onboarding baseline.</li>
              <li>You get music, breathing, mini-games or a counselor connect chosen for you.</li>
              <li>Your garden grows — rest days are always fine.</li>
            </ol>
          </Card>
          <Card tint="teal">
            <div className="mg-row"><Sparkles size={16} style={{ color: "var(--teal)" }} /><span className="mg-small mg-muted">Even one honest sentence counts as a check-in.</span></div>
          </Card>
        </div>
      </div>
    </>
  );
}
