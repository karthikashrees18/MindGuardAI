// Developer tools for live demos (counselor/admin only): an API reference built from the
// backend's OpenAPI schema, and a read-only database viewer. No database credentials ever
// reach the browser — the viewer only calls GET /api/admin/db-overview, which strips secrets.
import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Database, ExternalLink, FileJson, RefreshCw } from "lucide-react";
import { Button, Card, Skeleton } from "../components/ui";
import { adminApi, fetchOpenApi, OPENAPI_URL, SWAGGER_URL } from "./api";

const METHOD_COLOR = { get: "var(--teal)", post: "var(--violet)", put: "var(--amber)", patch: "var(--amber)", delete: "var(--coral)" };
const METHODS = ["get", "post", "put", "patch", "delete"];

function ExternalButton({ href, icon: Icon, children }) {
  return (
    <a className="mg-btn ghost sm" href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
      <Icon size={14} /> {children} <ExternalLink size={12} />
    </a>
  );
}

/* ----------------------------------------------------------------- API reference */
function resolve(spec, schema) {
  if (!schema) return null;
  if (schema.$ref) {
    const name = schema.$ref.split("/").pop();
    return { name, ...(spec.components?.schemas?.[name] || {}) };
  }
  if (schema.type === "array" && schema.items) {
    const inner = resolve(spec, schema.items);
    return { ...schema, name: `${inner?.name || inner?.type || "item"}[]`, properties: inner?.properties, required: inner?.required };
  }
  const alt = schema.anyOf || schema.oneOf;
  if (alt) {
    const real = alt.find((x) => x.type !== "null");
    return real ? resolve(spec, real) : schema;
  }
  return schema;
}

function typeOf(spec, prop) {
  if (!prop) return "any";
  if (prop.$ref) return prop.$ref.split("/").pop();
  if (prop.type === "array") return `${typeOf(spec, prop.items)}[]`;
  const alt = prop.anyOf || prop.oneOf;
  if (alt) return alt.filter((x) => x.type !== "null").map((x) => typeOf(spec, x)).join(" | ") || "any";
  if (prop.enum) return prop.enum.map((e) => JSON.stringify(e)).join(" | ");
  return prop.type || "any";
}

