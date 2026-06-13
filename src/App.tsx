import { useState, useEffect, useRef } from "react";
import DecisionLog, { OUTFIT_ENTRIES, ProjectLinksEditor, emptyEntry, makeId, nextNumber } from "./DecisionLogApp";
import CreateLogModal, { code } from "./CreateLogModal";
import { HACKWEEK_ENTRIES } from "./hackweekData";
import WorkflowCapture from "./WorkflowCapture";

const SUBTITLE = "A record of what was decided, and why.";
const TODAY = new Date().toISOString().slice(0, 10);

// Hack Week board — every Hackweek decision links here for now (editable per-decision later).
const HACKWEEK_LINK =
  "https://www.figma.com/board/16Hu89vaSw8O4XlpoCRbUX/Hack-Week-Q2-2026?node-id=124-6071&t=kPSX2s1kwxcyn94I-1";

const INITIAL_LOGS = [
  {
    id: "outfit",
    title: "Decision Log: Daily outfit generator",
    owner: "Lauren (DPM)",
    product: "Outfit App",
    feature: "Daily outfit generator",
    workflowLink: "",
    workflowView: "outfit", // id of the workflow in the workflows registry
    settings: { prefix: "DOG", workflow: "GEN" },
    projectLinks: [
      { label: "Workflow", url: "https://trishafey.github.io/hackweek-workflow-decision-log/#/workflow/outfit" },
      { label: "Prototype (TBD)", url: "" },
      { label: "Figma", url: "https://www.figma.com/file/9Kp2QoutfitGEN/Outfit-App-Designs" },
    ],
    entries: OUTFIT_ENTRIES.map((e) => ({ ...e, otherLink: "", otherLinkLabel: "" })),
  },
  {
    id: "hackweek",
    title: "Hackweek - Workflow & Decision Log Process",
    owner: "Team",
    product: "Hackweek",
    feature: "Workflow & Decision Log Process",
    workflowLink: "",
    workflowView: null,
    settings: { prefix: "HWK", workflow: "WDL" },
    projectLinks: [],
    entries: HACKWEEK_ENTRIES.map((e) => ({ ...e, otherLink: HACKWEEK_LINK, otherLinkLabel: "FigJam" })),
  },
];

// Workflows registry. "outfit" uses the built-in seed; the rest open blank (fictitious / new).
const INITIAL_WORKFLOWS = [
  { id: "outfit", name: "Daily outfit generator", product: "Outfit App", owner: "Lauren (DPM)", steps: 6, updated: "2026-06-11", seed: "outfit" },
  { id: "wf-returns", name: "Returns & refunds intake", product: "Commerce", owner: "Priya N. (Ops)", steps: 7, updated: "2026-05-28" },
  { id: "wf-onboard", name: "New hire onboarding", product: "People Ops", owner: "Marcus L. (HRBP)", steps: 9, updated: "2026-06-02" },
  { id: "wf-invoice", name: "Invoice approval", product: "Finance", owner: "Dana K. (AP)", steps: 5, updated: "2026-05-19" },
  { id: "wf-content", name: "Content publishing pipeline", product: "Marketing Site", owner: "Ivy R. (Content)", steps: 6, updated: "2026-06-05" },
  { id: "wf-triage", name: "Support ticket triage", product: "Support", owner: "Sam O. (CX)", steps: 8, updated: "2026-05-30" },
  { id: "wf-kyc", name: "KYC verification", product: "Banking", owner: "Leo M. (Risk)", steps: 10, updated: "2026-04-22" },
];

function summarize(entries) {
  const dates = entries.map((e) => e.date).filter(Boolean).sort();
  return { count: entries.length, updated: dates[dates.length - 1] || "—" };
}


// A blank workflow-capture initial state, seeded only with name/product/owner.
function blankWorkflow(name, product, owner) {
  return {
    info: {
      date: TODAY, product: product || "", workflow: name || "Untitled workflow",
      deadline: "", smes: "", anchors: "", facilitator: "", scribe: owner || "", logLink: "",
    },
    columns: [{ id: "c0", name: "Trigger" }, { id: "c1", name: "Step 1" }],
    cells: {}, subflows: {}, decisions: [],
  };
}

/* ------------------------------------------------------------------ */
/*  Decision Logs home                                                */
/* ------------------------------------------------------------------ */

