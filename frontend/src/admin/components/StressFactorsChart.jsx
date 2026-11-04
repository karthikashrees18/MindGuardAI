import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CHART, tooltipStyles } from "../theme";

const PALETTE = [CHART.teal, CHART.violet, CHART.amber, CHART.coral, "#60a5fa", "#86efac", "#f0abfc"];

export default function StressFactorsChart({ t, factors, kThreshold }) {
  const data = (factors || []).map((f) => ({ tag: f.tag, count: f.count }));

  return (
    <Card>
      <div style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, marginBottom: 4 }}>
        Top reported stress factors this period
      </div>
      <div style={{ fontSize: 11.5, color: t.textFaint, marginBottom: 8 }}>
        Tags derived from journal text · only shown once at least {kThreshold} entries mention them
      </div>
      {data.length ? (
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={data} margin={{ left: -18, right: 10, top: 10, bottom: 30 }}>
              <CartesianGrid stroke={CHART.grid} strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="tag" tick={{ fontSize: 9.5, fill: CHART.axis }} axisLine={{ stroke: CHART.grid }} tickLine={false} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: CHART.axis }} axisLine={false} tickLine={false} width={30} />
              <Tooltip {...tooltipStyles} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {data.map((d, i) => (
                  <Cell key={d.tag} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div style={{ fontSize: 12.5, color: t.textFaint, padding: "40px 0", textAlign: "center" }}>
          Not enough entries yet to report a stress factor without risking re-identification.
        </div>
      )}
    </Card>
  );
}