import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ShieldCheck, RefreshCw, Siren, AlertTriangle, Leaf, MessageCircle, Inbox } from "lucide-react";
import { Button, Chip, EmptyState, Skeleton, Toasts } from "../components/ui";
import { counselorApi } from "./api";
import CaseRow from "./components/CaseRow";
import CaseDrawer from "./components/CaseDrawer";

const POLL_MS = 20000;

const FILTERS = [
  { key: "all", label: "All" },
  { key: "critical", label: "Critical" },
  { key: "moderate", label: "Moderate" },
  { key: "stable", label: "Stable" },
  { key: "connect", label: "Connect requests" },
];

function matches(c, filter) {
  if (filter === "all") return true;
  if (filter === "connect") return !!c.flag?.connect_requested;
  return c.risk === filter;
}

export default function CounselorPortal({ onUnauthorized }) {
  const [summary, setSummary] = useState(null);
  const [cases, setCases] = useState(null);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [fresh, setFresh] = useState(() => new Set());
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [toasts, setToasts] = useState([]);

  const prevRef = useRef(null); // alias -> connect_requested at last poll
  const freshTimer = useRef(null);
  const toastTimers = useRef([]);
  const mounted = useRef(true);

  const notify = useCallback((message, type = "success") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    const timer = setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4500);
    toastTimers.current.push(timer);
  }, []);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const [s, list] = await Promise.all([counselorApi.summary(), counselorApi.cases()]);
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

      setSummary(s);
      setCases(list);
      setError("");
      setUpdatedAt(new Date());
    } catch (err) {
      if (!mounted.current) return;
      if (err.status === 401 || err.status === 403) return onUnauthorized();
      setError(err.message || "Couldn't load cases — is the backend running?");
    } finally {
      if (mounted.current) setRefreshing(false);
    }
  }, [notify, onUnauthorized]);

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

  const visible = useMemo(() => (cases || []).filter((c) => matches(c, filter)), [cases, filter]);
  const selectedCase = useMemo(() => (cases || []).find((c) => c.alias === selected) || null, [cases, selected]);
  const closeDrawer = useCallback(() => setSelected(null), []);

  const tiles = [
    { key: "critical", cls: "critical", label: "Critical", icon: Siren, value: summary?.critical },
    { key: "moderate", cls: "moderate", label: "Moderate", icon: AlertTriangle, value: summary?.moderate },
    { key: "stable", cls: "stable", label: "Stable", icon: Leaf, value: summary?.stable },
    { key: "connect", cls: "connect", label: "Open connect requests", icon: MessageCircle, value: summary?.connect_requests },
  ];

  return (
    <div className="mg-fade-up">
      <div className="mga-privacy" role="note">
        <ShieldCheck size={17} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
        <span>Students appear as anonymous IDs. Journal and chat text is never shown. Names appear only if a student chooses to share them.</span>
      </div>

      <div className="mga-tiles mg-stagger" role="group" aria-label="Case summary — click to filter">
        {tiles.map((tile) => (
          <button
            key={tile.key}
            type="button"
            className={`mga-tile ${tile.cls}`}
            aria-pressed={filter === tile.key}
            onClick={() => setFilter((f) => (f === tile.key ? "all" : tile.key))}
          >
            <span className="l"><tile.icon size={14} aria-hidden="true" /> {tile.label}</span>
            <span className="n">{summary ? tile.value ?? 0 : "—"}</span>
            {tile.key === "stable" && summary && <span className="mg-tiny mg-faint">{summary.monitored} monitored</span>}
          </button>
        ))}
      </div>

      <div className="mga-queue-bar">
        <div className="mga-filters" role="group" aria-label="Filter cases">
          {FILTERS.map((f) => (
            <Chip key={f.key} on={filter === f.key} onClick={() => setFilter(f.key)}>{f.label}</Chip>
          ))}
        </div>
        <div className="mg-row-wrap" style={{ gap: 10 }}>
          {updatedAt && <span className="mg-tiny mg-faint">Updated {updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })} · auto-refresh 20s</span>}
          <Button variant="ghost" size="sm" icon={RefreshCw} onClick={() => load(true)} loading={refreshing} aria-label="Refresh cases">Refresh</Button>
        </div>
      </div>

      {error && <div className="mg-error" role="alert" style={{ marginBottom: 10 }}>{error}</div>}

      <div className="mg-stack-sm" aria-live="polite">
        {cases === null && !error && [0, 1, 2].map((i) => <Skeleton key={i} height={84} />)}
        {cases !== null && visible.length === 0 && (
          <div className="mg-card">
            <EmptyState
              icon={Inbox}
              title={filter === "all" ? "No monitored cases yet" : "No cases match this filter"}
              body={filter === "all" ? "When a student's check-ins show rising distress, they appear here as an anonymous ID." : "Try another filter or wait for the next refresh."}
              action={filter !== "all" ? <Button variant="ghost" size="sm" onClick={() => setFilter("all")}>Show all cases</Button> : null}
            />
          </div>
        )}
        {visible.map((c) => (
          <CaseRow key={c.alias} c={c} selected={selected === c.alias} fresh={fresh.has(c.alias)} onOpen={setSelected} />
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
      <Toasts toasts={toasts} />
    </div>
  );
}
