import { useState } from "react";
import DecisionLog, { OUTFIT_ENTRIES } from "./DecisionLogApp";
import { HACKWEEK_ENTRIES } from "./hackweekData";
import WorkflowCapture from "./WorkflowCapture";

const SUBTITLE = "A record of what was decided, and why.";

const INITIAL_LOGS = [
  {
    id: "outfit",
    title: "Decision Log: Daily outfit generator",
    owner: "Lauren (DPM)",
    product: "Outfit App",
    feature: "Daily outfit generator",
    workflowLink: "",        // external URL link (none — uses internal workflow page)
    workflowView: "workflow", // internal workflow-capture page
    settings: { prefix: "DOG", workflow: "GEN" },
    entries: OUTFIT_ENTRIES,
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
    entries: HACKWEEK_ENTRIES,
  },
];

function summarize(entries) {
  const dates = entries.map((e) => e.date).filter(Boolean).sort();
  return { count: entries.length, updated: dates[dates.length - 1] || "—" };
}

// Derive a default ID code (first 3 letters) from a product/feature name.
function code(s) {
  const letters = (s || "").match(/[A-Za-z]/g) || [];
  return letters.slice(0, 3).join("").toUpperCase() || "LOG";
}

/* ------------------------------------------------------------------ */
/*  Create-log modal                                                  */
/* ------------------------------------------------------------------ */

function CreateLogModal({ onClose, onCreate }) {
  const [owner, setOwner] = useState("");
  const [product, setProduct] = useState("");
  const [feature, setFeature] = useState("");
  const [workflowLink, setWorkflowLink] = useState("");
  const valid = owner.trim() && product.trim() && feature.trim();

  const submit = () => {
    if (!valid) return;
    onCreate({
      owner: owner.trim(),
      product: product.trim(),
      feature: feature.trim(),
      workflowLink: workflowLink.trim(),
    });
  };

  return (
    <>
      <div className="home-scrim" onClick={onClose} />
      <div className="home-modal" role="dialog" aria-modal="true">
        <div className="home-modal-head">
          <div>
            <h2>New decision log</h2>
            <p>Create a log to record decisions for a product feature.</p>
          </div>
          <button className="home-x" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="home-modal-body">
          <label className="hm-field">
            <span className="hm-label">Decision log owner<i>*</i></span>
            <input className="hm-input" value={owner} onChange={(e) => setOwner(e.target.value)}
              placeholder="e.g. Lauren (DPM)" autoFocus />
          </label>
          <div className="hm-grid">
            <label className="hm-field">
              <span className="hm-label">Product<i>*</i></span>
              <input className="hm-input" value={product} onChange={(e) => setProduct(e.target.value)}
                placeholder="e.g. Outfit App" />
            </label>
            <label className="hm-field">
              <span className="hm-label">Feature<i>*</i></span>
              <input className="hm-input" value={feature} onChange={(e) => setFeature(e.target.value)}
                placeholder="e.g. Daily outfit generator" />
            </label>
          </div>
          <label className="hm-field">
            <span className="hm-label">Link to workflow <em>(optional)</em></span>
            <input className="hm-input" value={workflowLink} onChange={(e) => setWorkflowLink(e.target.value)}
              placeholder="https://… (FigJam, Lucid, docs, etc.)" />
          </label>
          <p className="hm-note">
            New IDs will start from <span className="mono">{code(product)}-{code(feature)}-001</span>.
            All of these are editable later in the log's Settings.
          </p>
        </div>
        <div className="home-modal-foot">
          <button className="hm-btn" onClick={onClose}>Cancel</button>
          <button className="hm-btn primary" onClick={submit} disabled={!valid}>Create log</button>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Home: table of decision logs                                      */
/* ------------------------------------------------------------------ */

function Home({ logs, onOpen, onCreate }) {
  const [creating, setCreating] = useState(false);
  return (
    <div className="home-root">
      <style>{HOME_CSS}</style>
      <header className="home-head">
        <div>
          <h1>Decision Logs</h1>
          <p>Every decision log across the project — what was decided, and why.</p>
        </div>
        <button className="hm-btn primary lg" onClick={() => setCreating(true)}>+ New decision log</button>
      </header>
      <div className="home-table-wrap">
        <table className="home-tbl">
          <thead>
            <tr>
              <th>Decision log</th>
              <th>Product</th>
              <th>Owner</th>
              <th className="num-h">Decisions</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => {
              const s = summarize(l.entries);
              return (
                <tr key={l.id} onClick={() => onOpen(l.id)}>
                  <td className="home-name">{l.title}</td>
                  <td className="dim">{l.product || "—"}</td>
                  <td className="dim">{l.owner || "—"}</td>
                  <td className="num">{s.count}</td>
                  <td className="dim">{s.updated}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {creating && (
        <CreateLogModal
          onClose={() => setCreating(false)}
          onCreate={(meta) => { setCreating(false); onCreate(meta); }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  App: routing + log state                                          */
/* ------------------------------------------------------------------ */

export default function App() {
  const [logs, setLogs] = useState(INITIAL_LOGS);
  const [route, setRoute] = useState({ view: "home" });

  const updateLog = (id, updater) =>
    setLogs((ls) => ls.map((l) => (l.id === id ? updater(l) : l)));

  const createLog = ({ owner, product, feature, workflowLink }) => {
    const id = "log-" + Date.now();
    const newLog = {
      id, title: feature, owner, product, feature,
      workflowLink: workflowLink || "", workflowView: null,
      settings: { prefix: code(product), workflow: code(feature) },
      entries: [],
    };
    setLogs((ls) => [...ls, newLog]);
    setRoute({ view: "log", id });
  };

  if (route.view === "workflow") {
    const fromLog = logs.find((l) => l.id === route.fromLogId);
    return (
      <WorkflowCapture
        onHome={() => setRoute({ view: "home" })}
        onBackToLog={() => setRoute({ view: "log", id: route.fromLogId })}
        backLogLabel={fromLog ? fromLog.title : "Decision log"}
        focusStep={route.focusStep}
      />
    );
  }

  if (route.view === "log") {
    const log = logs.find((l) => l.id === route.id);
    if (!log) return <Home logs={logs} onOpen={(id) => setRoute({ view: "log", id })} onCreate={createLog} />;
    return (
      <DecisionLog
        key={log.id}
        log={log}
        subtitle={SUBTITLE}
        onChange={(updater) => updateLog(log.id, updater)}
        onBack={() => setRoute({ view: "home" })}
        onOpenWorkflow={(step) => setRoute({ view: "workflow", fromLogId: log.id, focusStep: step })}
      />
    );
  }

  return <Home logs={logs} onOpen={(id) => setRoute({ view: "log", id })} onCreate={createLog} />;
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
.home-table-wrap{margin-top:28px;border:1px solid var(--line);border-radius:12px;overflow:hidden;
  background:var(--surface);box-shadow:0 1px 2px rgba(0,0,0,.02);max-width:900px}
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
.home-modal-foot{display:flex;justify-content:flex-end;gap:8px;padding:14px 22px;
  border-top:1px solid var(--line);background:#FCFBF8}
@media (max-width:560px){.hm-grid{grid-template-columns:1fr}}
`;
