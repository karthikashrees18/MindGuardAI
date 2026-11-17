// In-app direct messages, shared by the student app and the counselor dashboard.
// Left: every other account (search + role filter). Right: the open conversation.
// `client` is `messagesApi` from src/api.js or src/admin/api.js (same shape, different token).
// Polls while the tab is visible; on narrow screens shows one pane at a time.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Ban, Flag, MessagesSquare, Search, Send } from "lucide-react";
import { Button, EmptyState, Modal, Skeleton } from "./ui";
import { initials } from "./DashboardLayout";

const CONTACTS_POLL_MS = 15000;
const THREAD_POLL_MS = 5000;

const FILTERS = [
  { key: "all", label: "All" },
  { key: "student", label: "Students" },
  { key: "staff", label: "Counselors" },
];

function useVisiblePoll(fn, ms, deps) {
  useEffect(() => {
    let timer;
    const tick = () => { if (document.visibilityState === "visible") fn(); };
    tick();
    timer = window.setInterval(tick, ms);
    document.addEventListener("visibilitychange", tick);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", tick); };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

function shortTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

function Avatar({ name, role }) {
  return <div className={`mg-dm-avatar ${role === "student" ? "" : "staff"}`} aria-hidden="true">{initials(name)}</div>;
}

export default function Messenger({ client, initialContactId }) {
  const [contacts, setContacts] = useState(null);
  const [contactsError, setContactsError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [activeId, setActiveId] = useState(initialContactId || null);
  const [thread, setThread] = useState(null); // { contact, messages, blocked_by_me, blocked_me }
  const [threadError, setThreadError] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [notice, setNotice] = useState("");
  const endRef = useRef(null);
  const lastCount = useRef(0);

  const loadContacts = useCallback(async () => {
    try {
      const res = await client.contacts();
      setContacts(res.contacts);
      setContactsError("");
    } catch (e) {
      setContactsError(e.message || "Couldn't load contacts.");
    }
  }, [client]);

  const loadThread = useCallback(async (id) => {
    if (!id) return;
    try {
      const res = await client.thread(id);
      setThread((t) => (t && t.contact.id !== id ? t : res));
      setThreadError("");
      // reading clears this contact's unread badge
      setContacts((cs) => cs && cs.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
    } catch (e) {
      setThreadError(e.message || "Couldn't load this conversation.");
    }
  }, [client]);

  useVisiblePoll(loadContacts, CONTACTS_POLL_MS, [loadContacts]);
  useVisiblePoll(() => loadThread(activeId), THREAD_POLL_MS, [loadThread, activeId]);

  // scroll to the newest message when the conversation opens or grows
  useEffect(() => {
    const n = thread?.messages?.length || 0;
    if (n !== lastCount.current) endRef.current?.scrollIntoView({ block: "end" });
    lastCount.current = n;
  }, [thread]);

  const open = (id) => {
    if (id === activeId) return;
    setThread(null);
    setThreadError("");
    setNotice("");
    setDraft("");
    lastCount.current = 0;
    setActiveId(id);
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (contacts || []).filter((c) => {
      if (filter === "student" && c.role !== "student") return false;
      if (filter === "staff" && c.role === "student") return false;
      return !q || c.name.toLowerCase().includes(q) || c.role_label.toLowerCase().includes(q);
    });
  }, [contacts, query, filter]);

  async function send(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !activeId || sending) return;
    setSending(true);
    setThreadError("");
    try {
      const msg = await client.send(activeId, text);
      setDraft("");
      setThread((t) => (t ? { ...t, messages: [...t.messages, msg] } : t));
      setContacts((cs) => {
        if (!cs) return cs;
        const me = cs.find((c) => c.id === activeId);
        if (!me) return cs;
        const updated = { ...me, last_message: { text: msg.text, from_me: true, created_at: msg.created_at } };
        return [updated, ...cs.filter((c) => c.id !== activeId)];
      });
    } catch (err) {
      setThreadError(err.message || "Message not sent. Try again.");
    } finally {
      setSending(false);
    }
  }

  async function toggleBlock() {
    if (!thread) return;
    const blocking = !thread.blocked_by_me;
    try {
      if (blocking) await client.block(activeId); else await client.unblock(activeId);
      setThread((t) => ({ ...t, blocked_by_me: blocking }));
      setContacts((cs) => cs && cs.map((c) => (c.id === activeId ? { ...c, blocked_by_me: blocking } : c)));
      setNotice(blocking ? `You blocked ${thread.contact.name}. They can't message you.` : `You unblocked ${thread.contact.name}.`);
    } catch (err) {
      setThreadError(err.message);
    }
  }

  async function submitReport() {
    const reason = reportReason.trim();
    if (!reason) return;
    try {
      await client.report(activeId, reason);
      setReportOpen(false);
      setReportReason("");
      setNotice("Thanks — your report was sent to the campus team. You can also block this account.");
    } catch (err) {
      setThreadError(err.message);
    }
  }

  const active = thread?.contact || contacts?.find((c) => c.id === activeId);
  const cantSend = thread && (thread.blocked_by_me || thread.blocked_me);

  return (
    <div className={`mg-dm ${activeId ? "has-thread" : ""}`}>
      <section className="mg-dm-list" aria-label="Contacts">
        <div className="mg-dm-list-head">
          <label className="mg-dm-search">
            <Search size={15} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search people" aria-label="Search people" />
          </label>
          <div className="mg-row" style={{ gap: 6 }} role="group" aria-label="Filter contacts">
            {FILTERS.map((f) => (
              <button key={f.key} type="button" className={`mg-chip ${filter === f.key ? "on" : ""}`} onClick={() => setFilter(f.key)} aria-pressed={filter === f.key}>{f.label}</button>
            ))}
          </div>
        </div>
        <div className="mg-dm-contacts mg-scroll">
          {!contacts && !contactsError && [0, 1, 2, 3].map((i) => <Skeleton key={i} height={58} style={{ margin: "6px 8px" }} />)}
          {contactsError && <div className="mg-error" role="alert" style={{ padding: 12 }}>{contactsError}</div>}
          {contacts && visible.length === 0 && <p className="mg-small mg-muted" style={{ padding: 16 }}>{contacts.length ? "No one matches that search." : "No other accounts yet."}</p>}
          {visible.map((c) => (
            <button key={c.id} type="button" className={`mg-dm-contact ${c.id === activeId ? "active" : ""}`} onClick={() => open(c.id)} aria-current={c.id === activeId ? "true" : undefined}>
              <Avatar name={c.name} role={c.role} />
              <div className="mg-grow" style={{ minWidth: 0 }}>
                <div className="mg-row mg-between" style={{ gap: 8 }}>
                  <b className="mg-dm-name">{c.name}</b>
                  {c.last_message && <span className="mg-tiny mg-faint">{shortTime(c.last_message.created_at)}</span>}
                </div>
                <div className="mg-row mg-between" style={{ gap: 8 }}>
                  <span className="mg-dm-preview">
                    {c.blocked_by_me ? "Blocked" : c.last_message ? `${c.last_message.from_me ? "You: " : ""}${c.last_message.text}` : c.role_label}
                  </span>
                  {c.unread > 0 && <span className="mg-dm-badge" aria-label={`${c.unread} unread`}>{c.unread}</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="mg-dm-thread" aria-label="Conversation">
        {!activeId ? (
          <div className="mg-dm-empty">
            <EmptyState icon={MessagesSquare} title="Your messages" body="Pick anyone on the left to start a conversation. Messages are private between the two of you." />
          </div>
        ) : (
          <>
            <header className="mg-dm-thread-head">
              <button type="button" className="mg-btn quiet mg-dm-back" onClick={() => setActiveId(null)} aria-label="Back to contacts"><ArrowLeft size={18} /></button>
              {active && <Avatar name={active.name} role={active.role} />}
              <div className="mg-grow" style={{ minWidth: 0 }}>
                <div className="mg-dm-name">{active?.name || "…"}</div>
                <div className="mg-tiny mg-faint">{active?.role_label}</div>
              </div>
              {thread && (
                <>
                  <button type="button" className="mg-btn quiet sm" onClick={toggleBlock} title={thread.blocked_by_me ? "Unblock" : "Block"}>
                    <Ban size={15} /> <span className="mg-dm-act-label">{thread.blocked_by_me ? "Unblock" : "Block"}</span>
                  </button>
                  <button type="button" className="mg-btn quiet sm" onClick={() => setReportOpen(true)} title="Report">
                    <Flag size={15} /> <span className="mg-dm-act-label">Report</span>
                  </button>
                </>
              )}
            </header>

            <div className="mg-dm-messages mg-scroll" aria-live="polite">
              {!thread && !threadError && <Skeleton height={120} />}
              {thread && thread.messages.length === 0 && (
                <p className="mg-small mg-muted" style={{ textAlign: "center", margin: "auto 0" }}>No messages yet — say hello.</p>
              )}
              {thread?.messages.map((m) => (
                <div key={m.id} className={`mg-bubble ${m.from_me ? "user" : "ai"}`}>
                  {m.text}
                  <span className="mg-dm-time">{shortTime(m.created_at)}{m.from_me && m.read ? " · Seen" : ""}</span>
                </div>
              ))}
              <div ref={endRef} />
            </div>

            {(notice || threadError) && (
              <div className={threadError ? "mg-error" : "mg-small mg-muted"} role={threadError ? "alert" : "status"} style={{ padding: "0 16px 8px", margin: 0 }}>
                {threadError || notice}
              </div>
            )}

            <form className="mg-dm-compose" onSubmit={send}>
              {cantSend ? (
                <p className="mg-small mg-muted" style={{ margin: 0 }}>
                  {thread.blocked_by_me ? "You've blocked this account. Unblock to send messages." : "You can't send messages to this account."}
                </p>
              ) : (
                <div className="mg-row">
                  <input className="mg-input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write a message…" aria-label="Message" maxLength={2000} disabled={!thread} />
                  <Button type="submit" variant="teal" disabled={!draft.trim() || !thread} loading={sending} aria-label="Send" style={{ padding: 12 }}>
                    {!sending && <Send size={17} />}
                  </Button>
                </div>
              )}
            </form>
          </>
        )}
      </section>

      <Modal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title={`Report ${active?.name || "this account"}`}
        footer={(
          <>
            <Button variant="ghost" onClick={() => setReportOpen(false)}>Cancel</Button>
            <Button variant="coral" onClick={submitReport} disabled={!reportReason.trim()}>Send report</Button>
          </>
        )}
      >
        <p className="mg-small mg-muted" style={{ marginBottom: 10 }}>
          Tell the campus team what happened. Your report includes the recent messages in this conversation.
        </p>
        <textarea className="mg-textarea" rows={4} maxLength={500} value={reportReason} onChange={(e) => setReportReason(e.target.value)} placeholder="e.g. harassment, spam, or something that worried you" aria-label="Reason for report" />
      </Modal>
    </div>
  );
}
