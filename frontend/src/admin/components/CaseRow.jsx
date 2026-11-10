import React from "react";
import { CheckCheck, Eye, HeartHandshake, UserCheck, UserX } from "lucide-react";
import { Sparkline } from "../../components/ui";
import { ago, channelMeta, sparkColor } from "./caseUtils";

const RISK_LABEL = { critical: "Critical", moderate: "Moderate", stable: "Stable" };
const TREND = {
  rising: { cls: "rising", text: "↑ Rising Distress" },
  easing: { cls: "easing", text: "↓ Stabilizing" },
  steady: { cls: "steady", text: "→ Steady" },
  new: { cls: "new", text: "New" },
};

export default function CaseRow({ c, selected, fresh, busy, onOpen, onReach, onAck }) {
  const flag = c.flag;
  const connect = flag?.connect_requested;
  const ch = connect ? channelMeta(flag.connect_channel) : null;
  const open = flag && flag.status !== "resolved";
  const inReview = flag?.status === "in_progress";
  const trend = TREND[c.trend] || TREND.new;
  const cls = ["mga-case", c.risk, selected && "sel", fresh && "fresh"].filter(Boolean).join(" ");
  const stop = (fn) => (e) => { e.stopPropagation(); fn(); };

  return (
    <div className={cls} role="button" tabIndex={0} aria-label={`Open case ${c.alias}, ${c.risk} risk`}
      onClick={() => onOpen(c.alias)}
      onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onOpen(c.alias); } }}>
      <div className="mga-case-id">
        <div className="mg-row-wrap" style={{ gap: 8 }}>
          <span className="mga-alias">{c.alias}</span>
          {fresh && <span className="mga-pill new">New</span>}
        </div>
        <div className="mg-row-wrap" style={{ gap: 6 }}>
          <span className={`mga-pill risk ${c.risk}`}>{RISK_LABEL[c.risk]}</span>
          {connect && <span className="mga-pill connect"><ch.Icon size={11} aria-hidden="true" /> Connect Request</span>}
          {c.identity
            ? <span className="mga-pill identity"><UserCheck size={11} aria-hidden="true" /> Identity Shared</span>
            : <span className="mga-pill anon"><UserX size={11} aria-hidden="true" /> Anonymous</span>}
          {inReview && <span className="mga-pill review">In Review</span>}
        </div>
        {c.tags?.length > 0 && (
          <div className="mga-tags" aria-label="Distress markers">
            {c.tags.map((t) => <span key={t} className="mga-tag sm">{t}</span>)}
          </div>
        )}
      </div>

      <div className="mga-case-score">
        <span className={`mga-score ${c.risk}`} title={c.latest_category || ""}>
          <b>{c.latest_score ?? "—"}</b><small>/100</small>
        </span>
        <div className="mg-stack-sm" style={{ gap: 2, minWidth: 0 }}>
          <span className={`mga-trend ${trend.cls}`}>{trend.text}</span>
          <span className="mg-tiny mg-faint">
            {flag ? `Flagged ${ago(flag.created_at)}` : `Last entry ${ago(c.latest_at) || "—"}`}
          </span>
        </div>
      </div>

      <div className="mga-case-spark" aria-hidden="true">
        <Sparkline values={c.sparkline || []} height={42} color={sparkColor(c.risk)} />
        <span className="mg-tiny mg-faint">7-day avg {c.avg_7d ?? "—"}</span>
      </div>

      <div className="mga-case-actions">
        <button type="button" className="mga-act primary" onClick={stop(() => onOpen(c.alias))}><Eye size={14} /> View Case</button>
        <button type="button" className="mga-act" disabled={!open || busy} onClick={stop(() => onReach(c.alias))}
          title={open ? "Send a supportive in-app nudge" : "Available once a flag is open"}><HeartHandshake size={14} /> Reach Out</button>
        <button type="button" className="mga-act" disabled={!open || inReview || busy} onClick={stop(() => onAck(c.alias))}
          title={inReview ? "Already in review" : "Mark acknowledged"}><CheckCheck size={14} /> {inReview ? "In Review" : "Acknowledge"}</button>
      </div>
    </div>
  );
}
