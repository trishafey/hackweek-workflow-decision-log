import { useState } from "react";
import { ProjectLinksEditor } from "./DecisionLogApp";

export const ID_STRUCTURE = "First 2–3 letters = project · next 2–5 letters = specific workflow · 3 digits = chronological decision number.";

// Derive a default ID code (first n letters) from a product/feature name.
export function code(s, n = 3) {
  const letters = (s || "").match(/[A-Za-z]/g) || [];
  return letters.slice(0, n).join("").toUpperCase() || "LOG";
}

// Self-contained styles (duplicates the home styles) so the modal renders
// identically outside the Decision Logs home — e.g. from the workflow page.
const CLM_CSS = `
.home-scrim{position:fixed;inset:0;background:rgba(28,27,25,.34);z-index:140;backdrop-filter:blur(1.5px)}
.home-modal{
  --surface:#FFFFFF; --ink:#1C1B19; --ink-soft:#57534E; --ink-faint:#94908A;
  --line:#E7E4DD; --line-soft:#F1EEE8; --accent:#1F3A34; --accent-ink:#16302A;
  --accent-soft:#E9EFEC; --danger:#A8453B;
  position:fixed;z-index:150;left:50%;top:50%;transform:translate(-50%,-50%);
  background:var(--surface);border-radius:16px;box-shadow:0 30px 70px -20px rgba(0,0,0,.4);
  width:min(540px,94vw);max-height:90vh;display:flex;flex-direction:column;overflow:hidden;
  font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink);
  -webkit-font-smoothing:antialiased}
.home-modal *{box-sizing:border-box}
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
.hm-tip{position:absolute;bottom:calc(100% + 7px);left:50%;transform:translateX(-50%);z-index:160;
  background:var(--ink);color:#fff;font-size:11.5px;font-weight:400;line-height:1.5;letter-spacing:0;
  text-transform:none;padding:8px 11px;border-radius:8px;width:max-content;max-width:240px;
  box-shadow:0 12px 28px -10px rgba(0,0,0,.45);opacity:0;visibility:hidden;transition:opacity .14s;pointer-events:none}
.hm-info:hover .hm-tip,.hm-info:focus .hm-tip{opacity:1;visibility:visible}
.home-modal-foot{display:flex;justify-content:flex-end;gap:8px;padding:14px 22px;
  border-top:1px solid var(--line);background:#FCFBF8}
.hm-btn{font-family:inherit;font-size:13px;font-weight:600;border-radius:8px;padding:8px 13px;
  cursor:pointer;border:1px solid var(--line);background:var(--surface);color:var(--ink-soft);transition:.13s}
.hm-btn:hover{border-color:#d8d4cc}
.hm-btn.primary{background:var(--accent);border-color:var(--accent);color:#fff}
.hm-btn.primary:hover{background:var(--accent-ink)}
.hm-btn.primary:disabled{opacity:.5;cursor:not-allowed}
.home-modal .mono{font-family:"SF Mono",ui-monospace,"JetBrains Mono",monospace}
@media (max-width:560px){.home-modal .hm-grid{grid-template-columns:1fr}}
`;

export default function CreateLogModal({ onClose, onCreate, existingCodes }) {
  const [owner, setOwner] = useState("");
  const [product, setProduct] = useState("");
  const [feature, setFeature] = useState("");
  const [logId, setLogId] = useState("");
  const [workflowLink, setWorkflowLink] = useState("");
  const [projectLinks, setProjectLinks] = useState([]);

  const generate = () => setLogId(`${code(product, 3)}-${code(feature, 5)}-001`);
  const m = /^([A-Za-z]{1,3})-([A-Za-z]{1,5})-(\d{1,3})$/.exec(logId.trim());
  const codeKey = m ? `${m[1]}-${m[2]}`.toUpperCase() : null;
  const taken = codeKey && (existingCodes || []).includes(codeKey);
  const idValid = !!m && !taken;
  const valid = owner.trim() && product.trim() && feature.trim() && idValid;

  const submit = () => {
    if (!valid) return;
    onCreate({
      owner: owner.trim(), product: product.trim(), feature: feature.trim(), workflowLink: workflowLink.trim(),
      prefix: m[1].toUpperCase(), workflow: m[2].toUpperCase(),
      projectLinks: projectLinks.filter((l) => (l.label || "").trim() || (l.url || "").trim()),
    });
  };

  return (
    <>
      <style>{CLM_CSS}</style>
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
            <input className="hm-input" value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="e.g. Lauren (DPM)" autoFocus />
          </label>
          <div className="hm-grid">
            <label className="hm-field">
              <span className="hm-label">Product<i>*</i></span>
              <input className="hm-input" value={product} onChange={(e) => setProduct(e.target.value)} placeholder="e.g. Outfit App" />
            </label>
            <label className="hm-field">
              <span className="hm-label">Feature<i>*</i></span>
              <input className="hm-input" value={feature} onChange={(e) => setFeature(e.target.value)} placeholder="e.g. Daily outfit generator" />
            </label>
          </div>
          <label className="hm-field">
            <span className="hm-label">
              Log ID<i>*</i>
              <span className="hm-info" tabIndex={0}>i<span className="hm-tip">{ID_STRUCTURE}</span></span>
            </span>
            <div className="hm-idrow">
              <input className={"hm-input mono" + (logId && !idValid ? " hm-err" : "")} value={logId}
                onChange={(e) => setLogId(e.target.value)} placeholder="e.g. OUT-DAILY-001" />
              <button className="hm-btn" type="button" onClick={generate} disabled={!product.trim() || !feature.trim()}>Auto-generate</button>
            </div>
            {logId && !m && <span className="hm-error-text">Use the format PREFIX-WORKFLOW-001 (letters, then 3 digits).</span>}
            {taken && <span className="hm-error-text">That Log ID is already taken — pick another.</span>}
          </label>
          <label className="hm-field">
            <span className="hm-label">Link to workflow <em>(optional)</em></span>
            <input className="hm-input" value={workflowLink} onChange={(e) => setWorkflowLink(e.target.value)} placeholder="https://… (FigJam, Lucid, docs, etc.)" />
          </label>
          <ProjectLinksEditor links={projectLinks} onChange={setProjectLinks} />
          <p className="hm-note">All of these are editable later in the log's Settings.</p>
        </div>
        <div className="home-modal-foot">
          <button className="hm-btn" onClick={onClose}>Cancel</button>
          <button className="hm-btn primary" onClick={submit} disabled={!valid}>Create log</button>
        </div>
      </div>
    </>
  );
}
