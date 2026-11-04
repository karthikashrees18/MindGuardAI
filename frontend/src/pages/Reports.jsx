// Student's private reports view: trend, categories, triggers and recent entries.
import React, { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, Clock, Download, Minus, NotebookPen, TrendingDown, TrendingUp } from "lucide-react";
import { api } from "../api";
import { navigate } from "../lib/router";
import { CATEGORY_META, categoryOf } from "../lib/constants";
import { Button, Card, CategoryBadge, EmptyState, PageHeader, Skeleton } from "../components/ui";
import "../styles/games.css";

// recharts attributes can't read CSS variables reliably, so literal palette hexes
const HEX = { teal: "#5eead4", amber: "#fbc65d", coral: "#ff9b94", violet: "#a78bfa", axis: "#727d9f" };
const CAT_HEX = { calm: HEX.teal, mild: HEX.amber, critical: HEX.coral };

const TREND = {
  easing: { label: "Easing", icon: TrendingDown, tone: "teal", note: "Scores are coming down. Nice." },
  rising: { label: "Rising", icon: TrendingUp, tone: "coral", note: "Scores have crept up lately." },
  steady: { label: "Steady", icon: Minus, tone: "violet", note: "Pretty even over time." },
  "not enough data": { label: "Not enough data", icon: Minus, tone: "violet", note: "A couple more check-ins will reveal a trend." },
};

