import React from "react";
import { Mail, Phone, MessageSquare, ArrowUp, ArrowDown, ArrowRight } from "lucide-react";

/** Backend timestamps are UTC ISO strings; treat naive ones as UTC. */
export function parseTs(iso) {
  if (!iso) return null;
  const hasZone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(iso);
  const d = new Date(hasZone ? iso : `${iso}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function ago(iso) {
  const d = parseTs(iso);
  if (!d) return "";
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  return `${Math.floor(diff / 86400)} d ago`;
}

export function fmtDateTime(iso) {
  const d = parseTs(iso);
  return d ? d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "";
}

export const CHANNELS = {
  in_app: { label: "In-app message", Icon: MessageSquare },
  email: { label: "Email", Icon: Mail },
  phone: { label: "Phone", Icon: Phone },
};

export function channelMeta(key) {
  return CHANNELS[key] || { label: key || "In-app message", Icon: MessageSquare };
}

export function TrendBadge({ trend }) {
  if (trend === "rising") return <span className="mga-trend rising"><ArrowUp size={14} aria-hidden="true" /> Rising</span>;
  if (trend === "easing") return <span className="mga-trend easing"><ArrowDown size={14} aria-hidden="true" /> Easing</span>;
  if (trend === "steady") return <span className="mga-trend steady"><ArrowRight size={14} aria-hidden="true" /> Steady</span>;
  return <span className="mga-trend new">New</span>;
}

export const ACTION_LABELS = {
  reviewed: "Marked reviewed",
  schedule: "Intervention scheduled",
  outreach: "In-app message sent",
  resolve: "Resolved",
};

export function sparkColor(risk) {
  return risk === "critical" ? "var(--coral)" : risk === "moderate" ? "var(--amber)" : "var(--teal)";
}
