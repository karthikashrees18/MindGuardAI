import React from "react";
import { AlertTriangle } from "lucide-react";

export default function AnomalyBanner({ t, anomalies }) {
  if (!anomalies || !anomalies.length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {anomalies.map((a, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: t.coralSoft,
            border: `1px solid ${t.coralBorder}`,
            borderRadius: 14,
            padding: "12px 16px",
            fontSize: 12.5,
            color: t.coralDeep,
            fontWeight: 600,
          }}
        >
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span>Early warning: {a.message}</span>
        </div>
      ))}
    </div>
  );
}