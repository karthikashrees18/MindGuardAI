import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card } from "../theme";

const PALETTE = ["#4DB6AC", "#8A6FC0", "#F5B942", "#E15C50", "#5FA8D3", "#7CB342", "#EC7FA9"];

export default function StressFactorsChart({ t, factors, kThreshold }) {
  const data = (factors || []).map((f) => ({ tag: f.tag, count: f.count }));

  return (
    <Card t={t}>
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
              <CartesianGrid stroke={t.border} strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="tag" tick={{ fontSize: 9.5, fill: t.textFaint }} axisLine={{ stroke: t.border }} tickLine={false} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: t.textFaint }} axisLine={false} tickLine={false} width={30} />
              <Tooltip contentStyle={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, fontSize: 12 }} />
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