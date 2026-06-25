import { useState, useEffect, useRef } from "react";
import DecisionLog, { OUTFIT_ENTRIES, ProjectLinksEditor, emptyEntry, makeId, nextNumber } from "./DecisionLogApp";
import CreateLogModal, { code } from "./CreateLogModal";
import { HACKWEEK_ENTRIES } from "./hackweekData";
import WorkflowCapture from "./WorkflowCapture";
import { loadLocal, saveLocal, loadRemote, saveRemote } from "./store";

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

// Per-row kebab (⋯) menu with Archive/Unarchive + Delete.
// The popup is positioned with fixed coordinates so it is never clipped by the
// table wrapper's overflow:hidden (which previously hid the last row's menu).
function RowMenu({ archived, onArchive, onDelete, onDuplicate }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const right = window.innerWidth - r.right;
      // Flip upward when there isn't room for the menu below the button.
      if (r.bottom + 96 > window.innerHeight) {
        setPos({ bottom: window.innerHeight - r.top + 4, right });
      } else {
        setPos({ top: r.bottom + 4, right });
      }
    }
    setOpen((o) => !o);
  };
  return (
    <span className="home-menu" onClick={(e) => e.stopPropagation()}>
      <button ref={btnRef} className="home-kebab" title="Actions" aria-label="Row actions" onClick={toggle}>⋯</button>
      {open && (
        <>
          <div className="home-menu-scrim" onClick={() => setOpen(false)} />
          <div className="home-menu-pop" style={{ position: "fixed", top: pos?.top ?? "auto", bottom: pos?.bottom ?? "auto", right: pos?.right ?? 0 }}>
            {onDuplicate && <button onClick={() => { setOpen(false); onDuplicate(); }}>Duplicate</button>}
            <button onClick={() => { setOpen(false); onArchive(); }}>{archived ? "Unarchive" : "Archive"}</button>
            <button className="danger" onClick={() => { setOpen(false); onDelete(); }}>Delete</button>
          </div>
        </>
      )}
    </span>
  );
}

function HomeNav({ active, onLogs, onWorkflows }) {
  return (
    <nav className="home-nav" aria-label="Primary">
      <button className={"home-nav-link" + (active === "logs" ? " active" : "")} onClick={onLogs}>Decision Logs</button>
      <button className={"home-nav-link" + (active === "workflows" ? " active" : "")} onClick={onWorkflows}>Workflows</button>
    </nav>
  );
}

