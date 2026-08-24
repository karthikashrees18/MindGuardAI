import React from "react";
import { ArrowRight } from "lucide-react";
import { Card } from "../theme";

export default function MetricCard({ t, icon: Icon, iconColor, iconBg, label, value, sub, ctaLabel, onCtaClick }) {
  return (
    <Card t={t} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 12, color: t.textSecondary, fontWeight: 600 }}>{label}</div>
        {Icon && (
          <div style={{ width: 30, height: 30, borderRadius: 9, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon size={15} color={iconColor} />
          </div>
        )}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: t.textPrimary }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: t.textFaint }}>{sub}</div>}
      {ctaLabel && onCtaClick && (
        <button
          type="button"
          onClick={onCtaClick}
          className="mga-btn"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            marginTop: 2,
            padding: 0,
            border: "none",
            background: "none",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 700,
            color: t.tealDeep,
          }}
        >
          {ctaLabel} <ArrowRight size={13} />
        </button>
      )}
    </Card>
  );
}