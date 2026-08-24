import React from "react";

/* Same palette as the student app's src/App.jsx so the admin dashboard
   reads as part of the same product, not a bolted-on tool. */

export const LIGHT = {
  name: "light",
  page: "#F1F5F9",
  surface: "#FFFFFF",
  sidebar: "#FFFFFF",
  textPrimary: "#1E293B",
  textSecondary: "#64748B",
  textFaint: "#94A3B8",
  border: "#E2E8F0",
  teal: "#4DB6AC",
  tealDeep: "#2F8F86",
  tealGrad: "linear-gradient(135deg,#4DB6AC,#3AA79C)",
  tealSoft: "#EAF7F5",
  lavender: "#B39DDB",
  lavenderDeep: "#8A6FC0",
  lavenderGrad: "linear-gradient(135deg,#B39DDB,#9C82C9)",
  lavenderSoft: "#F3EEFB",
  coral: "#FF8A80",
  coralDeep: "#E15C50",
  coralGrad: "linear-gradient(135deg,#FF8A80,#E15C50)",
  coralSoft: "#FFF1F0",
  coralBorder: "#FFDAD6",
  amber: "#F5B942",
  amberSoft: "#FEF6E4",
  shadow: "0 12px 30px -10px rgba(100,116,139,0.18)",
  inputBg: "#F8FAFC",
  track: "#E2E8F0",
  heroGrad: "linear-gradient(160deg,#4DB6AC,#B39DDB)",
};

export const DARK = {
  name: "dark",
  page: "#0B1220",
  surface: "#1E293B",
  sidebar: "#111C31",
  textPrimary: "#F1F5F9",
  textSecondary: "#94A3B8",
  textFaint: "#64748B",
  border: "#2A3B55",
  teal: "#5FD1C4",
  tealDeep: "#4DB6AC",
  tealGrad: "linear-gradient(135deg,#4DB6AC,#2F8F86)",
  tealSoft: "rgba(77,182,172,0.14)",
  lavender: "#C4B5EE",
  lavenderDeep: "#B39DDB",
  lavenderGrad: "linear-gradient(135deg,#C4B5EE,#8A6FC0)",
  lavenderSoft: "rgba(179,157,219,0.12)",
  coral: "#FF9A90",
  coralDeep: "#FF8A80",
  coralGrad: "linear-gradient(135deg,#FF9A90,#E15C50)",
  coralSoft: "rgba(255,138,128,0.12)",
  coralBorder: "rgba(255,138,128,0.35)",
  amber: "#F5C463",
  amberSoft: "rgba(245,185,66,0.14)",
  shadow: "0 12px 30px -10px rgba(0,0,0,0.5)",
  inputBg: "#0F172A",
  track: "#334155",
  heroGrad: "linear-gradient(160deg,#2F8F86,#6E5AA6)",
};

export function GlobalStyle() {
  return (
    <style>{`
      * { box-sizing: border-box; }
      .mga-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
      .mga-scroll::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.4); border-radius: 8px; }
      .mga-card { transition: transform .15s ease, box-shadow .15s ease; }
      .mga-btn { transition: opacity .15s ease, transform .1s ease; }
      .mga-btn:active { transform: scale(0.98); }
      .mga-chip:hover { filter: brightness(1.04); }
      @media (max-width: 980px) {
        .mga-grid-4 { grid-template-columns: 1fr 1fr !important; }
        .mga-grid-2 { grid-template-columns: 1fr !important; }
        .mga-admin-sidebar { display: none !important; }
      }
      input:focus, select:focus, textarea:focus, button:focus-visible {
        outline: 2px solid #4DB6AC;
        outline-offset: 2px;
      }
    `}</style>
  );
}

export function Card({ t, children, style, className }) {
  return (
    <div
      className={`mga-card ${className || ""}`}
      style={{
        background: t.surface,
        borderRadius: 18,
        border: `1px solid ${t.border}`,
        padding: 20,
        boxShadow: t.shadow,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function PrimaryButton({ grad, shadowColor, children, onClick, style, disabled }) {
  return (
    <button
      className="mga-btn"
      onClick={onClick}
      disabled={disabled}
      style={{
        border: "none",
        borderRadius: 14,
        padding: "12px 20px",
        fontWeight: 600,
        fontSize: 13.5,
        color: "#fff",
        background: grad,
        boxShadow: `0 10px 22px ${shadowColor}`,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.6 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function GhostButton({ t, children, onClick, style, active }) {
  return (
    <button
      className="mga-btn mga-chip"
      onClick={onClick}
      style={{
        border: `1px solid ${active ? t.teal : t.border}`,
        borderRadius: 12,
        padding: "9px 14px",
        fontSize: 12.5,
        fontWeight: active ? 700 : 500,
        color: active ? t.tealDeep : t.textPrimary,
        background: active ? t.tealSoft : t.surface,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function inputStyle(t) {
  return {
    width: "100%",
    borderRadius: 12,
    border: `1px solid ${t.border}`,
    background: t.inputBg,
    color: t.textPrimary,
    padding: "12px 14px",
    fontSize: 13.5,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };
}

export const CHART_COLORS = {
  normal: "#4DB6AC",
  mild: "#8A6FC0",
  moderate: "#F5B942",
  high_distress: "#E15C50",
};

export const TIER_ORDER = ["normal", "mild", "moderate", "high_distress"];
export const TIER_LABELS = {
  normal: "Normal",
  mild: "Mild",
  moderate: "Moderate",
  high_distress: "High Distress",
};