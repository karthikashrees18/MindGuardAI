import React from "react";
import { UserCheck } from "lucide-react";
import { CategoryBadge, Sparkline } from "../../components/ui";
import { TrendBadge, ago, channelMeta, sparkColor } from "./caseUtils";

export default function CaseRow({ c, selected, fresh, onOpen }) {
  const flag = c.flag;
  const connect = flag?.connect_requested;
  const ch = connect ? channelMeta(flag.connect_channel) : null;
  const cls = ["mga-case", c.risk, selected && "sel", fresh && "fresh"].filter(Boolean).join(" ");

  return (
    <button type="button" className={cls} onClick={() => onOpen(c.alias)} aria-label={`Open case ${c.alias}, ${c.risk} risk`}>
      <div className="mg-stack-sm" style={{ gap: 8, alignItems: "flex-start" }}>
        <div className="mg-row-wrap" style={{ gap: 8 }}>
          <span className="mga-alias">{c.alias}</span>
          {fresh && <span className="mga-pill new">New</span>}
        </div>
        <div className="mg-row-wrap" style={{ gap: 6 }}>
          <CategoryBadge risk={c.risk} />
          {connect && (
            <span className="mga-pill connect"><ch.Icon size={11} aria-hidden="true" /> Connect request</span>
          )}
          {c.identity && (
            <span className="mga-pill identity"><UserCheck size={11} aria-hidden="true" /> Identity shared</span>
          )}
        </div>
      </div>

      <div className="mg-stack-sm" style={{ gap: 4 }}>
        <div className="mga-statline">
          <b>{c.latest_score ?? "—"}</b>
          <span className="mg-small mg-muted">{c.latest_category || "No scored entries"}</span>
        </div>
        <div className="mg-small mg-faint">
          7-day avg <b style={{ color: "var(--text-2)" }}>{c.avg_7d ?? "—"}</b>
          {" · "}
          <TrendBadge trend={c.trend} />
        </div>
      </div>

      <div aria-hidden="true" style={{ minWidth: 0 }}>
        <Sparkline values={c.sparkline || []} height={40} color={sparkColor(c.risk)} />
      </div>

      <div className="mg-small mg-faint" style={{ textAlign: "left" }}>
        {flag ? <>Flagged {ago(flag.created_at)}<br />Status: {flag.status.replace(/_/g, " ")}</> : <>Last entry {ago(c.latest_at) || "—"}</>}
      </div>
    </button>
  );
}