function SchemaTable({ spec, schema }) {
  const s = resolve(spec, schema);
  const props = s?.properties && Object.entries(s.properties);
  if (!props?.length) return <span className="mg-faint mg-small">{s?.name || s?.type || "—"}</span>;
  return (
    <div style={{ overflowX: "auto" }}>
      <div className="mg-tiny mg-faint" style={{ marginBottom: 4 }}>{s.name}</div>
      <table className="mg-small" style={{ borderCollapse: "collapse", width: "100%" }}>
        <tbody>
          {props.map(([k, v]) => (
            <tr key={k} style={{ borderTop: "1px solid var(--border)" }}>
              <td style={{ padding: "4px 8px 4px 0", fontFamily: "monospace" }}>{k}{s.required?.includes(k) ? <span style={{ color: "var(--coral)" }}> *</span> : null}</td>
              <td className="mg-muted" style={{ padding: "4px 8px", fontFamily: "monospace" }}>{typeOf(spec, v)}</td>
              <td className="mg-faint" style={{ padding: "4px 0" }}>{v.description || ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Endpoint({ spec, path, method, op }) {
  const [open, setOpen] = useState(false);
  const body = resolve(spec, op.requestBody?.content?.["application/json"]?.schema);
  const params = (op.parameters || []).filter((p) => p.in !== "header" || p.name.toLowerCase() !== "authorization");
  const okResponse = op.responses?.["200"] || op.responses?.["201"];
  const okSchema = okResponse?.content?.["application/json"]?.schema;
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "var(--surface)" }}>
      <button type="button" className="mg-row" onClick={() => setOpen(!open)} aria-expanded={open}
        style={{ width: "100%", padding: "10px 12px", background: "transparent", border: 0, color: "inherit", textAlign: "left", cursor: "pointer", gap: 10 }}>
        {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        <span style={{ minWidth: 58, textAlign: "center", padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 800, color: "#fff", background: METHOD_COLOR[method] || "var(--violet)" }}>
          {method.toUpperCase()}
        </span>
        <code className="mg-small" style={{ wordBreak: "break-all" }}>{path}</code>
        <span className="mg-faint mg-small mg-grow" style={{ textAlign: "right" }}>{op.summary}</span>
      </button>
      {open && (
        <div className="mg-stack-sm" style={{ padding: "4px 14px 14px" }}>
          {op.description && <p className="mg-muted mg-small" style={{ whiteSpace: "pre-wrap" }}>{op.description}</p>}
          {params.length > 0 && (
            <div>
              <div className="mg-tiny mg-faint" style={{ marginBottom: 4 }}>Parameters</div>
              {params.map((p) => (
                <div key={`${p.in}-${p.name}`} className="mg-small">
                  <code>{p.name}</code> <span className="mg-faint">({p.in}{p.required ? ", required" : ""}) · {typeOf(spec, p.schema)}</span>
                </div>
              ))}
            </div>
          )}
          {op.requestBody && (<div><div className="mg-tiny mg-faint" style={{ marginBottom: 4 }}>Request body</div><SchemaTable spec={spec} schema={body} /></div>)}
          {okSchema && (<div><div className="mg-tiny mg-faint" style={{ marginBottom: 4 }}>Response</div><SchemaTable spec={spec} schema={okSchema} /></div>)}
        </div>
      )}
    </div>
  );
}

function ApiReference() {
  const [spec, setSpec] = useState(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  const load = () => { setError(""); setSpec(null); fetchOpenApi().then(setSpec).catch((e) => setError(e.message)); };
  useEffect(load, []);

  const groups = useMemo(() => {
    if (!spec) return [];
    const map = new Map();
    const needle = q.trim().toLowerCase();
    Object.entries(spec.paths || {}).forEach(([path, item]) => {
      METHODS.forEach((m) => {
        const op = item[m];
        if (!op) return;
        if (needle && !`${m} ${path} ${op.summary || ""} ${op.description || ""}`.toLowerCase().includes(needle)) return;
        const tag = op.tags?.[0] || "other";
        if (!map.has(tag)) map.set(tag, []);
        map.get(tag).push({ path, method: m, op });
      });
    });
    return [...map.entries()];
  }, [spec, q]);

  return (
    <div className="mg-stack">
      <Card className="mg-row mg-between" style={{ flexWrap: "wrap" }}>
        <div>
          <div className="mg-h3">{spec?.info?.title || "API Reference"}</div>
          <div className="mg-faint mg-small">{spec ? `Version ${spec.info?.version} · ${Object.keys(spec.paths).length} paths` : "Loading from the server…"}</div>
        </div>
        <div className="mg-row-wrap">
          <ExternalButton href={SWAGGER_URL} icon={FileJson}>Open Swagger UI (/docs)</ExternalButton>
          <ExternalButton href={OPENAPI_URL} icon={FileJson}>openapi.json</ExternalButton>
          <Button variant="quiet" size="sm" icon={RefreshCw} onClick={load}>Reload</Button>
        </div>
      </Card>
      {error && <div className="mg-error" role="alert">{error}</div>}
      {!spec && !error && <Skeleton height={200} />}
      {spec && (
        <>
          <input className="mg-input" placeholder="Search endpoints (e.g. profile, checkins, POST)…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search endpoints" />
          {groups.length === 0 && <div className="mg-faint mg-small">No endpoints match.</div>}
          {groups.map(([tag, eps]) => (
            <div key={tag} className="mg-stack-sm">
              <div className="mg-eyebrow">{tag} · {eps.length}</div>
              {eps.map((e) => <Endpoint key={`${e.method} ${e.path}`} spec={spec} {...e} />)}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ DB viewer */
function CollectionBlock({ col }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)" }}>
      <button type="button" className="mg-row" onClick={() => setOpen(!open)} aria-expanded={open}
        style={{ width: "100%", padding: "10px 12px", background: "transparent", border: 0, color: "inherit", textAlign: "left", cursor: "pointer", gap: 10 }}>
        {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        <Database size={15} className="mg-faint" />
        <b className="mg-small">{col.name}</b>
        <span className="mg-badge violet">{col.count} {col.count === 1 ? "document" : "documents"}</span>
      </button>
      {open && (
        <div style={{ padding: "0 12px 12px" }}>
          {col.recent.length === 0 ? <span className="mg-faint mg-small">Empty collection.</span> : (
            <>
              <div className="mg-tiny mg-faint" style={{ marginBottom: 6 }}>Newest {col.recent.length} (private details hidden)</div>
              <pre className="mg-small" style={{ margin: 0, maxHeight: 360, overflow: "auto", padding: 10, borderRadius: 10, background: "var(--input-bg)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {JSON.stringify(col.recent, null, 2)}
              </pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function DatabaseViewer() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const load = () => { setError(""); adminApi.dbOverview().then(setData).catch((e) => setError(e.message)); };
  useEffect(load, []);
  return (
    <div className="mg-stack">
      <Card className="mg-row mg-between" style={{ flexWrap: "wrap" }}>
        <div>
          <div className="mg-h3">Database Viewer</div>
          <div className="mg-faint mg-small">
            Read-only view of the live database{data ? ` “${data.database}”` : ""}. Passwords, tokens and anything a student wrote are hidden.
          </div>
        </div>
        <div className="mg-row-wrap">
          <ExternalButton href="https://cloud.mongodb.com" icon={Database}>Open MongoDB Atlas</ExternalButton>
          <Button variant="quiet" size="sm" icon={RefreshCw} onClick={load}>Refresh</Button>
        </div>
      </Card>
      {error && <div className="mg-error" role="alert">{error}</div>}
      {!data && !error && <Skeleton height={200} />}
      {data?.collections.map((c) => <CollectionBlock key={c.name} col={c} />)}
    </div>
  );
}

/* ------------------------------------------------------------------------ page */
export default function DevTools() {
  const [view, setView] = useState("api");
  return (
    <div className="mg-stack">
      <div className="mg-row-wrap" role="tablist" aria-label="Developer tools">
        <button type="button" role="tab" aria-selected={view === "api"} className={`mg-chip ${view === "api" ? "on" : ""}`} onClick={() => setView("api")}>API Reference (Swagger)</button>
        <button type="button" role="tab" aria-selected={view === "db"} className={`mg-chip ${view === "db" ? "on" : ""}`} onClick={() => setView("db")}>Database Viewer</button>
      </div>
      {view === "api" ? <ApiReference /> : <DatabaseViewer />}
    </div>
  );
}
