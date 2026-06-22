import { useState, useRef, useEffect, useCallback } from "react";
import CreateLogModal from "./CreateLogModal";
import { FILLABLE_LOG, suggestLogField } from "./DecisionLogApp";

// ---------- Theme ----------
const ACCENT = "#1F3A34";
const ACCENT_SOFT = "#E8EEEC";
const BASE_BG = "#FAF9F7";
const CARD_BG = "#FFFFFF";
const BORDER = "#E5E1DA";
const INK = "#2B2A27";
const MUTED = "#8A857C";
const SERIF = "'Newsreader', Georgia, 'Times New Roman', serif";
const SANS = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif";

// ---------- Decision log statuses ----------
const STATUSES = ["Proposed", "Under review", "Prioritized", "Active", "Future state", "Rejected", "Descoped", "Deprecated"];
const STATUS_STYLE = {
  "Proposed":     { bg: "#F1EFEA", fg: "#6B665D" },
  "Under review": { bg: "#F6EFDC", fg: "#8A6A1F" },
  "Prioritized":  { bg: "#E4ECF2", fg: "#33586E" },
  "Active":       { bg: ACCENT_SOFT, fg: ACCENT },
  "Future state": { bg: "#EAF2E6", fg: "#4A6B3A" },
  "Rejected":     { bg: "#F4E5E1", fg: "#9C3D2E" },
  "Descoped":     { bg: "#EFE9F0", fg: "#6A5378" },
  "Deprecated":   { bg: "#ECEAE6", fg: "#85807A" },
};

// ---------- Row definitions ----------
const ROWS = [
  { key: "step", label: "Step / action", tip: "What happens here?" },
  { key: "actor", label: "Actor", tip: "Who is doing this step/action (role / name)" },
  { key: "costars", label: "Co-stars (other humans)", tip: "Who else is involved at this point i.e. vendor, client, TM etc" },
  { key: "system", label: "System / platform", tip: "Which tool or system — or '—' if it's manual" },
  { key: "context", label: "Context / input", tip: "What data is needed to complete the step" },
  { key: "branches", label: "Branches / sub-flows", tip: "Operational decision the actor makes here → name it and link to its own table. This is workflow, not a log entry. These are required workflows to the product." },
  { key: "impact", label: "Impact (effect of this step)", tip: "Impact of decision" },
  { key: "exceptions", label: "Exceptions", tip: "The path of the workflow broke. Worst case outcomes." },
  { key: "pain", label: "Pain points", tip: "The path didn't break, but it's causing friction (delay, annoyance, lengthy process, etc.)" },
  { key: "notes", label: "Opportunities / notes", tip: "Ideas for mitigating or solving for exceptions/pain points or future state ideas." },
  { key: "aiPass1", label: "AI — pass 1 (possibilities)", tip: "Pie-in-the-sky: every AI idea for this step, unfiltered. Not decisions yet. No idea is a bad idea." },
  { key: "aiPass2", label: "AI — pass 2 (scoped call + log ID)", tip: "The team's decision: in scope now / later / no, the call (automate / augment / assist / leave alone), the human checkpoint, and the log ID." },
];

// ---------- Info fields ----------
const INFO_FIELDS = [
  { key: "date", label: "Date", type: "date" },
  { key: "product", label: "Product / feature" },
  { key: "workflow", label: "Workflow" },
  { key: "deadline", label: "Deadline / timespan" },
  { key: "smes", label: "SME(s)" },
  { key: "anchors", label: "System anchors" },
  { key: "facilitator", label: "Facilitator" },
  { key: "scribe", label: "Scribe / decision-log owner" },
  { key: "logLink", label: "Decision log link" },
];

// ---------- Seed data: Daily outfit generator — live session capture ----------
const seedColumns = [
  { id: "c0", name: "Trigger" },
  { id: "c1", name: "Step 1: Styling brief" },
  { id: "c2", name: "Step 2: Generate the looks" },
  { id: "c3", name: "Step 3: Review" },
  { id: "c4", name: "Step 4: Select outfit" },
  { id: "c5", name: "Step 5: Confirmation" },
];

const seedCells = {
  c0: {
    step: "User opens the app to get an outfit ('what should I wear?')",
    actor: "User",
    costars: "—",
    system: "App & calendar & weather",
    context: "Date, calendar event, weather",
    branches: "—",
    impact: "Enter styling workflow",
    exceptions: "Haven't onboarded",
    pain: "—",
    notes: "If calendar linked and event exists",
    aiPass1: "• Detect today's occasion from the calendar and greet with a ready-made suggestion - or special event like birthday\n• Dynamic morning push about weather change i.e. 73 and raining\n• Learn when user enters app most i.e. 7am for work\n• Contextual awareness for location/travel. I.e. tropical, or Paris, or modest\n• Wearable for detecting body temp or health to adjust clothing",
    aiPass2: "• (Prioritized) Detect today's occasion from the calendar and greet with a ready-made suggestion - or special event like birthday\n• (Prioritized) Dynamic morning push about weather change i.e. 73 and raining\n• (Future state) Contextual awareness for location/travel. I.e. tropical, or Paris, or modest (tracking geolocation)",
  },
  c1: {
    step: "App prompts user for information about occasion/vibe",
    actor: "User",
    costars: "—",
    system: "App",
    context: "Occasion, look/vibe, additional information to set context and what look they are going for",
    branches: "Quick generate",
    impact: "Informs the app with styling brief so it can generate outfit choices",
    exceptions: "• App doesn't recognize free-text input\n• Input too vague/unclear",
    pain: "User doesn't know what they want to wear or what they are going for",
    notes: "Quick generate flow / prompts",
    aiPass1: "• Photo input as a brief\n• Link to Inspo or celebrity look\n• Smart defaults from history\n• Adjusting pills to things you might have filled in the past\n• Learning your style with each brief\n• Voice note brief \"tell me about your day\" or similar\n• Detecting multiple occasions and creating a transitional look or 2 outfits for the day\n• Searches dress code of event/restaurant and if there is something like theme\n• Vibe match to Spotify playlist\n• Conversational follow up question clarification\n• User wants to wear an item of clothing but doesn't know what to match with",
    aiPass2: "• (Prioritized) User wants to wear an item of clothing but doesn't know what to match with — plan an outfit around a specific item\n• (Prioritized) Conversational follow up question clarification\n• (Future state) Voice note brief \"tell me about your day\" or similar",
  },
  c2: {
    step: "App generates the looks (top, bottom, shoes, accessories) from closet",
    actor: "App",
    costars: "—",
    system: "App",
    context: "Weather, closet inventory, user's styling brief",
    branches: "Not enough closet inventory, suggest alternatives",
    impact: "App provides 3 outfit options",
    exceptions: "Not enough closet inventory",
    pain: "Takes too long to generate, errors while generating",
    notes: "Purchase suggestions (branch/subflow)",
    aiPass1: "• Look up smart suggestions for additional pieces to wardrobe\n• Weather-aware generation (layering for cold, low or high chance raining, breathable for heat) accessory: umbrella\n• Amount of walking to and from or at location (shoes)\n• Learning preferences of common \"vibes\" i.e. comfy, fashionable, bold, casual etc. and suggesting one for each category\n• Looking up current or emerging trends. Classic or trendy?\n• Explain the outfit: the blazer keeps it polished, sneaker say you're not trying to hard.\n• Confidence score \"92% match to your style\"\n• User preference for goals: app can suggest under worn pieces. Be more fashionable. Try new things. Create a capsule wardrobe. etc\n• \"Pack friendly\" context aware for work trip: pick less pieces that work together\n• Tips or suggestions for hair, makeup (can be turned off in preferences), accessories",
    aiPass2: "• (Prioritized) Explain the outfit: the blazer keeps it polished, sneaker say you're not trying to hard.\n• (Prioritized) Weather-aware generation (layering for cold, low or high chance raining, breathable for heat) accessory: umbrella\n• (Future state) Looking up current or emerging trends. Classic or trendy?\n• (Future state) Look up smart suggestions for additional pieces to wardrobe",
  },
  c3: {
    step: "User reviews 3 outfit options",
    actor: "User",
    costars: "—",
    system: "App",
    context: "Outfits generated by app, weather, user's styling brief",
    branches: "User doesn't like selection:\n• Swap pieces\n• Regenerate\n• Update styling brief",
    impact: "User makes a judgment call on outfit options",
    exceptions: "• AI hallucination\n• Weather API or other dependencies are unavailable",
    pain: "• User doesn't like options provided\n• Option(s) don't fit the users' style\n• They keep seeing the same options",
    notes: "• Not reusing same outfit in same week or preset time.\n• Favorite/save for later\n• Note a recently used outfit may be in the laundry.\n• Remove from closet\n• Learning from user preferences. rating/comments",
    aiPass1: "• Smart swapping single items. and learns from every swap. or \"more like this\"\n• Smart suggest additional pieces for wardrobe to purchase\n• Learning from user preferences. rating/comments\n• Natural language to fine tune selections (warmer, more casual, more colour)\n• \"Not my vibe\" button with follow up question \"why not\" & \"I love this\" \"favorite\"\n• Share a style look book, maybe a theme for a party, or a group vacation, or a night out.\n• Generate outfit on your body to preview with AI (can share measurements or photo of yourself in preferences or default to a general generation on mannequin/avatar)",
    aiPass2: "• (Prioritized) \"Not my vibe\" button with follow up question \"why not\" & \"I love this\" \"favorite\"\n• (Prioritized) Natural language to fine tune selections (warmer, more casual, more colour)\n• (Prioritized) Smart swapping single items. and learns from every swap. or \"more like this\"\n• (Future state) Generate outfit on your body to preview with AI (mannequin/avatar)",
  },
  c4: {
    step: "User makes a selection from the 3 provided",
    actor: "User",
    costars: "App",
    system: "App",
    context: "User's selection",
    branches: "App logs outfit for calendar date\n\nUser tried to find/tried on outfit:\n• Swap pieces\n• Regenerate\n• Update styling brief",
    impact: "• User has an outfit!\n• App learns from confirmation",
    exceptions: "AI fails to learn from this properly",
    pain: "• User selected it but something didn't work with the outfit\n• User wants to change or edit after selection",
    notes: "• Suggest cleaning out closet for unworn items\n• Planning tomorrows outfits? Or for the week?",
    aiPass1: "• Learning your style with each brief\n• Generate outfit on your body to preview with AI (can share measurements or photo of yourself in preferences or default to a general generation on mannequin/avatar)\n• Share a style look book, maybe a theme for a party, or a group vacation, or a night out.\n• Calendar aware \"you work this week\" or \"you already wore this on 3 vacations\" \"you wore this to 3 client meetings\" try something new! (adjust in preferences?)",
    aiPass2: "• (Prioritized) Calendar aware \"you work this week\" or \"you already wore this on 3 vacations\" \"you wore this to 3 client meetings\" try something new! (adjust in preferences?)\n• (Future state) Share a style look book, maybe a theme for a party, or a group vacation, or a night out.",
  },
  c5: {
    step: "User confirms the outfit worked for them",
    actor: "User",
    costars: "App",
    system: "App",
    context: "User's confirmation",
    branches: "• Regenerate",
    impact: "• App learns from confirmation",
    exceptions: "• AI fails to learn from this properly\n• User doesn't confirm",
    pain: "—",
    notes: "• Prompt rating / confirmation if user leaves flow before completing this step\n• Share with friend & ask for feedback or for coordination\n• Add to look book",
    aiPass1: "• Learning your style with each confirmation or \"didn't work try something new\" with follow up questions like \"why didn't this work\" or \"how confident did you feel\" or rating\n• Generate outfit on your body to preview with AI (can share measurements or photo of yourself in preferences or default to a general generation on mannequin/avatar)\n• Add to style look book, maybe a theme for a party, or a group vacation, or a night out. Tracks your preferences\n• Upload picture of you in this outfit for better generation in the future\n• Tracker for how many times you wore the outfit or pieces\n• \"Girl math\" \"you wore these $200 jeans 20 times so it was really $10\" :)\n• Declutter: auto suggest unworn items that go unselected\n• Most worn/least worn catalogue",
    aiPass2: "• (Prioritized) Learning your style with each confirmation or \"didn't work try something new\" with follow up questions like \"why didn't this work\" or \"how confident did you feel\" or rating\n• (Future state) Declutter: auto suggest unworn items that go unselected\n• (Future state) Tracker for how many times you wore the outfit or pieces",
  },
};

