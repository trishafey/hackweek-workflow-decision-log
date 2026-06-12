import React, { useState, useMemo, useRef } from "react";
import {
  Plus, Sparkles, Settings, Download, Upload, Copy, Trash2, Pencil, X,
  ChevronUp, ChevronDown, ChevronsUpDown, Check, FileJson, FileSpreadsheet,
  AlertCircle, Loader2, ClipboardCopy, Info, ChevronDown as Caret
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUSES = [
  "Proposed", "Under review", "Prioritized", "Active",
  "Future state", "Rejected", "Descoped", "Deprecated",
];

const STATUS_STYLE = {
  "Proposed":     { bg: "#EEF1F4", fg: "#475569", dot: "#94A3B8" },
  "Under review": { bg: "#FBF3E2", fg: "#8A6A12", dot: "#D9A526" },
  "Prioritized":  { bg: "#E8F0FB", fg: "#2C5BA0", dot: "#4A82D8" },
  "Active":       { bg: "#E5F1EA", fg: "#2E6B45", dot: "#4A9968" },
  "Future state": { bg: "#F0EBFA", fg: "#6B4B9E", dot: "#9576D6" },
  "Rejected":     { bg: "#FBEBEA", fg: "#A8453B", dot: "#D86C60" },
  "Descoped":     { bg: "#F0EEEA", fg: "#6B6256", dot: "#A89F90" },
  "Deprecated":   { bg: "#F3EDE6", fg: "#8A6B52", dot: "#B89171" },
};

// table column key + label + whether sortable
const COLUMNS = [
  { key: "id", label: "ID", w: 118, desc: "Project code (2–3 letters) · workflow code (2–3 letters) · 3-digit chronological number. Set the codes in Settings." },
  { key: "date", label: "Date", w: 104, desc: "When the decision was made." },
  { key: "status", label: "Status", w: 120, desc: "The current status of the decision." },
  { key: "subject", label: "Subject", w: 140, desc: "What the decision is about — a controlled tag, used for filtering." },
  { key: "decision", label: "Decision", w: 280, desc: "A clear, concise statement of what was decided." },
  { key: "context", label: "Context", w: 230, desc: "What problem or trigger led to this decision?\nInclude constraints, assumptions, or the scenario." },
  { key: "rationale", label: "Rationale", w: 240, desc: "Why this option was chosen.\nInclude tradeoffs, risks, and constraints." },
  { key: "workflowStep", label: "Workflow step", w: 150, desc: "Links the decision to a specific step in the workflow.\nPrevents floating, contextless decisions." },
  { key: "decisionOwner", label: "Owner", w: 170, desc: "Who made the final decision. Establishes accountability." },
];

// full field schema (used for forms / export / AI mapping)
const ID_DESC = "Project code (2–3 letters) · workflow code (2–3 letters) · 3-digit chronological number. Set the codes in Settings.";

const FIELDS = [
  { key: "date", label: "Date", type: "date", desc: "When the decision was made." },
  { key: "status", label: "Status", type: "status", desc: "The current status of the decision." },
  { key: "subject", label: "Subject", type: "subject", desc: "What the decision is about — a controlled tag, used for filtering." },
  { key: "decision", label: "Decision", type: "textarea", desc: "A clear, concise statement of what was decided." },
  { key: "context", label: "Context", type: "textarea", desc: "What problem or trigger led to this decision?\nInclude constraints, assumptions, or the scenario." },
  { key: "rationale", label: "Rationale", type: "textarea", desc: "Why this option was chosen.\nInclude tradeoffs, risks, and constraints." },
  { key: "optionsConsidered", label: "Options considered", type: "textarea", desc: "Capture at least 2–3 alternatives.\nShows the thinking — prevents future re-debates." },
  { key: "decisionOwner", label: "Decision owner", type: "text", desc: "Who made the final decision. Establishes accountability." },
  { key: "workflowStep", label: "Workflow step", type: "text", desc: "Links the decision to a specific step in the workflow.\nPrevents floating, contextless decisions." },
  { key: "otherLink", label: "Other link", type: "text", desc: "Links to meeting notes, research, Lucid boards, Figma, etc." },
];

const EXPORT_FIELDS = [
  { key: "id", label: "ID" },
  { key: "date", label: "Date" },
  { key: "status", label: "Status" },
  { key: "subject", label: "Subject" },
  { key: "decision", label: "Decision" },
  { key: "context", label: "Context" },
  { key: "rationale", label: "Rationale" },
  { key: "optionsConsidered", label: "Options Considered" },
  { key: "decisionOwner", label: "Decision Owner" },
  { key: "workflowStep", label: "Workflow Step" },
  { key: "otherLink", label: "Other Link" },
];

const TODAY = new Date().toISOString().slice(0, 10);

const SEED = [
  {
    id: "DOG-GEN-001", date: "2026-06-11", status: "Prioritized", subject: "Calendar occasion detection",
    decision: "Detect today's occasion from the calendar and greet with a ready-made suggestion - or special event like birthday",
    context: "", rationale: "", optionsConsidered: "",
    decisionOwner: "", workflowStep: "Trigger", otherLink: "decision-log://outfit-gen",
  },
  {
    id: "DOG-GEN-002", date: "2026-06-11", status: "Prioritized", subject: "Morning weather push",
    decision: "Dynamic morning push about weather change i.e. 73 and raining",
    context: "", rationale: "", optionsConsidered: "",
    decisionOwner: "", workflowStep: "Trigger", otherLink: "decision-log://outfit-gen",
  },
  {
    id: "DOG-GEN-003", date: "2026-06-11", status: "Future state", subject: "Location/travel awareness",
    decision: "Contextual awareness for location/travel. I.e. tropical, or Paris, or modest (tracking geolocation)",
    context: "", rationale: "", optionsConsidered: "",
    decisionOwner: "", workflowStep: "Trigger", otherLink: "decision-log://outfit-gen",
  },
  {
    id: "DOG-GEN-004", date: "2026-06-11", status: "Prioritized", subject: "Plan around a specific item",
    decision: "User wants to wear an item of clothing but doesn't know what to match with",
    context: "", rationale: "Being able to plan an outfit around a specific item like buying a new pair of pants and excited to wear", optionsConsidered: "",
    decisionOwner: "", workflowStep: "Step 1: Styling brief", otherLink: "decision-log://outfit-gen",
  },
  {
    id: "DOG-GEN-005", date: "2026-06-11", status: "Prioritized", subject: "Conversational clarification",
    decision: "Conversational follow up question clarification",
    context: "", rationale: "Adding context and details for AI. Helps match a vibe that you want to go with. Adds clarity and direction and learns your style more.", optionsConsidered: "",
    decisionOwner: "", workflowStep: "Step 1: Styling brief", otherLink: "decision-log://outfit-gen",
  },
  {
    id: "DOG-GEN-006", date: "2026-06-11", status: "Future state", subject: "Voice note brief",
    decision: "Voice note brief \"tell me about your day\" or similar",
    context: "", rationale: "Accessibility. Easier than typing, easier to explain what you want. Natural language. Hands free. Variety of input.", optionsConsidered: "",
    decisionOwner: "", workflowStep: "Step 1: Styling brief", otherLink: "decision-log://outfit-gen",
  },
  {
    id: "DOG-GEN-007", date: "2026-06-11", status: "Prioritized", subject: "Explain the outfit",
    decision: "Explain the outfit: the blazer keeps it polished, sneaker say you're not trying to hard.",
    context: "", rationale: "Helps users understand outfit choices, esp if not fashion savvy or want to learn about fashion. Adds context. Building trust.", optionsConsidered: "",
    decisionOwner: "Fejdasz, Trish", workflowStep: "Step 2: Generate the looks", otherLink: "decision-log://outfit-gen",
  },
  {
    id: "DOG-GEN-008", date: "2026-06-11", status: "Prioritized", subject: "Weather-aware generation",
    decision: "Weather-aware generation (layering for cold, low or high chance raining, breathable for heat) accessory: umbrella",
    context: "", rationale: "Weather is important for deciding outfits because temp and conditions affect what clothing and accessories are appropriate.", optionsConsidered: "",
    decisionOwner: "Fejdasz, Trish", workflowStep: "Step 2: Generate the looks", otherLink: "decision-log://outfit-gen",
  },
  {
    id: "DOG-GEN-009", date: "2026-06-11", status: "Future state", subject: "Trend lookup",
    decision: "Looking up current or emerging trends. Classic or trendy?",
    context: "", rationale: "Keeping current if user wants to try new trends or stay classic. Helps with personalization of experience and saves time from looking up trends.", optionsConsidered: "",
    decisionOwner: "Fejdasz, Trish", workflowStep: "Step 2: Generate the looks", otherLink: "decision-log://outfit-gen",
  },
  {
    id: "DOG-GEN-010", date: "2026-06-11", status: "Future state", subject: "Wardrobe purchase suggestions",
    decision: "Look up smart suggestions for additional pieces to wardrobe",
    context: "", rationale: "Building a more complete wardrobe for more options. Integrating monetizations through partnerships. More versatility. \"If you add these trousers you can have 12 new outfits in rotation\"", optionsConsidered: "",
    decisionOwner: "Fejdasz, Trish", workflowStep: "Step 2: Generate the looks", otherLink: "decision-log://outfit-gen",
  },
  {
    id: "DOG-GEN-011", date: "2026-06-11", status: "Prioritized", subject: "\"Not my vibe\" / favorite feedback",
    decision: "\"Not my vibe\" button with follow up question \"why not\" & \"I love this\" \"favorite\"",
    context: "", rationale: "Help train AI to understand user's style preferences. User can build custom look books, to favorite looks for later.", optionsConsidered: "",
    decisionOwner: "Fejdasz, Trish", workflowStep: "Step 3: Review", otherLink: "decision-log://outfit-gen",
  },
  {
    id: "DOG-GEN-012", date: "2026-06-11", status: "Prioritized", subject: "Natural-language fine tuning",
    decision: "Natural language to fine tune selections (warmer, more casual, more colour)",
    context: "", rationale: "Helps with accuracy of regeneration. Reduce AI token cost. Helps AI learn about user.", optionsConsidered: "Voice or text, or both. Prompts/pills/chips.",
    decisionOwner: "Fejdasz, Trish", workflowStep: "Step 3: Review", otherLink: "decision-log://outfit-gen",
  },
  {
    id: "DOG-GEN-013", date: "2026-06-11", status: "Prioritized", subject: "Smart single-item swapping",
    decision: "Smart swapping single items. and learns from every swap. or \"more like this\"",
    context: "", rationale: "Offering further customization and flexibility to the user. More learning for the AI.", optionsConsidered: "",
    decisionOwner: "Fejdasz, Trish", workflowStep: "Step 3: Review", otherLink: "decision-log://outfit-gen",
  },
  {
    id: "DOG-GEN-014", date: "2026-06-11", status: "Future state", subject: "On-body outfit preview",
    decision: "Generate outfit on your body to preview with AI (can share measurements or photo of yourself in preferences or default to a mannequin/avatar)",
    context: "", rationale: "Provides visualization without hassling the user to try everything on or envision in their head. Boosts confidence score. Potentially increases speed of decision. Try before you buy!", optionsConsidered: "",
    decisionOwner: "Fejdasz, Trish", workflowStep: "Step 3: Review", otherLink: "decision-log://outfit-gen",
  },
  {
    id: "DOG-GEN-015", date: "2026-06-11", status: "Prioritized", subject: "Calendar-aware repeat avoidance",
    decision: "Calendar aware \"you work this week\" or \"you already wore this on 3 vacations\" \"you wore this to 3 client meetings\" try something new! (adjust in preferences?)",
    context: "", rationale: "Avoid outfit repeats. User doesn't have to remember. Helps user try new things.", optionsConsidered: "",
    decisionOwner: "Fejdasz, Trish", workflowStep: "Step 4: Select outfit", otherLink: "decision-log://outfit-gen",
  },
  {
    id: "DOG-GEN-016", date: "2026-06-11", status: "Future state", subject: "Shareable style look book",
    decision: "Share a style look book, maybe a theme for a party, or a group vacation, or a night out.",
    context: "", rationale: "Coordinating with friends, adds a social aspect. Makes planning easier.", optionsConsidered: "",
    decisionOwner: "Fejdasz, Trish", workflowStep: "Step 4: Select outfit", otherLink: "decision-log://outfit-gen",
  },
  {
    id: "DOG-GEN-017", date: "2026-06-11", status: "Prioritized", subject: "Confirmation-based style learning",
    decision: "Learning your style with each confirmation or \"didn't work try something new\" with follow up questions like \"why didn't this work\" or \"how confident did you feel\" or rating",
    context: "", rationale: "AI training on user's preferences. Builds trust between user and AI.", optionsConsidered: "",
    decisionOwner: "Fejdasz, Trish", workflowStep: "Step 5: Confirmation", otherLink: "decision-log://outfit-gen",
  },
  {
    id: "DOG-GEN-018", date: "2026-06-11", status: "Future state", subject: "Declutter suggestions",
    decision: "Declutter: auto suggest unworn items that go unselected",
    context: "", rationale: "Assists user with mental and physical inventory of clothing usage, to make room for new pieces. Potentially help user repurpose pieces.", optionsConsidered: "",
    decisionOwner: "Fejdasz, Trish", workflowStep: "Step 5: Confirmation", otherLink: "decision-log://outfit-gen",
  },
  {
    id: "DOG-GEN-019", date: "2026-06-11", status: "Future state", subject: "Wear tracker",
    decision: "Tracker for how many times you wore the outfit or pieces",
    context: "", rationale: "Compliments the \"Declutter\" feature proposal. Helps user understand the value of each piece.", optionsConsidered: "#girlmath \"you wore these $200 jeans 20 times so it was really $10\" :)",
    decisionOwner: "Fejdasz, Trish", workflowStep: "Step 5: Confirmation", otherLink: "decision-log://outfit-gen",
  },
];

const SEED_OWNERS = [
  "Trish & Shokoh",
  "Jenevine, Lauren, & Trish",
  "Shokoh",
  "Lauren & Jenevine",
  "Trish, Shokoh, Jenevine, & Lauren",
  "Jenevine & Shokoh",
  "Lauren, Trish, & Shokoh",
  "Shokoh, Jenevine, & Lauren",
  "Trish & Lauren",
  "Jenevine",
  "Lauren, Shokoh, & Trish",
  "Trish, Jenevine, & Lauren",
  "Shokoh & Trish",
  "Lauren, Jenevine, Shokoh, & Trish",
  "Jenevine, Trish, & Shokoh",
  "Lauren & Shokoh",
  "Trish, Lauren, & Jenevine",
  "Shokoh, Trish, & Jenevine",
  "Jenevine, Lauren, Shokoh, & Trish",
];

const SEED_SUBJECTS = [
  "Occasion detection",
  "Weather push",
  "Travel awareness",
  "Item planning",
  "Clarification",
  "Voice brief",
  "Outfit explanation",
  "Weather-aware",
  "Trend lookup",
  "Purchase ideas",
  "Vibe feedback",
  "Fine tuning",
  "Item swapping",
  "Outfit preview",
  "Repeat avoidance",
  "Look book",
  "Style learning",
  "Declutter",
  "Wear tracker",
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function emptyEntry() {
  return {
    id: "", date: TODAY, status: "Proposed", subject: "", decision: "",
    context: "", rationale: "", optionsConsidered: "", decisionOwner: "",
    workflowStep: "", otherLink: "",
  };
}

function nextNumber(entries) {
  let max = 0;
  for (const e of entries) {
    const m = /(\d+)\s*$/.exec(e.id || "");
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max + 1;
}

function makeId(prefix, wf, n) {
  const p = (prefix || "PRJ").toUpperCase();
  const w = (wf || "WF").toUpperCase();
  return `${p}-${w}-${String(n).padStart(3, "0")}`;
}

function csvCell(v) {
  const s = (v == null ? "" : String(v));
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function download(filename, text, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function toCSV(entries) {
  const header = EXPORT_FIELDS.map((f) => csvCell(f.label)).join(",");
  const rows = entries.map((e) =>
    EXPORT_FIELDS.map((f) => csvCell(e[f.key])).join(",")
  );
  return [header, ...rows].join("\n");
}

function toTSV(entries) {
  const header = EXPORT_FIELDS.map((f) => f.label).join("\t");
  const rows = entries.map((e) =>
    EXPORT_FIELDS.map((f) => String(e[f.key] || "").replace(/\t/g, " ").replace(/\n/g, " ")).join("\t")
  );
  return [header, ...rows].join("\n");
}

/* ------------------------------------------------------------------ */
/*  AI parsing                                                         */
/* ------------------------------------------------------------------ */

function buildPrompt(notes) {
  return `You are parsing messy product/UX session notes into structured decision-log entries.

Each separate note, post-it, or distinct decision in the input becomes ONE entry.

Return ONLY a JSON array of objects. No prose, no markdown, no code fences.

Each object has these string fields. Use "" (empty string) when the information is not present in the notes:
- date: a date in YYYY-MM-DD format if one is clearly mentioned, otherwise ""
- status: exactly one of [${STATUSES.join(", ")}]. Infer the most likely status from the language ("we will", "shipped", "live" -> Active; "let's not", "killed" -> Rejected; "cut", "out of scope" -> Descoped; "maybe later", "someday" -> Future state; "needs sign-off", "TBD" -> Under review; "decided to do next" -> Prioritized). If genuinely unclear, use "Proposed".
- subject: a short topic tag, 1-3 words, inferred from the note
- decision: the decision itself, stated concisely
- context: the situation or problem that prompted it
- rationale: why the decision was made
- optionsConsidered: alternatives that were weighed
- decisionOwner: the person responsible, only if a name is given
- workflowStep: the screen, step, or flow it relates to, if mentioned
- otherLink: a URL, only if one appears in the notes

Infer status and subject where you reasonably can. Do NOT invent owners, links, dates, or rationale that are not supported by the notes — leave those "".

Notes to parse:
<<<
${notes}
>>>`;
}

async function callClaude(notes) {
  const prompt = buildPrompt(notes);

  // Prefer window.claude.complete if present, else hit the messages endpoint.
  let raw = "";
  if (typeof window !== "undefined" && window.claude && typeof window.claude.complete === "function") {
    raw = await window.claude.complete(prompt);
  } else {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error("API request failed (" + res.status + ")");
    const data = await res.json();
    raw = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");
  }

  return parseDrafts(raw);
}

function parseDrafts(raw) {
  let text = String(raw || "").trim();
  // strip code fences
  text = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  // isolate the array
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) {
    text = text.slice(start, end + 1);
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error("Could not read the model's response as JSON. Try simplifying the notes and running it again.");
  }
  if (!Array.isArray(parsed)) {
    if (parsed && typeof parsed === "object") parsed = [parsed];
    else throw new Error("The model did not return a list of entries.");
  }
  return parsed.map((o) => normalizeDraft(o)).filter((d) => d.decision || d.subject || d.context || d.rationale);
}

function normalizeDraft(o) {
  const base = emptyEntry();
  const get = (k) => (o && typeof o[k] === "string" ? o[k].trim() : (o && o[k] != null ? String(o[k]) : ""));
  const draft = {
    ...base,
    date: get("date") || "",
    status: STATUSES.includes(get("status")) ? get("status") : "Proposed",
    subject: get("subject"),
    decision: get("decision"),
    context: get("context"),
    rationale: get("rationale"),
    optionsConsidered: get("optionsConsidered") || get("options") || get("optionsconsidered"),
    decisionOwner: get("decisionOwner") || get("owner"),
    workflowStep: get("workflowStep") || get("workflowstep") || get("step"),
    otherLink: get("otherLink") || get("link") || get("url"),
  };
  draft.id = "";
  return draft;
}

/* ------------------------------------------------------------------ */
/*  Small UI pieces                                                    */
/* ------------------------------------------------------------------ */

function StatusPill({ value }) {
  const s = STATUS_STYLE[value] || STATUS_STYLE["Proposed"];
  return (
    <span className="pill" style={{ background: s.bg, color: s.fg }}>
      <span className="pill-dot" style={{ background: s.dot }} />
      {value || "—"}
    </span>
  );
}

function FieldLabel({ label, desc }) {
  return (
    <span className="field-label">
      {label}
      {desc && (
        <span className="info" tabIndex={0} aria-label={desc}>
          <Info size={12.5} />
          <span className="tip" role="tooltip">{desc}</span>
        </span>
      )}
    </span>
  );
}

function Field({ field, value, onChange, subjects }) {
  const id = "f-" + field.key;
  if (field.type === "textarea") {
    return (
      <label className="field">
        <FieldLabel label={field.label} desc={field.desc} />
        <textarea
          id={id} className="input textarea" rows={field.key === "decision" ? 3 : 2}
          value={value || ""} onChange={(e) => onChange(field.key, e.target.value)}
        />
      </label>
    );
  }
  if (field.type === "status") {
    return (
      <label className="field">
        <FieldLabel label={field.label} desc={field.desc} />
        <select id={id} className="input" value={value || "Proposed"} onChange={(e) => onChange(field.key, e.target.value)}>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>
    );
  }
  if (field.type === "subject") {
    return (
      <label className="field">
        <FieldLabel label={field.label} desc={field.desc} />
        <input
          id={id} className="input" list="subject-list" value={value || ""}
          placeholder="e.g. Onboarding"
          onChange={(e) => onChange(field.key, e.target.value)}
        />
      </label>
    );
  }
  return (
    <label className="field">
      <FieldLabel label={field.label} desc={field.desc} />
      <input
        id={id} className="input" type={field.type === "date" ? "date" : "text"}
        value={value || ""} onChange={(e) => onChange(field.key, e.target.value)}
      />
    </label>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function DecisionLog() {
  const [entries, setEntries] = useState(() => SEED.map((e, i) => ({ ...e, decisionOwner: SEED_OWNERS[i] || e.decisionOwner, subject: SEED_SUBJECTS[i] || e.subject })));
  const [settings, setSettings] = useState({ prefix: "DOG", workflow: "GEN" });

  const [statusFilter, setStatusFilter] = useState("All");
  const [subjectFilter, setSubjectFilter] = useState("All");
  const [sort, setSort] = useState({ key: "id", dir: "desc" });

  const [drawer, setDrawer] = useState(null); // entry being added/edited (form state)
  const [drawerMode, setDrawerMode] = useState("add");

  const [aiOpen, setAiOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [drafts, setDrafts] = useState(null); // array | null
  const [expandedDraft, setExpandedDraft] = useState(null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const fileInput = useRef(null);

  const subjects = useMemo(() => {
    const set = new Set();
    entries.forEach((e) => { if (e.subject) set.add(e.subject); });
    return Array.from(set).sort();
  }, [entries]);

  function flash(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }

  /* ---- derived table ---- */
  const view = useMemo(() => {
    let rows = entries.filter((e) =>
      (statusFilter === "All" || e.status === statusFilter) &&
      (subjectFilter === "All" || e.subject === subjectFilter)
    );
    const { key, dir } = sort;
    rows = [...rows].sort((a, b) => {
      let av = a[key] || "", bv = b[key] || "";
      if (key === "id") {
        const na = parseInt((/(\d+)\s*$/.exec(av) || [])[1] || "0", 10);
        const nb = parseInt((/(\d+)\s*$/.exec(bv) || [])[1] || "0", 10);
        return dir === "asc" ? na - nb : nb - na;
      }
      if (key === "date") {
        return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      if (key === "status") {
        const ia = STATUSES.indexOf(av), ib = STATUSES.indexOf(bv);
        return dir === "asc" ? ia - ib : ib - ia;
      }
      return dir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return rows;
  }, [entries, statusFilter, subjectFilter, sort]);

  function toggleSort(key) {
    setSort((s) => s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" });
  }

  /* ---- CRUD ---- */
  function openAdd() {
    const e = emptyEntry();
    e.id = makeId(settings.prefix, settings.workflow, nextNumber(entries));
    setDrawer(e);
    setDrawerMode("add");
  }
  function openEdit(entry) {
    setDrawer({ ...entry });
    setDrawerMode("edit");
  }
  function saveDrawer() {
    if (!drawer) return;
    if (drawerMode === "add") {
      setEntries((prev) => [...prev, drawer]);
      flash("Decision added");
    } else {
      setEntries((prev) => prev.map((e) => (e.id === drawer.id ? drawer : e)));
      flash("Decision updated");
    }
    setDrawer(null);
  }
  function deleteEntry(id) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    if (drawer && drawer.id === id) setDrawer(null);
    flash("Decision deleted");
  }
  function setDrawerField(k, v) {
    setDrawer((d) => ({ ...d, [k]: v }));
  }

  /* ---- AI ---- */
  async function runParse() {
    if (!notes.trim()) return;
    setAiLoading(true); setAiError(""); setDrafts(null);
    try {
      const result = await callClaude(notes);
      if (!result.length) {
        setAiError("No decisions were found in those notes. Try adding a bit more detail.");
      } else {
        setDrafts(result);
        setExpandedDraft(0);
      }
    } catch (err) {
      setAiError(err.message || "Something went wrong while parsing.");
    } finally {
      setAiLoading(false);
    }
  }
  function setDraftField(i, k, v) {
    setDrafts((ds) => ds.map((d, idx) => idx === i ? { ...d, [k]: v } : d));
  }
  function acceptDraft(i) {
    setEntries((prev) => {
      const id = makeId(settings.prefix, settings.workflow, nextNumber(prev));
      return [...prev, { ...drafts[i], id }];
    });
    setDrafts((ds) => ds.filter((_, idx) => idx !== i));
    setExpandedDraft(null);
    flash("Draft accepted");
  }
  function discardDraft(i) {
    setDrafts((ds) => ds.filter((_, idx) => idx !== i));
    setExpandedDraft(null);
  }
  function acceptAll() {
    setEntries((prev) => {
      let n = nextNumber(prev);
      const added = drafts.map((d) => ({ ...d, id: makeId(settings.prefix, settings.workflow, n++) }));
      return [...prev, ...added];
    });
    flash(`${drafts.length} decision${drafts.length === 1 ? "" : "s"} added`);
    setDrafts(null); setNotes(""); setAiOpen(false);
  }
  function closeAi() {
    setAiOpen(false); setDrafts(null); setNotes(""); setAiError(""); setExpandedDraft(null);
  }

  /* ---- export / import ---- */
  function exportJSON() {
    download("decision-log.json", JSON.stringify({ settings, entries }, null, 2), "application/json");
    setExportOpen(false); flash("JSON downloaded");
  }
  function exportCSV() {
    download("decision-log.csv", toCSV(entries), "text/csv");
    setExportOpen(false); flash("CSV downloaded");
  }
  async function copyTable() {
    try {
      await navigator.clipboard.writeText(toTSV(entries));
      flash("Table copied to clipboard");
    } catch {
      flash("Copy failed — clipboard unavailable");
    }
    setExportOpen(false);
  }
  function importJSON(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        let imported = Array.isArray(data) ? data : (data.entries || []);
        if (!Array.isArray(imported)) throw new Error("bad shape");
        imported = imported.map((o) => ({ ...emptyEntry(), ...o }));
        setEntries(imported);
        if (data && data.settings && data.settings.prefix) setSettings(data.settings);
        flash(`Imported ${imported.length} decision${imported.length === 1 ? "" : "s"}`);
      } catch {
        flash("Import failed — not a valid log file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  /* ---------------------------------------------------------------- */
  return (
    <div className="dl-root">
      <style>{CSS}</style>
      <datalist id="subject-list">
        {subjects.map((s) => <option key={s} value={s} />)}
      </datalist>

      {/* Header */}
      <header className="topbar">
        <div className="brand">
          <h1>Decision Log</h1>
          <p className="sub">A record of what was decided, and why — so it isn't re-litigated.</p>
        </div>
        <div className="topbar-actions">
          <button className="btn ghost" onClick={() => setSettingsOpen(true)}>
            <Settings size={15} /> <span className="code-chip">{settings.prefix}-{settings.workflow}</span>
          </button>
          <div className="menu-wrap">
            <button className="btn ghost" onClick={() => setExportOpen((o) => !o)}>
              <Download size={15} /> Export <Caret size={13} />
            </button>
            {exportOpen && (
              <>
                <div className="menu-scrim" onClick={() => setExportOpen(false)} />
                <div className="menu">
                  <button onClick={exportJSON}><FileJson size={15} /> Download JSON</button>
                  <button onClick={exportCSV}><FileSpreadsheet size={15} /> Download CSV <span className="hint">FigJam</span></button>
                  <button onClick={copyTable}><ClipboardCopy size={15} /> Copy table (TSV)</button>
                </div>
              </>
            )}
          </div>
          <button className="btn ghost" onClick={() => fileInput.current && fileInput.current.click()}>
            <Upload size={15} /> Import
          </button>
          <input ref={fileInput} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={importJSON} />
        </div>
      </header>

      {/* Action row */}
      <div className="actionbar">
        <button className="btn accent ai-btn" onClick={() => setAiOpen(true)}>
          <Sparkles size={16} /> Populate from notes
        </button>
        <button className="btn solid" onClick={openAdd}>
          <Plus size={15} /> Add decision
        </button>

        <div className="filters">
          <label className="filter">
            <span>Status</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option>All</option>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label className="filter">
            <span>Subject</span>
            <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
              <option>All</option>
              {subjects.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <span className="count">{view.length} of {entries.length}</span>
        </div>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr>
              {COLUMNS.map((c, ci) => (
                <th key={c.key} style={{ width: c.w }} onClick={() => toggleSort(c.key)} className="sortable">
                  <span className="th-inner">
                    <span className="th-label">{c.label}</span>
                    <span className="info" tabIndex={0} aria-label={c.desc} onClick={(e) => e.stopPropagation()}>
                      <Info size={12} />
                      <span className={"tip" + (ci >= COLUMNS.length - 2 ? " tip-right" : "")} role="tooltip">{c.desc}</span>
                    </span>
                    {sort.key === c.key
                      ? (sort.dir === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />)
                      : <ChevronsUpDown size={13} className="faint-ic" />}
                  </span>
                </th>
              ))}
              <th style={{ width: 78 }} className="th-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {view.length === 0 && (
              <tr><td colSpan={COLUMNS.length + 1} className="empty">
                No decisions match these filters.
              </td></tr>
            )}
            {view.map((e) => (
              <tr key={e.id} onClick={() => openEdit(e)}>
                <td className="mono">{e.id}</td>
                <td className="nowrap dim">{e.date || "—"}</td>
                <td><StatusPill value={e.status} /></td>
                <td>{e.subject ? <span className="subj">{e.subject}</span> : <span className="dim">—</span>}</td>
                <td><div className="clamp" title={e.decision}>{e.decision || <span className="dim">—</span>}</div></td>
                <td><div className="clamp" title={e.context}>{e.context || <span className="dim">—</span>}</div></td>
                <td><div className="clamp" title={e.rationale}>{e.rationale || <span className="dim">—</span>}</div></td>
                <td className="dim">
                  {e.workflowStep
                    ? (e.otherLink
                        ? <a className="wf-link" href={e.otherLink} target="_blank" rel="noopener noreferrer"
                            title={`${e.workflowStep} → ${e.otherLink}`} onClick={(ev) => ev.stopPropagation()}>{e.workflowStep}</a>
                        : <div className="ellipsis" title={e.workflowStep}>{e.workflowStep}</div>)
                    : <span className="dim">—</span>}
                </td>
                <td className="dim"><div className="ellipsis" title={e.decisionOwner}>{e.decisionOwner || "—"}</div></td>
                <td className="row-actions" onClick={(ev) => ev.stopPropagation()}>
                  <button className="icon-btn" title="Edit" onClick={() => openEdit(e)}><Pencil size={14} /></button>
                  <button className="icon-btn danger" title="Delete" onClick={() => deleteEntry(e.id)}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---------------- Add / Edit drawer ---------------- */}
      {drawer && (
        <>
          <div className="scrim" onClick={() => setDrawer(null)} />
          <aside className="drawer">
            <div className="drawer-head">
              <div>
                <span className="kicker">{drawerMode === "add" ? "New decision" : "Edit decision"}</span>
                <span className="drawer-id-row">
                  <span className="mono drawer-id">{drawer.id}</span>
                  <span className="info" tabIndex={0} aria-label={ID_DESC}>
                    <Info size={13} />
                    <span className="tip" role="tooltip">{ID_DESC}</span>
                  </span>
                </span>
              </div>
              <button className="icon-btn" onClick={() => setDrawer(null)}><X size={18} /></button>
            </div>
            <div className="drawer-body">
              {FIELDS.map((f) => (
                <Field key={f.key} field={f} value={drawer[f.key]} onChange={setDrawerField} subjects={subjects} />
              ))}
            </div>
            <div className="drawer-foot">
              {drawerMode === "edit" && (
                <button className="btn ghost danger" onClick={() => deleteEntry(drawer.id)}>
                  <Trash2 size={15} /> Delete
                </button>
              )}
              <div className="spacer" />
              <button className="btn ghost" onClick={() => setDrawer(null)}>Cancel</button>
              <button className="btn solid" onClick={saveDrawer}>
                <Check size={15} /> {drawerMode === "add" ? "Add to log" : "Save changes"}
              </button>
            </div>
          </aside>
        </>
      )}

      {/* ---------------- AI modal ---------------- */}
      {aiOpen && (
        <>
          <div className="scrim" onClick={closeAi} />
          <div className="modal ai-modal">
            <div className="modal-head">
              <div className="modal-title">
                <span className="ai-badge"><Sparkles size={15} /></span>
                <div>
                  <h2>Populate from notes</h2>
                  <p>Paste raw session notes or post-its. Each note becomes a draft you can review before it's logged.</p>
                </div>
              </div>
              <button className="icon-btn" onClick={closeAi}><X size={18} /></button>
            </div>

            <div className="modal-body">
              {!drafts && (
                <>
                  <textarea
                    className="input notes-box"
                    placeholder={"Paste messy notes here, e.g.\n\n— Decided to batch low-priority alerts into a daily digest. Too many pings. Priya owns.\n— Killed the in-house search index idea, too much upkeep for v1.\n— Maybe explore offline mode later?"}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={aiLoading}
                  />
                  {aiError && <div className="error"><AlertCircle size={15} /> {aiError}</div>}
                  <div className="modal-foot">
                    <span className="hint-muted">Drafts are never added automatically — you accept each one.</span>
                    <button className="btn accent" onClick={runParse} disabled={aiLoading || !notes.trim()}>
                      {aiLoading ? <><Loader2 size={15} className="spin" /> Parsing…</> : <><Sparkles size={15} /> Parse into drafts</>}
                    </button>
                  </div>
                </>
              )}

              {drafts && (
                <div className="drafts">
                  <div className="drafts-head">
                    <span>{drafts.length} draft{drafts.length === 1 ? "" : "s"} ready for review</span>
                    <div className="drafts-head-actions">
                      <button className="btn ghost small" onClick={() => { setDrafts(null); }}>Back to notes</button>
                      <button className="btn ghost small danger" onClick={() => { setDrafts(null); }} style={{ display: "none" }} />
                      <button className="btn solid small" onClick={acceptAll} disabled={!drafts.length}>
                        <Check size={14} /> Accept all
                      </button>
                    </div>
                  </div>

                  {drafts.length === 0 && <div className="all-clear"><Check size={16} /> All drafts handled.</div>}

                  {drafts.map((d, i) => {
                    const open = expandedDraft === i;
                    return (
                      <div className={"draft-card" + (open ? " open" : "")} key={i}>
                        <div className="draft-top">
                          <select className="input mini" value={d.status} onChange={(e) => setDraftField(i, "status", e.target.value)}>
                            {STATUSES.map((s) => <option key={s}>{s}</option>)}
                          </select>
                          <input className="input mini subj-in" list="subject-list" placeholder="Subject"
                            value={d.subject} onChange={(e) => setDraftField(i, "subject", e.target.value)} />
                          <div className="draft-card-actions">
                            <button className="icon-btn" onClick={() => setExpandedDraft(open ? null : i)} title={open ? "Collapse" : "Edit details"}>
                              <Caret size={15} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
                            </button>
                          </div>
                        </div>
                        <textarea className="input draft-decision" rows={2} placeholder="Decision"
                          value={d.decision} onChange={(e) => setDraftField(i, "decision", e.target.value)} />

                        {open && (
                          <div className="draft-details">
                            {[
                              ["date", "Date", "date"], ["context", "Context", "ta"],
                              ["rationale", "Rationale", "ta"], ["optionsConsidered", "Options considered", "ta"],
                              ["decisionOwner", "Owner", "text"], ["workflowStep", "Workflow step", "text"],
                              ["otherLink", "Other link", "text"],
                            ].map(([k, label, t]) => (
                              <label className="field" key={k}>
                                <span className="field-label">{label}</span>
                                {t === "ta"
                                  ? <textarea className="input" rows={2} value={d[k]} onChange={(e) => setDraftField(i, k, e.target.value)} />
                                  : <input className="input" type={t === "date" ? "date" : "text"} value={d[k]} onChange={(e) => setDraftField(i, k, e.target.value)} />}
                              </label>
                            ))}
                          </div>
                        )}

                        <div className="draft-foot">
                          <button className="btn ghost small danger" onClick={() => discardDraft(i)}><X size={14} /> Discard</button>
                          <button className="btn solid small" onClick={() => acceptDraft(i)}><Check size={14} /> Accept</button>
                        </div>
                      </div>
                    );
                  })}

                  {drafts.length === 0 && (
                    <div className="modal-foot">
                      <span className="spacer" />
                      <button className="btn solid" onClick={closeAi}>Done</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ---------------- Settings modal ---------------- */}
      {settingsOpen && (
        <>
          <div className="scrim" onClick={() => setSettingsOpen(false)} />
          <div className="modal settings-modal">
            <div className="modal-head">
              <div className="modal-title"><div><h2>Settings</h2><p>These drive how new IDs are generated.</p></div></div>
              <button className="icon-btn" onClick={() => setSettingsOpen(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="settings-grid">
                <label className="field">
                  <span className="field-label">Project prefix</span>
                  <input className="input mono-in" value={settings.prefix}
                    onChange={(e) => setSettings((s) => ({ ...s, prefix: e.target.value.replace(/\s/g, "") }))} />
                </label>
                <label className="field">
                  <span className="field-label">Workflow code</span>
                  <input className="input mono-in" value={settings.workflow}
                    onChange={(e) => setSettings((s) => ({ ...s, workflow: e.target.value.replace(/\s/g, "") }))} />
                </label>
              </div>
              <div className="id-preview">
                Next ID:&nbsp;<span className="mono">{makeId(settings.prefix, settings.workflow, nextNumber(entries))}</span>
              </div>
              <p className="settings-note">Existing IDs are not renumbered. New decisions and accepted drafts continue from the highest current number.</p>
            </div>
            <div className="modal-foot">
              <span className="spacer" />
              <button className="btn solid" onClick={() => setSettingsOpen(false)}>Done</button>
            </div>
          </div>
        </>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const CSS = `
.dl-root{
  --paper:#FAF9F6; --surface:#FFFFFF; --ink:#1C1B19; --ink-soft:#57534E;
  --ink-faint:#94908A; --line:#E7E4DD; --line-soft:#F1EEE8;
  --accent:#1F3A34; --accent-ink:#16302A; --accent-soft:#E9EFEC; --accent-tint:#F3F6F4;
  --danger:#A8453B;
  font-family: system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  color:var(--ink); background:var(--paper); min-height:100vh;
  padding:28px clamp(16px,4vw,44px) 80px; box-sizing:border-box;
  -webkit-font-smoothing:antialiased;
}
.dl-root *{box-sizing:border-box}
.dl-root h1,.dl-root h2{font-family:Georgia,"Iowan Old Style","Palatino Linotype",serif;font-weight:600;letter-spacing:-.01em;margin:0}

.topbar{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:22px}
.brand h1{font-size:30px;line-height:1.1}
.brand .sub{margin:6px 0 0;color:var(--ink-soft);font-size:13.5px;max-width:46ch}
.topbar-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.code-chip{font-family:"SF Mono",ui-monospace,"JetBrains Mono",monospace;font-size:11.5px;letter-spacing:.02em}

.actionbar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:16px;
  padding-bottom:16px;border-bottom:1px solid var(--line)}
.filters{display:flex;gap:14px;align-items:center;margin-left:auto;flex-wrap:wrap}
.filter{display:flex;align-items:center;gap:7px;font-size:12px;color:var(--ink-soft)}
.filter span{font-weight:600;text-transform:uppercase;letter-spacing:.05em;font-size:10.5px;color:var(--ink-faint)}
.filter select{font-size:13px;padding:6px 26px 6px 9px;border:1px solid var(--line);border-radius:7px;background:var(--surface);color:var(--ink);cursor:pointer;
  appearance:none;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394908A' stroke-width='2.5'><path d='M6 9l6 6 6-6'/></svg>");
  background-repeat:no-repeat;background-position:right 8px center}
.count{font-size:12px;color:var(--ink-faint);font-variant-numeric:tabular-nums}

/* buttons */
.btn{display:inline-flex;align-items:center;gap:7px;font-size:13px;font-weight:550;
  border-radius:8px;padding:8px 13px;cursor:pointer;border:1px solid transparent;
  transition:background .13s,border-color .13s,box-shadow .13s;line-height:1;font-family:inherit}
.btn.solid{background:var(--accent);color:#fff}
.btn.solid:hover{background:var(--accent-ink)}
.btn.accent{background:var(--accent);color:#fff;box-shadow:0 1px 0 rgba(0,0,0,.04),0 6px 18px -8px rgba(31,58,52,.5)}
.btn.accent:hover{background:var(--accent-ink)}
.btn.accent:disabled{opacity:.55;cursor:not-allowed;box-shadow:none}
.btn.ghost{background:var(--surface);border-color:var(--line);color:var(--ink-soft)}
.btn.ghost:hover{border-color:#d8d4cc;background:#fff}
.btn.ghost.danger{color:var(--danger)}
.btn.ghost.danger:hover{background:#FBEBEA;border-color:#f0d4d0}
.btn.small{padding:6px 10px;font-size:12px;border-radius:7px}
.ai-btn{font-weight:600;padding:9px 15px}
.btn:disabled{opacity:.5;cursor:not-allowed}

.icon-btn{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;
  border-radius:7px;border:1px solid transparent;background:transparent;color:var(--ink-faint);cursor:pointer;transition:.12s}
.icon-btn:hover{background:var(--line-soft);color:var(--ink)}
.icon-btn.danger:hover{background:#FBEBEA;color:var(--danger)}

/* export menu */
.menu-wrap{position:relative}
.menu-scrim{position:fixed;inset:0;z-index:30}
.menu{position:absolute;right:0;top:calc(100% + 6px);z-index:31;background:var(--surface);
  border:1px solid var(--line);border-radius:10px;box-shadow:0 12px 30px -12px rgba(0,0,0,.22);
  padding:5px;min-width:210px;display:flex;flex-direction:column}
.menu button{display:flex;align-items:center;gap:9px;padding:9px 10px;border:none;background:transparent;
  border-radius:7px;font-size:13px;color:var(--ink);cursor:pointer;text-align:left;font-family:inherit}
.menu button:hover{background:var(--accent-tint)}
.menu .hint{margin-left:auto;font-size:10px;color:var(--ink-faint);text-transform:uppercase;letter-spacing:.05em;
  background:var(--line-soft);padding:2px 6px;border-radius:5px}

/* table */
.table-wrap{border:1px solid var(--line);border-radius:12px;overflow:auto;background:var(--surface);
  box-shadow:0 1px 2px rgba(0,0,0,.02);width:fit-content;max-width:100%}
.tbl{border-collapse:collapse;font-size:13px;min-width:920px;table-layout:fixed}
.tbl thead th{position:sticky;top:0;background:#FCFBF8;text-align:left;font-weight:600;
  font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-faint);
  padding:11px 14px;border-bottom:1px solid var(--line);white-space:nowrap;z-index:1}
.tbl th.sortable{cursor:pointer;user-select:none}
.tbl th.sortable span{margin-right:5px;vertical-align:middle}
.th-inner{display:inline-flex;align-items:center;gap:5px}
.tbl th.sortable .th-inner span{margin-right:0}
.th-inner .info{width:15px;height:15px}
.tip-right{left:auto;right:-7px}
.tip-right::after{left:auto;right:12px}
.tbl th.sortable:hover{color:var(--ink-soft)}
.tbl th .faint-ic{opacity:.4}
.tbl th svg{vertical-align:middle}
.th-actions{text-align:right}
.tbl tbody td{padding:11px 14px;border-bottom:1px solid var(--line-soft);vertical-align:middle;color:var(--ink)}
.tbl tbody tr{cursor:pointer;transition:background .1s}
.tbl tbody tr:hover{background:var(--accent-tint)}
.tbl tbody tr:last-child td{border-bottom:none}
.mono{font-family:"SF Mono",ui-monospace,"JetBrains Mono",monospace;font-size:12px;letter-spacing:.01em;color:var(--ink-soft);white-space:nowrap}
.dim{color:var(--ink-faint)}
.nowrap{white-space:nowrap}
.clamp{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.4;overflow-wrap:anywhere}
.ellipsis{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wf-link{display:inline-block;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  vertical-align:bottom;color:var(--accent);text-decoration:none;border-bottom:1px solid var(--accent-soft);transition:border-color .12s}
.wf-link:hover{border-bottom-color:var(--accent)}
.subj{display:inline-block;box-sizing:content-box;width:fit-content;max-width:100%;
  font-size:12px;background:var(--line-soft);color:var(--ink-soft);padding:3px 9px;border-radius:11px;
  line-height:1.4;white-space:normal;overflow-wrap:break-word}
.row-actions{text-align:right;white-space:nowrap}
.tbl tbody tr:hover .row-actions .icon-btn{opacity:1}
.row-actions .icon-btn{opacity:.35}
.empty{text-align:center;color:var(--ink-faint);padding:40px 0;font-style:italic}

.pill{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:600;
  padding:3px 9px 3px 8px;border-radius:20px;white-space:nowrap}
.pill-dot{width:6px;height:6px;border-radius:50%}

/* scrim + overlays */
.scrim{position:fixed;inset:0;background:rgba(28,27,25,.34);z-index:40;backdrop-filter:blur(1.5px);animation:fade .15s ease}
@keyframes fade{from{opacity:0}to{opacity:1}}

/* drawer */
.drawer{position:fixed;top:0;right:0;height:100vh;width:min(480px,100vw);z-index:50;
  background:var(--surface);box-shadow:-12px 0 40px -16px rgba(0,0,0,.3);
  display:flex;flex-direction:column;animation:slide .2s cubic-bezier(.2,.7,.3,1)}
@keyframes slide{from{transform:translateX(30px);opacity:.6}to{transform:translateX(0);opacity:1}}
.drawer-head{display:flex;justify-content:space-between;align-items:center;padding:18px 22px;border-bottom:1px solid var(--line)}
.kicker{display:block;font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--ink-faint);font-weight:600}
.drawer-id{font-size:16px;color:var(--ink);margin-top:3px;display:inline-block}
.drawer-body{padding:18px 22px;overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:14px}
.drawer-foot{display:flex;align-items:center;gap:8px;padding:14px 22px;border-top:1px solid var(--line);background:#FCFBF8}
.spacer{flex:1}

/* fields */
.field{display:flex;flex-direction:column;gap:5px}
.field-label{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-faint)}

/* info tooltip */
.info{position:relative;display:inline-flex;align-items:center;justify-content:center;
  width:16px;height:16px;border-radius:50%;color:#B6B1A8;cursor:help;outline:none;transition:color .12s;flex-shrink:0}
.info:hover,.info:focus{color:var(--accent)}
.tip{position:absolute;top:calc(100% + 8px);left:-7px;z-index:80;
  background:var(--ink);color:#fff;font-size:11.5px;font-weight:400;line-height:1.5;letter-spacing:0;
  text-transform:none;padding:9px 12px;border-radius:9px;width:max-content;max-width:248px;
  white-space:pre-line;box-shadow:0 12px 28px -10px rgba(0,0,0,.45);
  opacity:0;visibility:hidden;transform:translateY(4px);transition:opacity .14s,transform .14s;pointer-events:none}
.info:hover .tip,.info:focus .tip{opacity:1;visibility:visible;transform:translateY(0)}
.tip::after{content:"";position:absolute;bottom:100%;left:12px;border:5px solid transparent;border-bottom-color:var(--ink)}
.drawer-id-row{display:flex;align-items:center;gap:7px;margin-top:3px}
.input{font-family:inherit;font-size:13.5px;color:var(--ink);background:var(--surface);
  border:1px solid var(--line);border-radius:8px;padding:8px 10px;width:100%;transition:border-color .12s,box-shadow .12s}
.input:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}
.textarea{resize:vertical;line-height:1.45;min-height:38px}
select.input{appearance:none;cursor:pointer;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394908A' stroke-width='2.5'><path d='M6 9l6 6 6-6'/></svg>");
  background-repeat:no-repeat;background-position:right 10px center;padding-right:30px}
.mono-in{font-family:"SF Mono",ui-monospace,monospace;text-transform:uppercase;letter-spacing:.03em}

/* modal */
.modal{position:fixed;z-index:50;left:50%;top:50%;transform:translate(-50%,-50%);
  background:var(--surface);border-radius:16px;box-shadow:0 30px 70px -20px rgba(0,0,0,.4);
  width:min(720px,94vw);max-height:88vh;display:flex;flex-direction:column;overflow:hidden;animation:pop .18s cubic-bezier(.2,.7,.3,1)}
@keyframes pop{from{transform:translate(-50%,-46%);opacity:.5}to{transform:translate(-50%,-50%);opacity:1}}
.settings-modal{width:min(460px,94vw)}
.modal-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:20px 22px 16px;border-bottom:1px solid var(--line)}
.modal-title{display:flex;gap:13px;align-items:flex-start}
.modal-title h2{font-size:20px}
.modal-title p{margin:5px 0 0;font-size:13px;color:var(--ink-soft);max-width:52ch;line-height:1.45}
.ai-badge{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:10px;
  background:var(--accent);color:#fff;flex-shrink:0;box-shadow:0 6px 16px -8px rgba(31,58,52,.6)}
.modal-body{padding:20px 22px;overflow-y:auto}
.modal-foot{display:flex;align-items:center;gap:10px;margin-top:16px}
.hint-muted{font-size:12px;color:var(--ink-faint);margin-right:auto}

.notes-box{min-height:200px;resize:vertical;line-height:1.5;font-size:13.5px}
.error{display:flex;align-items:center;gap:8px;margin-top:12px;color:var(--danger);font-size:13px;
  background:#FBEBEA;border:1px solid #f0d4d0;padding:9px 12px;border-radius:9px}

/* drafts */
.drafts-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;
  font-size:13px;font-weight:600;color:var(--ink-soft)}
.drafts-head-actions{display:flex;gap:8px}
.draft-card{border:1px solid var(--line);border-radius:12px;padding:13px;margin-bottom:12px;background:#FCFBF9;transition:border-color .12s}
.draft-card.open{border-color:#d8d4cc;background:#fff}
.draft-top{display:flex;gap:8px;align-items:center;margin-bottom:9px}
.input.mini{padding:6px 9px;font-size:12.5px;width:auto}
select.input.mini{padding-right:26px}
.subj-in{flex:1}
.draft-card-actions{margin-left:auto}
.draft-decision{font-size:13.5px;line-height:1.45}
.draft-details{display:flex;flex-direction:column;gap:11px;margin-top:11px;padding-top:12px;border-top:1px dashed var(--line)}
.draft-foot{display:flex;justify-content:flex-end;gap:8px;margin-top:11px}
.all-clear{display:flex;align-items:center;gap:8px;color:var(--accent);font-size:13.5px;padding:24px;justify-content:center}

/* settings */
.settings-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.id-preview{margin-top:16px;font-size:13px;color:var(--ink-soft);background:var(--accent-tint);
  border:1px solid var(--accent-soft);border-radius:9px;padding:11px 13px;display:flex;align-items:center}
.id-preview .mono{color:var(--accent-ink);font-size:13px}
.settings-note{font-size:12px;color:var(--ink-faint);line-height:1.5;margin:12px 0 0}

/* toast */
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:60;
  background:var(--ink);color:#fff;font-size:13px;font-weight:500;padding:10px 18px;border-radius:30px;
  box-shadow:0 12px 30px -10px rgba(0,0,0,.4);animation:rise .2s ease}
@keyframes rise{from{transform:translate(-50%,8px);opacity:0}to{transform:translate(-50%,0);opacity:1}}

.spin{animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

@media (max-width:640px){
  .brand h1{font-size:24px}
  .filters{margin-left:0;width:100%}
  .actionbar .btn.accent,.actionbar .btn.solid{flex:1}
}
`;