function LogsHome({ logs, onOpen, onCreate, onWorkflows, onLogs, onArchive, onDelete, onDuplicate }) {
  const [creating, setCreating] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [q, setQ] = useState("");
  const archivedCount = logs.filter((l) => l.archived).length;
  const viewingArchived = showArchived && archivedCount > 0;
  const needle = q.trim().toLowerCase();
  const scope = logs.filter((l) => (viewingArchived ? l.archived : !l.archived));
  const rows = needle ? scope.filter((l) => `${l.title} ${l.product} ${l.owner}`.toLowerCase().includes(needle)) : scope;
  return (
    <div className="home-root">
      <style>{HOME_CSS}</style>
      <HomeNav active="logs" onLogs={onLogs} onWorkflows={onWorkflows} />
      <header className="home-head">
        <div>
          <h1>Decision Logs</h1>
          <p>Every decision log across the project — what was decided, and why.</p>
        </div>
        <div className="home-head-actions">
          <button className="hm-btn primary lg" onClick={() => setCreating(true)}>+ New decision log</button>
        </div>
      </header>
      <div className="home-search-row">
        <input className="home-search" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Search decision logs by name, product, or owner…" />
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
            <tr><th>Decision log</th><th>Product</th><th>Owner</th><th className="num-h">Decisions</th><th>Updated</th><th></th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} className="home-empty">{needle ? `No decision logs match “${q}”.` : (viewingArchived ? "No archived logs." : "No decision logs yet.")}</td></tr>
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
                  <td className="home-rowactions">
                    <RowMenu archived={l.archived}
                      onDuplicate={() => onDuplicate(l.id)}
                      onArchive={() => onArchive(l.id, !l.archived)}
                      onDelete={() => { if (window.confirm(`Delete "${l.title}" and all its decisions? This can't be undone.`)) onDelete(l.id); }} />
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

function WorkflowsHome({ workflows, onOpen, onCreate, onLogs, onWorkflows, onArchive, onDelete, onDuplicate }) {
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
      <HomeNav active="workflows" onLogs={onLogs} onWorkflows={onWorkflows} />
      <header className="home-head">
        <div>
          <h1>Workflows</h1>
          <p>Captured workflows — steps, people, exceptions, and where AI fits.</p>
        </div>
        <div className="home-head-actions">
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
                <td className="home-rowactions">
                  <RowMenu archived={w.archived}
                    onDuplicate={() => onDuplicate(w.id)}
                    onArchive={() => onArchive(w.id, !w.archived)}
                    onDelete={() => { if (window.confirm(`Delete the workflow "${w.name}"? This can't be undone.`)) onDelete(w.id); }} />
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

// ---- persistence: localStorage now, Cloudflare D1 (/api/state) when deployed ----
function loadSaved() {
  return loadLocal();
}

export default function App() {
  const saved = loadSaved();
  const [logs, setLogs] = useState(saved?.logs ?? INITIAL_LOGS);
  const [workflows, setWorkflows] = useState(saved?.workflows ?? INITIAL_WORKFLOWS);
  const [route, setRoute] = useState(hashToRoute);
  const routeRef = useRef(route);
  routeRef.current = route;
  const apiPresent = useRef(false); // true once the backend API has responded
  const hydrated = useRef(false);   // true after the initial server load attempt

  // On mount, try to load the shared workspace from the database. If there's no
  // backend (e.g. plain static hosting), we silently stay on localStorage.
  useEffect(() => {
    let cancelled = false;
    loadRemote()
      .then((d) => {
        apiPresent.current = true;
        if (cancelled || !d) return;
        if (Array.isArray(d.logs) && d.logs.length) setLogs(d.logs);
        if (Array.isArray(d.workflows) && d.workflows.length) setWorkflows(d.workflows);
      })
      .catch(() => { apiPresent.current = false; })
      .finally(() => { hydrated.current = true; });
    return () => { cancelled = true; };
  }, []);

  // Persist changes: always to localStorage; debounced to the database when present.
  useEffect(() => {
    saveLocal({ logs, workflows });
    if (!hydrated.current || !apiPresent.current) return;
    const t = setTimeout(() => { saveRemote({ logs, workflows }).catch(() => {}); }, 600);
    return () => clearTimeout(t);
  }, [logs, workflows]);

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

  // Duplicate a log / workflow as an independent copy placed right after it.
  const duplicateLog = (id) => setLogs((ls) => {
    const i = ls.findIndex((l) => l.id === id);
    if (i < 0) return ls;
    const copy = JSON.parse(JSON.stringify(ls[i]));
    copy.id = "log-" + Date.now();
    copy.title = (ls[i].title || "Untitled") + " (copy)";
    copy.archived = false;
    const next = [...ls];
    next.splice(i + 1, 0, copy);
    return next;
  });
  const duplicateWorkflow = (id) => setWorkflows((ws) => {
    const i = ws.findIndex((w) => w.id === id);
    if (i < 0) return ws;
    const copy = JSON.parse(JSON.stringify(ws[i]));
    copy.id = "wf-" + Date.now();
    copy.name = (ws[i].name || "Untitled workflow") + " (copy)";
    copy.updated = TODAY;
    copy.archived = false;
    const next = [...ws];
    next.splice(i + 1, 0, copy);
    return next;
  });
  // Persist a workflow's capture content (info + flows + decisions + links) and
  // refresh its step count / updated date for the index.
  const updateWorkflowContent = (id, content) =>
    setWorkflows((ws) => ws.map((w) => {
      if (w.id !== id) return w;
      const mainFlow = (content.flows || []).find((f) => f.id === "main") || (content.flows || [])[0];
      return { ...w, content, steps: mainFlow ? mainFlow.columns.length : w.steps, updated: TODAY };
    }));

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

  // Replace existing log entries' content (keeping their id) — used by the
  // "replace duplicate" option when exporting from a workflow.
  const replaceLogEntries = (logId, pairs) => {
    updateLog(logId, (p) => ({
      ...p,
      entries: p.entries.map((e) => {
        const match = pairs.find((x) => x.id === e.id);
        return match ? { ...e, ...match.entry, id: e.id } : e;
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
    // Prefer saved content; else seed (outfit) or a blank workflow.
    const initial = wf?.content ?? (wf && wf.seed === "outfit" ? undefined : blankWorkflow(wf?.name, wf?.product, wf?.owner));
    return (
      <WorkflowCapture
        key={route.id}
        initial={initial}
        projectLinks={wf?.content?.links ?? wf?.projectLinks ?? []}
        focusStep={route.focusStep}
        focusFlowId={route.focusFlowId}
        startInfoEditing={!wf?.content && wf?.seed !== "outfit"}
        onWorkflowsHome={() => setRoute({ view: "workflows" })}
        onContentChange={(content) => updateWorkflowContent(route.id, content)}
        logsIndex={logs.map((l) => ({ id: l.id, title: l.title, code: `${l.settings.prefix}-${l.settings.workflow}` }))}
        existingLogCodes={logs.map((l) => `${l.settings.prefix}-${l.settings.workflow}`.toUpperCase())}
        logEntriesById={Object.fromEntries(logs.map((l) => [l.id, l.entries.map((e) => ({ id: e.id, decision: e.decision }))]))}
        onCreateLog={createLogSilent}
        onAddToLog={addEntriesToLog}
        onUpdateLogEntries={updateLogEntries}
        onReplaceLogEntries={replaceLogEntries}
        onOpenLog={(id) => setRoute({ view: "log", id })}
      />
    );
  }

  if (route.view === "workflows") {
    return <WorkflowsHome workflows={workflows} onOpen={(id) => setRoute({ view: "workflow", id })} onCreate={createWorkflow} onLogs={() => setRoute({ view: "logs" })} onWorkflows={() => setRoute({ view: "workflows" })} onArchive={setWorkflowArchived} onDelete={deleteWorkflow} onDuplicate={duplicateWorkflow} />;
  }

  if (route.view === "log") {
    const log = logs.find((l) => l.id === route.id);
    if (!log) return <LogsHome logs={logs} onOpen={(id) => setRoute({ view: "log", id })} onCreate={createLog} onWorkflows={() => setRoute({ view: "workflows" })} onLogs={() => setRoute({ view: "logs" })} onArchive={setLogArchived} onDelete={deleteLog} onDuplicate={duplicateLog} />;
    return (
      <DecisionLog
        key={log.id}
        log={log}
        subtitle={SUBTITLE}
        onChange={(updater) => updateLog(log.id, updater)}
        onBack={() => setRoute({ view: "logs" })}
        onOpenWorkflow={(step, flowId) => setRoute({ view: "workflow", id: log.workflowView, focusStep: step, focusFlowId: flowId })}
      />
    );
  }

  return <LogsHome logs={logs} onOpen={(id) => setRoute({ view: "log", id })} onCreate={createLog} onWorkflows={() => setRoute({ view: "workflows" })} onLogs={() => setRoute({ view: "logs" })} onArchive={setLogArchived} onDelete={deleteLog} onDuplicate={duplicateLog} />;
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
.home-nav{display:flex;gap:18px;align-items:center;margin-bottom:24px;border-bottom:1px solid var(--line)}
.home-nav-link{font-family:inherit;font-size:14px;font-weight:600;color:var(--ink-faint);background:none;
  border:none;border-bottom:2px solid transparent;padding:6px 2px 10px;cursor:pointer;transition:color .12s}
.home-nav-link:hover{color:var(--ink)}
.home-nav-link.active{color:var(--accent);border-bottom-color:var(--accent)}
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
.home-rowactions{text-align:right;white-space:nowrap;width:48px}
.home-menu{position:relative;display:inline-block}
.home-kebab{font-family:inherit;font-size:16px;line-height:1;color:var(--ink-faint);background:transparent;
  border:1px solid transparent;border-radius:7px;width:30px;height:28px;cursor:pointer;transition:.12s}
.home-kebab:hover{background:var(--line-soft);color:var(--ink);border-color:var(--line)}
.home-menu-scrim{position:fixed;inset:0;z-index:30}
.home-menu-pop{position:absolute;right:0;top:calc(100% + 4px);z-index:31;background:var(--surface);
  border:1px solid var(--line);border-radius:9px;box-shadow:0 10px 26px -10px rgba(0,0,0,.25);
  padding:4px;min-width:130px;display:flex;flex-direction:column;text-align:left}
.home-menu-pop button{font-family:inherit;font-size:12.5px;font-weight:600;color:var(--ink);background:transparent;
  border:none;border-radius:6px;padding:8px 10px;text-align:left;cursor:pointer}
.home-menu-pop button:hover{background:var(--accent-tint)}
.home-menu-pop button.danger{color:var(--danger)}
.home-menu-pop button.danger:hover{background:#FBEBEA}
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