const seedInfo = {
  date: "2026-06-11",
  product: "Outfit App",
  workflow: "Daily outfit generator",
  deadline: "Q3 design sprint",
  smes: "Trish (Client Specialist)",
  anchors: "Shokoh (System Architect)",
  facilitator: "Jenevine (UX)",
  scribe: "Lauren (DPM)",
  logLink: "decision-log://outfit-gen",
};

const seedSubflows = { c1: true, c2: true };

const D = "2026-06-11";
const OWNER = "Fejdasz, Trish";
const LINK = "decision-log://outfit-gen";

const seedDecisions = [
  // ----- Trigger -----
  { id: "d1", date: D, status: "Prioritized", subject: "Calendar occasion detection",
    decision: "Detect today's occasion from the calendar and greet with a ready-made suggestion - or special event like birthday",
    context: "", rationale: "", optionsConsidered: "", decisionOwner: "",
    workflowStep: "Trigger", otherLink: LINK, anchor: { colId: "c0", rowKey: "aiPass2" } },
  { id: "d2", date: D, status: "Prioritized", subject: "Morning weather push",
    decision: "Dynamic morning push about weather change i.e. 73 and raining",
    context: "", rationale: "", optionsConsidered: "", decisionOwner: "",
    workflowStep: "Trigger", otherLink: LINK, anchor: { colId: "c0", rowKey: "aiPass2" } },
  { id: "d3", date: D, status: "Future state", subject: "Location/travel awareness",
    decision: "Contextual awareness for location/travel. I.e. tropical, or Paris, or modest (tracking geolocation)",
    context: "", rationale: "", optionsConsidered: "", decisionOwner: "",
    workflowStep: "Trigger", otherLink: LINK, anchor: { colId: "c0", rowKey: "aiPass2" } },
  // ----- Step 1: Styling brief -----
  { id: "d4", date: D, status: "Prioritized", subject: "Plan around a specific item",
    decision: "User wants to wear an item of clothing but doesn't know what to match with",
    context: "", rationale: "Being able to plan an outfit around a specific item like buying a new pair of pants and excited to wear",
    optionsConsidered: "", decisionOwner: "",
    workflowStep: "Step 1: Styling brief", otherLink: LINK, anchor: { colId: "c1", rowKey: "aiPass2" } },
  { id: "d5", date: D, status: "Prioritized", subject: "Conversational clarification",
    decision: "Conversational follow up question clarification",
    context: "", rationale: "Adding context and details for AI. Helps match a vibe that you want to go with. Adds clarity and direction and learns your style more.",
    optionsConsidered: "", decisionOwner: "",
    workflowStep: "Step 1: Styling brief", otherLink: LINK, anchor: { colId: "c1", rowKey: "aiPass2" } },
  { id: "d6", date: D, status: "Future state", subject: "Voice note brief",
    decision: "Voice note brief \"tell me about your day\" or similar",
    context: "", rationale: "Accessibility. Easier than typing, easier to explain what you want. Natural language. Hands free. Variety of input.",
    optionsConsidered: "", decisionOwner: "",
    workflowStep: "Step 1: Styling brief", otherLink: LINK, anchor: { colId: "c1", rowKey: "aiPass2" } },
  // ----- Step 2: Generate the looks -----
  { id: "d7", date: D, status: "Prioritized", subject: "Explain the outfit",
    decision: "Explain the outfit: the blazer keeps it polished, sneaker say you're not trying to hard.",
    context: "", rationale: "Helps users understand outfit choices, esp if not fashion savvy or want to learn about fashion. Adds context. Building trust.",
    optionsConsidered: "", decisionOwner: OWNER,
    workflowStep: "Step 2: Generate the looks", otherLink: LINK, anchor: { colId: "c2", rowKey: "aiPass2" } },
  { id: "d8", date: D, status: "Prioritized", subject: "Weather-aware generation",
    decision: "Weather-aware generation (layering for cold, low or high chance raining, breathable for heat) accessory: umbrella",
    context: "", rationale: "Weather is important for deciding outfits because temp and conditions affect what clothing and accessories are appropriate.",
    optionsConsidered: "", decisionOwner: OWNER,
    workflowStep: "Step 2: Generate the looks", otherLink: LINK, anchor: { colId: "c2", rowKey: "aiPass2" } },
  { id: "d9", date: D, status: "Future state", subject: "Trend lookup",
    decision: "Looking up current or emerging trends. Classic or trendy?",
    context: "", rationale: "Keeping current if user wants to try new trends or stay classic. Helps with personalization of experience and saves time from looking up trends.",
    optionsConsidered: "", decisionOwner: OWNER,
    workflowStep: "Step 2: Generate the looks", otherLink: LINK, anchor: { colId: "c2", rowKey: "aiPass2" } },
  { id: "d10", date: D, status: "Future state", subject: "Wardrobe purchase suggestions",
    decision: "Look up smart suggestions for additional pieces to wardrobe",
    context: "", rationale: "Building a more complete wardrobe for more options. Integrating monetizations through partnerships. More versatility. \"If you add these trousers you can have 12 new outfits in rotation\"",
    optionsConsidered: "", decisionOwner: OWNER,
    workflowStep: "Step 2: Generate the looks", otherLink: LINK, anchor: { colId: "c2", rowKey: "aiPass2" } },
  // ----- Step 3: Review -----
  { id: "d11", date: D, status: "Prioritized", subject: "\"Not my vibe\" / favorite feedback",
    decision: "\"Not my vibe\" button with follow up question \"why not\" & \"I love this\" \"favorite\"",
    context: "", rationale: "Help train AI to understand user's style preferences. User can build custom look books, to favorite looks for later.",
    optionsConsidered: "", decisionOwner: OWNER,
    workflowStep: "Step 3: Review", otherLink: LINK, anchor: { colId: "c3", rowKey: "aiPass2" } },
  { id: "d12", date: D, status: "Prioritized", subject: "Natural-language fine tuning",
    decision: "Natural language to fine tune selections (warmer, more casual, more colour)",
    context: "", rationale: "Helps with accuracy of regeneration. Reduce AI token cost. Helps AI learn about user.",
    optionsConsidered: "Voice or text, or both. Prompts/pills/chips.", decisionOwner: OWNER,
    workflowStep: "Step 3: Review", otherLink: LINK, anchor: { colId: "c3", rowKey: "aiPass2" } },
  { id: "d13", date: D, status: "Prioritized", subject: "Smart single-item swapping",
    decision: "Smart swapping single items. and learns from every swap. or \"more like this\"",
    context: "", rationale: "Offering further customization and flexibility to the user. More learning for the AI.",
    optionsConsidered: "", decisionOwner: OWNER,
    workflowStep: "Step 3: Review", otherLink: LINK, anchor: { colId: "c3", rowKey: "aiPass2" } },
  { id: "d14", date: D, status: "Future state", subject: "On-body outfit preview",
    decision: "Generate outfit on your body to preview with AI (can share measurements or photo of yourself in preferences or default to a mannequin/avatar)",
    context: "", rationale: "Provides visualization without hassling the user to try everything on or envision in their head. Boosts confidence score. Potentially increases speed of decision. Try before you buy!",
    optionsConsidered: "", decisionOwner: OWNER,
    workflowStep: "Step 3: Review", otherLink: LINK, anchor: { colId: "c3", rowKey: "aiPass2" } },
  // ----- Step 4: Select outfit -----
  { id: "d15", date: D, status: "Prioritized", subject: "Calendar-aware repeat avoidance",
    decision: "Calendar aware \"you work this week\" or \"you already wore this on 3 vacations\" \"you wore this to 3 client meetings\" try something new! (adjust in preferences?)",
    context: "", rationale: "Avoid outfit repeats. User doesn't have to remember. Helps user try new things.",
    optionsConsidered: "", decisionOwner: OWNER,
    workflowStep: "Step 4: Select outfit", otherLink: LINK, anchor: { colId: "c4", rowKey: "aiPass2" } },
  { id: "d16", date: D, status: "Future state", subject: "Shareable style look book",
    decision: "Share a style look book, maybe a theme for a party, or a group vacation, or a night out.",
    context: "", rationale: "Coordinating with friends, adds a social aspect. Makes planning easier.",
    optionsConsidered: "", decisionOwner: OWNER,
    workflowStep: "Step 4: Select outfit", otherLink: LINK, anchor: { colId: "c4", rowKey: "aiPass2" } },
  // ----- Step 5: Confirmation -----
  { id: "d17", date: D, status: "Prioritized", subject: "Confirmation-based style learning",
    decision: "Learning your style with each confirmation or \"didn't work try something new\" with follow up questions like \"why didn't this work\" or \"how confident did you feel\" or rating",
    context: "", rationale: "AI training on user's preferences. Builds trust between user and AI.",
    optionsConsidered: "", decisionOwner: OWNER,
    workflowStep: "Step 5: Confirmation", otherLink: LINK, anchor: { colId: "c5", rowKey: "aiPass2" } },
  { id: "d18", date: D, status: "Future state", subject: "Declutter suggestions",
    decision: "Declutter: auto suggest unworn items that go unselected",
    context: "", rationale: "Assists user with mental and physical inventory of clothing usage, to make room for new pieces. Potentially help user repurpose pieces.",
    optionsConsidered: "", decisionOwner: OWNER,
    workflowStep: "Step 5: Confirmation", otherLink: LINK, anchor: { colId: "c5", rowKey: "aiPass2" } },
  { id: "d19", date: D, status: "Future state", subject: "Wear tracker",
    decision: "Tracker for how many times you wore the outfit or pieces",
    context: "", rationale: "Compliments the \"Declutter\" feature proposal. Helps user understand the value of each piece.",
    optionsConsidered: "#girlmath \"you wore these $200 jeans 20 times so it was really $10\" :)", decisionOwner: OWNER,
    workflowStep: "Step 5: Confirmation", otherLink: LINK, anchor: { colId: "c5", rowKey: "aiPass2" } },
];

