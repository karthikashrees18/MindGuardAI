// Check-in history timeline: the student's past check-ins, newest first, each
// with its date, mood, stress level and a colour-coded wellness score.
// `version` is bumped by the parent after a new check-in so the list refetches
// immediately, without a page refresh.
import React, { useEffect, useState } from "react";
import { History, Lock } from "lucide-react";
import { api } from "../api";
import { categoryOf } from "../lib/constants";
import { Card, EmptyState } from "./ui";

const TIME = { hour: "numeric", minute: "2-digit" };

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** "Today", "Yesterday", "3 days ago", then "10 Nov 2026". */
export function dayLabel(iso, now = new Date()) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function ScoreChip({ item }) {
  if (item.wellness_score == null) return null;
  // calm -> green (optimal), mild -> amber (moderate), critical -> red (high distress)
  const cat = item.category || categoryOf(item.rumination_score);
  const tone = { calm: "optimal", mild: "moderate", critical: "high distress" }[cat] || "";
  return (
    <span className={`mg-badge ${cat}`} title={`Rumination ${item.rumination_score}/100 · ${tone}`}>
      Wellness Score: {item.wellness_score}/100
    </span>
  );
}

function Entry({ item }) {
  const when = new Date(item.created_at);
  const valid = !Number.isNaN(when.getTime());
  return (
    <li className="mg-card" style={{ padding: "12px 14px", listStyle: "none", display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div style={{ fontSize: 28, lineHeight: 1 }} aria-label={item.mood ? `Mood ${item.mood}` : "No mood recorded"}>{item.mood || "·"}</div>
      <div className="mg-grow" style={{ minWidth: 0 }}>
        <div className="mg-row-wrap" style={{ gap: 8, marginBottom: 4 }}>
          <b className="mg-small">{dayLabel(item.created_at)}</b>
          {valid && <span className="mg-tiny mg-faint">{when.toLocaleTimeString([], TIME)}</span>}
          <ScoreChip item={item} />
          {item.stress_level != null && <span className="mg-tiny mg-muted">Stress {item.stress_level}/100</span>}
        </div>
        {item.confidential ? (
          <div className="mg-tiny mg-faint mg-row" style={{ gap: 5 }}><Lock size={12} /> Vent entry — kept private</div>
        ) : item.excerpt ? (
          <div className="mg-small mg-muted" style={{ overflowWrap: "anywhere" }}>{item.excerpt}</div>
        ) : null}
      </div>
    </li>
  );
}

export default function CheckinHistory({ version = 0 }) {
  const [items, setItems] = useState(null);   // null = first load
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    api.checkinHistory(30)
      .then((rows) => { if (alive) { setItems(rows); setError(""); } })
      .catch((e) => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, [version]);

  return (
    <Card>
      <div className="mg-row" style={{ marginBottom: 12 }}>
        <History size={16} style={{ color: "var(--lavender)" }} />
        <div className="mg-h3">Check-in history</div>
      </div>
      {error && items === null ? (
        <div className="mg-error" role="alert">Couldn't load your history: {error}</div>
      ) : items === null ? (
        <div className="mg-skeleton" style={{ height: 120 }} aria-busy="true" />
      ) : items.length === 0 ? (
        <EmptyState icon={History} title="No previous check-ins yet." body="Complete your first check-in above!" />
      ) : (
        <ul className="mg-stack-sm" style={{ margin: 0, padding: 0 }}>
          {items.map((it) => <Entry key={it.id} item={it} />)}
        </ul>
      )}
    </Card>
  );
}
