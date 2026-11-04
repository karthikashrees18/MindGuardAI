// Student home: greeting, latest score, quick actions, garden and today's nudge.
import React, { useEffect, useState } from "react";
import { ArrowRight, Gamepad2, HeartPulse, Lightbulb, MessageCircle, NotebookPen, Wind } from "lucide-react";
import { api } from "../api";
import { useApp } from "../lib/store";
import { navigate } from "../lib/router";
import { CATEGORY_META, categoryOf, displayName, greeting } from "../lib/constants";
import { Button, Card, CategoryBadge, ScoreRing, Skeleton, Sparkline } from "../components/ui";
import { EarlyWarningBanner } from "../components/EarlyWarning";
import { GardenCard } from "../components/Garden";
import "../styles/home.css";

const TILES = [
  { path: "/checkin", icon: NotebookPen, tone: "violet", title: "Daily check-in", sub: "Two minutes to unload your head" },
  { path: "/chat", icon: MessageCircle, tone: "teal", title: "AI companion", sub: "Talk it through, no judgement" },
  { path: "/calm", icon: Wind, tone: "amber", title: "Calm space", sub: "Breathing, music and resets" },
  { path: "/games", icon: Gamepad2, tone: "coral", title: "Mini-games", sub: "Gentle fun that grows your garden" },
];

const NUDGE_CTA = {
  music: ["/calm", "Open calm space"],
  breathing: ["/calm", "Start breathing"],
  pomodoro: ["/calm", "Take a reset break"],
  journal_prompt: ["/calm", "Try the prompt"],
  game_bubble: ["/games/bubble", "Play Zen Bubble Pop"],
  game_reframe: ["/games/reframe", "Play Thought Reframe"],
};

function summaryLine(score, trend, hasEntries) {
  if (score == null) return hasEntries ? "Your latest entry is still being scored." : "A fresh start — check in whenever you're ready.";
  const cat = categoryOf(score);
  if (cat === "calm") return trend === "easing" ? "Things are settling down nicely. Keep doing what works." : "You're in a steady, calm place right now.";
  if (cat === "mild") return "A little overthinking lately. A short reset could help.";
  return "It's been heavy. Small, gentle steps count today.";
}

export default function Home() {
  const { user, latest, refreshGarden } = useApp();
  const [summary, setSummary] = useState(null);
  const [cards, setCards] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    refreshGarden();
    Promise.all([api.reportsSummary(), api.interventions()])
      .then(([s, iv]) => {
        if (!alive) return;
        setSummary(s);
        setCards(iv?.cards || []);
      })
      .catch((e) => alive && setError(e.message || "Something went wrong loading your home."));
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loading = !summary && !error;
  const recent = summary?.recent || [];
  const lastRecent = recent.length ? recent[recent.length - 1] : null;
  const score = lastRecent ? lastRecent.score : latest?.analysis?.rumination_score ?? null;
  const category = score != null ? categoryOf(score) : null;
  const mood = lastRecent?.mood || latest?.entry?.mood_label || latest?.analysis?.mood_label || null;
  const series = recent.slice(-14).map((r) => r.score);
  const nudge = (cards || []).find((c) => c.type !== "counselor" && NUDGE_CTA[c.type]);
  const [nudgePath, nudgeLabel] = nudge ? NUDGE_CTA[nudge.type] : [];

  return (
    <div className="mg-stack">
      <div className="mg-fade-up">
        <h1 className="mg-h1">{greeting()}, <span className="mg-gradient-text">{displayName(user)}</span></h1>
        <p className="mg-muted" style={{ marginTop: 5 }}>
          {loading ? "Getting your day ready…" : summaryLine(score, summary?.trend, (summary?.total_entries || 0) > 0)}
        </p>
      </div>

      <EarlyWarningBanner />

      {error && (
        <Card tint="coral" role="alert">
          <div className="mg-h3">We couldn't load everything</div>
          <p className="mg-small mg-muted" style={{ marginTop: 4 }}>{error}</p>
        </Card>
      )}

      {/* hero */}
      {loading ? (
        <Skeleton height={190} style={{ borderRadius: 22 }} />
      ) : (
        <Card glow className="mg-fade-up">
          <div className="mg-home-hero">
            <ScoreRing score={score} size={148} stroke={12} label="OVERTHINKING" />
            <div className="trend mg-stack-sm">
              {score != null ? (
                <>
                  <div className="mg-row-wrap">
                    <CategoryBadge category={category} label={CATEGORY_META[category].label} />
                    {mood && <span className="mg-badge violet">Mood: {mood}</span>}
                  </div>
                  <div className="mg-eyebrow">Last {series.length} check-in{series.length === 1 ? "" : "s"}</div>
                  <Sparkle values={series} />
                </>
              ) : (
                <>
                  <div className="mg-h2">Check in to see your first score</div>
                  <p className="mg-muted mg-small">
                    Write a few honest sentences about your day. Mind Guard reads the pattern, never judges it,
                    and your trend appears right here.
                  </p>
                  <div><Button icon={NotebookPen} onClick={() => navigate("/checkin")}>Start my first check-in</Button></div>
                </>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* quick actions */}
      <div className="mg-grid mg-grid-4 mg-stagger">
        {TILES.map(({ path, icon: Icon, tone, title, sub }) => (
          <button key={path} type="button" className="mg-tile" onClick={() => navigate(path)}>
            <div className={`mg-icon-tile ${tone}`}><Icon size={20} /></div>
            <div>
              <div className="t">{title}</div>
              <div className="s">{sub}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="mg-grid mg-grid-2">
        <GardenCard />
        {loading ? (
          <Skeleton height={150} style={{ borderRadius: 22 }} />
        ) : (
          <Card tint="violet">
            <div className="mg-row" style={{ alignItems: "flex-start" }}>
              <div className="mg-icon-tile violet">{nudge ? <Lightbulb size={20} /> : <HeartPulse size={20} />}</div>
              <div className="mg-grow">
                <div className="mg-eyebrow">Today's nudge</div>
                {nudge ? (
                  <>
                    <div className="mg-h3" style={{ marginTop: 4 }}>{nudge.title}</div>
                    <p className="mg-muted mg-small" style={{ marginTop: 3 }}>{nudge.subtitle}</p>
                    <div style={{ marginTop: 14 }}>
                      <Button variant="violet" size="sm" onClick={() => navigate(nudgePath)}>
                        {nudgeLabel} <ArrowRight size={14} />
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mg-h3" style={{ marginTop: 4 }}>Nothing urgent today</div>
                    <p className="mg-muted mg-small" style={{ marginTop: 3 }}>
                      Once you check in, we'll suggest something that fits how you're feeling.
                    </p>
                  </>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function Sparkle({ values }) {
  return <Sparkline values={values} height={64} bands color="var(--violet)" />;
}