// ---------- Helpers ----------
function download(filename, text, type) {
  const blob = new Blob([text], { type: type || "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvEscape(v) {
  const s = (v == null ? "" : String(v));
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function slug(s) { return (s || "untitled").replace(/\s+/g, "-").toLowerCase(); }

function toLogEntry(d) {
  return {
    id: "",
    date: d.date || "",
    status: d.status || "",
    subject: d.subject || "",
    decision: d.decision || "",
    context: d.context || "",
    rationale: d.rationale || "",
    optionsConsidered: d.optionsConsidered || "",
    decisionOwner: d.decisionOwner || "",
    workflowStep: d.workflowStep || "",
    otherLink: d.otherLink || "",
  };
}

// ---------- Auto-growing textarea ----------
function GrowBox({ value, onChange, placeholder, small }) {
  const ref = useRef(null);
  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, []);
  useEffect(() => { resize(); }, [value, resize]);
  return (
    <textarea
      ref={ref}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || ""}
      rows={1}
      style={{
        width: "100%", border: "none", outline: "none", resize: "none",
        background: "transparent", fontFamily: SANS,
        fontSize: small ? 12.5 : 13, lineHeight: 1.45, color: INK, padding: 0,
        minHeight: 20, overflow: "hidden", boxSizing: "border-box",
      }}
    />
  );
}

// ---------- Link icon ----------
function LinkGlyph({ size = 11 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

// ---------- Pill ----------
function Pill({ children, tone, bg, fg, onClick }) {
  const tones = {
    accent: { bg: ACCENT_SOFT, fg: ACCENT },
    neutral: { bg: "#F1EFEA", fg: "#6B665D" },
    outline: { bg: "transparent", fg: ACCENT, bd: ACCENT },
  };
  const t = bg ? { bg, fg } : (tones[tone] || tones.neutral);
  return (
    <span onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 4, background: t.bg, color: t.fg,
      border: `1px solid ${t.bd || "transparent"}`, borderRadius: 999, padding: "2px 9px",
      fontSize: 10.5, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase",
      fontFamily: SANS, whiteSpace: "nowrap", cursor: onClick ? "pointer" : "default",
    }}>{children}</span>
  );
}

// ---------- Buttons ----------
function Btn({ children, onClick, primary, title, disabled, small }) {
  return (
    <button onClick={onClick} title={title} disabled={disabled} style={{
      fontFamily: SANS, fontSize: small ? 11.5 : 12.5, fontWeight: 600,
      padding: small ? "5px 10px" : "8px 14px", borderRadius: 8, cursor: disabled ? "default" : "pointer",
      border: primary ? `1px solid ${ACCENT}` : `1px solid ${BORDER}`,
      background: primary ? ACCENT : CARD_BG, color: primary ? "#FDFCFA" : INK,
      opacity: disabled ? 0.45 : 1, transition: "all .12s", whiteSpace: "nowrap",
    }}>{children}</button>
  );
}

function IconBtn({ children, onClick, title, danger }) {
  return (
    <button onClick={onClick} title={title} style={{
      width: 20, height: 20, borderRadius: 6, border: `1px solid ${BORDER}`,
      background: CARD_BG, color: danger ? "#9C3D2E" : MUTED, fontSize: 11, cursor: "pointer",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      lineHeight: 1, padding: 0, fontFamily: SANS, flexShrink: 0,
    }}>{children}</button>
  );
}

// ---------- Generic dropdown menu ----------
function Menu({ label, items, primary, disabled }) {
  const [open, setOpen] = useState(false);
  const itemStyle = {
    display: "block", width: "100%", textAlign: "left", border: "none",
    background: "transparent", padding: "9px 14px", fontSize: 12.5, fontWeight: 600,
    fontFamily: SANS, color: INK, cursor: "pointer",
  };
  return (
    <div style={{ position: "relative" }}>
      <Btn primary={primary} disabled={disabled} onClick={() => setOpen((v) => !v)}>{label}</Btn>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 90 }} onClick={() => setOpen(false)} />
          <div style={{
            position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 95,
            background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.14)", minWidth: 180, overflow: "hidden",
          }}>
            {items.map((it, i) => (
              <button key={i} style={itemStyle} onClick={() => { setOpen(false); it.onClick(); }}
                onMouseEnter={(e) => e.currentTarget.style.background = ACCENT_SOFT}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                {it.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------- Export dropdown ----------
function ExportMenu({ disabled, onText, onExcel, onJSON }) {
  const [open, setOpen] = useState(false);
  const itemStyle = {
    display: "block", width: "100%", textAlign: "left", border: "none",
    background: "transparent", padding: "9px 14px", fontSize: 12.5, fontWeight: 600,
    fontFamily: SANS, color: INK, cursor: "pointer",
  };
  return (
    <div style={{ position: "relative" }}>
      <Btn primary disabled={disabled} onClick={() => setOpen((v) => !v)}>Export ▾</Btn>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 90 }} onClick={() => setOpen(false)} />
          <div style={{
            position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 95,
            background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.14)", minWidth: 175, overflow: "hidden",
          }}>
            <button style={itemStyle} onClick={() => { setOpen(false); onText(); }}
              onMouseEnter={(e) => e.currentTarget.style.background = ACCENT_SOFT}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
              Text (.txt)
            </button>
            <button style={itemStyle} onClick={() => { setOpen(false); onExcel(); }}
              onMouseEnter={(e) => e.currentTarget.style.background = ACCENT_SOFT}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
              Excel (.csv)
            </button>
            <button style={itemStyle} onClick={() => { setOpen(false); onJSON(); }}
              onMouseEnter={(e) => e.currentTarget.style.background = ACCENT_SOFT}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
              JSON (.json)
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ---------- Decision card ----------
function DecisionCard({ d, onChange, onDelete, statusStyle, anchorRowLabel, onJumpAnchor, highlight }) {
  const set = (k, v) => onChange({ ...d, [k]: v });
  const ss = statusStyle || STATUS_STYLE[d.status] || STATUS_STYLE["Proposed"];
  const [open, setOpen] = useState(false);
  useEffect(() => { if (highlight) setOpen(true); }, [highlight]);
  const labelStyle = {
    fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
    color: MUTED, fontFamily: SANS, marginBottom: 3, display: "block",
  };
  const inputStyle = {
    width: "100%", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "6px 8px",
    fontSize: 12.5, fontFamily: SANS, color: INK, background: "#FDFCFA", outline: "none",
    boxSizing: "border-box", height: 32,
  };
  const areaWrap = { border: `1px solid ${BORDER}`, borderRadius: 8, padding: "7px 9px", background: "#FDFCFA" };

  return (
    <div id={`dec-${d.id}`} style={{
      background: CARD_BG, border: `1px solid ${highlight ? ACCENT : BORDER}`,
      boxShadow: highlight ? `0 0 0 3px ${ACCENT_SOFT}` : "0 1px 3px rgba(0,0,0,0.04)",
      borderRadius: 14, padding: open ? "16px 18px" : "12px 14px", transition: "all .3s",
    }}>
      {/* Collapsed header — click to expand. Pills: workflow step · anchor row · status */}
      <div onClick={() => setOpen((o) => !o)} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", cursor: "pointer" }}>
        {d.workflowStep ? <Pill tone="accent">{d.workflowStep}</Pill> : null}
        {anchorRowLabel ? (
          <Pill tone="outline" onClick={(e) => { e.stopPropagation(); onJumpAnchor && onJumpAnchor(); }}>⊙ {anchorRowLabel}</Pill>
        ) : null}
        <Pill bg={ss.bg} fg={ss.fg}>{d.status || "Proposed"}</Pill>
        {!open && (
          <span style={{ flex: 1, minWidth: 80, fontSize: 12.5, color: MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {d.decision || "Untitled decision"}
          </span>
        )}
        {open && <span style={{ flex: 1 }} />}
        <span style={{ color: MUTED, fontSize: 11 }}>{open ? "▲" : "▼"}</span>
        <IconBtn danger title="Delete decision" onClick={(e) => { e.stopPropagation && e.stopPropagation(); onDelete(); }}>×</IconBtn>
      </div>

      {!open ? null : (
      <div style={{ marginTop: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px 14px", marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>Date</label>
          <input type="date" value={d.date || ""} onChange={(e) => set("date", e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Status</label>
          <select value={d.status || "Proposed"} onChange={(e) => set("status", e.target.value)}
            style={{ ...inputStyle, cursor: "pointer" }}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Subject</label>
          <input value={d.subject || ""} onChange={(e) => set("subject", e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Decision owner</label>
          <input value={d.decisionOwner || ""} onChange={(e) => set("decisionOwner", e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Workflow step</label>
          <input value={d.workflowStep || ""} onChange={(e) => set("workflowStep", e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Other link</label>
          <input value={d.otherLink || ""} onChange={(e) => set("otherLink", e.target.value)} style={inputStyle} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "10px" }}>
        <div>
          <label style={labelStyle}>Decision</label>
          <div style={areaWrap}><GrowBox small value={d.decision} onChange={(v) => set("decision", v)} placeholder="The call that was made…" /></div>
        </div>
        <div>
          <label style={labelStyle}>Context</label>
          <div style={areaWrap}><GrowBox small value={d.context} onChange={(v) => set("context", v)} /></div>
        </div>
        <div>
          <label style={labelStyle}>Rationale</label>
          <div style={areaWrap}><GrowBox small value={d.rationale} onChange={(v) => set("rationale", v)} /></div>
        </div>
        <div>
          <label style={labelStyle}>Options considered</label>
          <div style={areaWrap}><GrowBox small value={d.optionsConsidered} onChange={(v) => set("optionsConsidered", v)} /></div>
        </div>
      </div>
      </div>
      )}
    </div>
  );
}

// ---------- Main app ----------
export default function WorkflowCapture({
  initial, focusStep, onWorkflowsHome, projectLinks = [],
  logsIndex = [], existingLogCodes = [], onCreateLog, onAddToLog, onUpdateLogEntries, onOpenLog,
}) {
  const init = initial || { info: seedInfo, columns: seedColumns, cells: seedCells, subflows: seedSubflows, decisions: seedDecisions };
  const [info, setInfo] = useState(init.info);
  // A workflow has multiple flows: the main flow + branch sub-flows. The grid
  // edits the ACTIVE flow; tabs switch between them. Decisions are workflow-level
  // and carry a flowId on their anchor.
  const [flows, setFlows] = useState(() => (init.flows && init.flows.length) ? init.flows : [{
    id: "main",
    name: "Main flow",
    columns: init.columns,
    cells: init.cells,
    subflows: init.subflows || {},
    nextId: init.columns.reduce((m, c) => Math.max(m, (parseInt(String(c.id).replace(/\D/g, ""), 10) || 0) + 1), 0),
  }]);
  const [activeFlowId, setActiveFlowId] = useState("main");
  const flowSeqRef = useRef(1);
  const activeFlow = flows.find((f) => f.id === activeFlowId) || flows[0];
  const columns = activeFlow.columns;
  const cells = activeFlow.cells;
  const subflows = activeFlow.subflows;
  const nextId = activeFlow.nextId;
  const updateFlow = (id, patch) =>
    setFlows((fs) => fs.map((f) => (f.id === id ? { ...f, ...(typeof patch === "function" ? patch(f) : patch) } : f)));
  const setColumns = (u) => updateFlow(activeFlowId, (f) => ({ columns: typeof u === "function" ? u(f.columns) : u }));
  const setCells = (u) => updateFlow(activeFlowId, (f) => ({ cells: typeof u === "function" ? u(f.cells) : u }));
  const setSubflows = (u) => updateFlow(activeFlowId, (f) => ({ subflows: typeof u === "function" ? u(f.subflows) : u }));
  const setNextId = (u) => updateFlow(activeFlowId, (f) => ({ nextId: typeof u === "function" ? u(f.nextId) : u }));
  const flowName = (id) => flows.find((f) => f.id === id)?.name;
  const flowColumns = (id) => flows.find((f) => f.id === id)?.columns || [];

  // ----- Sub-flow (branch) management -----
  const newFlowId = () => "flow-" + (flowSeqRef.current++);
  const createSubFlowFromBranch = (colId, text) => {
    const sourceId = activeFlowId;
    const nm = ((text || "").split("\n")[0].trim().slice(0, 32)) || ("Branch " + flows.length);
    const id = newFlowId();
    setFlows((fs) =>
      fs.map((f) => (f.id === sourceId ? { ...f, subflows: { ...f.subflows, [colId]: id } } : f))
        .concat([{ id, name: nm, columns: [{ id: "c0", name: "Trigger" }, { id: "c1", name: "Step 1" }], cells: {}, subflows: {}, nextId: 2 }]));
    setActiveFlowId(id);
    flash(`Created sub-flow "${nm}"`);
  };
  const linkBranchToFlow = (colId, targetId) =>
    updateFlow(activeFlowId, (f) => ({ subflows: { ...f.subflows, [colId]: targetId } }));
  const unlinkBranch = (colId) =>
    updateFlow(activeFlowId, (f) => { const n = { ...f.subflows }; delete n[colId]; return { subflows: n }; });
  const renameFlow = (id, name) => updateFlow(id, { name });
  const deleteFlow = (id) => {
    if (id === "main") return;
    setFlows((fs) => fs
      .filter((f) => f.id !== id)
      .map((f) => {
        const sf = { ...f.subflows };
        for (const k of Object.keys(sf)) if (sf[k] === id) delete sf[k];
        return { ...f, subflows: sf };
      }));
    setActiveFlowId((cur) => (cur === id ? "main" : cur));
  };

  const [decisions, setDecisions] = useState(init.decisions);
  const decIdRef = useRef(
    (init.decisions || []).reduce((m, x) => Math.max(m, (parseInt(String(x.id).replace(/\D/g, ""), 10) || 0) + 1), 1));
  const [showPreview, setShowPreview] = useState(false);
  const [showDesc, setShowDesc] = useState(true);
  const [infoOpen, setInfoOpen] = useState(true);
  const [toast, setToast] = useState(null);
  const [highlightId, setHighlightId] = useState(null);
  const [focusCol, setFocusCol] = useState(null);
  const [decQuery, setDecQuery] = useState("");
  const [decStatus, setDecStatus] = useState("All");
  const [decStep, setDecStep] = useState("All");
  const [filterOpen, setFilterOpen] = useState(false);
  const [aiReview, setAiReview] = useState(null);
  const [addToLog, setAddToLog] = useState(null); // { step, logId, items:[{d, action}], added }
  const [logFill, setLogFill] = useState(null);   // { logId, items } post-add populate review
  const [links, setLinks] = useState(projectLinks || []);
  const [linkDraft, setLinkDraft] = useState(null); // { label, url } when the add-link modal is open
  const fileRef = useRef(null);

  useEffect(() => {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400..700;1,6..72,400..600&display=swap";
    document.head.appendChild(l);
    return () => { document.head.removeChild(l); };
  }, []);

  // Scroll to + highlight the column matching a workflow step linked from the decision log.
  useEffect(() => {
    if (!focusStep) return;
    const col = columns.find((c) => c.name === focusStep);
    if (!col) return;
    setFocusCol(col.id);
    const el = document.getElementById("wfcol-" + col.id);
    if (el) el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    const t = setTimeout(() => setFocusCol(null), 2600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusStep]);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2600); };

  const setCell = (colId, rowKey, val) =>
    setCells((p) => ({ ...p, [colId]: { ...(p[colId] || {}), [rowKey]: val } }));

  const addColumn = () => {
    const id = "c" + nextId;
    setColumns((p) => [...p, { id, name: "Step " + p.length }]);
    setNextId((n) => n + 1);
  };

  const removeColumn = (id) => {
    if (columns.length <= 1) return;
    setColumns((p) => p.filter((c) => c.id !== id));
    setCells((p) => { const n = { ...p }; delete n[id]; return n; });
    setSubflows((p) => { const n = { ...p }; delete n[id]; return n; });
  };

  const moveColumn = (idx, dir) => {
    const j = idx + dir;
    if (j < 0 || j >= columns.length) return;
    setColumns((p) => { const n = [...p]; [n[idx], n[j]] = [n[j], n[idx]]; return n; });
  };

  const renameColumn = (id, name) =>
    setColumns((p) => p.map((c) => (c.id === id ? { ...c, name } : c)));

  // ----- Decisions -----
  const newDecision = (extra, opts = {}) => {
    const { scroll = true } = opts;
    const id = "d" + decIdRef.current++;
    const d = {
      id, date: info.date || new Date().toISOString().slice(0, 10),
      status: "Proposed", subject: "", decisionOwner: "", decision: "",
      context: "", rationale: "", optionsConsidered: "", workflowStep: "",
      otherLink: "", anchor: null, ...extra,
    };
    setDecisions((p) => [...p, d]);
    if (scroll) {
      setHighlightId(id);
      setTimeout(() => {
        document.getElementById(`dec-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 60);
      setTimeout(() => setHighlightId(null), 2200);
    }
    return d;
  };

  const logFromCell = (col, row) => {
    newDecision({
      workflowStep: col.name,
      subject: row.label,
      context: (cells[col.id]?.[row.key] || "").trim(),
      anchor: { flowId: activeFlowId, colId: col.id, rowKey: row.key },
    });
    flash(`Decision logged for ${col.name} · ${row.label}`);
  };

  // Decisions anchored to a cell in the *active* flow (anchors w/o flowId = main).
  const cellDecisions = (colId, rowKey) =>
    decisions.filter((d) => d.anchor && (d.anchor.flowId || "main") === activeFlowId && d.anchor.colId === colId && d.anchor.rowKey === rowKey);

  const jumpToDecision = (id) => {
    setHighlightId(id);
    document.getElementById(`dec-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => setHighlightId(null), 2200);
  };

  // Scroll to the grid cell a decision is anchored to (switching flows if needed).
  const jumpToAnchor = (anchor) => {
    if (!anchor) return;
    const fid = anchor.flowId || "main";
    if (fid !== activeFlowId) setActiveFlowId(fid);
    setFocusCol(anchor.colId);
    setTimeout(() => {
      document.getElementById(`wfcell-${anchor.colId}-${anchor.rowKey}`)?.scrollIntoView({ behavior: "smooth", inline: "center", block: "center" });
    }, fid !== activeFlowId ? 80 : 0);
    setTimeout(() => setFocusCol(null), 2600);
  };

  const anchorLabel = (d) => {
    if (!d.anchor) return null;
    const col = flowColumns(d.anchor.flowId || "main").find((c) => c.id === d.anchor.colId);
    const row = ROWS.find((r) => r.key === d.anchor.rowKey);
    if (!col || !row) return null;
    return `${col.name} · ${row.label}`;
  };

  // Just the anchor's row label (e.g. "Pain points") for the reordered pill.
  const anchorRowLabel = (d) => {
    if (!d.anchor) return null;
    const row = ROWS.find((r) => r.key === d.anchor.rowKey);
    return row ? row.label : null;
  };

  // ----- Decision search + filters -----
  const decView = decisions.filter((d) => {
    if (decStatus !== "All" && d.status !== decStatus) return false;
    if (decStep !== "All" && d.workflowStep !== decStep) return false;
    if (decQuery.trim()) {
      const q = decQuery.toLowerCase();
      const hay = `${d.decision} ${d.subject} ${d.context} ${d.rationale} ${d.optionsConsidered} ${d.workflowStep} ${d.decisionOwner}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const decSteps = Array.from(new Set(decisions.map((d) => d.workflowStep).filter(Boolean)));
  const filtersActive = decStatus !== "All" || decStep !== "All";

  // ----- Decision exports -----
  const LOG_HEADERS = ["id", "date", "status", "subject", "decision", "context", "rationale", "optionsConsidered", "decisionOwner", "workflowStep", "otherLink"];

  const exportDecJSON = (list = decisions) => {
    download(`decision-log-${slug(info.workflow)}.json`, JSON.stringify(list.map(toLogEntry), null, 2));
    flash(`${list.length} decision${list.length === 1 ? "" : "s"} exported as JSON`);
  };

  const exportDecExcel = (list = decisions) => {
    const rows = [LOG_HEADERS.join(",")].concat(
      list.map((d) => { const e = toLogEntry(d); return LOG_HEADERS.map((h) => csvEscape(e[h])).join(","); })
    );
    download(`decision-log-${slug(info.workflow)}.csv`, rows.join("\n"), "text/csv");
    flash("Exported as CSV (opens in Excel)");
  };

  const exportDecText = (list = decisions) => {
    const txt = list.map((d, i) => {
      const e = toLogEntry(d);
      return [
        `DECISION ${i + 1}`,
        `Date: ${e.date}`, `Status: ${e.status}`, `Subject: ${e.subject}`,
        `Decision owner: ${e.decisionOwner}`, `Decision: ${e.decision}`,
        `Context: ${e.context}`, `Rationale: ${e.rationale}`,
        `Options considered: ${e.optionsConsidered}`,
        `Workflow step: ${e.workflowStep}`, `Other link: ${e.otherLink}`,
      ].join("\n");
    }).join("\n\n" + "—".repeat(40) + "\n\n");
    download(`decision-log-${slug(info.workflow)}.txt`, txt, "text/plain");
    flash("Exported as text");
  };

  const runExport = (format, list) => {
    if (format === "json") exportDecJSON(list);
    else if (format === "excel") exportDecExcel(list);
    else exportDecText(list);
  };

  // ----- Pre-export: offer to fill missing fields with AI -----
  const FILLABLE = [["context", "Context"], ["rationale", "Rationale"], ["optionsConsidered", "Options considered"]];

  const suggestFor = (d, field) => {
    if (field === "context")
      return `Came up while working through “${d.workflowStep || "the workflow"}”${d.subject ? ` — ${d.subject}` : ""}.`;
    if (field === "rationale")
      return `Chosen to move “${(d.decision || "this").slice(0, 80)}” forward; revisit if constraints change.`;
    return `Alternatives weren't recorded at the time — worth revisiting later.`;
  };

  const requestExport = (format) => {
    const items = [];
    decisions.forEach((d) => {
      if (!(d.decision || "").trim()) return;
      FILLABLE.forEach(([field, label]) => {
        if (!(d[field] || "").trim())
          items.push({ decId: d.id, field, label, suggestion: suggestFor(d, field), action: "approve" });
      });
    });
    if (items.length === 0) { runExport(format, decisions); return; }
    setAiReview({ format, items });
  };

  const setReviewAction = (idx, action) =>
    setAiReview((r) => ({ ...r, items: r.items.map((it, i) => (i === idx ? { ...it, action } : it)) }));

  const confirmAiReview = () => {
    const { format, items } = aiReview;
    const approved = items.filter((it) => it.action === "approve");
    const final = decisions.map((d) => {
      const ups = approved.filter((a) => a.decId === d.id);
      if (!ups.length) return d;
      const nd = { ...d };
      ups.forEach((a) => { nd[a.field] = a.suggestion; });
      return nd;
    });
    if (approved.length) setDecisions(final);
    setAiReview(null);
    runExport(format, final);
  };

  // ----- Add to Decision Log wizard -----
  const openAddToLog = () => {
    if (!decisions.length) return;
    setAddToLog({
      step: logsIndex.length ? "select" : "create",
      logId: logsIndex.length ? logsIndex[0].id : null,
      items: decisions.map((d) => ({ d, action: "accept" })),
      added: [],
    });
  };

  const setAddItemAction = (idx, action) =>
    setAddToLog((a) => ({ ...a, items: a.items.map((it, i) => (i === idx ? { ...it, action } : it)) }));

  const setAllAddItems = (action) =>
    setAddToLog((a) => ({ ...a, items: a.items.map((it) => ({ ...it, action })) }));

  const confirmAddToLog = () => {
    const accepted = addToLog.items.filter((it) => it.action === "accept").map((it) => toLogEntry(it.d));
    const ids = (onAddToLog && onAddToLog(addToLog.logId, accepted)) || [];
    const added = accepted.map((e, i) => ({ ...e, id: ids[i] || "" }));
    setAddToLog((a) => ({ ...a, step: "done", added }));
    flash(`${accepted.length} decision${accepted.length === 1 ? "" : "s"} added to the log`);
  };

  // After adding: offer to populate missing fields on the entries that just landed.
  const openLogFill = () => {
    const items = [];
    addToLog.added.forEach((e) => {
      if (!(e.decision || "").trim()) return;
      FILLABLE_LOG.forEach(([field, label]) => {
        if (!(e[field] || "").trim())
          items.push({ id: e.id, field, label, suggestion: suggestLogField(e, field), action: "approve", decision: e.decision });
      });
    });
    if (!items.length) { flash("No missing fields to populate"); setAddToLog(null); return; }
    setLogFill({ logId: addToLog.logId, items });
    setAddToLog(null);
  };

  const setLogFillAction = (idx, action) =>
    setLogFill((r) => ({ ...r, items: r.items.map((it, i) => (i === idx ? { ...it, action } : it)) }));

  const applyLogFill = () => {
    const approved = logFill.items.filter((it) => it.action === "approve")
      .map((it) => ({ id: it.id, field: it.field, value: it.suggestion }));
    if (approved.length && onUpdateLogEntries) onUpdateLogEntries(logFill.logId, approved);
    flash(approved.length ? `Populated ${approved.length} field${approved.length === 1 ? "" : "s"} in the log` : "Nothing populated");
    setLogFill(null);
  };

  // ----- AI pass-2 sweep: decisions found -----
  const pendingDecisions = columns
    .map((c) => ({ col: c, text: (cells[c.id]?.aiPass2 || "").trim() }))
    .filter((d) => d.text.length > 0);

  const pass2Added = (colId) =>
    decisions.some((d) => d.anchor && d.anchor.colId === colId && d.anchor.rowKey === "aiPass2");

  const addPass2ToLog = (d) => {
    newDecision({
      workflowStep: d.col.name,
      subject: `AI scope call — ${d.col.name}`,
      decision: d.text,
      otherLink: info.logLink || "",
      anchor: { colId: d.col.id, rowKey: "aiPass2" },
    }, { scroll: false });
    flash(`Added to decision log: ${d.col.name}`);
  };

  const remainingPass2 = pendingDecisions.filter((d) => !pass2Added(d.col.id));

  const addAllPass2 = () => {
    const count = remainingPass2.length;
    remainingPass2.forEach((d) => {
      newDecision({
        workflowStep: d.col.name,
        subject: `AI scope call — ${d.col.name}`,
        decision: d.text,
        otherLink: info.logLink || "",
        anchor: { colId: d.col.id, rowKey: "aiPass2" },
      }, { scroll: false });
    });
    setShowPreview(false);
    flash(`${count} decision${count === 1 ? "" : "s"} added to the log below`);
  };

  // ----- Workflow JSON export / import -----
  const exportWorkflow = () => {
    download(
      `workflow-${slug(info.workflow)}.json`,
      JSON.stringify({ kind: "workflow-capture", version: 3, info, flows, decisions }, null, 2)
    );
    flash("Workflow exported");
  };

  const importWorkflow = (file) => {
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(r.result);
        // v3: { flows }. Older exports: { columns, cells, subflows } -> wrap as main.
        let nextFlows;
        if (Array.isArray(d.flows) && d.flows.length) {
          nextFlows = d.flows;
        } else if (d.columns && d.cells) {
          nextFlows = [{
            id: "main", name: "Main flow", columns: d.columns, cells: d.cells, subflows: d.subflows || {},
            nextId: d.columns.reduce((m, c) => Math.max(m, (parseInt(String(c.id).replace(/\D/g, ""), 10) || 0) + 1), 0),
          }];
        } else {
          throw new Error("bad file");
        }
        setInfo(d.info || {});
        setFlows(nextFlows);
        setActiveFlowId(nextFlows[0].id);
        setDecisions(d.decisions || []);
        decIdRef.current = (d.decisions || []).reduce((m, x) => {
          const n = parseInt(String(x.id).replace(/\D/g, ""), 10);
          return isNaN(n) ? m : Math.max(m, n + 1);
        }, 2);
        flash("Workflow imported");
      } catch {
        flash("Couldn't read that file — is it a workflow export?");
      }
    };
    r.readAsText(file);
  };

  // ----- Grid CSV export -----
  const exportCSV = () => {
    const header = ["Field", ...columns.map((c) => c.name)].map(csvEscape).join(",");
    const lines = ROWS.map((row) =>
      [row.label, ...columns.map((c) => cells[c.id]?.[row.key] || "")].map(csvEscape).join(",")
    );
    download(`workflow-${slug(info.workflow)}.csv`, [header, ...lines].join("\n"), "text/csv");
    flash("Grid CSV exported for FigJam");
  };

  const labelStyle = {
    fontSize: 10.5, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
    color: MUTED, fontFamily: SANS, marginBottom: 3, display: "block",
  };
  const inputStyle = {
    width: "100%", minWidth: 0, maxWidth: "100%", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "7px 9px",
    fontSize: 13, fontFamily: SANS, color: INK, background: "#FDFCFA", outline: "none", boxSizing: "border-box",
  };

  const DESC_W = 230;

  const selectStyle = {
    fontFamily: SANS, fontSize: 13, color: INK, background: CARD_BG,
    border: `1px solid ${BORDER}`, borderRadius: 9, padding: "8px 10px", outline: "none", cursor: "pointer",
  };

  const crumbLink = {
    background: "none", border: "none", padding: 0, font: "inherit", fontFamily: SANS,
    fontSize: 12.5, color: ACCENT, cursor: "pointer", fontWeight: 600,
  };

  return (
    <div style={{ minHeight: "100vh", background: BASE_BG, color: INK, padding: "28px 28px 60px", fontFamily: SANS }}>
      {/* ---------- Breadcrumb ---------- */}
      {onWorkflowsHome && (
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 16, fontSize: 12.5, flexWrap: "wrap" }}>
          <button style={crumbLink} onClick={onWorkflowsHome}>← Workflows</button>
          <span style={{ color: MUTED }}>/</span>
          <span style={{ color: MUTED }}>{info.workflow || "Untitled workflow"}</span>
        </div>
      )}
      {/* ---------- Page header ---------- */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 14, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 34, lineHeight: 1.1, margin: 0, color: ACCENT, letterSpacing: "-0.01em" }}>
            Workflow: {info.workflow || "Untitled workflow"}
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 13.5, color: MUTED, maxWidth: 560 }}>
            Capture the steps, the people, the exceptions — and where AI could fit — while the nuance is still in the room.
          </p>
          {links.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              {links.map((pl, i) => (
                <a key={i} href={pl.url} target="_blank" rel="noopener noreferrer" title={pl.url} style={{
                  display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 600,
                  color: ACCENT, background: ACCENT_SOFT, padding: "3px 9px", borderRadius: 999, textDecoration: "none", fontFamily: SANS,
                }}><LinkGlyph />{pl.label || pl.url}</a>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Menu label="Import / Export ▾" items={[
            { label: "Import JSON", onClick: () => fileRef.current?.click() },
            { label: "Export JSON", onClick: exportWorkflow },
            { label: "Grid CSV", onClick: exportCSV },
          ]} />
          <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: "none" }}
            onChange={(e) => { if (e.target.files?.[0]) importWorkflow(e.target.files[0]); e.target.value = ""; }} />
        </div>
      </div>

      {/* ---------- Workflow info card ---------- */}
      <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "18px 20px", marginBottom: 22, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <h2 onClick={() => setInfoOpen((v) => !v)} style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 600, margin: infoOpen ? "0 0 14px" : 0, color: INK, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}>
          <span style={{ color: ACCENT, fontSize: 14, fontFamily: SANS, transform: infoOpen ? "none" : "rotate(-90deg)", transition: "transform .15s" }}>▾</span>
          Workflow info
        </h2>
        <div style={{ display: infoOpen ? "grid" : "none", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "12px 16px" }}>
          {INFO_FIELDS.map((f) => (
            <div key={f.key}>
              <label style={labelStyle}>{f.label}</label>
              {f.key === "logLink" ? (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type={f.type || "text"} value={info[f.key] || ""} style={{ ...inputStyle, flex: 1 }}
                    onChange={(e) => setInfo((p) => ({ ...p, [f.key]: e.target.value }))} />
                  <Btn small onClick={() => setLinkDraft({ label: "", url: "" })}>+ add links</Btn>
                </div>
              ) : (
                <input type={f.type || "text"} value={info[f.key] || ""} style={inputStyle}
                  onChange={(e) => setInfo((p) => ({ ...p, [f.key]: e.target.value }))} />
              )}
              {f.key === "logLink" && links.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {links.map((pl, i) => (
                    <span key={i} style={{
                      display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600,
                      color: ACCENT, background: ACCENT_SOFT, padding: "3px 6px 3px 9px", borderRadius: 999, fontFamily: SANS,
                    }}>
                      <a href={pl.url} target="_blank" rel="noopener noreferrer" title={pl.url} style={{ display: "inline-flex", alignItems: "center", gap: 4, color: ACCENT, textDecoration: "none" }}><LinkGlyph />{pl.label || pl.url}</a>
                      <button onClick={() => setLinks(links.filter((_, idx) => idx !== i))} title="Remove" style={{
                        border: "none", background: "none", color: ACCENT, cursor: "pointer", fontSize: 12, lineHeight: 1, padding: 0,
                      }}>✕</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ---------- Capture grid ---------- */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 8, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 600, margin: 0, color: INK }}>Capture grid</h2>
        <Btn onClick={addColumn}>+ Add step</Btn>
      </div>

      {/* Flow tabs: main flow + branch sub-flows */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 10, flexWrap: "wrap", borderBottom: `1px solid ${BORDER}`, paddingBottom: 2 }}>
        {flows.map((f) => {
          const active = f.id === activeFlowId;
          return (
            <span key={f.id} style={{ display: "inline-flex", alignItems: "center" }}>
              <button onClick={() => setActiveFlowId(f.id)} style={{
                fontFamily: SANS, fontSize: 13, fontWeight: 600, cursor: "pointer",
                background: active ? ACCENT_SOFT : "transparent", color: active ? ACCENT : MUTED,
                border: "none", borderBottom: `2px solid ${active ? ACCENT : "transparent"}`,
                borderRadius: "6px 6px 0 0", padding: "7px 12px",
              }}>{f.name}</button>
              {f.id !== "main" && active && (
                <button onClick={() => { if (window.confirm(`Delete sub-flow "${f.name}"?`)) deleteFlow(f.id); }}
                  title="Delete sub-flow" style={{ border: "none", background: "transparent", color: MUTED, cursor: "pointer", fontSize: 13, padding: "0 4px" }}>×</button>
              )}
            </span>
          );
        })}
        <button onClick={() => { const id = newFlowId(); setFlows((fs) => [...fs, { id, name: "Sub-flow " + fs.length, columns: [{ id: "c0", name: "Trigger" }, { id: "c1", name: "Step 1" }], cells: {}, subflows: {}, nextId: 2 }]); setActiveFlowId(id); }}
          style={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 600, color: ACCENT, background: "transparent", border: "none", cursor: "pointer", padding: "7px 10px" }}>+ Sub-flow</button>
      </div>

      <div style={{ overflowX: "auto", border: `1px solid ${BORDER}`, borderRadius: 14, background: CARD_BG, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <table style={{ borderCollapse: "separate", borderSpacing: 0, width: "100%", minWidth: 220 + (showDesc ? DESC_W : 34) + columns.length * 260 }}>
          <thead>
            <tr>
              <th style={{
                position: "sticky", left: 0, zIndex: 10, background: "#F5F3EF",
                borderBottom: `2px solid ${ACCENT}`, borderRight: "none",
                padding: "10px 14px", textAlign: "left", minWidth: 210, width: 210,
                fontFamily: SANS, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em",
                textTransform: "uppercase", color: MUTED,
              }}>Field</th>
              <th style={{
                position: "sticky", left: 210, zIndex: 10, background: "#F5F3EF",
                borderBottom: `2px solid ${ACCENT}`, borderRight: `1px solid ${BORDER}`,
                padding: showDesc ? "10px 14px" : "10px 6px", textAlign: "left",
                minWidth: showDesc ? DESC_W : 34, width: showDesc ? DESC_W : 34,
                fontFamily: SANS, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em",
                textTransform: "uppercase", color: MUTED, whiteSpace: "nowrap",
              }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <button onClick={() => setShowDesc((v) => !v)} title={showDesc ? "Collapse descriptions" : "Show descriptions"}
                    style={{ border: "none", background: "none", cursor: "pointer", color: ACCENT, padding: 0, fontSize: 15, lineHeight: 1, display: "inline-flex", alignItems: "center" }}>
                    {showDesc ? "‹" : "›"}
                  </button>
                  {showDesc && <span>Description</span>}
                </span>
              </th>
              {columns.map((col, i) => (
                <th key={col.id} id={"wfcol-" + col.id} style={{
                  background: focusCol === col.id ? ACCENT_SOFT : "#F5F3EF", borderBottom: `2px solid ${ACCENT}`,
                  borderRight: i < columns.length - 1 ? `1px solid ${BORDER}` : "none",
                  boxShadow: focusCol === col.id ? `inset 0 0 0 2px ${ACCENT}` : "none",
                  transition: "background .3s, box-shadow .3s",
                  padding: "8px 12px", minWidth: 250, verticalAlign: "top",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <Pill tone={i === 0 ? "accent" : "neutral"}>{i === 0 ? "Trigger col" : `Step ${i}`}</Pill>
                    <span style={{ flex: 1 }} />
                    <IconBtn title="Move left" onClick={() => moveColumn(i, -1)}>‹</IconBtn>
                    <IconBtn title="Move right" onClick={() => moveColumn(i, 1)}>›</IconBtn>
                    <IconBtn danger title="Remove column" onClick={() => removeColumn(col.id)}>×</IconBtn>
                  </div>
                  <input value={col.name} onChange={(e) => renameColumn(col.id, e.target.value)}
                    style={{
                      width: "100%", border: "none", outline: "none", background: "transparent",
                      fontFamily: SERIF, fontSize: 16, fontWeight: 600, color: ACCENT,
                      padding: 0, boxSizing: "border-box",
                    }} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, ri) => {
              const isAI = row.key.startsWith("aiPass");
              return (
                <tr key={row.key}>
                  <td style={{
                    position: "sticky", left: 0, zIndex: 5,
                    background: isAI ? ACCENT_SOFT : "#FBFAF8",
                    borderBottom: ri < ROWS.length - 1 ? `1px solid ${BORDER}` : "none",
                    borderRight: "none",
                    padding: "10px 14px", verticalAlign: "top", width: 210, minWidth: 210,
                  }}>
                    <span style={{
                      fontSize: 12.5, fontWeight: 600, color: isAI ? ACCENT : INK,
                      fontFamily: SANS, lineHeight: 1.3,
                    }} title={row.tip}>{row.label}</span>
                  </td>
                  <td style={{
                    position: "sticky", left: 210, zIndex: 5,
                    background: isAI ? ACCENT_SOFT : "#FBFAF8",
                    borderBottom: ri < ROWS.length - 1 ? `1px solid ${BORDER}` : "none",
                    borderRight: `1px solid ${BORDER}`,
                    padding: showDesc ? "10px 14px" : "10px 6px", verticalAlign: "top",
                    width: showDesc ? DESC_W : 34, minWidth: showDesc ? DESC_W : 34,
                  }}>
                    {showDesc && (
                      <span style={{ fontSize: 11.5, color: MUTED, fontFamily: SANS, lineHeight: 1.45, fontStyle: "italic" }}>{row.tip}</span>
                    )}
                  </td>
                  {columns.map((col, ci) => {
                    const val = cells[col.id]?.[row.key] || "";
                    const isBranch = row.key === "branches";
                    const linkedFlowId = isBranch ? subflows[col.id] : null;
                    const linkedFlow = linkedFlowId ? flows.find((f) => f.id === linkedFlowId) : null;
                    const attached = cellDecisions(col.id, row.key);
                    return (
                      <td key={col.id} id={`wfcell-${col.id}-${row.key}`} style={{
                        position: "relative",
                        borderBottom: ri < ROWS.length - 1 ? `1px solid ${BORDER}` : "none",
                        borderRight: ci < columns.length - 1 ? `1px solid ${BORDER}` : "none",
                        padding: "9px 26px 9px 12px", verticalAlign: "top",
                        background: focusCol === col.id && isAI ? "#EAF3EE" : (isAI ? "#F7FAF8" : "transparent"), minWidth: 250,
                      }}>
                        <button onClick={() => logFromCell(col, row)}
                          title={`Log a decision on ${col.name} · ${row.label}`}
                          style={{
                            position: "absolute", top: 6, right: 6, width: 17, height: 17,
                            borderRadius: 5, border: `1px solid ${BORDER}`, background: CARD_BG,
                            color: MUTED, fontSize: 10, cursor: "pointer", lineHeight: 1,
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                            padding: 0, opacity: 0.55, fontFamily: SANS,
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; e.currentTarget.style.color = ACCENT; e.currentTarget.style.borderColor = ACCENT; }}
                          onMouseLeave={(e) => { e.currentTarget.style.opacity = 0.55; e.currentTarget.style.color = MUTED; e.currentTarget.style.borderColor = BORDER; }}
                        >✚</button>
                        <GrowBox value={val} onChange={(v) => setCell(col.id, row.key, v)}
                          placeholder={ri === 0 && !val ? "…" : ""} />
                        {attached.length > 0 && (
                          <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {attached.map((d) => (
                              <Pill key={d.id} tone="accent" onClick={() => jumpToDecision(d.id)}>
                                ⊙ {d.subject || "decision"}
                              </Pill>
                            ))}
                          </div>
                        )}
                        {isBranch && val.trim() && (
                          <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            {linkedFlow ? (
                              <>
                                <button onClick={() => setActiveFlowId(linkedFlow.id)} style={{
                                  border: `1px solid ${ACCENT}`, background: ACCENT_SOFT, color: ACCENT, borderRadius: 999,
                                  fontSize: 10.5, fontWeight: 600, cursor: "pointer", padding: "2px 9px", fontFamily: SANS,
                                }}>↳ {linkedFlow.name}</button>
                                <button onClick={() => unlinkBranch(col.id)} style={{
                                  border: "none", background: "transparent", color: MUTED, fontSize: 10.5, cursor: "pointer",
                                  padding: 0, fontFamily: SANS, textDecoration: "underline", textUnderlineOffset: 2,
                                }}>unlink</button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => createSubFlowFromBranch(col.id, val)} style={{
                                  border: `1px solid ${BORDER}`, background: CARD_BG, color: ACCENT, borderRadius: 7,
                                  fontSize: 10.5, fontWeight: 600, cursor: "pointer", padding: "3px 9px", fontFamily: SANS,
                                }}>+ Create sub-flow</button>
                                {flows.filter((f) => f.id !== activeFlowId).length > 0 && (
                                  <select defaultValue="" onChange={(e) => { if (e.target.value) linkBranchToFlow(col.id, e.target.value); }}
                                    style={{ fontFamily: SANS, fontSize: 10.5, color: MUTED, background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 7, padding: "3px 6px", cursor: "pointer" }}>
                                    <option value="">Link existing…</option>
                                    {flows.filter((f) => f.id !== activeFlowId).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                                  </select>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 11.5, color: MUTED, marginTop: 10 }}>
        Tip: flip the <span style={{ fontWeight: 600 }}>Descriptions</span> toggle to pin a column explaining each field. Use a cell's <span style={{ fontWeight: 600 }}>✚</span> to log a decision pinned to that cell — it lands in the decisions section below.
      </p>

      {/* ---------- Decisions section ---------- */}
      <div style={{ marginTop: 30 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
          <h2 style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 600, margin: 0, color: INK }}>Decisions</h2>
          <Pill tone="neutral">{decisions.length} logged</Pill>
          <span style={{ flex: 1 }} />
          {decisions.length > 0 && (
            <>
              <input value={decQuery} onChange={(e) => setDecQuery(e.target.value)} placeholder="Search decisions…"
                style={{ width: 200, fontFamily: SANS, fontSize: 13, color: INK, background: CARD_BG,
                  border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 11px", outline: "none" }} />
              <div style={{ position: "relative" }}>
                <button onClick={() => setFilterOpen((o) => !o)} title="Filters" style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 34,
                  borderRadius: 8, cursor: "pointer", background: filtersActive ? ACCENT_SOFT : CARD_BG,
                  border: `1px solid ${filtersActive ? ACCENT : BORDER}`, color: filtersActive ? ACCENT : MUTED, position: "relative",
                }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
                  {filtersActive && <span style={{ position: "absolute", top: 5, right: 6, width: 6, height: 6, borderRadius: "50%", background: ACCENT }} />}
                </button>
                {filterOpen && (
                  <>
                    <div style={{ position: "fixed", inset: 0, zIndex: 90 }} onClick={() => setFilterOpen(false)} />
                    <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 95, background: CARD_BG,
                      border: `1px solid ${BORDER}`, borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.14)", padding: 12, width: 220 }}>
                      <label style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: MUTED, fontFamily: SANS }}>Status</label>
                      <select value={decStatus} onChange={(e) => setDecStatus(e.target.value)} style={{ ...selectStyle, width: "100%", margin: "4px 0 12px" }}>
                        <option>All</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}
                      </select>
                      <label style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: MUTED, fontFamily: SANS }}>Workflow step</label>
                      <select value={decStep} onChange={(e) => setDecStep(e.target.value)} style={{ ...selectStyle, width: "100%", margin: "4px 0 12px" }}>
                        <option>All</option>{decSteps.map((s) => <option key={s}>{s}</option>)}
                      </select>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 11.5, color: MUTED }}>{decView.length} of {decisions.length}</span>
                        <button onClick={() => { setDecStatus("All"); setDecStep("All"); }} disabled={!filtersActive} style={{
                          fontFamily: SANS, fontSize: 11.5, fontWeight: 600, color: filtersActive ? ACCENT : MUTED,
                          background: "none", border: "none", cursor: filtersActive ? "pointer" : "default", padding: 0,
                        }}>Clear</button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
          <Menu label="Export ▾" disabled={decisions.length === 0} items={[
            { label: "Text (.txt)", onClick: () => requestExport("text") },
            { label: "Excel (.csv)", onClick: () => requestExport("excel") },
            { label: "JSON (.json)", onClick: () => requestExport("json") },
          ]} />
          <Btn onClick={() => setShowPreview(true)} disabled={pendingDecisions.length === 0}
            title={pendingDecisions.length === 0 ? "No AI pass-2 cells filled yet" : ""}>
            ✨ Decisions found{pendingDecisions.length > 0 ? ` (${pendingDecisions.length})` : ""}
          </Btn>
          {onAddToLog && (
            <Btn onClick={openAddToLog} disabled={decisions.length === 0}
              title={decisions.length === 0 ? "No decisions to add yet" : "Send these decisions to a decision log"}>
              Add to Decision Log
            </Btn>
          )}
          <Btn primary onClick={() => { newDecision({}); flash("Decision added"); }}>+ Add decision</Btn>
        </div>
        <p style={{ fontSize: 12.5, color: MUTED, margin: "0 0 14px", maxWidth: 640 }}>
          Notes captured here travel to the Decision Log. Decisions pinned from a grid cell carry a <span style={{ fontWeight: 600 }}>⊙</span> tag back to their cell; JSON exports leave <span style={{ fontFamily: "ui-monospace, monospace" }}>id</span> blank so the log assigns it on import.
        </p>

        {decisions.length === 0 ? (
          <div style={{
            border: `1.5px dashed ${BORDER}`, borderRadius: 14, padding: "26px 20px",
            textAlign: "center", color: MUTED, fontSize: 13,
          }}>
            No decisions yet. Use <span style={{ fontWeight: 600 }}>+ Add decision</span>, the <span style={{ fontWeight: 600 }}>✚</span> on any grid cell, or <span style={{ fontWeight: 600 }}>Decisions found</span> to pull in AI pass-2 calls.
          </div>
        ) : (
          <>
            {decView.length === 0 ? (
              <div style={{ border: `1.5px dashed ${BORDER}`, borderRadius: 14, padding: "22px 20px", textAlign: "center", color: MUTED, fontSize: 13 }}>
                No decisions match these filters.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[...decView].reverse().map((d) => (
                  <DecisionCard key={d.id} d={d}
                    highlight={highlightId === d.id}
                    statusStyle={STATUS_STYLE[d.status] || STATUS_STYLE["Proposed"]}
                    anchorRowLabel={anchorRowLabel(d)}
                    onJumpAnchor={() => jumpToAnchor(d.anchor)}
                    onChange={(nd) => setDecisions((p) => p.map((x) => (x.id === d.id ? nd : x)))}
                    onDelete={() => setDecisions((p) => p.filter((x) => x.id !== d.id))}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ---------- Decisions found modal ---------- */}
      {showPreview && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(43,42,39,0.45)", zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
        }} onClick={() => setShowPreview(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: CARD_BG, borderRadius: 16, padding: "22px 24px", maxWidth: 560,
            width: "100%", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
          }}>
            <h3 style={{ fontFamily: SERIF, fontSize: 21, fontWeight: 600, margin: "0 0 4px", color: ACCENT }}>
              Decisions found
            </h3>
            <p style={{ fontSize: 13, color: MUTED, margin: "0 0 14px" }}>
              {pendingDecisions.length} scoped call{pendingDecisions.length === 1 ? "" : "s"} found in the AI — pass 2 row. Add each one to the decision log below, where you can fill in status, owner, rationale, and the rest before exporting.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
              {pendingDecisions.map((d) => {
                const added = pass2Added(d.col.id);
                return (
                  <div key={d.col.id} style={{
                    border: `1px solid ${added ? ACCENT : BORDER}`, borderRadius: 10,
                    padding: "10px 12px", background: added ? "#F7FAF8" : "transparent",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <Pill tone="accent">{d.col.name}</Pill>
                      <span style={{ flex: 1 }} />
                      {added ? (
                        <Pill tone="outline">✓ In log</Pill>
                      ) : (
                        <Btn small primary onClick={() => addPass2ToLog(d)}>Add to log</Btn>
                      )}
                    </div>
                    <p style={{ fontSize: 12.5, margin: 0, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{d.text}</p>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Btn onClick={() => setShowPreview(false)}>Done</Btn>
              <Btn primary disabled={remainingPass2.length === 0} onClick={addAllPass2}>
                Add all ({remainingPass2.length})
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Add link modal ---------- */}
      {linkDraft && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(43,42,39,0.45)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={() => setLinkDraft(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: CARD_BG, borderRadius: 16, padding: "22px 24px", maxWidth: 460, width: "100%", boxShadow: "0 12px 40px rgba(0,0,0,0.25)" }}>
            <h3 style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 600, margin: "0 0 14px", color: ACCENT }}>Add link</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ ...labelStyle, marginBottom: 4 }}>Label</label>
                <input autoFocus value={linkDraft.label} placeholder="e.g. Figma, DevOps, Research"
                  onChange={(e) => setLinkDraft((d) => ({ ...d, label: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={{ ...labelStyle, marginBottom: 4 }}>URL</label>
                <input value={linkDraft.url} placeholder="https://…"
                  onChange={(e) => setLinkDraft((d) => ({ ...d, url: e.target.value }))} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 18 }}>
              <Btn onClick={() => setLinkDraft(null)}>Cancel</Btn>
              <Btn primary disabled={!(linkDraft.label.trim() || linkDraft.url.trim())}
                onClick={() => { setLinks((ls) => [...ls, { label: linkDraft.label.trim(), url: linkDraft.url.trim() }]); setLinkDraft(null); flash("Link added"); }}>
                Add link
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Add to Decision Log wizard ---------- */}
      {addToLog && addToLog.step === "create" && (
        <CreateLogModal
          existingCodes={existingLogCodes}
          initialWorkflowLink={typeof window !== "undefined" ? window.location.href : ""}
          onClose={() => (logsIndex.length ? setAddToLog((a) => ({ ...a, step: "select" })) : setAddToLog(null))}
          onCreate={(meta) => {
            const id = onCreateLog ? onCreateLog(meta) : null;
            setAddToLog((a) => ({ ...a, logId: id, step: "review" }));
          }}
        />
      )}
      {addToLog && addToLog.step !== "create" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(43,42,39,0.45)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={() => setAddToLog(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: CARD_BG, borderRadius: 16, padding: "22px 24px", maxWidth: 620, width: "100%", maxHeight: "82vh", overflowY: "auto", boxShadow: "0 12px 40px rgba(0,0,0,0.25)" }}>

            {addToLog.step === "select" && (
              <>
                <h3 style={{ fontFamily: SERIF, fontSize: 21, fontWeight: 600, margin: "0 0 4px", color: ACCENT }}>Add to Decision Log</h3>
                <p style={{ fontSize: 13, color: MUTED, margin: "0 0 14px" }}>
                  Choose where these {decisions.length} decision{decisions.length === 1 ? "" : "s"} should go — or create a new log.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
                  {logsIndex.map((l) => (
                    <label key={l.id} style={{
                      display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                      border: `1px solid ${addToLog.logId === l.id ? ACCENT : BORDER}`, borderRadius: 10,
                      padding: "11px 13px", background: addToLog.logId === l.id ? "#F7FAF8" : "transparent",
                    }}>
                      <input type="radio" name="dest-log" checked={addToLog.logId === l.id}
                        onChange={() => setAddToLog((a) => ({ ...a, logId: l.id }))} style={{ accentColor: ACCENT }} />
                      <span style={{ fontFamily: SANS, fontSize: 13.5, fontWeight: 600, color: INK }}>{l.title}</span>
                      <span style={{ marginLeft: "auto", fontFamily: "ui-monospace, monospace", fontSize: 11, color: MUTED }}>{l.code}</span>
                    </label>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <Btn onClick={() => setAddToLog(null)}>Cancel</Btn>
                  <Btn onClick={() => setAddToLog((a) => ({ ...a, step: "create" }))}>+ New log</Btn>
                  <Btn primary disabled={!addToLog.logId} onClick={() => setAddToLog((a) => ({ ...a, step: "review" }))}>Continue</Btn>
                </div>
              </>
            )}

            {addToLog.step === "review" && (() => {
              const acceptedCount = addToLog.items.filter((it) => it.action === "accept").length;
              const destTitle = logsIndex.find((l) => l.id === addToLog.logId)?.title || "the decision log";
              return (
                <>
                  <h3 style={{ fontFamily: SERIF, fontSize: 21, fontWeight: 600, margin: "0 0 4px", color: ACCENT }}>Review entries</h3>
                  <p style={{ fontSize: 13, color: MUTED, margin: "0 0 12px" }}>
                    Accept or reject each entry before it's added to “{destTitle}”.
                  </p>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
                    <Btn small onClick={() => setAllAddItems("accept")}>Accept all</Btn>
                    <Btn small onClick={() => setAllAddItems("reject")}>Reject all</Btn>
                    <span style={{ marginLeft: "auto", fontSize: 12, color: MUTED }}>{acceptedCount} of {addToLog.items.length} accepted</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
                    {addToLog.items.map((it, i) => {
                      const ss = STATUS_STYLE[it.d.status] || STATUS_STYLE["Proposed"];
                      const rejected = it.action === "reject";
                      return (
                        <div key={it.d.id} style={{
                          border: `1px solid ${rejected ? BORDER : ACCENT}`, borderRadius: 10, padding: "10px 12px",
                          background: rejected ? "transparent" : "#F7FAF8", opacity: rejected ? 0.55 : 1,
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                            {it.d.workflowStep ? <Pill tone="accent">{it.d.workflowStep}</Pill> : null}
                            <Pill bg={ss.bg} fg={ss.fg}>{it.d.status || "Proposed"}</Pill>
                            <span style={{ flex: 1 }} />
                            <Btn small primary={!rejected} onClick={() => setAddItemAction(i, "accept")}>Accept</Btn>
                            <Btn small onClick={() => setAddItemAction(i, "reject")}>Reject</Btn>
                          </div>
                          <p style={{ fontSize: 12.5, margin: 0, lineHeight: 1.45, whiteSpace: "pre-wrap", fontFamily: SANS, color: INK }}>
                            {(it.d.decision || "Untitled decision").slice(0, 300)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <Btn onClick={() => setAddToLog(null)}>Cancel</Btn>
                    <Btn primary disabled={acceptedCount === 0} onClick={confirmAddToLog}>
                      Add {acceptedCount} to log
                    </Btn>
                  </div>
                </>
              );
            })()}

            {addToLog.step === "done" && (
              <>
                <h3 style={{ fontFamily: SERIF, fontSize: 21, fontWeight: 600, margin: "0 0 4px", color: ACCENT }}>
                  ✓ Added to the log
                </h3>
                <p style={{ fontSize: 13, color: MUTED, margin: "0 0 16px" }}>
                  {addToLog.added.length} decision{addToLog.added.length === 1 ? "" : "s"} now live in
                  “{logsIndex.find((l) => l.id === addToLog.logId)?.title || "the decision log"}”
                  ({addToLog.added[0]?.id}{addToLog.added.length > 1 ? ` – ${addToLog.added[addToLog.added.length - 1].id}` : ""}).
                  You can optionally have AI draft any missing fields before you review them in the log.
                </p>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                  <Btn onClick={() => setAddToLog(null)}>Done</Btn>
                  <Btn onClick={openLogFill}>✨ Populate missing fields</Btn>
                  {onOpenLog && <Btn primary onClick={() => onOpenLog(addToLog.logId)}>View log</Btn>}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ---------- Post-add populate review ---------- */}
      {logFill && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(43,42,39,0.45)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={() => setLogFill(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: CARD_BG, borderRadius: 16, padding: "22px 24px", maxWidth: 620, width: "100%", maxHeight: "82vh", overflowY: "auto", boxShadow: "0 12px 40px rgba(0,0,0,0.25)" }}>
            <h3 style={{ fontFamily: SERIF, fontSize: 21, fontWeight: 600, margin: "0 0 4px", color: ACCENT }}>✨ Populate missing fields</h3>
            <p style={{ fontSize: 13, color: MUTED, margin: "0 0 14px" }}>
              {logFill.items.length} field{logFill.items.length === 1 ? "" : "s"} are empty on the entries you just added. Approve, deny, or skip each draft — only approved drafts are written to the log.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
              {logFill.items.map((it, i) => (
                <div key={i} style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>
                    <span style={{ fontFamily: "ui-monospace, monospace" }}>{it.id}</span> · <span style={{ fontWeight: 700 }}>{it.label}</span> · {(it.decision || "decision").slice(0, 56)}
                  </div>
                  <p style={{ fontSize: 12.5, margin: "0 0 8px", lineHeight: 1.45, fontStyle: "italic", color: INK }}>“{it.suggestion}”</p>
                  <div style={{ display: "flex", gap: 6 }}>
                    {["approve", "deny", "skip"].map((a) => (
                      <button key={a} onClick={() => setLogFillAction(i, a)} style={{
                        fontFamily: SANS, fontSize: 11.5, fontWeight: 600, textTransform: "capitalize",
                        padding: "5px 11px", borderRadius: 7, cursor: "pointer",
                        border: `1px solid ${it.action === a ? ACCENT : BORDER}`,
                        background: it.action === a ? ACCENT_SOFT : CARD_BG,
                        color: it.action === a ? ACCENT : MUTED,
                      }}>{a}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Btn onClick={() => setLogFill(null)}>Cancel</Btn>
              <Btn primary onClick={applyLogFill}>
                Apply ({logFill.items.filter((it) => it.action === "approve").length} approved)
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* ---------- AI fill-in review (pre-export) ---------- */}
      {aiReview && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(43,42,39,0.45)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={() => setAiReview(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: CARD_BG, borderRadius: 16, padding: "22px 24px", maxWidth: 620, width: "100%", maxHeight: "82vh", overflowY: "auto", boxShadow: "0 12px 40px rgba(0,0,0,0.25)" }}>
            <h3 style={{ fontFamily: SERIF, fontSize: 21, fontWeight: 600, margin: "0 0 4px", color: ACCENT }}>✨ Populate missing fields before export?</h3>
            <p style={{ fontSize: 13, color: MUTED, margin: "0 0 14px" }}>
              {aiReview.items.length} field{aiReview.items.length === 1 ? "" : "s"} are empty. Review each AI-suggested draft and Approve, Deny, or Skip — only approved drafts are written before exporting.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
              {aiReview.items.map((it, i) => {
                const dec = decisions.find((x) => x.id === it.decId);
                return (
                  <div key={i} style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 12px" }}>
                    <div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700 }}>{it.label}</span> · {(dec?.decision || "decision").slice(0, 60)}
                    </div>
                    <p style={{ fontSize: 12.5, margin: "0 0 8px", lineHeight: 1.45, fontStyle: "italic", color: INK }}>“{it.suggestion}”</p>
                    <div style={{ display: "flex", gap: 6 }}>
                      {["approve", "deny", "skip"].map((a) => (
                        <button key={a} onClick={() => setReviewAction(i, a)} style={{
                          fontFamily: SANS, fontSize: 11.5, fontWeight: 600, textTransform: "capitalize",
                          padding: "5px 11px", borderRadius: 7, cursor: "pointer",
                          border: `1px solid ${it.action === a ? ACCENT : BORDER}`,
                          background: it.action === a ? ACCENT_SOFT : CARD_BG,
                          color: it.action === a ? ACCENT : MUTED,
                        }}>{a}</button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Btn onClick={() => setAiReview(null)}>Cancel</Btn>
              <Btn primary onClick={confirmAiReview}>
                Export ({aiReview.items.filter((it) => it.action === "approve").length} approved)
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Toast ---------- */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: ACCENT, color: "#FDFCFA", padding: "10px 18px", borderRadius: 999,
          fontSize: 13, fontWeight: 600, fontFamily: SANS, zIndex: 200,
        }}>{toast}</div>
      )}
    </div>
  );
}
