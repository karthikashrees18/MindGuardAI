// Campus-level visual analytics: daily distress vs wellness vs baseline, and the
// distribution of detected stressors. Aggregate and k-anonymised on the server.
import React, { useMemo } from "react";
import { AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { CHART, tooltipStyles } from "../theme";

const PALETTE = [CHART.coral, CHART.amber, CHART.violet, CHART.teal, "#60a5fa", "#f0abfc", "#86efac"];

function fmtDay(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString([], { weekday: "short", day: "numeric" });
}

export function TrendCard({ ov }) {
  const data = useMemo(() => (ov?.trend || []).map((p) => ({ ...p, label: fmtDay(p.date) })), [ov]);
  const hasData = data.some((p) => p.stress != null);
  return (
    <section className="mga-panel" aria-label="Campus distress trend">
      <div className="mga-panel-h">
        <div>
          <h3>Campus distress trend</h3>
          <p>Average stress score vs wellness, against the campus baseline{ov?.baseline != null ? ` (${ov.baseline})` : ""}</p>
        </div>
        <div className="mga-legend">
          <span><i style={{ background: CHART.coral }} />Stress</span>
          <span><i style={{ background: CHART.teal }} />Wellness</span>
        </div>
      </div>
      {!ov ? <div className="mg-skeleton" style={{ height: 220 }} /> : hasData ? (
        <div style={{ width: "100%", height: 230 }} role="img" aria-label="Daily campus stress and wellness scores">
          <ResponsiveContainer>
            <AreaChart data={data} margin={{ left: -18, right: 8, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="mgaStress" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART.coral} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={CHART.coral} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={CHART.grid} strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: CHART.axis }} axisLine={{ stroke: CHART.grid }} tickLine={false} minTickGap={16} />
              <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 10, fill: CHART.axis }} axisLine={false} tickLine={false} width={34} />
              <Tooltip {...tooltipStyles} />
              {ov.baseline != null && <ReferenceLine y={ov.baseline} stroke={CHART.axis} strokeDasharray="5 5" label={{ value: "baseline", fill: CHART.axis, fontSize: 10, position: "insideTopRight" }} />}
              <Area type="monotone" dataKey="stress" name="Stress" stroke={CHART.coral} strokeWidth={2.4} fill="url(#mgaStress)" connectNulls dot={{ r: 3, fill: CHART.coral, strokeWidth: 0 }} />
              <Line type="monotone" dataKey="wellness" name="Wellness" stroke={CHART.teal} strokeWidth={2.2} connectNulls dot={{ r: 3, fill: CHART.teal, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="mga-chart-empty">Not enough check-ins per day yet to show a trend without risking re-identification (minimum {ov.k_threshold} students per day).</div>
      )}
    </section>
  );
}

export function StressorCard({ factors, kThreshold }) {
  const data = (factors || []).map((f) => ({ tag: f.tag, count: f.count }));
  return (
    <section className="mga-panel" aria-label="Primary stressors">
      <div className="mga-panel-h">
        <div>
          <h3>Primary detected stressors</h3>
          <p>Entries mentioning each theme. Shown only when {kThreshold ?? 5}+ entries support it.</p>
        </div>
      </div>
      {!factors ? <div className="mg-skeleton" style={{ height: 220 }} /> : data.length ? (
        <div style={{ width: "100%", height: Math.max(190, data.length * 38) }} role="img" aria-label="Stressor counts">
          <ResponsiveContainer>
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 0 }}>
              <CartesianGrid stroke={CHART.grid} strokeDasharray="4 4" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: CHART.axis }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="tag" width={128} tick={{ fontSize: 10.5, fill: CHART.axis }} axisLine={false} tickLine={false} />
              <Tooltip {...tooltipStyles} />
              <Bar dataKey="count" name="Entries" radius={[0, 6, 6, 0]}>
                {data.map((d, i) => <Cell key={d.tag} fill={PALETTE[i % PALETTE.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="mga-chart-empty">Not enough entries yet to report a stressor without risking re-identification.</div>
      )}
    </section>
  );
}