const shortDate = (iso) => new Date(iso).toLocaleDateString([], { day: "numeric", month: "short" });
const longDate = (iso) => new Date(iso).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const hourLabel = (h) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "AM" : "PM"}`;

function csvCell(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(rows) {
  const head = ["date", "score", "category", "mood"];
  const body = rows.map((r) => [r.date, r.score, r.category, r.mood].map(csvCell).join(","));
  const blob = new Blob(["﻿" + [head.join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mind-guard-report-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function ChartTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div style={{ background: "#141b35", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 12, padding: "9px 12px", color: "#eef1fb", fontSize: 12 }}>
      <div style={{ color: "#a9b2d0" }}>{longDate(p.at)}</div>
      <div style={{ fontWeight: 700, fontSize: 14, margin: "2px 0" }}>Score {p.score}</div>
      <div style={{ color: CAT_HEX[p.category] }}>{CATEGORY_META[p.category]?.label}</div>
    </div>
  );
}

export default function Reports() {
  const [summary, setSummary] = useState(null);
  const [journals, setJournals] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    Promise.all([api.reportsSummary(), api.listJournals(30)])
      .then(([s, j]) => {
        if (!alive) return;
        setSummary(s);
        setJournals(Array.isArray(j) ? j : j?.items || []);
      })
      .catch((e) => alive && setError(e.message || "Couldn't load your reports."));
    return () => { alive = false; };
  }, []);

  const data = useMemo(() => (summary?.recent || []).map((r, i) => ({ i, at: r.at, score: r.score, category: r.category || categoryOf(r.score) })), [summary]);

  if (error) {
    return (
      <div className="mg-stack">
        <PageHeader eyebrow="Insights" title="My reports" />
        <Card tint="coral" role="alert">
          <div className="mg-h3">We couldn't load your reports</div>
          <p className="mg-small mg-muted" style={{ marginTop: 4 }}>{error}</p>
          <div style={{ marginTop: 12 }}><Button variant="ghost" size="sm" onClick={() => window.location.reload()}>Try again</Button></div>
        </Card>
      </div>
    );
  }

  if (!summary || !journals) {
    return (
      <div className="mg-stack">
        <PageHeader eyebrow="Insights" title="My reports" subtitle="Your patterns, just for you." />
        <div className="mg-grid mg-grid-4">{[0, 1, 2, 3].map((k) => <Skeleton key={k} height={92} style={{ borderRadius: 22 }} />)}</div>
        <Skeleton height={300} style={{ borderRadius: 22 }} />
        <Skeleton height={200} style={{ borderRadius: 22 }} />
      </div>
    );
  }

  if (!summary.total_entries) {
    return (
      <div className="mg-stack">
        <PageHeader eyebrow="Insights" title="My reports" subtitle="Your patterns, just for you." />
        <Card>
          <EmptyState
            icon={BarChart3}
            title="No entries yet"
            body="Your reports appear after your first check-in. It takes about two minutes."
            action={<Button icon={NotebookPen} onClick={() => navigate("/checkin")}>Do a check-in</Button>}
          />
        </Card>
      </div>
    );
  }

  const trend = TREND[summary.trend] || TREND["not enough data"];
  const TrendIcon = trend.icon;
  const counts = summary.category_counts || {};
  const totalCats = (counts.calm || 0) + (counts.mild || 0) + (counts.critical || 0);
  const triggers = summary.top_triggers || [];
  const maxTrig = Math.max(1, ...triggers.map((t) => t.count));
  const avg = summary.average_rumination_score;
  const avgCat = avg == null ? null : categoryOf(avg);

  const csvRows = journals
    .filter((j) => j.rumination_score != null)
    .map((j) => ({ date: j.created_at, score: j.rumination_score, category: j.category || categoryOf(j.rumination_score), mood: j.mood_label || j.mood || "" }));

  return (
    <div className="mg-stack">
      <PageHeader
        eyebrow="Insights"
        title="My reports"
        subtitle="Your patterns, just for you. Only you can see this page."
        actions={<Button variant="ghost" icon={Download} onClick={() => downloadCsv(csvRows)} disabled={!csvRows.length}>Download my report (CSV)</Button>}
      />

      <div className="mg-grid mg-grid-4 mg-stagger">
        <Card>
          <div className="mg-stat"><b>{summary.total_entries}</b><span>Total entries</span></div>
        </Card>
        <Card>
          <div className="mg-stat">
            <b style={{ color: avgCat ? CAT_HEX[avgCat] : undefined }}>{avg == null ? "—" : Math.round(avg)}</b>
            <span>Average score</span>
          </div>
        </Card>
        <Card>
          <div className="mg-row" style={{ alignItems: "flex-start" }}>
            <div className={`mg-icon-tile ${trend.tone}`}><TrendIcon size={20} /></div>
            <div className="mg-stat"><b style={{ fontSize: 18 }}>{trend.label}</b><span>Trend</span></div>
          </div>
        </Card>
        <Card>
          <div className="mg-row" style={{ alignItems: "flex-start" }}>
            <div className="mg-icon-tile amber"><Clock size={20} /></div>
            <div className="mg-stat">
              <b style={{ fontSize: 18 }}>{summary.best_hour != null ? hourLabel(summary.best_hour) : "—"}</b>
              <span>{summary.best_hour != null ? "Your calmest hour" : "Calmest hour (needs calm entries)"}</span>
            </div>
          </div>
        </Card>
      </div>
      <p className="mg-small mg-muted" style={{ marginTop: -6 }}>{trend.note}</p>

      <Card>
        <div className="mg-h3" style={{ marginBottom: 4 }}>Score over time</div>
        <p className="mg-small mg-faint" style={{ marginBottom: 10 }}>Lower is calmer. Dotted lines mark the 40 and 70 bands.</p>
        {data.length ? (
          <div className="mg-chart-wrap" role="img" aria-label={`Area chart of your last ${data.length} scores`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="mgArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={HEX.violet} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={HEX.violet} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(127,138,170,0.15)" vertical={false} />
                <XAxis
                  dataKey="i"
                  tickFormatter={(i) => (data[i] ? shortDate(data[i].at) : "")}
                  stroke={HEX.axis} tick={{ fill: HEX.axis, fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24}
                />
                <YAxis domain={[0, 100]} ticks={[0, 40, 70, 100]} stroke={HEX.axis} tick={{ fill: HEX.axis, fontSize: 11 }} tickLine={false} axisLine={false} />
                <ReferenceLine y={40} stroke={HEX.amber} strokeDasharray="4 5" strokeOpacity={0.6} />
                <ReferenceLine y={70} stroke={HEX.coral} strokeDasharray="4 5" strokeOpacity={0.6} />
                <Tooltip content={<ChartTip />} cursor={{ stroke: HEX.axis, strokeOpacity: 0.4 }} />
                <Area
                  type="monotone" dataKey="score" stroke={HEX.violet} strokeWidth={2.5} fill="url(#mgArea)"
                  dot={({ cx, cy, payload, index }) => (
                    <circle key={index} cx={cx} cy={cy} r={3.5} fill={CAT_HEX[payload.category]} stroke="#0a0f1f" strokeWidth={1} />
                  )}
                  activeDot={{ r: 6 }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="mg-muted mg-small">No scored entries yet.</p>
        )}
      </Card>

      <div className="mg-grid mg-grid-2">
        <Card>
          <div className="mg-h3" style={{ marginBottom: 12 }}>How your entries break down</div>
          {totalCats ? (
            <>
              <div className="mg-stackbar" role="img" aria-label={`Calm ${counts.calm || 0}, mild ${counts.mild || 0}, critical ${counts.critical || 0}`}>
                {["calm", "mild", "critical"].map((k) => (counts[k] ? <i key={k} style={{ width: `${(counts[k] / totalCats) * 100}%`, background: CAT_HEX[k] }} /> : null))}
              </div>
              <div className="mg-grid mg-grid-3" style={{ marginTop: 14, gap: 10 }}>
                {["calm", "mild", "critical"].map((k) => (
                  <div key={k} className="mg-stat">
                    <b style={{ color: CAT_HEX[k] }}>{counts[k] || 0}</b>
                    <span>{CATEGORY_META[k].label}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <p className="mg-muted mg-small">Nothing to show yet.</p>}
        </Card>

        <Card>
          <div className="mg-h3" style={{ marginBottom: 12 }}>Top triggers</div>
          {triggers.length ? (
            <div className="mg-stack-sm">
              {triggers.map((t) => (
                <div key={t.key} className="mg-hbar">
                  <span className="mg-muted">{t.label}</span>
                  <div className="track" role="img" aria-label={`${t.label}: ${t.count}`}><i style={{ width: `${(t.count / maxTrig) * 100}%` }} /></div>
                  <b>{t.count}</b>
                </div>
              ))}
            </div>
          ) : <p className="mg-muted mg-small">No clear triggers detected yet. That's a good sign.</p>}
        </Card>
      </div>

      <Card>
        <div className="mg-h3" style={{ marginBottom: 4 }}>Recent entries</div>
        <p className="mg-small mg-faint" style={{ marginBottom: 6 }}>What you wrote is private. Counselors never see it unless you choose to share.</p>
        {journals.length ? journals.slice(0, 15).map((j) => {
          const cat = j.category || (j.rumination_score != null ? categoryOf(j.rumination_score) : null);
          return (
            <div key={j.id} className="mg-entry">
              <div className="mg-grow">
                <div className="mg-row-wrap" style={{ gap: 8, marginBottom: 4 }}>
                  <span className="mg-small mg-faint">{longDate(j.created_at)}</span>
                  {j.mood_label && <span className="mg-badge violet">{j.mood_label}</span>}
                  {cat && <CategoryBadge category={cat} />}
                </div>
                <div className="snip mg-small mg-muted">{j.text}</div>
              </div>
              <b style={{ fontSize: 20, color: cat ? CAT_HEX[cat] : undefined }}>{j.rumination_score ?? "—"}</b>
            </div>
          );
        }) : <p className="mg-muted mg-small">No entries yet.</p>}
      </Card>
    </div>
  );
}
