import React, { useEffect, useState } from "react";
import {
  Users, HeartPulse, TrendingUp, ClipboardCheck, Megaphone,
  Download, ShieldCheck, PhoneCall, Stethoscope, UsersRound,
} from "lucide-react";
import { Card, GhostButton, PrimaryButton } from "./theme";
import { adminApi } from "./api";

import MetricCard from "./components/MetricCard";
import RiskDistributionChart from "./components/RiskDistributionChart";
import TrendsLineChart from "./components/TrendsLineChart";
import DepartmentBarChart from "./components/DepartmentBarChart";
import StressFactorsChart from "./components/StressFactorsChart";
import BroadcastModal from "./components/BroadcastModal";
import AnomalyBanner from "./components/AnomalyBanner";

const PERIODS = [
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "semester", label: "Semester-to-date" },
];

export default function AdminDashboard({ t, actor, onLogout }) {
  const [period, setPeriod] = useState("7d");
  const [groupBy, setGroupBy] = useState("department");

  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const [stressFactors, setStressFactors] = useState(null);
  const [utilization, setUtilization] = useState(null);
  const [broadcasts, setBroadcasts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastStatus, setBroadcastStatus] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    Promise.all([
      adminApi.aggregateStats(period),
      adminApi.cohortTrends(period),
      adminApi.departmentBreakdown(period, groupBy),
      adminApi.stressFactors(period),
      adminApi.resourceUtilization(period),
      adminApi.listBroadcasts(),
    ])
      .then(([s, tr, b, sf, ru, bc]) => {
        if (cancelled) return;
        setStats(s);
        setTrends(tr);
        setBreakdown(b);
        setStressFactors(sf);
        setUtilization(ru);
        setBroadcasts(bc);
      })
      .catch((err) => !cancelled && setError(err.message || "Couldn't load analytics — is the backend running?"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [period, groupBy]);

  async function refreshBreakdownOnly(nextGroupBy) {
    setGroupBy(nextGroupBy);
  }

  function scrollToSection(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleBroadcastSubmit(payload) {
    const created = await adminApi.createBroadcast(payload);
    setBroadcasts((prev) => [created, ...prev]);
    setShowBroadcastModal(false);
    setBroadcastStatus(`Published "${created.title}" to ${created.target_group}.`);
    setTimeout(() => setBroadcastStatus(""), 5000);
  }

  const kpis = stats?.kpis;

  return (
    <div style={{ minHeight: "100vh", background: t.page }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 28px 60px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14, marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: t.tealGrad, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShieldCheck size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: t.textPrimary }}>Cohort Wellness Analytics</div>
              <div style={{ fontSize: 12, color: t.textSecondary }}>Signed in as {actor?.name} · {actor?.role}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <a href={adminApi.exportSummaryCsvUrl(period)} style={{ textDecoration: "none" }}>
              <GhostButton t={t}>
                <Download size={14} /> Export CSV
              </GhostButton>
            </a>
            <PrimaryButton grad={t.lavenderGrad} shadowColor="rgba(179,157,219,0.4)" onClick={() => setShowBroadcastModal(true)}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Megaphone size={15} /> New broadcast
              </span>
            </PrimaryButton>
            <GhostButton t={t} onClick={onLogout}>Log out</GhostButton>
          </div>
        </div>

        {/* Privacy badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: t.tealSoft, border: `1px solid ${t.teal}33`, borderRadius: 14, padding: "12px 16px", marginBottom: 18, fontSize: 12, color: t.tealDeep, fontWeight: 600 }}>
          <ShieldCheck size={16} style={{ flexShrink: 0 }} />
          Privacy Protected: end-to-end k-anonymized aggregate metrics. Individual student identities and personal journals are mathematically redacted.
        </div>

        {/* Time filter bar */}
        <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
          {PERIODS.map((p) => (
            <GhostButton key={p.key} t={t} active={period === p.key} onClick={() => setPeriod(p.key)}>
              {p.label}
            </GhostButton>
          ))}
        </div>

        {broadcastStatus && (
          <div style={{ fontSize: 12.5, color: t.tealDeep, marginBottom: 14 }}>{broadcastStatus}</div>
        )}
        {error && (
          <div style={{ fontSize: 12.5, color: t.coralDeep, marginBottom: 14 }}>{error}</div>
        )}

        {/* Anomaly alerts */}
        {stats?.anomalies?.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <AnomalyBanner t={t} anomalies={stats.anomalies} />
          </div>
        )}

        {/* KPI banner */}
        <div className="mga-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 18 }}>
          <MetricCard
            t={t} icon={Users} iconColor={t.tealDeep} iconBg={t.tealSoft}
            label="Active enrolled students" value={loading ? "—" : kpis?.total_active_students ?? "—"}
            ctaLabel="View breakdown" onCtaClick={() => scrollToSection("department-breakdown")}
          />
          <MetricCard
            t={t} icon={HeartPulse} iconColor={t.lavenderDeep} iconBg={t.lavenderSoft}
            label="Campus wellness index" value={loading ? "—" : kpis?.wellness_index != null ? `${kpis.wellness_index}` : "—"}
            sub="0–100, higher is better"
            ctaLabel="View trend" onCtaClick={() => scrollToSection("mood-trend")}
          />
          <MetricCard
            t={t} icon={TrendingUp} iconColor={t.coralDeep} iconBg={t.coralSoft}
            label="Moderate/High risk flagged" value={loading ? "—" : `${kpis?.high_moderate_risk_percent ?? 0}%`}
            sub={stats ? `of ${stats.sample_size} active students` : ""}
            ctaLabel="Send broadcast" onCtaClick={() => setShowBroadcastModal(true)}
          />
          <MetricCard
            t={t} icon={ClipboardCheck} iconColor={t.tealDeep} iconBg={t.tealSoft}
            label="Weekly check-in completion" value={loading ? "—" : `${kpis?.weekly_checkin_completion_rate ?? 0}%`}
            ctaLabel="View utilization" onCtaClick={() => scrollToSection("resource-utilization")}
          />
        </div>

        {/* Charts row 1 */}
        <div id="mood-trend" className="mga-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 16, marginBottom: 16, scrollMarginTop: 20 }}>
          <RiskDistributionChart t={t} distribution={stats?.risk_distribution} sampleSize={stats?.sample_size} />
          <TrendsLineChart t={t} points={trends?.points} />
        </div>

        {/* Charts row 2 */}
        <div id="department-breakdown" className="mga-grid-2" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16, marginBottom: 16, scrollMarginTop: 20 }}>
          <DepartmentBarChart
            t={t}
            buckets={breakdown?.buckets}
            kThreshold={breakdown?.k_threshold ?? 5}
            groupBy={groupBy}
            setGroupBy={refreshBreakdownOnly}
          />
          <StressFactorsChart t={t} factors={stressFactors?.factors} kThreshold={stressFactors?.k_threshold ?? 5} />
        </div>

        {/* Resource utilization + recent broadcasts */}
        <div id="resource-utilization" className="mga-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 16, scrollMarginTop: 20 }}>
          <Card t={t}>
            <div style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, marginBottom: 14 }}>
              Counselor resource utilization
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <UtilRow t={t} icon={PhoneCall} label="Crisis helpline taps" value={utilization?.helpline_taps} color={t.coralDeep} bg={t.coralSoft} />
              <UtilRow t={t} icon={Stethoscope} label="Counselor contact requests" value={utilization?.counselor_contacts} color={t.tealDeep} bg={t.tealSoft} />
              <UtilRow t={t} icon={UsersRound} label="Trusted contact alerts" value={utilization?.trusted_contact_alerts} color={t.lavenderDeep} bg={t.lavenderSoft} />
            </div>
          </Card>

          <Card t={t}>
            <div style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, marginBottom: 14 }}>
              Recent broadcasts
            </div>
            {broadcasts.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 260, overflowY: "auto" }} className="mga-scroll">
                {broadcasts.map((b) => (
                  <div key={b.id} style={{ borderBottom: `1px solid ${t.border}`, paddingBottom: 10 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: t.textPrimary }}>{b.title}</div>
                    <div style={{ fontSize: 11.5, color: t.textSecondary, marginTop: 2 }}>{b.message}</div>
                    <div style={{ fontSize: 10.5, color: t.textFaint, marginTop: 4 }}>
                      → {b.target_group} · {new Date(b.created_at).toLocaleString()} · {b.created_by}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12.5, color: t.textFaint }}>No broadcasts published yet.</div>
            )}
          </Card>
        </div>
      </div>

      {showBroadcastModal && (
        <BroadcastModal t={t} onClose={() => setShowBroadcastModal(false)} onSubmit={handleBroadcastSubmit} />
      )}
    </div>
  );
}

function UtilRow({ t, icon: Icon, label, value, color, bg }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={16} color={color} />
      </div>
      <div style={{ flex: 1, fontSize: 12.5, color: t.textPrimary }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: t.textPrimary }}>{value ?? "—"}</div>
    </div>
  );
}