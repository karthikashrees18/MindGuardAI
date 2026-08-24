import React from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CHART_COLORS, TIER_LABELS, TIER_ORDER } from "../theme";

export default function RiskDistributionChart({ t, distribution, sampleSize }) {
  const data = TIER_ORDER.map((key) => ({
    key,
    name: TIER_LABELS[key],
    value: distribution ? distribution[key] || 0 : 0,
  }));
  const hasData = data.some((d) => d.value > 0);

  return (
    <Card t={t}>
      <div style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, marginBottom: 4 }}>
        Overall student mental state distribution
      </div>
      <div style={{ fontSize: 11.5, color: t.textFaint, marginBottom: 8 }}>
        {sampleSize != null ? `Based on ${sampleSize} active students this period` : ""}
      </div>
      {hasData ? (
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={2}>
                {data.map((d) => (
                  <Cell key={d.key} fill={CHART_COLORS[d.key]} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, fontSize: 12 }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => <span style={{ color: t.textSecondary, fontSize: 12 }}>{value}</span>}
              />
            </PieChart>
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