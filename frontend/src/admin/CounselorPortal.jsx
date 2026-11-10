// Counselor triage portal: live KPIs, campus analytics, and an interactive case queue.
// Students appear only as anonymous IDs; journal and chat text is never shown here.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Inbox, Printer, RefreshCw, Search, ShieldCheck, PartyPopper } from "lucide-react";
import { Button, EmptyState, Skeleton, Toasts } from "../components/ui";
import { adminApi, counselorApi } from "./api";
import CaseRow from "./components/CaseRow";
import CaseDrawer, { OutreachDialog } from "./components/CaseDrawer";
import KpiCards from "./components/KpiCards";
import { StressorCard, TrendCard } from "./components/CampusCharts";
import { parseTs } from "./components/caseUtils";

const POLL_MS = 20000;

const TIMEFRAMES = [
  { key: "24h", label: "Last 24h", days: 1, period: "7d" },
  { key: "7d", label: "7 Days", days: 7, period: "7d" },
  { key: "30d", label: "30 Days", days: 30, period: "30d" },
  { key: "semester", label: "Semester", days: 112, period: "semester" },
];

const TABS = [
  { key: "all", label: "All Cases", test: () => true },
  { key: "critical", label: "Critical Distress", test: (c) => c.risk === "critical" },
  { key: "moderate", label: "At-Risk", test: (c) => c.risk === "moderate" },
  { key: "connect", label: "Connect Requests", test: (c) => !!c.flag?.connect_requested && c.flag.status !== "resolved" },
  { key: "review", label: "In Review", test: (c) => c.flag?.status === "in_progress" },
  { key: "stable", label: "Resolved / Stable", test: (c) => c.risk === "stable" },
];

const EMPTY = {
  critical: ["All urgent flags addressed.", "No students are currently in critical distress."],
  connect: ["No pending connect requests.", "New requests appear here the moment a student asks to talk."],
  review: ["Nothing in review.", "Cases you acknowledge move here while you follow up."],
};

