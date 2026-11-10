// Executive KPI cards for the counselor portal: count, share of monitored students,
// 24h movement and a progress bar. Clicking a card filters the queue.
import React from "react";
import { AlertTriangle, Leaf, MessageCircle, Siren } from "lucide-react";

function Kpi({ cls, icon: Icon, label, value, sub, delta, pct, active, onClick, pulse, loading }) {
  return (
    <button type="button" className={`mga-kpi ${cls}`} aria-pressed={active} onClick={onClick}>
      <span className="l"><Icon size={14} aria-hidden="true" /> {label}
        {pulse && <span className="mga-pulse" aria-label="Pending requests" />}
      </span>
      <span className="n">{loading ? "—" : value}</span>
      <span className="sub">{loading ? "Loading…" : sub}</span>
      {delta && <span className="delta">{delta}</span>}
      <span className="mga-bar" aria-hidden="true"><i style={{ width: `${Math.min(100, Math.max(loading ? 0 : 3, pct || 0))}%` }} /></span>
    </button>
  );
}

const since = (n) => (n > 0 ? `+${n} since yesterday` : "No new flags in 24h");

export default function KpiCards({ ov, tab, onPick }) {
  const loading = !ov;
  const toggle = (k) => onPick(tab === k ? "all" : k);
  return (
    <div className="mga-kpis mg-stagger" role="group" aria-label="Case summary — click to filter">
      <Kpi cls="critical" icon={Siren} label="Immediate attention" loading={loading} active={tab === "critical"}
        value={ov?.critical.count} pct={ov?.critical.pct}
        sub={ov && `${ov.critical.pct}% of ${ov.monitored} students`} delta={ov && since(ov.critical.new_24h)}
        onClick={() => toggle("critical")} />
      <Kpi cls="moderate" icon={AlertTriangle} label="Moderate / at-risk" loading={loading} active={tab === "moderate"}
        value={ov?.moderate.count} pct={ov?.moderate.pct}
        sub={ov && `${ov.moderate.pct}% of ${ov.monitored} students`} delta={ov && (ov.moderate.new_24h > 0 ? `+${ov.moderate.new_24h} since yesterday` : "Monitoring")}
        onClick={() => toggle("moderate")} />
      <Kpi cls="stable" icon={Leaf} label="Stable / flourishing" loading={loading} active={tab === "stable"}
        value={ov?.stable.count} pct={ov?.stable.pct}
        sub={ov && `${ov.stable.count} of ${ov.monitored} students stable (${ov.stable.pct}%)`} delta={ov && "Healthy baseline"}
        onClick={() => toggle("stable")} />
      <Kpi cls="connect" icon={MessageCircle} label="Open connect requests" loading={loading} active={tab === "connect"}
        value={ov?.connect_requests.count} pct={ov?.connect_requests.pct} pulse={!!ov?.connect_requests.count}
        sub={ov && (ov.connect_requests.count ? "Students asking for a 1-on-1" : "No pending requests")}
        delta={ov && (ov.connect_requests.count ? "Respond soon" : "All clear")}
        onClick={() => toggle("connect")} />
    </div>
  );
}
