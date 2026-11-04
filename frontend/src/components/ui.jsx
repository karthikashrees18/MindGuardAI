// Shared UI primitives. Styling lives in src/styles.css (mg-* classes).
import React, { useEffect } from "react";
import { X } from "lucide-react";
import { CATEGORY_META, RISK_META, categoryOf } from "../lib/constants";

export function Card({ className = "", tint, lift, glow, flush, children, ...rest }) {
  const cls = ["mg-card", tint && `tint-${tint}`, lift && "lift", glow && "glow", flush && "pad-0", className]
    .filter(Boolean).join(" ");
  return <div className={cls} {...rest}>{children}</div>;
}

/** variant: primary (default) | teal | violet | coral | ghost | quiet · size: sm | lg */
export function Button({ variant = "", size = "", block, loading, icon: Icon, children, className = "", disabled, ...rest }) {
  const cls = ["mg-btn", variant, size, block && "block", className].filter(Boolean).join(" ");
  return (
    <button className={cls} disabled={disabled || loading} {...rest}>
      {loading ? <span className="mg-spinner" /> : Icon ? <Icon size={size === "sm" ? 14 : 16} /> : null}
      {children}
    </button>
  );
}

export function Chip({ on, onClick, icon: Icon, tone = "", children, ...rest }) {
  return (
    <button type="button" className={`mg-chip ${tone} ${on ? "on" : ""}`} onClick={onClick} aria-pressed={!!on} {...rest}>
      {Icon && <Icon size={15} />}
      {children}
    </button>
  );
}

/** Large selectable row used by the onboarding steps. */
export function Choice({ on, onClick, icon: Icon, title, hint }) {
  return (
    <button type="button" className={`mg-choice ${on ? "on" : ""}`} onClick={onClick} aria-pressed={!!on}>
      {Icon && <span className="ico"><Icon size={18} /></span>}
      <span style={{ flex: 1 }}>
        <b style={{ display: "block", fontSize: 13.5 }}>{title}</b>
        {hint && <span className="mg-faint mg-small">{hint}</span>}
      </span>
    </button>
  );
}

export function Field({ label, hint, error, children }) {
  return (
    <div>
      {label && <label className="mg-label">{label}</label>}
      {children}
      {error ? <div className="mg-error" role="alert">{error}</div> : hint ? <div className="mg-hint">{hint}</div> : null}
    </div>
  );
}

/** category: "calm" | "mild" | "critical"  OR risk: "critical" | "moderate" | "stable" */
export function CategoryBadge({ category, risk, label }) {
  if (risk) {
    const m = RISK_META[risk] || RISK_META.stable;
    return <span className={`mg-badge ${m.cls}`}>{label || m.label}</span>;
  }
  const m = CATEGORY_META[category] || CATEGORY_META.calm;
  return <span className={`mg-badge ${category || "calm"}`}>{label || m.label}</span>;
}

/** Circular gauge. Colour follows the score band unless `color` is given. */
export function ScoreRing({ score, size = 132, stroke = 11, label = "SCORE", color }) {
  const value = score == null ? 0 : Math.max(0, Math.min(100, score));
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const col = color || CATEGORY_META[categoryOf(score)].color;
  return (
    <div className="mg-ring" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${score ?? "no data"}`}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <circle className="fg" cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - value / 100)} />
      </svg>
      <div className="num">
        <b style={{ color: col, fontSize: size * 0.27 }}>{score == null ? "—" : Math.round(value)}</b>
        <small>{label}</small>
      </div>
    </div>
  );
}

/** Minimal SVG area-line chart for 0-100 series. */
export function Sparkline({ values = [], height = 56, color = "var(--violet)", width = 240, bands = false }) {
  if (!values.length) return <div className="mg-faint mg-small" style={{ height }}>No data yet</div>;
  const n = values.length;
  const pad = 4;
  const x = (i) => (n === 1 ? width / 2 : pad + (i * (width - pad * 2)) / (n - 1));
  const y = (v) => pad + (1 - Math.max(0, Math.min(100, v)) / 100) * (height - pad * 2);
  const pts = values.map((v, i) => `${x(i)},${y(v)}`);
  const area = `M${x(0)},${height} L${pts.join(" L")} L${x(n - 1)},${height} Z`;
  const gid = `sg-${Math.abs(values.reduce((a, v, i) => a + v * (i + 1), 7))}`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none" role="img" aria-label="trend">
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {bands && (
        <>
          <line x1="0" x2={width} y1={y(70)} y2={y(70)} stroke="var(--coral)" strokeOpacity="0.35" strokeDasharray="3 4" />
          <line x1="0" x2={width} y1={y(40)} y2={y(40)} stroke="var(--amber)" strokeOpacity="0.35" strokeDasharray="3 4" />
        </>
      )}
      <path d={area} fill={`url(#${gid})`} />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {values.map((v, i) => (i === n - 1 ? <circle key={i} cx={x(i)} cy={y(v)} r="3.6" fill={color} /> : null))}
    </svg>
  );
}

export function Modal({ open, onClose, title, children, footer, width }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="mg-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="mg-modal" role="dialog" aria-modal="true" aria-label={title} style={width ? { maxWidth: width } : undefined}>
        <div className="mg-row mg-between" style={{ marginBottom: 14 }}>
          <h3 className="mg-h2">{title}</h3>
          {onClose && (
            <button className="mg-btn quiet" onClick={onClose} aria-label="Close" style={{ padding: 6 }}><X size={18} /></button>
          )}
        </div>
        {children}
        {footer && <div className="mg-row-wrap" style={{ marginTop: 20, justifyContent: "flex-end" }}>{footer}</div>}
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, eyebrow }) {
  return (
    <div className="mg-row mg-between" style={{ alignItems: "flex-end", flexWrap: "wrap", gap: 14, marginBottom: 22 }}>
      <div>
        {eyebrow && <div className="mg-eyebrow" style={{ marginBottom: 6 }}>{eyebrow}</div>}
        <h1 className="mg-h1">{title}</h1>
        {subtitle && <p className="mg-muted" style={{ marginTop: 5 }}>{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <div style={{ textAlign: "center", padding: "28px 12px" }}>
      {Icon && <div className="mg-icon-tile violet" style={{ margin: "0 auto 12px", width: 52, height: 52 }}><Icon size={24} /></div>}
      <div className="mg-h3">{title}</div>
      {body && <p className="mg-muted mg-small" style={{ margin: "6px auto 14px", maxWidth: 340 }}>{body}</p>}
      {action}
    </div>
  );
}

export function Skeleton({ height = 80, style }) {
  return <div className="mg-skeleton" style={{ height, ...style }} />;
}

export function Toasts({ toasts }) {
  return (
    <div className="mg-toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`mg-toast ${t.type}`}>{t.message}</div>
      ))}
    </div>
  );
}

export function Aurora() {
  return <div className="mg-aurora" aria-hidden="true"><span /></div>;
}

export function Equalizer() {
  return <span className="mg-eq" aria-hidden="true"><i /><i /><i /><i /></span>;
}

export function relTime(iso) {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  return `${Math.floor(diff / 86400)} d ago`;
}
