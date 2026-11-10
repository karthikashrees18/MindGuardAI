import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";
import { X, Check, CalendarClock, MessageCircle, CheckCheck, Copy, ShieldCheck, Lock, UserCheck, Inbox, NotebookPen } from "lucide-react";
import { Button, CategoryBadge, ScoreRing, Skeleton, Modal, Field } from "../../components/ui";
import { counselorApi } from "../api";
import { CHART, tooltipStyles } from "../theme";
import { TrendBadge, ACTION_LABELS, ago, channelMeta, fmtDateTime, parseTs } from "./caseUtils";

const CAT_LABEL = { calm: "Calm", mild: "Mild", critical: "Critical" };
const CAT_COLOR = { calm: "var(--teal)", mild: "var(--amber)", critical: "var(--coral)" };

const RANGES = [{ days: 7, label: "7 days" }, { days: 14, label: "14 days" }, { days: 30, label: "30 days" }];

const NUDGE_TEMPLATES = [
  "Hi, I noticed things might be heavy lately. I'm here whenever you'd like to talk, no pressure at all.",
  "You're doing better than you think. If it would help, we can set up a short, relaxed chat this week.",
  "Exams and deadlines pile up fast. Remember you don't have to carry it alone. My door is open, in person or online.",
];

function TrendTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div style={{ ...tooltipStyles.contentStyle, padding: "8px 12px" }}>
      <div style={{ fontWeight: 700 }}>{p.label}</div>
      <div>Score {p.score} · {CAT_LABEL[p.category] || p.category}</div>
    </div>
  );
}