function csvCell(v) {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportCsv(rows, label) {
  const head = ["Anonymous ID", "Risk", "Latest score", "7-day avg", "Trend", "Status", "Connect request", "Identity shared", "Department", "Markers"];
  const lines = [head, ...rows.map((c) => [
    c.alias, c.risk, c.latest_score, c.avg_7d, c.trend, c.flag?.status || "no open flag",
    c.flag?.connect_requested ? "yes" : "no", c.identity ? "yes" : "no", c.department || "", (c.tags || []).join("; "),
  ])];
  const blob = new Blob([lines.map((r) => r.map(csvCell).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mindguard-anonymized-report-${label}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function CounselorPortal({ onUnauthorized }) {
  const [overview, setOverview] = useState(null);
  const [factors, setFactors] = useState(null);
  const [cases, setCases] = useState(null);
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState("");
  const [tf, setTf] = useState("7d");
  const [selected, setSelected] = useState(null);
  const [reach, setReach] = useState(null);
  const [busyAlias, setBusyAlias] = useState(null);
  const [fresh, setFresh] = useState(() => new Set());
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [toasts, setToasts] = useState([]);

  const prevRef = useRef(null); // alias -> connect_requested at last poll
  const freshTimer = useRef(null);
  const toastTimers = useRef([]);
  const mounted = useRef(true);
  const frame = TIMEFRAMES.find((t) => t.key === tf);

  const notify = useCallback((message, type = "success") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    toastTimers.current.push(setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4500));
  }, []);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const [ov, list, sf] = await Promise.all([
        counselorApi.overview(frame.days, dept || undefined),
        counselorApi.cases(),
        adminApi.stressFactors(frame.period).catch(() => null),
      ]);
      if (!mounted.current) return;

      // Highlight cases / connect requests that appeared since the previous poll.
      const prev = prevRef.current;
      const next = new Map(list.map((c) => [c.alias, !!c.flag?.connect_requested]));
      if (prev) {
        const added = list.filter((c) => !prev.has(c.alias) || (next.get(c.alias) && !prev.get(c.alias)));
        if (added.length) {
          setFresh(new Set(added.map((c) => c.alias)));
          clearTimeout(freshTimer.current);
          freshTimer.current = setTimeout(() => mounted.current && setFresh(new Set()), 15000);
          const wantsConnect = added.some((c) => c.flag?.connect_requested);
          notify(
            added.length === 1
              ? `${wantsConnect ? "New connect request" : "New case"}: ${added[0].alias}`
              : `${added.length} new cases need attention`,
            wantsConnect ? "reward" : "warn"
          );
        }
      }
      prevRef.current = next;
      setOverview(ov);
      setCases(list);
      setFactors(sf);
      setError("");
      setUpdatedAt(new Date());
    } catch (err) {
      if (!mounted.current) return;
      if (err.status === 401 || err.status === 403) return onUnauthorized();
      setError(err.message || "Couldn't load cases — is the backend running?");
    } finally {
      if (mounted.current) setRefreshing(false);
    }
  }, [frame, dept, notify, onUnauthorized]);

  useEffect(() => {
    mounted.current = true;
    load();
    const id = setInterval(() => load(), POLL_MS);
    return () => {
      mounted.current = false;
      clearInterval(id);
      clearTimeout(freshTimer.current);
      toastTimers.current.forEach(clearTimeout);
    };
  }, [load]);

  // search + department + timeframe narrow the pool; tabs then slice it
  const pool = useMemo(() => {
    const q = query.trim().toLowerCase();
    const since = Date.now() - frame.days * 86400000;
    return (cases || []).filter((c) => {
      if (dept && c.department !== dept) return false;
      if (q && !(c.alias.toLowerCase().includes(q) || (c.tags || []).some((t) => t.toLowerCase().includes(q)))) return false;
      if (c.flag && c.flag.status !== "resolved") return true; // open flags are never hidden by the time window
      const d = parseTs(c.latest_at);
      return !!d && d.getTime() >= since;
    });
  }, [cases, query, dept, frame]);

  const counts = useMemo(() => Object.fromEntries(TABS.map((t) => [t.key, pool.filter(t.test).length])), [pool]);
  const visible = useMemo(() => pool.filter(TABS.find((t) => t.key === tab).test), [pool, tab]);
  const selectedCase = useMemo(() => (cases || []).find((c) => c.alias === selected) || null, [cases, selected]);
  const closeDrawer = useCallback(() => setSelected(null), []);

  async function acknowledge(alias) {
    setBusyAlias(alias);
    try {
      await counselorApi.action(alias, { type: "reviewed" });
      notify(`${alias} marked as in review.`, "success");
      await load();
    } catch (err) {
      if (err.status === 401 || err.status === 403) return onUnauthorized();
      notify(err.message || "Couldn't update this case.", "error");
    } finally {
      setBusyAlias(null);
    }
  }

  async function sendNudge(body) {
    try {
      await counselorApi.action(reach, body);
    } catch (err) {
      if (err.status === 401 || err.status === 403) onUnauthorized();
      throw err;
    }
    notify(`Nudge sent to ${reach} — they'll see it confidentially in their app.`, "success");
    setReach(null);
    load();
  }

  const emptyCopy = EMPTY[tab];

  return (
    <div className="mga-portal mg-fade-up">
      <div className="mga-toolbar">
        <div className="mga-live" role="status" aria-live="polite">
          <span className={`mga-live-dot ${error ? "off" : ""}`} aria-hidden="true" />
          <div>
            <b>{error ? "Connection issue" : "Live Monitoring Active"}</b>
            <span>{updatedAt ? `Updated ${updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })} · auto-refresh 20s` : "Connecting…"}</span>
          </div>
          <button type="button" className="mga-icon-btn" onClick={() => load(true)} aria-label="Refresh now" disabled={refreshing}>
            <RefreshCw size={15} className={refreshing ? "mga-spin" : ""} />
          </button>
        </div>

        <label className="mga-search">
          <Search size={15} aria-hidden="true" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search anonymous ID (MG-4E9EC) or marker" aria-label="Search cases" />
        </label>

        <select className="mga-select" value={dept} onChange={(e) => setDept(e.target.value)} aria-label="Filter by department">
          <option value="">All Departments</option>
          {(overview?.departments || []).map((d) => <option key={d} value={d}>{d}</option>)}
        </select>

        <div className="mga-seg" role="group" aria-label="Timeframe">
          {TIMEFRAMES.map((t) => (
            <button key={t.key} type="button" className={tf === t.key ? "on" : ""} aria-pressed={tf === t.key} onClick={() => setTf(t.key)}>{t.label}</button>
          ))}
        </div>

        <div className="mga-export">
          <Button variant="ghost" size="sm" icon={Download} disabled={!pool.length} onClick={() => exportCsv(visible.length ? visible : pool, tf)}>Export Anonymized Report</Button>
          <button type="button" className="mga-icon-btn" onClick={() => window.print()} aria-label="Print summary"><Printer size={15} /></button>
        </div>
      </div>

      <div className="mga-privacy" role="note">
        <ShieldCheck size={17} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
        <span>Students appear as anonymous IDs. Journal and chat text is never shown. Names appear only if a student chooses to share them.</span>
      </div>

      <KpiCards ov={overview} tab={tab} onPick={setTab} />

      <div className="mga-charts">
        <TrendCard ov={overview} />
        <StressorCard factors={factors?.factors} kThreshold={factors?.k_threshold} />
      </div>

      <div className="mga-tabs" role="tablist" aria-label="Case queue filter">
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={tab === t.key ? "on" : ""} onClick={() => setTab(t.key)}>
            {t.label} <i>{cases ? counts[t.key] : "…"}</i>
          </button>
        ))}
      </div>

      {error && <div className="mg-error" role="alert" style={{ marginBottom: 10 }}>{error}</div>}

      <div className="mg-stack-sm mga-queue" aria-live="polite" key={`${tab}-${dept}-${tf}`}>
        {cases === null && !error && [0, 1, 2].map((i) => <Skeleton key={i} height={96} />)}
        {cases !== null && visible.length === 0 && (
          <div className="mg-card">
            <EmptyState
              icon={emptyCopy ? PartyPopper : Inbox}
              title={emptyCopy ? emptyCopy[0] : "No cases match these filters"}
              body={emptyCopy ? emptyCopy[1] : "Try another tab, department or timeframe, or clear the search."}
              action={(query || dept || tab !== "all") ? <Button variant="ghost" size="sm" onClick={() => { setQuery(""); setDept(""); setTab("all"); }}>Reset filters</Button> : null}
            />
          </div>
        )}
        {visible.map((c, i) => (
          <div key={c.alias} className="mga-row-in" style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}>
            <CaseRow c={c} selected={selected === c.alias} fresh={fresh.has(c.alias)} busy={busyAlias === c.alias}
              onOpen={setSelected} onReach={setReach} onAck={acknowledge} />
          </div>
        ))}
      </div>

      {selected && (
        <CaseDrawer
          key={selected}
          alias={selected}
          listCase={selectedCase}
          onClose={closeDrawer}
          onChanged={() => load()}
          notify={notify}
          onUnauthorized={onUnauthorized}
        />
      )}
      <OutreachDialog open={!!reach} alias={reach} onClose={() => setReach(null)} onSubmit={sendNudge} />
      <Toasts toasts={toasts} />
    </div>
  );
}
