import React from "react";

/* The admin app shares the student app's design system (src/styles.css).
   `t` values are CSS-variable strings so they follow <html data-theme>.
   Recharts needs literal colours, so charts read CHART instead. */

const VARS = {
  page: "var(--bg)",
  surface: "var(--surface)",
  sidebar: "var(--surface-solid)",
  textPrimary: "var(--text)",
  textSecondary: "var(--text-2)",
  textFaint: "var(--text-3)",
  border: "var(--border)",
  teal: "var(--teal)",
  tealDeep: "var(--teal)",
  tealGrad: "var(--grad-teal)",
  tealSoft: "var(--teal-soft)",
  lavender: "var(--lavender)",
  lavenderDeep: "var(--violet)",
  lavenderGrad: "var(--grad-violet)",
  lavenderSoft: "var(--violet-soft)",
  coral: "var(--coral)",
  coralDeep: "var(--coral)",
  coralGrad: "var(--grad-coral)",
  coralSoft: "var(--coral-soft)",
  coralBorder: "rgba(255,155,148,0.35)",
  amber: "var(--amber)",
  amberSoft: "var(--amber-soft)",
  shadow: "var(--shadow)",
  inputBg: "var(--input-bg)",
  track: "var(--surface-2)",
  heroGrad: "var(--grad-brand)",
};

export const LIGHT = { name: "light", ...VARS };
export const DARK = { name: "dark", ...VARS };

/* Literal colours for recharts (axis, grid, tooltip) — mid-tones readable on both themes. */
export const CHART = {
  axis: "#8f9abd",
  grid: "rgba(143,154,189,0.22)",
  text: "#c9d0ea",
  tooltipBg: "#141b35",
  tooltipBorder: "rgba(255,255,255,0.18)",
  tooltipText: "#eef1fb",
  teal: "#2dd4bf",
  violet: "#a78bfa",
  amber: "#fbc65d",
  coral: "#ff8076",
  refHigh: "#ff8076",
  refMid: "#fbc65d",
};

export const tooltipStyles = {
  contentStyle: {
    background: CHART.tooltipBg,
    border: `1px solid ${CHART.tooltipBorder}`,
    borderRadius: 12,
    fontSize: 12,
    color: CHART.tooltipText,
  },
  labelStyle: { color: CHART.tooltipText, fontWeight: 600 },
  itemStyle: { color: CHART.tooltipText },
};

export const CHART_COLORS = {
  normal: CHART.teal,
  mild: CHART.violet,
  moderate: CHART.amber,
  high_distress: CHART.coral,
};

export const TIER_ORDER = ["normal", "mild", "moderate", "high_distress"];
export const TIER_LABELS = {
  normal: "Normal",
  mild: "Mild",
  moderate: "Moderate",
  high_distress: "High Distress",
};

export function GlobalStyle() {
  return (
    <style>{`
      * { box-sizing: border-box; }
      html, body { margin: 0; background: var(--bg); }
      .mga-root { position: relative; z-index: 1; min-height: 100vh; color: var(--text); font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      .mga-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
      .mga-scroll::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 8px; }
      .mga-card { transition: transform .2s ease, border-color .2s ease; }
      .mga-btn { transition: opacity .15s ease, transform .1s ease, filter .15s ease; }
      .mga-btn:active { transform: scale(0.98); }
      .mga-chip:hover { filter: brightness(1.1); }
      .mga-grid-4 { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
      @media (max-width: 980px) {
        .mga-grid-4 { grid-template-columns: 1fr 1fr !important; }
        .mga-grid-2 { grid-template-columns: 1fr !important; }
      }
      @media (max-width: 520px) {
        .mga-grid-4 { gap: 10px; }
        .mga-pad { padding: 16px 14px 48px !important; }
      }
      input:focus-visible, select:focus-visible, textarea:focus-visible, button:focus-visible, a:focus-visible {
        outline: 2px solid var(--violet);
        outline-offset: 2px;
      }
    `}</style>
  );
}

export function Card({ t: _t, children, style, className }) {
  return (
    <div className={`mga-card mg-card ${className || ""}`} style={style}>
      {children}
    </div>
  );
}

export function PrimaryButton({ shadowColor: _s, grad, children, onClick, style, disabled, type = "button", ...rest }) {
  const violet = grad && grad.includes("violet");
  return (
    <button
      type={type}
      className="mga-btn mg-btn"
      onClick={onClick}
      disabled={disabled}
      style={{
        background: grad || "var(--grad-brand)",
        color: violet ? "#140c33" : grad ? "var(--on-accent)" : "#fff",
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

export function GhostButton({ t: _t, children, onClick, style, active, type = "button", ...rest }) {
  return (
    <button
      type={type}
      className={`mga-btn mg-btn ghost sm ${active ? "mga-active" : ""}`}
      onClick={onClick}
      aria-pressed={active === undefined ? undefined : !!active}
      style={{
        ...(active ? { borderColor: "var(--violet)", background: "var(--violet-soft)", color: "var(--lavender)" } : null),
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

export function inputStyle() {
  return {
    width: "100%",
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "var(--input-bg)",
    color: "var(--text)",
    padding: "12px 14px",
    fontSize: 13.5,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };
}