function LogsHome({ logs, onOpen, onCreate, onWorkflows, onArchive, onDelete }) {
  const [creating, setCreating] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const archivedCount = logs.filter((l) => l.archived).length;
  const viewingArchived = showArchived && archivedCount > 0;
  const rows = logs.filter((l) => (viewingArchived ? l.archived : !l.archived));
  return (
    <div className="home-root">
      <style>{HOME_CSS}</style>
      <header className="home-head">
        <div>
          <h1>Decision Logs</h1>
          <p>Every decision log across the project — what was decided, and why.</p>
        </div>
        <div className="home-head-actions">
          <button className="hm-link" onClick={onWorkflows}>Workflows →</button>
          <button className="hm-btn primary lg" onClick={() => setCreating(true)}>+ New decision log</button>
        </div>
      </header>
      {archivedCount > 0 && (
        <div className="home-archive-row">
          <button className="hm-link" onClick={() => setShowArchived((v) => !v)}>
            {viewingArchived ? "← Back to active" : `View archived (${archivedCount})`}
          </button>
        </div>
      )}
      <div className="home-table-wrap">
        <table className="home-tbl">
          <thead>
            <tr><th>Decision log</th><th>Product</th><th>Owner</th><th className="num-h">Decisions</th><th>Updated</th><th></th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} className="home-empty">{viewingArchived ? "No archived logs." : "No decision logs yet."}</td></tr>
            )}
            {rows.map((l) => {
              const s = summarize(l.entries);
              return (
                <tr key={l.id} onClick={() => onOpen(l.id)}>
                  <td className="home-name">{l.title}{l.archived ? <span className="home-badge">Archived</span> : null}</td>
                  <td className="dim">{l.product || "—"}</td>
                  <td className="dim">{l.owner || "—"}</td>
                  <td className="num">{s.count}</td>
                  <td className="dim">{s.updated}</td>
                  <td className="home-rowactions" onClick={(e) => e.stopPropagation()}>
                    <button className="home-iconbtn" title={l.archived ? "Unarchive" : "Archive"}
                      onClick={() => onArchive(l.id, !l.archived)}>{l.archived ? "Unarchive" : "Archive"}</button>
                    <button className="home-iconbtn danger" title="Delete permanently"
                      onClick={() => { if (window.confirm(`Delete "${l.title}" and all its decisions? This can't be undone.`)) onDelete(l.id); }}>Delete</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {creating && (
        <CreateLogModal
          existingCodes={logs.map((l) => `${l.settings.prefix}-${l.settings.workflow}`.toUpperCase())}
          onClose={() => setCreating(false)}
          onCreate={(meta) => { setCreating(false); onCreate(meta); }}
        />
      )}
    </div>
  );
}

function CreateWorkflowModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [product, setProduct] = useState("");
  const [owner, setOwner] = useState("");
  const [projectLinks, setProjectLinks] = useState([]);
  const valid = name.trim();
  const submit = () => {
    if (!valid) return;
    onCreate({
      name: name.trim(), product: product.trim(), owner: owner.trim(),
      projectLinks: projectLinks.filter((l) => (l.label || "").trim() || (l.url || "").trim()),
    });
  };
  return (
    <>
      <div className="home-scrim" onClick={onClose} />
      <div className="home-modal" role="dialog" aria-modal="true">
        <div className="home-modal-head">
          <div>
            <h2>New workflow</h2>
            <p>Start a blank workflow capture.</p>
          </div>
          <button className="home-x" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="home-modal-body">
          <label className="hm-field">
            <span className="hm-label">Workflow name<i>*</i></span>
            <input className="hm-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Returns & refunds intake" autoFocus />
          </label>
          <div className="hm-grid">
            <label className="hm-field">
              <span className="hm-label">Product</span>
              <input className="hm-input" value={product} onChange={(e) => setProduct(e.target.value)} placeholder="e.g. Commerce" />
            </label>
            <label className="hm-field">
              <span className="hm-label">Owner</span>
              <input className="hm-input" value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="e.g. Priya N. (Ops)" />
            </label>
          </div>
          <ProjectLinksEditor links={projectLinks} onChange={setProjectLinks} />
        </div>
        <div className="home-modal-foot">
          <button className="hm-btn" onClick={onClose}>Cancel</button>
          <button className="hm-btn primary" onClick={submit} disabled={!valid}>Create workflow</button>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Workflows home (searchable index)                                 */
/* ------------------------------------------------------------------ */

function WorkflowsHome({ workflows, onOpen, onCreate, onLogs, onArchive, onDelete }) {
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const needle = q.trim().toLowerCase();
  const archivedCount = workflows.filter((w) => w.archived).length;
  const viewingArchived = showArchived && archivedCount > 0;
  const scope = workflows.filter((w) => (viewingArchived ? w.archived : !w.archived));
  const rows = needle
    ? scope.filter((w) => `${w.name} ${w.product} ${w.owner}`.toLowerCase().includes(needle))
    : scope;
  return (
    <div className="home-root">
      <style>{HOME_CSS}</style>
      <header className="home-head">
        <div>
          <h1>Workflows</h1>
          <p>Captured workflows — steps, people, exceptions, and where AI fits.</p>
        </div>
        <div className="home-head-actions">
          <button className="hm-link" onClick={onLogs}>Decision logs →</button>
          <button className="hm-btn primary lg" onClick={() => setCreating(true)}>+ New workflow</button>
        </div>
      </header>
      <div className="home-search-row">
        <input className="home-search" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Search workflows by name, product, or owner…" />
        <span className="home-count">{rows.length} of {scope.length}</span>
        {archivedCount > 0 && (
          <button className="hm-link" onClick={() => setShowArchived((v) => !v)}>
            {viewingArchived ? "← Back to active" : `View archived (${archivedCount})`}
          </button>
        )}
      </div>
      <div className="home-table-wrap">
        <table className="home-tbl">
          <thead>
            <tr><th>Workflow</th><th>Product</th><th>Owner</th><th className="num-h">Steps</th><th>Updated</th><th></th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} className="home-empty">{needle ? `No workflows match “${q}”.` : (viewingArchived ? "No archived workflows." : "No workflows yet.")}</td></tr>
            )}
            {rows.map((w) => (
              <tr key={w.id} onClick={() => onOpen(w.id)}>
                <td className="home-name">{w.name}{w.archived ? <span className="home-badge">Archived</span> : null}</td>
                <td className="dim">{w.product || "—"}</td>
                <td className="dim">{w.owner || "—"}</td>
                <td className="num">{w.steps ?? "—"}</td>
                <td className="dim">{w.updated || "—"}</td>
                <td className="home-rowactions" onClick={(e) => e.stopPropagation()}>
                  <button className="home-iconbtn" title={w.archived ? "Unarchive" : "Archive"}
                    onClick={() => onArchive(w.id, !w.archived)}>{w.archived ? "Unarchive" : "Archive"}</button>
                  <button className="home-iconbtn danger" title="Delete permanently"
                    onClick={() => { if (window.confirm(`Delete the workflow "${w.name}"? This can't be undone.`)) onDelete(w.id); }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {creating && (
        <CreateWorkflowModal onClose={() => setCreating(false)} onCreate={(meta) => { setCreating(false); onCreate(meta); }} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  App: routing + state                                              */
/* ------------------------------------------------------------------ */

function hashToRoute() {
  const parts = window.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (parts[0] === "log" && parts[1]) return { view: "log", id: decodeURIComponent(parts[1]) };
  if (parts[0] === "workflow" && parts[1]) return { view: "workflow", id: decodeURIComponent(parts[1]) };
  if (parts[0] === "workflows") return { view: "workflows" };
  return { view: "logs" };
}
function routeToHash(r) {
  if (r.view === "log") return `#/log/${encodeURIComponent(r.id)}`;
  if (r.view === "workflow") return `#/workflow/${encodeURIComponent(r.id)}`;
  if (r.view === "workflows") return "#/workflows";
  return "#/logs";
}

export default function App() {
  const [logs, setLogs] = useState(INITIAL_LOGS);
  const [workflows, setWorkflows] = useState(INITIAL_WORKFLOWS);
  const [route, setRoute] = useState(hashToRoute);
  const routeRef = useRef(route);
  routeRef.current = route;

  // Keep the URL hash in sync with the route (so each page has a unique URL).
  useEffect(() => {
    const want = routeToHash(route);
    if (window.location.hash !== want) window.location.hash = want;
  }, [route]);

  // React to back/forward and manual URL edits.
  useEffect(() => {
    const onHash = () => {
      const next = hashToRoute();
      const cur = routeRef.current;
      if (cur.view !== next.view || cur.id !== next.id) setRoute(next);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const updateLog = (id, updater) => setLogs((ls) => ls.map((l) => (l.id === id ? updater(l) : l)));
  const setLogArchived = (id, archived) => updateLog(id, (p) => ({ ...p, archived }));
  const deleteLog = (id) => setLogs((ls) => ls.filter((l) => l.id !== id));
  const setWorkflowArchived = (id, archived) => setWorkflows((ws) => ws.map((w) => (w.id === id ? { ...w, archived } : w)));
  const deleteWorkflow = (id) => setWorkflows((ws) => ws.filter((w) => w.id !== id));

  // Creates a log and returns its id without navigating (used by the
  // workflow page's "Add to Decision Log" flow).
  const createLogSilent = ({ owner, product, feature, workflowLink, projectLinks, prefix, workflow }) => {
    const id = "log-" + Date.now();
    setLogs((ls) => [...ls, {
      id, title: feature, owner, product, feature,
      workflowLink: workflowLink || "", workflowView: null,
      settings: { prefix: prefix || code(product), workflow: workflow || code(feature) },
      projectLinks: projectLinks || [],
      entries: [],
    }]);
    return id;
  };

  const createLog = (meta) => {
    const id = createLogSilent(meta);
    setRoute({ view: "log", id });
  };

  // Append entries to a log, assigning IDs from the log's code settings.
  // Returns the assigned IDs in order.
  const addEntriesToLog = (logId, drafts) => {
    const log = logs.find((l) => l.id === logId);
    if (!log) return [];
    let n = nextNumber(log.entries);
    const ids = [];
    const withIds = drafts.map((d) => {
      const id = makeId(log.settings.prefix, log.settings.workflow, n++);
      ids.push(id);
      return { ...emptyEntry(), ...d, id };
    });
    updateLog(logId, (p) => ({ ...p, entries: [...p.entries, ...withIds] }));
    return ids;
  };

  // Apply field updates ({id, field, value}) to a log's entries.
  const updateLogEntries = (logId, updates) => {
    updateLog(logId, (p) => ({
      ...p,
      entries: p.entries.map((e) => {
        const ups = updates.filter((u) => u.id === e.id);
        if (!ups.length) return e;
        const ne = { ...e };
        ups.forEach((u) => { ne[u.field] = u.value; });
        return ne;
      }),
    }));
  };

  const createWorkflow = ({ name, product, owner, projectLinks }) => {
    const id = "wf-" + Date.now();
    setWorkflows((ws) => [...ws, {
      id, name: name || "Untitled workflow", product: product || "", owner: owner || "",
      steps: 0, updated: TODAY, projectLinks: projectLinks || [],
    }]);
    setRoute({ view: "workflow", id });
  };

  if (route.view === "workflow") {
    const wf = workflows.find((w) => w.id === route.id);
    const initial = wf && wf.seed === "outfit" ? undefined : blankWorkflow(wf?.name, wf?.product, wf?.owner);
    return (
      <WorkflowCapture
        key={route.id}
        initial={initial}
        projectLinks={wf?.projectLinks || []}
        focusStep={route.focusStep}
        onWorkflowsHome={() => setRoute({ view: "workflows" })}
        logsIndex={logs.map((l) => ({ id: l.id, title: l.title, code: `${l.settings.prefix}-${l.settings.workflow}` }))}
        existingLogCodes={logs.map((l) => `${l.settings.prefix}-${l.settings.workflow}`.toUpperCase())}
        onCreateLog={createLogSilent}
        onAddToLog={addEntriesToLog}
        onUpdateLogEntries={updateLogEntries}
        onOpenLog={(id) => setRoute({ view: "log", id })}
      />
    );
  }

  if (route.view === "workflows") {
    return <WorkflowsHome workflows={workflows} onOpen={(id) => setRoute({ view: "workflow", id })} onCreate={createWorkflow} onLogs={() => setRoute({ view: "logs" })} onArchive={setWorkflowArchived} onDelete={deleteWorkflow} />;
  }

  if (route.view === "log") {
    const log = logs.find((l) => l.id === route.id);
    if (!log) return <LogsHome logs={logs} onOpen={(id) => setRoute({ view: "log", id })} onCreate={createLog} onWorkflows={() => setRoute({ view: "workflows" })} onArchive={setLogArchived} onDelete={deleteLog} />;
    return (
      <DecisionLog
        key={log.id}
        log={log}
        subtitle={SUBTITLE}
        onChange={(updater) => updateLog(log.id, updater)}
        onBack={() => setRoute({ view: "logs" })}
        onOpenWorkflow={(step) => setRoute({ view: "workflow", id: log.workflowView, focusStep: step })}
      />
    );
  }

  return <LogsHome logs={logs} onOpen={(id) => setRoute({ view: "log", id })} onCreate={createLog} onWorkflows={() => setRoute({ view: "workflows" })} onArchive={setLogArchived} onDelete={deleteLog} />;
}

/* ------------------------------------------------------------------ */
/*  Home + modal styles                                               */
/* ------------------------------------------------------------------ */

const HOME_CSS = `
.home-root{
  --paper:#FAF9F6; --surface:#FFFFFF; --ink:#1C1B19; --ink-soft:#57534E;
  --ink-faint:#94908A; --line:#E7E4DD; --line-soft:#F1EEE8;
  --accent:#1F3A34; --accent-ink:#16302A; --accent-soft:#E9EFEC; --accent-tint:#F3F6F4;
  --danger:#A8453B;
  font-family: system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  color:var(--ink); background:var(--paper); min-height:100vh;
  padding:48px clamp(16px,5vw,64px) 80px; box-sizing:border-box;
  -webkit-font-smoothing:antialiased;
}
.home-root *{box-sizing:border-box}
.home-head{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap}
.home-head h1{font-family:Georgia,"Iowan Old Style","Palatino Linotype",serif;font-weight:600;
  letter-spacing:-.01em;margin:0;font-size:32px;line-height:1.1}
.home-head p{margin:8px 0 0;color:var(--ink-soft);font-size:14px;max-width:54ch}
.home-head-actions{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.hm-link{background:none;border:none;padding:0;font:inherit;font-size:13px;font-weight:600;
  color:var(--accent);cursor:pointer}
.hm-link:hover{text-decoration:underline}
.home-search-row{display:flex;align-items:center;gap:12px;margin-top:24px;max-width:1000px}
.home-search{flex:1;font-family:inherit;font-size:13.5px;color:var(--ink);background:var(--surface);
  border:1px solid var(--line);border-radius:9px;padding:9px 12px}
.home-search:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}
.home-count{font-size:12px;color:var(--ink-faint);font-variant-numeric:tabular-nums;white-space:nowrap}
.home-table-wrap{margin-top:16px;border:1px solid var(--line);border-radius:12px;overflow:hidden;
  background:var(--surface);box-shadow:0 1px 2px rgba(0,0,0,.02);max-width:1000px}
.home-tbl{border-collapse:collapse;width:100%;font-size:14px}
.home-tbl thead th{text-align:left;background:#FCFBF8;font-weight:600;font-size:10.5px;
  letter-spacing:.06em;text-transform:uppercase;color:var(--ink-faint);
  padding:12px 18px;border-bottom:1px solid var(--line)}
.home-tbl thead th.num-h{text-align:right}
.home-tbl tbody tr{cursor:pointer;transition:background .1s}
.home-tbl tbody tr:hover{background:var(--accent-tint)}
.home-tbl tbody td{padding:16px 18px;border-bottom:1px solid var(--line-soft);vertical-align:middle}
.home-tbl tbody tr:last-child td{border-bottom:none}
.home-name{font-weight:600;color:var(--ink);font-size:14.5px}
.home-tbl .num{text-align:right;font-variant-numeric:tabular-nums;color:var(--ink-soft)}
.home-tbl .dim{color:var(--ink-faint)}
.home-empty{text-align:center;color:var(--ink-faint);font-style:italic;padding:32px 0}
.home-archive-row{margin-top:14px}
.home-badge{display:inline-block;margin-left:8px;font-size:9.5px;font-weight:700;letter-spacing:.04em;
  text-transform:uppercase;color:var(--ink-faint);background:var(--line-soft);border:1px solid var(--line);
  padding:1px 6px;border-radius:5px;vertical-align:middle}
.home-rowactions{text-align:right;white-space:nowrap}
.home-iconbtn{font-family:inherit;font-size:11.5px;font-weight:600;color:var(--ink-soft);background:transparent;
  border:1px solid var(--line);border-radius:7px;padding:4px 9px;cursor:pointer;margin-left:6px;transition:.12s}
.home-iconbtn:hover{border-color:#d8d4cc;background:var(--surface)}
.home-iconbtn.danger{color:var(--danger)}
.home-iconbtn.danger:hover{background:#FBEBEA;border-color:#f0d4d0}
.mono{font-family:"SF Mono",ui-monospace,"JetBrains Mono",monospace}

/* buttons */
.hm-btn{font-family:inherit;font-size:13px;font-weight:600;border-radius:8px;padding:8px 13px;
  cursor:pointer;border:1px solid var(--line);background:var(--surface);color:var(--ink-soft);transition:.13s}
.hm-btn:hover{border-color:#d8d4cc}
.hm-btn.primary{background:var(--accent);border-color:var(--accent);color:#fff}
.hm-btn.primary:hover{background:var(--accent-ink)}
.hm-btn.primary:disabled{opacity:.5;cursor:not-allowed}
.hm-btn.lg{padding:9px 15px;font-size:13.5px}

/* modal */
.home-scrim{position:fixed;inset:0;background:rgba(28,27,25,.34);z-index:40;backdrop-filter:blur(1.5px)}
.home-modal{position:fixed;z-index:50;left:50%;top:50%;transform:translate(-50%,-50%);
  background:var(--surface);border-radius:16px;box-shadow:0 30px 70px -20px rgba(0,0,0,.4);
  width:min(540px,94vw);max-height:90vh;display:flex;flex-direction:column;overflow:hidden}
.home-modal-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;
  padding:20px 22px 16px;border-bottom:1px solid var(--line)}
.home-modal-head h2{font-family:Georgia,serif;font-size:20px;font-weight:600;margin:0}
.home-modal-head p{margin:5px 0 0;font-size:13px;color:var(--ink-soft)}
.home-x{width:30px;height:30px;border-radius:7px;border:1px solid transparent;background:transparent;
  color:var(--ink-faint);cursor:pointer;font-size:14px}
.home-x:hover{background:var(--line-soft);color:var(--ink)}
.home-modal-body{padding:20px 22px;overflow-y:auto;display:flex;flex-direction:column;gap:14px}
.hm-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.hm-field{display:flex;flex-direction:column;gap:5px}
.hm-label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-faint)}
.hm-label i{color:var(--danger);font-style:normal;margin-left:2px}
.hm-label em{font-style:normal;text-transform:none;letter-spacing:0;color:var(--ink-faint);font-weight:400}
.hm-input{font-family:inherit;font-size:13.5px;color:var(--ink);background:var(--surface);
  border:1px solid var(--line);border-radius:8px;padding:8px 10px;width:100%}
.hm-input:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}
.hm-note{font-size:12px;color:var(--ink-faint);line-height:1.5;margin:2px 0 0}
.hm-idrow{display:flex;gap:8px;align-items:center}
.hm-idrow .hm-input{flex:1;text-transform:uppercase;letter-spacing:.03em}
.hm-idrow .hm-btn{white-space:nowrap}
.hm-err{border-color:var(--danger)!important;box-shadow:0 0 0 3px rgba(168,69,59,.12)!important}
.hm-error-text{font-size:11.5px;color:var(--danger);margin-top:1px}
.hm-info{position:relative;display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;
  border-radius:50%;border:1px solid var(--ink-faint);color:var(--ink-faint);font-size:9px;font-style:italic;
  font-weight:700;margin-left:5px;cursor:help;font-family:Georgia,serif;outline:none}
.hm-info:hover,.hm-info:focus{border-color:var(--accent);color:var(--accent)}
.hm-tip{position:absolute;bottom:calc(100% + 7px);left:50%;transform:translateX(-50%);z-index:60;
  background:var(--ink);color:#fff;font-size:11.5px;font-weight:400;line-height:1.5;letter-spacing:0;
  text-transform:none;padding:8px 11px;border-radius:8px;width:max-content;max-width:240px;
  box-shadow:0 12px 28px -10px rgba(0,0,0,.45);opacity:0;visibility:hidden;transition:opacity .14s;pointer-events:none}
.hm-info:hover .hm-tip,.hm-info:focus .hm-tip{opacity:1;visibility:visible}
.mono{font-family:"SF Mono",ui-monospace,"JetBrains Mono",monospace}
.home-modal-foot{display:flex;justify-content:flex-end;gap:8px;padding:14px 22px;
  border-top:1px solid var(--line);background:#FCFBF8}
@media (max-width:560px){.hm-grid{grid-template-columns:1fr}}
`;
