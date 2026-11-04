import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, GhostButton, CHART_COLORS, TIER_LABELS, CHART, tooltipStyles } from "../theme";

export default function DepartmentBarChart({ t, buckets, kThreshold, groupBy, setGroupBy }) {
  const data = (buckets || []).map((b) => ({
    label: b.label,
    normal: b.risk_distribution.normal,
    mild: b.risk_distribution.mild,
    moderate: b.risk_distribution.moderate,
    high_distress: b.risk_distribution.high_distress,
    suppressed: b.suppressed,
    total: b.student_count,
  }));

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary }}>
            Distress severity by {groupBy === "department" ? "department" : "year of study"}
          </div>
          <div style={{ fontSize: 11.5, color: t.textFaint, marginTop: 2 }}>
            Groups with fewer than {kThreshold} students are folded into "Other / Insufficient Data"
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <GhostButton t={t} active={groupBy === "department"} onClick={() => setGroupBy("department")}>Department</GhostButton>
          <GhostButton t={t} active={groupBy === "year_of_study"} onClick={() => setGroupBy("year_of_study")}>Year</GhostButton>
        </div>
      </div>
      {data.length ? (
        <div style={{ width: "100%", height: Math.max(220, data.length * 46) }}>
          <ResponsiveContainer>
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 10, bottom: 0 }}>
              <CartesianGrid stroke={CHART.grid} strokeDasharray="4 4" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: CHART.axis }} axisLine={{ stroke: CHART.grid }} tickLine={false} />
              <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 11, fill: CHART.text }} axisLine={false} tickLine={false} />
              <Tooltip
                {...tooltipStyles}
                formatter={(value, name) => [value, TIER_LABELS[name] || name]}
              />
              <Bar dataKey="normal" stackId="a" fill={CHART_COLORS.normal} radius={[0, 0, 0, 0]} />
              <Bar dataKey="mild" stackId="a" fill={CHART_COLORS.mild} />
              <Bar dataKey="moderate" stackId="a" fill={CHART_COLORS.moderate} />
              <Bar dataKey="high_distress" stackId="a" fill={CHART_COLORS.high_distress} radius={[0, 4, 4, 0]} />
            </BarChart>
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