import React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card } from "../theme";

export default function TrendsLineChart({ t, points }) {
  const data = (points || []).map((p) => ({
    date: p.date?.slice(5), // MM-DD
    sentiment: p.average_sentiment,
    entries: p.entry_count,
  }));

  return (
    <Card t={t}>
      <div style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, marginBottom: 4 }}>
        Longitudinal campus mood trend
      </div>
      <div style={{ fontSize: 11.5, color: t.textFaint, marginBottom: 8 }}>
        Average sentiment score (0-100, higher is better) per day
      </div>
      {data.length ? (
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <AreaChart data={data} margin={{ left: -18, right: 10, top: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="mgaTrendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={t.teal} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={t.teal} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={t.border} strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: t.textFaint }} axisLine={{ stroke: t.border }} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: t.textFaint }} axisLine={false} tickLine={false} width={30} />
              <Tooltip
                contentStyle={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, fontSize: 12 }}
                labelStyle={{ color: t.textPrimary, fontWeight: 600 }}
              />
              <Area type="monotone" dataKey="sentiment" name="Avg. sentiment" stroke={t.tealDeep} strokeWidth={2.5} fill="url(#mgaTrendFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div style={{ fontSize: 12.5, color: t.textFaint, padding: "40px 0", textAlign: "center" }}>
          No journal activity in this period yet.
        </div>
      )}
    </Card>
  );
}