export default function CaseDrawer({ alias, listCase, onClose, onChanged, notify, onUnauthorized }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState(null); // schedule | outreach | resolve
  const [copied, setCopied] = useState(false);
  const [range, setRange] = useState(14);
  const [notes, setNotes] = useState(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteBusy, setNoteBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await counselorApi.caseDetail(alias);
      setDetail(d);
      setError("");
    } catch (err) {
      if (err.status === 401 || err.status === 403) return onUnauthorized();
      setError(err.message || "Couldn't load this case.");
    } finally {
      setLoading(false);
    }
  }, [alias, onUnauthorized]);

  useEffect(() => {
    setLoading(true);
    setDetail(null);
    load();
  }, [load]);

  const loadNotes = useCallback(async () => {
    try {
      setNotes(await counselorApi.notes(alias));
    } catch (err) {
      if (err.status === 401 || err.status === 403) return onUnauthorized();
      setNotes([]);
    }
  }, [alias, onUnauthorized]);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  async function saveNote() {
    const text = noteDraft.trim();
    if (!text || noteBusy) return;
    setNoteBusy(true);
    try {
      await counselorApi.addNote(alias, text);
      setNoteDraft("");
      notify("Private note saved.", "success");
      await loadNotes();
    } catch (err) {
      notify(err.message || "Couldn't save the note.", "error");
    } finally {
      setNoteBusy(false);
    }
  }

  useEffect(() => {
    if (dialog) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialog, onClose]);

  const c = detail || listCase;
  const flag = c?.flag;
  const canAct = !!flag && flag.status !== "resolved";

  const chartData = useMemo(
    () =>
      (detail?.trend || []).filter((p) => {
        const d = parseTs(p.at);
        return d && Date.now() - d.getTime() <= range * 86400000;
      }).map((p) => {
        const d = parseTs(p.at);
        return {
          score: p.score,
          category: p.category,
          label: d ? d.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "",
          day: d ? d.toLocaleDateString([], { month: "short", day: "numeric" }) : "",
        };
      }),
    [detail, range]
  );

  async function perform(body, doneMsg) {
    try {
      await counselorApi.action(alias, body);
    } catch (err) {
      if (err.status === 401 || err.status === 403) onUnauthorized();
      throw err;
    }
    notify(doneMsg, "success");
    setDialog(null);
    await load();
    onChanged();
  }

  async function quickReview() {
    try {
      await perform({ type: "reviewed" }, `${alias} marked as reviewed.`);
    } catch (err) {
      notify(err.message || "Couldn't mark as reviewed.", "error");
    }
  }

  async function copyContact(text) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (_) {
      notify("Couldn't copy — select the text manually.", "warn");
    }
  }

  const counts = detail?.category_counts;
  const total = counts ? counts.calm + counts.mild + counts.critical : 0;
  const ch = flag?.connect_requested ? channelMeta(flag.connect_channel) : null;

  return (
    <>
      <div className="mga-drawer-scrim" onClick={onClose} />
      <aside className="mga-drawer" role="dialog" aria-modal="true" aria-label={`Case ${alias}`}>
        <div className="mga-drawer-head">
          <div className="mg-row-wrap" style={{ gap: 10 }}>
            <span className="mga-alias" style={{ fontSize: 16 }}>{alias}</span>
            {c && <CategoryBadge risk={c.risk} />}
          </div>
          <button type="button" className="mga-icon-btn" onClick={onClose} aria-label="Close case panel"><X size={18} /></button>
        </div>

        <div className="mga-drawer-body mga-scroll">
          {error && <div className="mg-error" role="alert">{error}</div>}
          {loading && !c && <Skeleton height={140} />}

          {c && (
            <>
              <div className="mga-section" style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
                <ScoreRing score={c.latest_score} size={112} stroke={10} label="LATEST" />
                <div className="mg-stack-sm" style={{ gap: 6, flex: 1, minWidth: 160 }}>
                  <div className="mg-h3">{c.latest_category || "No scored entries"}</div>
                  <div className="mg-small mg-muted">7-day average <b>{c.avg_7d ?? "—"}</b> · {c.entries_14d} entries in 14 days</div>
                  <TrendBadge trend={c.trend} />
                  {c.latest_at && <div className="mg-tiny mg-faint">Last check-in {ago(c.latest_at)}</div>}
                </div>
              </div>

              <div className="mga-section">
                <div className="mg-row mg-between" style={{ marginBottom: 10 }}>
                  <h4 style={{ margin: 0 }}>Mood and stress trend</h4>
                  <div className="mga-seg" role="group" aria-label="Trend range">
                    {RANGES.map((r) => (
                      <button key={r.days} type="button" className={range === r.days ? "on" : ""} aria-pressed={range === r.days} onClick={() => setRange(r.days)}>{r.label}</button>
                    ))}
                  </div>
                </div>
                {loading ? (
                  <Skeleton height={180} />
                ) : chartData.length ? (
                  <div style={{ width: "100%", height: 200 }} role="img" aria-label="Rumination score over time">
                    <ResponsiveContainer>
                      <AreaChart data={chartData} margin={{ left: -18, right: 8, top: 8, bottom: 0 }}>
                        <defs>
                          <linearGradient id="mgaCaseFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={CHART.violet} stopOpacity={0.4} />
                            <stop offset="100%" stopColor={CHART.violet} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke={CHART.grid} strokeDasharray="4 4" vertical={false} />
                        <XAxis dataKey="day" tick={{ fontSize: 10, fill: CHART.axis }} axisLine={{ stroke: CHART.grid }} tickLine={false} minTickGap={24} />
                        <YAxis domain={[0, 100]} ticks={[0, 40, 70, 100]} tick={{ fontSize: 10, fill: CHART.axis }} axisLine={false} tickLine={false} width={34} />
                        <Tooltip content={<TrendTooltip />} />
                        <ReferenceLine y={70} stroke={CHART.refHigh} strokeDasharray="4 4" strokeOpacity={0.7} />
                        <ReferenceLine y={40} stroke={CHART.refMid} strokeDasharray="4 4" strokeOpacity={0.7} />
                        <Area type="monotone" dataKey="score" stroke={CHART.violet} strokeWidth={2.4} fill="url(#mgaCaseFill)" dot={{ r: 2.5, fill: CHART.violet, strokeWidth: 0 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="mg-small mg-faint">No scored check-ins in this range.</div>
                )}
              </div>

              {counts && (
                <div className="mga-section">
                  <h4>Category distribution</h4>
                  {total ? (
                    <div className="mga-catbar" role="img" aria-label={`Calm ${counts.calm}, mild ${counts.mild}, critical ${counts.critical}`}>
                      {["calm", "mild", "critical"].map((k) =>
                        counts[k] ? <span key={k} style={{ width: `${(counts[k] / total) * 100}%`, background: CAT_COLOR[k] }} /> : null
                      )}
                    </div>
                  ) : null}
                  <div className="mg-row-wrap" style={{ marginTop: 10, gap: 16 }}>
                    {["calm", "mild", "critical"].map((k) => (
                      <span key={k} className="mg-small mg-muted" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                        <i style={{ width: 9, height: 9, borderRadius: 3, background: CAT_COLOR[k], display: "inline-block" }} />
                        {CAT_LABEL[k]} <b style={{ color: "var(--text)" }}>{counts[k]}</b>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {detail?.top_triggers?.length > 0 && (
                <div className="mga-section">
                  <h4>Top trigger tags</h4>
                  <div className="mg-row-wrap">
                    {detail.top_triggers.map((tg) => (
                      <span key={tg.key} className="mga-tag">{tg.label} <i>{tg.count}</i></span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mga-section">
                <h4>Early-warning flag</h4>
                {flag ? (
                  <>
                    <div className="mga-kv"><span>Severity</span><span style={{ textTransform: "capitalize" }}>{flag.severity}</span></div>
                    <div className="mga-kv"><span>Status</span><span style={{ textTransform: "capitalize" }}>{flag.status.replace(/_/g, " ")}</span></div>
                    <div className="mga-kv"><span>Flagged</span><span>{fmtDateTime(flag.created_at)} ({ago(flag.created_at)})</span></div>
                    {flag.reason && <div className="mga-kv"><span>Reason</span><span>{flag.reason}</span></div>}
                  </>
                ) : (
                  <div className="mg-small mg-faint">No open early-warning flag. Actions are available once a flag is raised.</div>
                )}
              </div>

              {ch && (
                <div className="mga-section" style={{ borderColor: "rgba(167,139,250,0.45)" }}>
                  <h4>Connect request</h4>
                  <div className="mga-kv">
                    <span>Preferred channel</span>
                    <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><ch.Icon size={14} aria-hidden="true" /> {ch.label}</span>
                  </div>
                  {flag.connect_requested_at && <div className="mga-kv"><span>Requested</span><span>{ago(flag.connect_requested_at)}</span></div>}
                  <div className="mg-small mg-muted" style={{ marginTop: 6 }}>Message from the student</div>
                  <div style={{ marginTop: 4, padding: "10px 12px", borderRadius: 12, background: "var(--violet-soft)", fontSize: 13.5, lineHeight: 1.55 }}>
                    {flag.student_note ? `"${flag.student_note}"` : <span className="mg-faint">No note added.</span>}
                  </div>
                </div>
              )}

              <div className="mga-section">
                <h4>Identity</h4>
                {c.identity ? (
                  <>
                    <div className="mg-row-wrap" style={{ marginBottom: 6 }}>
                      <span className="mga-pill identity"><UserCheck size={11} aria-hidden="true" /> Shared by the student</span>
                    </div>
                    <div className="mga-kv"><span>Name</span><span>{c.identity.name || "—"}</span></div>
                    {c.identity.email && <div className="mga-kv"><span>Email</span><span>{c.identity.email}</span></div>}
                    {(c.identity.department || c.identity.year_of_study) && (
                      <div className="mga-kv"><span>Department / year</span><span>{[c.identity.department, c.identity.year_of_study && `Year ${c.identity.year_of_study}`].filter(Boolean).join(" · ")}</span></div>
                    )}
                    <div className="mga-kv">
                      <span>Contact via</span>
                      <span>{channelMeta(c.identity.channel).label}</span>
                    </div>
                    {c.identity.contact_detail ? (
                      <div className="mg-row" style={{ marginTop: 6 }}>
                        <code style={{ flex: 1, padding: "8px 12px", borderRadius: 10, background: "var(--input-bg)", border: "1px solid var(--border)", fontSize: 13, wordBreak: "break-all" }}>{c.identity.contact_detail}</code>
                        <Button variant="ghost" size="sm" icon={copied ? Check : Copy} onClick={() => copyContact(c.identity.contact_detail)}>
                          {copied ? "Copied" : "Copy"}
                        </Button>
                      </div>
                    ) : (
                      <div className="mg-small mg-faint" style={{ marginTop: 4 }}>No contact detail given — use the in-app message.</div>
                    )}
                  </>
                ) : (
                  <div className="mg-row" style={{ alignItems: "flex-start" }}>
                    <div className="mg-icon-tile violet" style={{ width: 34, height: 34 }}><Lock size={16} /></div>
                    <div>
                      <div className="mg-h3" style={{ fontSize: 13.5 }}>Anonymous</div>
                      <p className="mg-small mg-muted" style={{ marginTop: 4, lineHeight: 1.55 }}>
                        Student chose to remain anonymous. You can send an in-app encouragement nudge or counselor chat invite.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mga-section">
                <h4><NotebookPen size={12} style={{ verticalAlign: "-2px" }} aria-hidden="true" /> Internal counselor notes</h4>
                <p className="mg-tiny mg-faint" style={{ margin: "0 0 8px" }}>Private to counselors and encrypted at rest. Never shown to the student.</p>
                <textarea className="mg-textarea" style={{ minHeight: 72 }} maxLength={2000} value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="e.g. Outreach completed on Nov 10; follow up after lab exams." aria-label="New private note" />
                <div className="mg-row mg-between" style={{ marginTop: 8 }}>
                  <span className="mg-tiny mg-faint">{noteDraft.length}/2000</span>
                  <Button variant="ghost" size="sm" icon={Check} loading={noteBusy} disabled={!noteDraft.trim()} onClick={saveNote}>Save note</Button>
                </div>
                {notes?.length > 0 && (
                  <ul className="mga-timeline" style={{ marginTop: 12 }}>
                    {notes.map((n) => (
                      <li key={n.id}>
                        <span className="mg-faint">{n.by_name} · {fmtDateTime(n.at)}</span>
                        <div className="mg-small" style={{ whiteSpace: "pre-wrap" }}>{n.text}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mga-section">
                <h4>Action timeline</h4>
                {flag?.actions?.length ? (
                  <ul className="mga-timeline">
                    {flag.actions.map((a, i) => (
                      <li key={a.id || i}>
                        <b>{ACTION_LABELS[a.type] || a.type}</b>
                        <span className="mg-faint"> · {a.by_name || "Counselor"} · {ago(a.at)}</span>
                        {a.type === "schedule" && a.scheduled_for && <div className="mg-small mg-muted">For {fmtDateTime(a.scheduled_for)}</div>}
                        {a.note && <div className="mg-small mg-muted">{a.note}</div>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mg-small mg-faint" style={{ display: "flex", gap: 8, alignItems: "center" }}><Inbox size={14} /> No actions taken yet.</div>
                )}
              </div>

              <div className="mg-small mg-faint" style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <ShieldCheck size={14} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                Scores, trends and trigger tags only. Journal and chat text is never shown.
              </div>
            </>
          )}
        </div>

        <div className="mga-drawer-foot">
          <Button variant="ghost" icon={CheckCheck} onClick={quickReview} disabled={!canAct}>Mark reviewed</Button>
          <Button variant="ghost" icon={CalendarClock} onClick={() => setDialog("schedule")} disabled={!canAct}>Schedule Session</Button>
          <Button variant="violet" icon={MessageCircle} onClick={() => setDialog("outreach")} disabled={!canAct}>Send In-App Counselor Nudge</Button>
          <Button variant="teal" icon={Check} onClick={() => setDialog("resolve")} disabled={!canAct}>Resolve</Button>
        </div>
      </aside>

      <ScheduleDialog open={dialog === "schedule"} onClose={() => setDialog(null)} onSubmit={(b) => perform(b, `Session scheduled for ${alias}.`)} />
      <OutreachDialog open={dialog === "outreach"} alias={alias} onClose={() => setDialog(null)} onSubmit={(b) => perform(b, `Message sent to ${alias} — they'll see it confidentially in their app.`)} />
      <ResolveDialog open={dialog === "resolve"} alias={alias} onClose={() => setDialog(null)} onSubmit={(b) => perform(b, `${alias} resolved.`)} />
    </>
  );
}

function useSubmit(onSubmit) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run(body) {
    setBusy(true);
    setError("");
    try {
      await onSubmit(body);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, run, setError };
}

function defaultSlot() {
  const d = new Date(Date.now() + 24 * 3600 * 1000);
  d.setMinutes(0, 0, 0);
  d.setHours(10);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ScheduleDialog({ open, onClose, onSubmit }) {
  const [when, setWhen] = useState(defaultSlot);
  const [note, setNote] = useState("");
  const { busy, error, run, setError } = useSubmit(onSubmit);
  useEffect(() => { if (open) { setError(""); setNote(""); setWhen(defaultSlot()); } }, [open, setError]);
  function go() {
    const d = new Date(when);
    if (!when || Number.isNaN(d.getTime())) return setError("Pick a date and time.");
    run({ type: "schedule", scheduled_for: d.toISOString(), note: note.trim() || undefined });
  }
  return (
    <Modal open={open} onClose={onClose} title="Schedule in-person / virtual session"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={go}>Schedule</Button></>}>
      <div className="mg-stack-sm">
        <p className="mg-small mg-muted">The student is notified confidentially that a counselor session is planned.</p>
        <Field label="Date and time">
          <input className="mg-input" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        </Field>
        <Field label="Note (optional)">
          <textarea className="mg-textarea" style={{ minHeight: 80 }} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. 20-minute check-in at the wellness centre" />
        </Field>
        {error && <div className="mg-error" role="alert">{error}</div>}
      </div>
    </Modal>
  );
}

export function OutreachDialog({ open, alias, onClose, onSubmit }) {
  const [note, setNote] = useState("");
  const { busy, error, run, setError } = useSubmit(onSubmit);
  useEffect(() => { if (open) { setError(""); setNote(""); } }, [open, setError]);
  function go() {
    if (!note.trim()) return setError("Write a short message first.");
    run({ type: "outreach", note: note.trim() });
  }
  return (
    <Modal open={open} onClose={onClose} title={alias ? `Send in-app nudge to ${alias}` : "Send in-app nudge"}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="violet" loading={busy} onClick={go}>Send nudge</Button></>}>
      <div className="mg-stack-sm">
        <p className="mg-small mg-muted">The student sees this confidentially inside their Mind Guard app. They stay anonymous to you unless they chose to share their identity.</p>
        <div className="mg-row-wrap" role="group" aria-label="Message templates">
          {NUDGE_TEMPLATES.map((m, i) => (
            <button key={i} type="button" className="mg-chip" onClick={() => setNote(m)}>Template {i + 1}</button>
          ))}
        </div>
        <Field label="Message" hint={`${note.length}/500`}>
          <textarea className="mg-textarea" style={{ minHeight: 120 }} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Hi, I'm here whenever you'd like to talk. No pressure at all." />
        </Field>
        {error && <div className="mg-error" role="alert">{error}</div>}
      </div>
    </Modal>
  );
}

function ResolveDialog({ open, alias, onClose, onSubmit }) {
  const [note, setNote] = useState("");
  const { busy, error, run, setError } = useSubmit(onSubmit);
  useEffect(() => { if (open) { setError(""); setNote(""); } }, [open, setError]);
  return (
    <Modal open={open} onClose={onClose} title={`Resolve ${alias}?`}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="teal" loading={busy} onClick={() => run({ type: "resolve", note: note.trim() || undefined })}>Yes, resolve</Button></>}>
      <div className="mg-stack-sm">
        <p className="mg-small mg-muted">This closes the early-warning flag.</p>
        <Field label="Closing note (optional)">
          <textarea className="mg-textarea" style={{ minHeight: 70 }} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        {error && <div className="mg-error" role="alert">{error}</div>}
      </div>
    </Modal>
  );
}
