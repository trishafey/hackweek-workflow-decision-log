import { useState, useRef, useEffect, useCallback } from "react";
import CreateLogModal from "./CreateLogModal";
import { FILLABLE_LOG, suggestLogField } from "./DecisionLogApp";
import WorkflowDiagram from "./WorkflowDiagram";
import * as XLSX from "xlsx";

// A 16x16 chevron used for every collapse/expand toggle. Base points down;
// pass `rotate` (degrees) to point it elsewhere for the closed/open state.
function Chevron({ size = 16, rotate = 0 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      style={{ transform: rotate ? `rotate(${rotate}deg)` : "none", transition: "transform .15s", display: "block" }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// Info icon with a tooltip that shows on hover AND tap/click. The bubble is
// positioned with fixed coordinates so it is never clipped by the scrolling
// grid container.
function InfoDot({ text }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState(null);
  const ref = useRef(null);
  if (!text) return null;
  const place = () => {
    const r = ref.current && ref.current.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 6, left: Math.min(r.left + r.width / 2, window.innerWidth - 12) });
  };
  return (
    <>
      <span
        ref={ref}
        role="button"
        tabIndex={0}
        aria-label={text}
        onMouseEnter={() => { place(); setShow(true); }}
        onMouseLeave={() => setShow(false)}
        onFocus={() => { place(); setShow(true); }}
        onBlur={() => setShow(false)}
        onClick={(e) => { e.stopPropagation(); place(); setShow((s) => !s); }}
        style={{
          flex: "0 0 auto", display: "inline-flex", alignItems: "center", justifyContent: "center",
          color: show ? ACCENT : "#B6B1A8", cursor: "help", lineHeight: 0, transition: "color .12s",
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: "block" }}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      </span>
      {show && pos && (
        <span style={{
          position: "fixed", top: pos.top, left: pos.left, transform: "translateX(-50%)",
          zIndex: 200, maxWidth: 248, background: "#1C1B19", color: "#fff",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
          fontSize: 11.5, lineHeight: 1.5, fontWeight: 400, padding: "9px 12px", borderRadius: 9,
          boxShadow: "0 12px 28px -10px rgba(0,0,0,0.45)", pointerEvents: "none",
        }}>{text}</span>
      )}
    </>
  );
}

// Expand / exit full-screen icon (lucide maximize / minimize).
function Maximize({ size = 16, exit = false }) {
  return exit ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: "block" }}>
      <polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" />
      <line x1="14" y1="10" x2="21" y2="3" /><line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: "block" }}>
      <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}

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
  { key: "date", label: "Date", type: "date", tip: "When the capture session happened — anchors the artifact in time." },
  { key: "product", label: "Product / feature", suggest: "product", tip: "The product or feature this workflow belongs to." },
  { key: "workflow", label: "Workflow", tip: "The name of the workflow being captured — what everything else hangs off." },
  { key: "deadline", label: "Deadline / timespan", tip: "When this needs to feed into design, and/or how long the real-world process takes end to end." },
  { key: "smes", label: "SME(s)", tip: "Subject-matter experts being interviewed — 1–2 power users who are the source of truth." },
  { key: "anchors", label: "System anchors", multi: true, suggest: "anchors", tip: "People familiar with the backend/tech systems (architect, DPM, dev) who surface what's technically possible." },
  { key: "facilitator", label: "Facilitator", multi: true, suggest: "people", tip: "Guides the conversation — asks the elicitation questions and decides when to dig vs. move on (DPM or UX)." },
  { key: "scribe", label: "Scribe / decision-log owner", multi: true, suggest: "people", tip: "Writes the notes, fills in the workflow, and owns/maintains the decision log." },
  { key: "collaborators", label: "Other collaborators", multi: true, suggest: "people", tip: "Other team members who contributed to the workflow." },
  { key: "logLink", label: "Decision log link", tip: "A direct link to where this workflow's decision log lives." },
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
    // Which flow this decision was captured in — lets the decision-log link
    // deep-link back to the right sub-flow.
    workflowFlowId: d.anchor?.flowId || "main",
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
        display: "block", width: "100%", border: "none", outline: "none", resize: "none",
        background: "transparent", fontFamily: SANS,
        fontSize: small ? 12.5 : 13, lineHeight: 1.45, color: INK, padding: 0,
        minHeight: 18, overflow: "hidden", boxSizing: "border-box", verticalAlign: "top",
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

// Multi-value field with a remembered-suggestions dropdown. Stores the value as
// a comma-joined string so persistence/export stay string-based.
function TagInput({ value, onChange, suggestions = [], placeholder }) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const tokens = (value || "").split(",").map((s) => s.trim()).filter(Boolean);
  const has = (t) => tokens.some((x) => x.toLowerCase() === t.toLowerCase());
  const commit = (next) => onChange(next.join(", "));
  const add = (t) => { const v = (t || "").trim(); if (v && !has(v)) commit([...tokens, v]); setText(""); };
  const remove = (t) => commit(tokens.filter((x) => x !== t));
  const filtered = suggestions
    .filter((s) => !has(s) && s.toLowerCase().includes(text.trim().toLowerCase()))
    .slice(0, 8);
  return (
    <div style={{ position: "relative" }}>
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center",
        border: `1px solid ${BORDER}`, borderRadius: 8, background: "#fff", padding: "5px 7px", minHeight: 36,
      }}>
        {tokens.map((t) => (
          <span key={t} style={{
            display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 600,
            color: ACCENT, background: ACCENT_SOFT, borderRadius: 999, padding: "2px 4px 2px 9px", fontFamily: SANS,
          }}>{t}
            <button onClick={() => remove(t)} title="Remove" style={{ border: "none", background: "none", color: ACCENT, cursor: "pointer", fontSize: 12, lineHeight: 1, padding: "0 3px" }}>×</button>
          </span>
        ))}
        <input
          value={text}
          placeholder={tokens.length ? "" : placeholder}
          onChange={(e) => { setText(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 130)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); add(text); }
            else if (e.key === "Backspace" && !text && tokens.length) remove(tokens[tokens.length - 1]);
          }}
          style={{ flex: 1, minWidth: 90, border: "none", outline: "none", background: "transparent", fontFamily: SANS, fontSize: 13, color: INK, padding: "2px 0" }}
        />
      </div>
      {open && (filtered.length > 0 || text.trim()) && (
        <div style={{
          position: "absolute", left: 0, right: 0, top: "calc(100% + 4px)", zIndex: 120, maxHeight: 200, overflowY: "auto",
          background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 4, boxShadow: "0 10px 26px -10px rgba(0,0,0,0.25)",
        }}>
          {filtered.map((s) => (
            <button key={s} onMouseDown={(e) => { e.preventDefault(); add(s); }} style={{
              display: "block", width: "100%", textAlign: "left", border: "none", background: "transparent",
              borderRadius: 6, padding: "7px 9px", cursor: "pointer", fontFamily: SANS, fontSize: 12.5, color: INK,
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = ACCENT_SOFT; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>{s}</button>
          ))}
          {text.trim() && !suggestions.some((s) => s.toLowerCase() === text.trim().toLowerCase()) && (
            <button onMouseDown={(e) => { e.preventDefault(); add(text); }} style={{
              display: "block", width: "100%", textAlign: "left", border: "none", background: "transparent",
              borderRadius: 6, padding: "7px 9px", cursor: "pointer", fontFamily: SANS, fontSize: 12.5, fontWeight: 600, color: ACCENT,
            }}>+ Add “{text.trim()}”</button>
          )}
        </div>
      )}
    </div>
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
            {items.filter(Boolean).map((it, i) => (
              it.divider ? (
                <div key={i} style={{ borderTop: `1px solid ${BORDER}`, margin: "4px 0" }} />
              ) : (
                <button key={i} style={itemStyle} disabled={it.disabled} onClick={() => { setOpen(false); it.onClick(); }}
                  onMouseEnter={(e) => { if (!it.disabled) e.currentTarget.style.background = ACCENT_SOFT; }}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  {it.label}
                </button>
              )
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
function DecisionCard({ d, onChange, onDelete, statusStyle, anchorRowLabel, flowLabel, onJumpAnchor, highlight, mode = "row", onOpen }) {
  const set = (k, v) => onChange({ ...d, [k]: v });
  const ss = statusStyle || STATUS_STYLE[d.status] || STATUS_STYLE["Proposed"];
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

  // Row mode: a collapsed summary in the list; clicking opens the editing drawer.
  if (mode === "row") {
    return (
      <div id={`dec-${d.id}`} onClick={onOpen} style={{
        background: CARD_BG, border: `1px solid ${highlight ? ACCENT : BORDER}`,
        boxShadow: highlight ? `0 0 0 3px ${ACCENT_SOFT}` : "0 1px 3px rgba(0,0,0,0.04)",
        borderRadius: 14, padding: "12px 14px", transition: "all .3s", cursor: "pointer",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {flowLabel ? <Pill tone="neutral">⑂ {flowLabel}</Pill> : null}
          {d.workflowStep ? <Pill tone="accent">{d.workflowStep}</Pill> : null}
          {anchorRowLabel ? (
            <Pill tone="outline" onClick={(e) => { e.stopPropagation(); onJumpAnchor && onJumpAnchor(); }}>⊙ {anchorRowLabel}</Pill>
          ) : null}
          <Pill bg={ss.bg} fg={ss.fg}>{d.status || "Proposed"}</Pill>
          <span style={{ flex: 1, minWidth: 80, fontSize: 12.5, color: MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {d.decision || "Untitled decision"}
          </span>
          <span style={{ color: MUTED, fontSize: 11.5, fontWeight: 600, fontFamily: SANS }}>Edit ›</span>
        </div>
      </div>
    );
  }

  // Form mode: the full editing surface, rendered inside the drawer.
  return (
      <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px 14px", marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>Date</label>
          <input className="wf-date" type="date" value={d.date || ""} style={inputStyle}
            onClick={(e) => { try { e.currentTarget.showPicker && e.currentTarget.showPicker(); } catch { /* unsupported */ } }}
            onChange={(e) => set("date", e.target.value)} />
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
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
        <button onClick={() => { if (window.confirm("Delete this decision? This can't be undone.")) onDelete(); }}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: SANS, fontSize: 12, fontWeight: 600,
            color: "#9C3D2E", background: "#fff", border: "1px solid #E7C9C3", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          Delete
        </button>
      </div>
      </div>
  );
}

// ---------- Main app ----------
// A grid step can branch into multiple sub-flows. We store subflows[colId] as a
// list of target flow ids, but tolerate the older single-id shape on read.
const subIdList = (subflowsObj, colId) => {
  const v = subflowsObj && subflowsObj[colId];
  return Array.isArray(v) ? v.filter(Boolean) : (v ? [v] : []);
};

export default function WorkflowCapture({
  initial, focusStep, focusFlowId, onWorkflowsHome, projectLinks = [],
  logsIndex = [], existingLogCodes = [], onCreateLog, onAddToLog, onUpdateLogEntries, onReplaceLogEntries, onOpenLog, logEntriesById = {}, onContentChange, startInfoEditing = false,
  workflowsIndex = [], onOpenWorkflow, fieldSuggestions = {}, relatedIds = [], onRelatedChange, linkedLogLinks = [],
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
  // Seed the id counter past any existing flow ids so reloaded data never
  // collides with freshly created sub-flows (which caused duplicate tabs).
  const flowSeqRef = useRef(
    ((init.flows && init.flows.length) ? init.flows : []).reduce((m, f) => {
      const n = parseInt(String(f.id).replace(/\D/g, ""), 10);
      return Number.isFinite(n) ? Math.max(m, n + 1) : m;
    }, 1)
  );
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
  const colNameOf = (flowId, colId) => flowColumns(flowId).find((c) => c.id === colId)?.name || "";
  // All (flow,column) branch points that link to a given flow.
  const parentsOf = (flowId) => {
    const out = [];
    flows.forEach((f) => Object.entries(f.subflows || {}).forEach(([colId, t]) => {
      if (subIdList({ [colId]: t }, colId).includes(flowId)) out.push({ flowId: f.id, colId });
    }));
    return out;
  };
  // Walk up first-parents to build a breadcrumb chain main → … → current.
  const lineage = (flowId) => {
    const chain = [{ flowId }];
    const seen = new Set([flowId]);
    let cur = flowId;
    while (true) {
      const p = parentsOf(cur)[0];
      if (!p || seen.has(p.flowId)) break;
      seen.add(p.flowId);
      chain.unshift({ flowId: p.flowId, viaColId: p.colId });
      cur = p.flowId;
    }
    return chain;
  };

  // ----- Sub-flow (branch) management -----
  const newFlowId = () => "flow-" + (flowSeqRef.current++);
  const createSubFlowFromBranch = (colId, text) => {
    const sourceId = activeFlowId;
    const nm = ((text || "").split("\n")[0].trim().slice(0, 32)) || ("Branch " + flows.length);
    const id = newFlowId();
    // First column ("Previous step") inherits ALL row values from the step the
    // branch came from, so the sub-flow opens with that context pre-filled.
    const fromCells = { ...(activeFlow.cells[colId] || {}) };
    setFlows((fs) =>
      fs.map((f) => (f.id === sourceId ? { ...f, subflows: { ...f.subflows, [colId]: [...subIdList(f.subflows, colId), id] } } : f))
        .concat([{
          id, name: nm,
          columns: [{ id: "c0", name: "Previous step" }, { id: "c1", name: "Step 1" }],
          cells: { c0: fromCells },
          subflows: {}, nextId: 2,
        }]));
    setActiveFlowId(id);
    flash(`Created sub-flow "${nm}"`);
  };
  const linkBranchToFlow = (colId, targetId) =>
    updateFlow(activeFlowId, (f) => {
      const cur = subIdList(f.subflows, colId);
      if (cur.includes(targetId)) return {};
      return { subflows: { ...f.subflows, [colId]: [...cur, targetId] } };
    });
  const unlinkBranch = (colId, targetId) =>
    updateFlow(activeFlowId, (f) => {
      const cur = subIdList(f.subflows, colId).filter((t) => t !== targetId);
      const n = { ...f.subflows };
      if (cur.length) n[colId] = cur; else delete n[colId];
      return { subflows: n };
    });
  const renameFlow = (id, name) => updateFlow(id, { name });
  const deleteFlow = (id) => {
    if (id === "main") return;
    setFlows((fs) => fs
      .filter((f) => f.id !== id)
      .map((f) => {
        const sf = { ...f.subflows };
        for (const k of Object.keys(sf)) {
          const cur = subIdList(sf, k).filter((t) => t !== id);
          if (cur.length) sf[k] = cur; else delete sf[k];
        }
        return { ...f, subflows: sf };
      }));
    setActiveFlowId((cur) => (cur === id ? "main" : cur));
  };

  const [decisions, setDecisions] = useState(init.decisions);
  const decIdRef = useRef(
    (init.decisions || []).reduce((m, x) => Math.max(m, (parseInt(String(x.id).replace(/\D/g, ""), 10) || 0) + 1), 1));
  const [showPreview, setShowPreview] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(startInfoEditing);
  const [usersModalOpen, setUsersModalOpen] = useState(false);
  const [view, setView] = useState("grid"); // "grid" | "diagram"
  const [fullscreen, setFullscreen] = useState(false); // expand grid/diagram to fill the screen
  // On phones we drop the sticky first column so the table can scroll fully.
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 700px)").matches);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 700px)");
    const on = () => setIsMobile(mq.matches);
    mq.addEventListener ? mq.addEventListener("change", on) : mq.addListener(on);
    return () => { mq.removeEventListener ? mq.removeEventListener("change", on) : mq.removeListener(on); };
  }, []);
  const [relatedPicker, setRelatedPicker] = useState(false); // dropdown to link a related workflow
  const [toast, setToast] = useState(null);
  const [highlightId, setHighlightId] = useState(null);
  const [decDrawerId, setDecDrawerId] = useState(null); // decision open in the editing drawer
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
  // Related workflows live on the workflow record (App manages reciprocity), so
  // we seed from the prop and report changes up rather than into content.
  const [related, setRelated] = useState(() => ((relatedIds && relatedIds.length) ? relatedIds : (init.related || [])).filter(Boolean));
  const setRelatedAnd = (updater) => setRelated((r) => { const n = (typeof updater === "function" ? updater(r) : updater).filter(Boolean); if (onRelatedChange) onRelatedChange(n); return n; });
  const [users, setUsers] = useState(() => (init.users || [])); // [{id,type,group,role,description}]
  const fileRef = useRef(null);
  const xlsxRef = useRef(null);

  // Report content up (debounced) so the App can persist it to the database.
  useEffect(() => {
    if (!onContentChange) return;
    const t = setTimeout(() => onContentChange({ info, flows, decisions, links, users }), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info, flows, decisions, links, users]);

  // ----- Decision log linking (workflow info) -----
  const [logMenuOpen, setLogMenuOpen] = useState(false);
  const [creatingLogLink, setCreatingLogLink] = useState(false);
  const linkedLogId = (() => { const m = /#\/log\/([^?\s]+)/.exec(info.logLink || ""); return m ? decodeURIComponent(m[1]) : null; })();
  const linkedLog = linkedLogId ? logsIndex.find((l) => l.id === linkedLogId) : null;
  const linkDecisionLog = (id) => { setInfo((p) => ({ ...p, logLink: `#/log/${encodeURIComponent(id)}` })); setLogMenuOpen(false); flash("Decision log linked"); };
  const openLinkedLog = () => {
    if (linkedLogId && onOpenLog) { onOpenLog(linkedLogId); return; }
    if (info.logLink) window.open(info.logLink, "_blank", "noopener,noreferrer");
  };

  // ----- Related workflows (same product/goal, different team or variant) -----
  const relatedList = related.map((id) => workflowsIndex.find((w) => w.id === id)).filter(Boolean);
  const linkableWorkflows = workflowsIndex.filter((w) => !related.includes(w.id));
  const addRelated = (id) => { setRelatedAnd((r) => (r.includes(id) ? r : [...r, id])); setRelatedPicker(false); flash("Related workflow linked"); };
  const removeRelated = (id) => setRelatedAnd((r) => r.filter((x) => x !== id));
  const openRelated = (id) => { if (onOpenWorkflow) onOpenWorkflow(id); };

  // ----- Users (typical roles in this workflow) -----
  const userIdRef = useRef((init.users || []).reduce((m, x) => Math.max(m, parseInt(String(x.id).replace(/\D/g, ""), 10) || 0), 0) + 1);
  const addUser = () => setUsers((u) => [...u, { id: "u-" + (userIdRef.current++), type: "internal", group: "", role: "", description: "" }]);
  const updateUser = (id, patch) => setUsers((u) => u.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const removeUser = (id) => setUsers((u) => u.filter((x) => x.id !== id));
  const userGroupMeta = (type) =>
    type === "internal" ? { label: "Business area", suggest: "areas", ph: "e.g. Scheduling & Assignment" }
    : type === "partner" ? { label: "Partner", suggest: "partners", ph: "Partner name" }
    : type === "client" ? { label: "Client", suggest: null, ph: "Client name (optional)" }
    : { label: "System", suggest: null, ph: "System name" };

  useEffect(() => {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400..700;1,6..72,400..600&display=swap";
    document.head.appendChild(l);
    return () => { document.head.removeChild(l); };
  }, []);

  // Scroll to + highlight the step linked from the decision log — switching to the
  // right sub-flow first when the decision came from one.
  useEffect(() => {
    if (!focusStep && !focusFlowId) return;
    const fid = focusFlowId && flows.some((f) => f.id === focusFlowId) ? focusFlowId : activeFlowId;
    if (fid !== activeFlowId) setActiveFlowId(fid);
    const col = flowColumns(fid).find((c) => c.name === focusStep);
    if (!col) return;
    setFocusCol(col.id);
    const delay = fid !== activeFlowId ? 100 : 0;
    const s = setTimeout(() => { document.getElementById("wfcol-" + col.id)?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" }); }, delay);
    const t = setTimeout(() => setFocusCol(null), 2600);
    return () => { clearTimeout(s); clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusStep, focusFlowId]);

  // Jump from the tree diagram to a specific step: open the grid on the right
  // flow, then scroll to + highlight the column.
  const goToStep = (flowId, colId) => {
    setView("grid");
    const switching = flowId && flows.some((f) => f.id === flowId) && flowId !== activeFlowId;
    if (switching) setActiveFlowId(flowId);
    setFocusCol(colId);
    setTimeout(() => { document.getElementById("wfcol-" + colId)?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" }); }, switching ? 140 : 40);
    setTimeout(() => setFocusCol(null), 2600);
  };

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
    if (opts.drawer) setDecDrawerId(id);
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
    }, { drawer: true });
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
  // The sub-flow a decision belongs to (null for the main flow).
  const anchorFlowLabel = (d) => {
    const fid = d.anchor?.flowId || "main";
    if (fid === "main") return null;
    return flowName(fid) || "Sub-flow";
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

  // Move to the review step, flagging decisions already present in the target log.
  const enterReview = (logId) => {
    const existing = logEntriesById[logId] || [];
    const norm = (s) => (s || "").trim().toLowerCase();
    setAddToLog((a) => ({
      ...a, logId, step: "review",
      items: a.items.map((it) => {
        const dn = norm(it.d.decision);
        const match = dn ? existing.find((e) => norm(e.decision) === dn) : null;
        return { ...it, dupId: match ? match.id : null, action: match ? "skip" : "accept" };
      }),
    }));
  };

  const setAddItemAction = (idx, action) =>
    setAddToLog((a) => ({ ...a, items: a.items.map((it, i) => (i === idx ? { ...it, action } : it)) }));
  const setAllAddItems = (action) =>
    setAddToLog((a) => ({ ...a, items: a.items.map((it) => ({ ...it, action })) }));
  const setDupeAction = (action) =>
    setAddToLog((a) => ({ ...a, items: a.items.map((it) => (it.dupId ? { ...it, action } : it)) }));

  const confirmAddToLog = () => {
    const logId = addToLog.logId;
    const accepted = addToLog.items.filter((it) => it.action === "accept").map((it) => toLogEntry(it.d));
    const replacements = addToLog.items.filter((it) => it.action === "replace" && it.dupId).map((it) => ({ id: it.dupId, entry: toLogEntry(it.d) }));
    const ids = (accepted.length && onAddToLog) ? onAddToLog(logId, accepted) : [];
    if (replacements.length && onReplaceLogEntries) onReplaceLogEntries(logId, replacements);
    const added = accepted.map((e, i) => ({ ...e, id: ids[i] || "" })).concat(replacements.map((r) => ({ ...r.entry, id: r.id })));
    setAddToLog((a) => ({ ...a, step: "done", added }));
    const n = accepted.length + replacements.length;
    flash(`${n} decision${n === 1 ? "" : "s"} ${replacements.length ? "added/updated" : "added"} to the log`);
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
      JSON.stringify({ kind: "workflow-capture", version: 3, info, flows, decisions, users }, null, 2)
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
        setUsers(d.users || []);
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
    // Workflow info table.
    const infoLines = [["Workflow info", ""].map(csvEscape).join(",")]
      .concat(INFO_FIELDS.map((f) => [f.label, info[f.key] || ""].map(csvEscape).join(",")));
    // One capture grid per flow.
    const gridLines = flows.flatMap((f) => {
      const header = ["Field", ...f.columns.map((c) => c.name)].map(csvEscape).join(",");
      const rows = ROWS.map((row) => [row.label, ...f.columns.map((c) => f.cells[c.id]?.[row.key] || "")].map(csvEscape).join(","));
      return ["", [`Capture grid — ${f.name}`].map(csvEscape).join(","), header, ...rows];
    });
    download(`workflow-${slug(info.workflow)}.csv`, [...infoLines, ...gridLines].join("\n"), "text/csv");
    flash("Grid CSV exported (info + flows)");
  };

  // ----- Excel (.xlsx) export / import -----
  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const infoAoa = [["Field", "Value"], ...INFO_FIELDS.map((f) => [f.label, info[f.key] || ""])];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(infoAoa), "Info");
    const usersAoa = [["Type", "Business area / partner", "Role", "What they typically do"],
      ...users.map((u) => [u.type || "", u.group || "", u.role || "", u.description || ""])];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(usersAoa), "Users");
    const used = new Set(["Info", "Users"]);
    flows.forEach((f) => {
      const base = (f.name || "Flow").slice(0, 28).replace(/[\\/?*[\]:]/g, " ");
      let nm = base || "Flow", i = 2;
      while (used.has(nm)) nm = `${base} ${i++}`.slice(0, 31);
      used.add(nm);
      const aoa = [["Field", ...f.columns.map((c) => c.name)],
        ...ROWS.map((row) => [row.label, ...f.columns.map((c) => f.cells[c.id]?.[row.key] || "")])];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), nm);
    });
    XLSX.writeFile(wb, `workflow-${slug(info.workflow)}.xlsx`);
    flash("Workflow exported to Excel");
  };

  const importExcel = (file) => {
    const r = new FileReader();
    r.onload = () => {
      try {
        const wb = XLSX.read(r.result, { type: "array" });
        const labelToKey = Object.fromEntries(INFO_FIELDS.map((f) => [f.label.toLowerCase(), f.key]));
        const rowLabelToKey = Object.fromEntries(ROWS.map((rw) => [rw.label.toLowerCase(), rw.key]));
        const newInfo = { ...info }; const newUsers = []; const newFlows = [];
        wb.SheetNames.forEach((sn) => {
          const aoa = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, blankrows: false });
          if (sn === "Info") {
            aoa.slice(1).forEach((row) => { const k = labelToKey[String(row[0] || "").toLowerCase()]; if (k) newInfo[k] = row[1] != null ? String(row[1]) : ""; });
          } else if (sn === "Users") {
            aoa.slice(1).forEach((row, i) => { if (row[0] || row[1] || row[2] || row[3]) newUsers.push({ id: "u-imp-" + i, type: String(row[0] || "internal").toLowerCase(), group: String(row[1] || ""), role: String(row[2] || ""), description: String(row[3] || "") }); });
          } else {
            const header = aoa[0] || [];
            const cols = header.slice(1).map((nm, ci) => ({ id: "c" + ci, name: String(nm || ("Step " + (ci + 1))) }));
            if (!cols.length) return;
            const cells = {};
            aoa.slice(1).forEach((row) => {
              const rk = rowLabelToKey[String(row[0] || "").toLowerCase()]; if (!rk) return;
              cols.forEach((c, ci) => { const v = row[ci + 1]; if (v != null && String(v) !== "") cells[c.id] = { ...(cells[c.id] || {}), [rk]: String(v) }; });
            });
            const isMain = newFlows.length === 0;
            newFlows.push({ id: isMain ? "main" : "flow-imp-" + newFlows.length, name: isMain ? "Main flow" : sn, columns: cols, cells, subflows: {}, nextId: cols.length });
          }
        });
        if (!newFlows.length) throw new Error("no grid");
        setInfo(newInfo);
        setUsers(newUsers);
        setFlows(newFlows);
        setActiveFlowId(newFlows[0].id);
        flash("Workflow imported from Excel");
      } catch {
        flash("Couldn't read that Excel file.");
      }
    };
    r.readAsArrayBuffer(file);
  };

  const labelStyle = {
    fontSize: 10.5, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
    color: MUTED, fontFamily: SANS, marginBottom: 3, display: "block",
  };
  const inputStyle = {
    width: "100%", minWidth: 0, maxWidth: "100%", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "7px 9px",
    fontSize: 13, fontFamily: SANS, color: INK, background: "#FDFCFA", outline: "none", boxSizing: "border-box",
  };

  const selectStyle = {
    fontFamily: SANS, fontSize: 13, color: INK, background: CARD_BG,
    border: `1px solid ${BORDER}`, borderRadius: 9, padding: "8px 10px", outline: "none", cursor: "pointer",
  };

  const crumbLink = {
    background: "none", border: "none", padding: 0, font: "inherit", fontFamily: SANS,
    fontSize: 12.5, color: ACCENT, cursor: "pointer", fontWeight: 600,
  };

  const fmtDate = (s) => {
    if (!s) return "";
    const d = new Date(s + "T00:00:00");
    return isNaN(d.getTime()) ? s : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };
  const staticVal = { fontFamily: SANS, fontSize: 13, color: INK, padding: "7px 0", minHeight: 20, lineHeight: 1.4, wordBreak: "break-word" };

  return (
    <div style={{ minHeight: "100vh", background: BASE_BG, color: INK, padding: "28px 28px 60px", fontFamily: SANS }}>
      <style>{`
        input.wf-date{ -webkit-appearance:none; -moz-appearance:none; appearance:none; width:100%; min-width:0; box-sizing:border-box; }
        input.wf-date::-webkit-date-and-time-value{ text-align:left; margin:0; }
        input.wf-date::-webkit-calendar-picker-indicator{ margin-left:auto; opacity:.55; cursor:pointer; }
      `}</style>
      {/* ---------- Page header ---------- */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 14, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 34, lineHeight: 1.1, margin: 0, color: ACCENT, letterSpacing: "-0.01em" }}>
            Workflow: {info.workflow || "Untitled workflow"}
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: 13.5, color: MUTED }}>
            Capture the steps, the people, the exceptions — and where AI could fit — while the nuance is still in the room.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn onClick={() => setInfoModalOpen(true)}>Workflow info</Btn>
          <Menu label="Import / Export ▾" items={[
            { label: "Export Excel", onClick: exportExcel },
            { label: "Import Excel", onClick: () => xlsxRef.current?.click() },
            { divider: true },
            { label: "Export JSON", onClick: exportWorkflow },
            { label: "Import JSON", onClick: () => fileRef.current?.click() },
            { label: "Grid CSV", onClick: exportCSV },
          ]} />
          <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: "none" }}
            onChange={(e) => { if (e.target.files?.[0]) importWorkflow(e.target.files[0]); e.target.value = ""; }} />
          <input ref={xlsxRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }}
            onChange={(e) => { if (e.target.files?.[0]) importExcel(e.target.files[0]); e.target.value = ""; }} />
        </div>
      </div>

      {/* ---------- Workflow info modal ---------- */}
      {infoModalOpen && (
      <div style={{ position: "fixed", inset: 0, background: "rgba(43,42,39,0.45)", zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 24, overflowY: "auto" }}
        onClick={() => { setInfoModalOpen(false); flash("Workflow info saved"); }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "20px 22px", width: "100%", maxWidth: 720, margin: "24px 0", boxShadow: "0 16px 50px rgba(0,0,0,0.28)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <h2 style={{ fontFamily: SERIF, fontSize: 21, fontWeight: 600, margin: 0, color: ACCENT, letterSpacing: "-0.01em" }}>Workflow info</h2>
          <span style={{ flex: 1 }} />
          <button onClick={() => setInfoModalOpen(false)} title="Close" style={{ border: "none", background: "transparent", color: MUTED, cursor: "pointer", fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "12px 16px" }}>
            {INFO_FIELDS.filter((f) => f.key !== "logLink").map((f) => (
              <div key={f.key}>
                <label style={{ ...labelStyle, display: "inline-flex", alignItems: "center", gap: 5 }}>{f.label}<InfoDot text={f.tip} /></label>
                {f.key === "logLink" ? (
                  <div>
                    {linkedLog ? (
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        <button type="button" onClick={openLinkedLog} title="Open decision log" style={{
                          display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 600,
                          color: ACCENT, background: ACCENT_SOFT, padding: "5px 10px", borderRadius: 999,
                          border: `1px solid ${ACCENT}`, cursor: "pointer", fontFamily: SANS,
                        }}><LinkGlyph />{linkedLog.title}</button>
                        <button type="button" onClick={() => setInfo((p) => ({ ...p, logLink: "" }))} title="Unlink" style={{
                          border: "none", background: "transparent", color: MUTED, cursor: "pointer", fontSize: 11.5, fontFamily: SANS,
                          textDecoration: "underline", textUnderlineOffset: 2,
                        }}>unlink</button>
                      </div>
                    ) : info.logLink ? (
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input type="text" value={info.logLink} style={{ ...inputStyle, flex: 1 }}
                          onChange={(e) => setInfo((p) => ({ ...p, logLink: e.target.value }))} />
                      </div>
                    ) : (
                      <div style={{ position: "relative", display: "inline-block" }}>
                        <Btn small onClick={() => setLogMenuOpen((o) => !o)}>+ Add decision log</Btn>
                        {logMenuOpen && (
                          <>
                            <div style={{ position: "fixed", inset: 0, zIndex: 60 }} onClick={() => setLogMenuOpen(false)} />
                            <div style={{
                              position: "absolute", left: 0, top: "calc(100% + 4px)", zIndex: 61, minWidth: 220,
                              background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 4,
                              boxShadow: "0 10px 26px -10px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column",
                            }}>
                              {logsIndex.length > 0 && (
                                <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: MUTED, padding: "6px 8px 2px" }}>Link existing</div>
                              )}
                              {logsIndex.map((l) => (
                                <button key={l.id} onClick={() => linkDecisionLog(l.id)} style={{
                                  display: "flex", alignItems: "center", gap: 8, border: "none", background: "transparent",
                                  borderRadius: 6, padding: "8px 9px", cursor: "pointer", textAlign: "left", fontFamily: SANS,
                                }}
                                  onMouseEnter={(e) => { e.currentTarget.style.background = ACCENT_SOFT; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                                  <span style={{ fontSize: 12.5, fontWeight: 600, color: INK }}>{l.title}</span>
                                  <span style={{ marginLeft: "auto", fontFamily: "ui-monospace, monospace", fontSize: 10.5, color: MUTED }}>{l.code}</span>
                                </button>
                              ))}
                              {logsIndex.length > 0 && <div style={{ height: 1, background: BORDER, margin: "4px 0" }} />}
                              <button onClick={() => { setLogMenuOpen(false); setCreatingLogLink(true); }} style={{
                                border: "none", background: "transparent", borderRadius: 6, padding: "8px 9px", cursor: "pointer",
                                textAlign: "left", fontFamily: SANS, fontSize: 12.5, fontWeight: 600, color: ACCENT,
                              }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = ACCENT_SOFT; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>+ Create new decision log</button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ) : f.type === "date" ? (
                  <input className="wf-date" type="date" value={info[f.key] || ""} style={inputStyle}
                    onClick={(e) => { try { e.currentTarget.showPicker && e.currentTarget.showPicker(); } catch { /* not supported */ } }}
                    onChange={(e) => setInfo((p) => ({ ...p, [f.key]: e.target.value }))} />
                ) : f.multi ? (
                  <TagInput value={info[f.key] || ""} suggestions={fieldSuggestions[f.suggest] || []}
                    placeholder="Type a name…" onChange={(v) => setInfo((p) => ({ ...p, [f.key]: v }))} />
                ) : f.suggest ? (
                  <>
                    <input type="text" list={`sugg-${f.key}`} value={info[f.key] || ""} style={inputStyle}
                      onChange={(e) => setInfo((p) => ({ ...p, [f.key]: e.target.value }))} />
                    <datalist id={`sugg-${f.key}`}>
                      {(fieldSuggestions[f.suggest] || []).map((s) => <option key={s} value={s} />)}
                    </datalist>
                  </>
                ) : (
                  <input type={f.type || "text"} value={info[f.key] || ""} style={inputStyle}
                    onChange={(e) => setInfo((p) => ({ ...p, [f.key]: e.target.value }))} />
                )}
              </div>
            ))}
          </div>

        {/* Users — typical roles in this workflow */}
        <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
          <label style={{ ...labelStyle, display: "inline-flex", alignItems: "center", gap: 5 }}>
            Users<InfoDot text="Who is typically in this workflow and what they do — internal team, partner, client, or a system." />
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
            {users.map((u) => {
              const meta = userGroupMeta(u.type);
              return (
                <div key={u.id} style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 12px", background: "#fff" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
                    <div style={{ minWidth: 120 }}>
                      <label style={labelStyle}>Type</label>
                      <select value={u.type} onChange={(e) => updateUser(u.id, { type: e.target.value, group: "" })} style={{ ...inputStyle, cursor: "pointer" }}>
                        <option value="internal">Internal</option>
                        <option value="partner">Partner</option>
                        <option value="client">Client</option>
                        <option value="system">System</option>
                      </select>
                    </div>
                    <div style={{ flex: 1, minWidth: 150 }}>
                      <label style={labelStyle}>{meta.label}</label>
                      <input type="text" list={meta.suggest ? `usugg-${meta.suggest}` : undefined} value={u.group || ""} placeholder={meta.ph}
                        onChange={(e) => updateUser(u.id, { group: e.target.value })} style={inputStyle} />
                      {meta.suggest && (
                        <datalist id={`usugg-${meta.suggest}`}>
                          {(fieldSuggestions[meta.suggest] || []).map((s) => <option key={s} value={s} />)}
                        </datalist>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 130 }}>
                      <label style={labelStyle}>Role</label>
                      <input type="text" value={u.role || ""} placeholder="e.g. Team Leader"
                        onChange={(e) => updateUser(u.id, { role: e.target.value })} style={inputStyle} />
                    </div>
                    <button onClick={() => removeUser(u.id)} title="Remove user" style={{
                      border: `1px solid ${BORDER}`, background: CARD_BG, color: MUTED, cursor: "pointer",
                      borderRadius: 7, padding: "7px 10px", fontFamily: SANS, fontSize: 12,
                    }}>Remove</button>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <label style={labelStyle}>What they typically do</label>
                    <textarea value={u.description || ""} rows={2} placeholder="e.g. Manages their team's dashboard, creates reports, handles escalations…"
                      onChange={(e) => updateUser(u.id, { description: e.target.value })}
                      style={{ ...inputStyle, resize: "vertical", lineHeight: 1.4 }} />
                  </div>
                </div>
              );
            })}
            <div><Btn small onClick={addUser}>+ Add user</Btn></div>
          </div>
        </div>

        {/* Links — decision log, related workflow, other links grouped together */}
        <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${BORDER}` }}>
          <label style={labelStyle}>Links</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginTop: 6 }}>
          {!linkedLog && (
            <div style={{ position: "relative", display: "inline-block" }}>
              <Btn small onClick={() => setLogMenuOpen((o) => !o)}>+ Decision log</Btn>
              {logMenuOpen && (
                <>
                  <div style={{ position: "fixed", inset: 0, zIndex: 110 }} onClick={() => setLogMenuOpen(false)} />
                  <div style={{ position: "absolute", left: 0, top: "calc(100% + 4px)", zIndex: 111, minWidth: 220, background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 4, boxShadow: "0 10px 26px -10px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column" }}>
                    {logsIndex.length > 0 && <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: MUTED, padding: "6px 8px 2px" }}>Link existing</div>}
                    {logsIndex.map((l) => (
                      <button key={l.id} onClick={() => linkDecisionLog(l.id)} style={{ display: "flex", alignItems: "center", gap: 8, border: "none", background: "transparent", borderRadius: 6, padding: "8px 9px", cursor: "pointer", textAlign: "left", fontFamily: SANS }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = ACCENT_SOFT; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: INK }}>{l.title}</span>
                        <span style={{ marginLeft: "auto", fontFamily: "ui-monospace, monospace", fontSize: 10.5, color: MUTED }}>{l.code}</span>
                      </button>
                    ))}
                    {logsIndex.length > 0 && <div style={{ height: 1, background: BORDER, margin: "4px 0" }} />}
                    <button onClick={() => { setLogMenuOpen(false); setCreatingLogLink(true); }} style={{ border: "none", background: "transparent", borderRadius: 6, padding: "8px 9px", cursor: "pointer", textAlign: "left", fontFamily: SANS, fontSize: 12.5, fontWeight: 600, color: ACCENT }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = ACCENT_SOFT; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>+ Create new decision log</button>
                  </div>
                </>
              )}
            </div>
          )}
          <div style={{ position: "relative", display: "inline-block" }}>
            <Btn small onClick={() => setRelatedPicker((o) => !o)}>+ Related workflow</Btn>
            {relatedPicker && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 110 }} onClick={() => setRelatedPicker(false)} />
                <div style={{ position: "absolute", left: 0, top: "calc(100% + 4px)", zIndex: 111, minWidth: 240, maxHeight: 260, overflowY: "auto", background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 4, boxShadow: "0 10px 26px -10px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column" }}>
                  {linkableWorkflows.length === 0 ? (
                    <div style={{ fontSize: 12, color: MUTED, padding: "8px 9px" }}>No other workflows to link.</div>
                  ) : linkableWorkflows.map((w) => (
                    <button key={w.id} onClick={() => addRelated(w.id)} style={{ display: "flex", alignItems: "center", gap: 8, border: "none", background: "transparent", borderRadius: 6, padding: "8px 9px", cursor: "pointer", textAlign: "left", fontFamily: SANS }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = ACCENT_SOFT; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: INK }}>{w.name}</span>
                      {w.product ? <span style={{ marginLeft: "auto", fontSize: 10.5, color: MUTED }}>{w.product}</span> : null}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <Btn small onClick={() => setLinkDraft({ label: "", url: "" })}>+ Other link</Btn>
        </div>

        {(linkedLog || links.length > 0 || relatedList.length > 0) && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
            {linkedLog && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: "#FDFCFA", background: ACCENT, padding: "3px 6px 3px 9px", borderRadius: 999, fontFamily: SANS }}>
                <button onClick={openLinkedLog} title="Open decision log" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#FDFCFA", background: "none", border: "none", cursor: "pointer", fontFamily: SANS, fontSize: 11, fontWeight: 600, padding: 0 }}><LinkGlyph />Decision log: {linkedLog.title}</button>
                <button onClick={() => setInfo((p) => ({ ...p, logLink: "" }))} title="Unlink" style={{ border: "none", background: "none", color: "#FDFCFA", cursor: "pointer", fontSize: 12, lineHeight: 1, padding: 0, opacity: 0.85 }}>✕</button>
              </span>
            )}
            {links.map((pl, i) => (
              <span key={"l" + i} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: ACCENT, background: ACCENT_SOFT, padding: "3px 6px 3px 9px", borderRadius: 999, fontFamily: SANS }}>
                <a href={pl.url} target="_blank" rel="noopener noreferrer" title={pl.url} style={{ display: "inline-flex", alignItems: "center", gap: 4, color: ACCENT, textDecoration: "none" }}><LinkGlyph />{pl.label || pl.url}</a>
                <button onClick={() => setLinks(links.filter((_, idx) => idx !== i))} title="Remove" style={{ border: "none", background: "none", color: ACCENT, cursor: "pointer", fontSize: 12, lineHeight: 1, padding: 0 }}>✕</button>
              </span>
            ))}
            {relatedList.map((w) => (
              <span key={"r" + w.id} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: INK, background: "transparent", border: `1px solid ${BORDER}`, padding: "3px 6px 3px 9px", borderRadius: 999, fontFamily: SANS }}>
                ⇄ {w.name}
                <button onClick={() => removeRelated(w.id)} title="Remove" style={{ border: "none", background: "none", color: MUTED, cursor: "pointer", fontSize: 12, lineHeight: 1, padding: 0 }}>✕</button>
              </span>
            ))}
          </div>
        )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
          <Btn primary onClick={() => { setInfoModalOpen(false); flash("Workflow info saved"); }}>Done</Btn>
        </div>
      </div>
      </div>
      )}

      {/* ---------- Links visible above the capture grid ---------- */}
      {(() => {
        // Merge this workflow's links with the linked log's links (secondary,
        // shared both ways). The decision log shows as a primary tag.
        const seen = new Set();
        const mergedLinks = [...links, ...linkedLogLinks]
          .filter((pl) => pl && (pl.url || pl.label))
          .filter((pl) => { const k = (pl.url || "") + "|" + (pl.label || ""); if (seen.has(k)) return false; seen.add(k); return true; });
        if (!(mergedLinks.length || linkedLog || relatedList.length || users.length)) return null;
        return (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 18 }}>
          {linkedLog && (
            <button type="button" onClick={openLinkedLog} title={`Open decision log: ${linkedLog.title}`} style={{
              display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 600,
              color: "#FDFCFA", background: ACCENT, padding: "5px 12px", borderRadius: 999,
              border: "none", cursor: "pointer", fontFamily: SANS,
            }}><LinkGlyph />Decision log</button>
          )}
          {mergedLinks.map((pl, i) => (
            <a key={i} href={pl.url} target="_blank" rel="noopener noreferrer" title={pl.url} style={{
              display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 600,
              color: ACCENT, background: ACCENT_SOFT, padding: "4px 11px", borderRadius: 999, textDecoration: "none", fontFamily: SANS,
            }}><LinkGlyph />{pl.label || pl.url}</a>
          ))}
          {relatedList.length === 1 && (
            <button type="button" onClick={() => openRelated(relatedList[0].id)} title="Open related workflow" style={{
              display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 600,
              color: INK, background: CARD_BG, padding: "4px 11px", borderRadius: 999,
              border: `1px solid ${BORDER}`, cursor: "pointer", fontFamily: SANS,
            }}>⇄ {relatedList[0].name}</button>
          )}
          {relatedList.length > 1 && (
            <select value="" onChange={(e) => { if (e.target.value) openRelated(e.target.value); }} style={{
              fontFamily: SANS, fontSize: 11.5, fontWeight: 600, color: INK, background: CARD_BG,
              border: `1px solid ${BORDER}`, borderRadius: 999, padding: "4px 10px", cursor: "pointer",
            }}>
              <option value="">⇄ Related workflows ({relatedList.length})</option>
              {relatedList.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          )}
          {users.length > 0 && (
            <button type="button" onClick={() => setUsersModalOpen(true)} title="View users & roles" style={{
              display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 600,
              color: ACCENT, background: CARD_BG, padding: "4px 11px", borderRadius: 999,
              border: `1px solid ${ACCENT}`, cursor: "pointer", fontFamily: SANS,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              {users.length} user{users.length === 1 ? "" : "s"}
            </button>
          )}
        </div>
        );
      })()}

      {/* ---------- Capture grid / Tree diagram ---------- */}
      <div style={fullscreen ? { position: "fixed", inset: 0, zIndex: 80, background: "#FBFAF8", padding: "14px 16px", overflow: "auto" } : undefined}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 8, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: SERIF, fontSize: 23, fontWeight: 600, margin: 0, color: ACCENT, letterSpacing: "-0.01em" }}>{view === "grid" ? "Capture grid" : "Tree diagram"}</h2>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "inline-flex", border: `1px solid ${BORDER}`, borderRadius: 8, overflow: "hidden" }}>
            {[["grid", "Grid"], ["diagram", "Tree diagram"]].map(([v, lbl]) => (
              <button key={v} onClick={() => setView(v)} style={{
                fontFamily: SANS, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none",
                padding: "6px 12px", background: view === v ? ACCENT : "transparent", color: view === v ? "#FDFCFA" : MUTED,
              }}>{lbl}</button>
            ))}
          </div>
          <button onClick={() => setFullscreen((f) => !f)} title={fullscreen ? "Exit full screen" : "Expand to full screen"}
            aria-label={fullscreen ? "Exit full screen" : "Expand to full screen"} style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 30,
              border: `1px solid ${BORDER}`, borderRadius: 8, background: CARD_BG, color: MUTED, cursor: "pointer",
            }}><Maximize exit={fullscreen} /></button>
        </div>
      </div>

      {view === "diagram" ? (
        <WorkflowDiagram flows={flows} decisions={decisions} onSelectStep={goToStep} height={fullscreen ? "calc(100vh - 124px)" : undefined} />
      ) : (<>
      {/* Branch lineage breadcrumb (only for sub-flows) */}
      {activeFlowId !== "main" && (() => {
        const chain = lineage(activeFlowId);
        const extra = parentsOf(activeFlowId).length - 1;
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 10, fontFamily: SANS, fontSize: 12 }}>
            <span style={{ color: MUTED, fontWeight: 600 }}>Branched from:</span>
            {chain.map((seg, i) => {
              const isActive = seg.flowId === activeFlowId;
              return (
                <span key={seg.flowId + i} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <button onClick={() => setActiveFlowId(seg.flowId)} style={{
                    fontFamily: SANS, fontSize: 11.5, fontWeight: 600, cursor: "pointer",
                    border: `1px solid ${isActive ? ACCENT : BORDER}`, borderRadius: 999,
                    background: isActive ? ACCENT_SOFT : "#fff", color: isActive ? ACCENT : INK, padding: "2px 10px",
                  }}>{seg.flowId === "main" ? "Main flow" : (flowName(seg.flowId) || "Sub-flow")}</button>
                  {seg.viaColId ? (
                    <span style={{ color: MUTED, display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 11 }}>↳ {colNameOf(seg.flowId, seg.viaColId)}</span>
                      <span style={{ color: BORDER }}>→</span>
                    </span>
                  ) : null}
                </span>
              );
            })}
            {extra > 0 && <span style={{ color: MUTED, fontStyle: "italic" }}>(+{extra} other branch{extra === 1 ? "" : "es"} link here)</span>}
          </div>
        );
      })()}
      {/* Flow tabs: main flow + branch sub-flows */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 10, flexWrap: "wrap", borderBottom: `1px solid ${BORDER}`, paddingBottom: 2 }}>
        {flows.map((f) => {
          const active = f.id === activeFlowId;
          const isSub = f.id !== "main";
          return (
            <span key={f.id} style={{
              display: "inline-flex", alignItems: "center",
              background: active ? ACCENT_SOFT : "transparent",
              borderBottom: `2px solid ${active ? ACCENT : "transparent"}`,
              borderRadius: "6px 6px 0 0",
            }}>
              {active && isSub ? (
                // Active sub-flow tab is an inline field — click and rewrite to
                // rename; changes autosave as you type.
                <input
                  value={f.name}
                  onChange={(e) => renameFlow(f.id, e.target.value)}
                  onBlur={(e) => { if (!e.target.value.trim()) renameFlow(f.id, "Sub-flow"); }}
                  onFocus={(e) => e.target.select()}
                  size={Math.max((f.name || "").length, 4)}
                  title="Click to rename"
                  style={{
                    fontFamily: SANS, fontSize: 13, fontWeight: 600, color: ACCENT,
                    background: "transparent", border: "none", outline: "none",
                    padding: "7px 4px 7px 12px",
                  }}
                />
              ) : (
                <button onClick={() => setActiveFlowId(f.id)} style={{
                  fontFamily: SANS, fontSize: 13, fontWeight: 600, cursor: "pointer",
                  background: "transparent", color: active ? ACCENT : MUTED,
                  border: "none", borderRadius: "6px 6px 0 0", padding: "7px 12px",
                }}>{f.name}</button>
              )}
              {isSub && active && (
                <button onClick={() => { if (window.confirm(`Delete sub-flow "${f.name}"?`)) deleteFlow(f.id); }}
                  title="Delete sub-flow" style={{ border: "none", background: "transparent", color: MUTED, cursor: "pointer", fontSize: 13, padding: "0 8px 0 2px" }}>×</button>
              )}
            </span>
          );
        })}
        <button onClick={() => { const id = newFlowId(); setFlows((fs) => [...fs, { id, name: "Sub-flow " + fs.length, columns: [{ id: "c0", name: "Trigger" }, { id: "c1", name: "Step 1" }], cells: {}, subflows: {}, nextId: 2 }]); setActiveFlowId(id); }}
          style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: INK, background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 8, cursor: "pointer", padding: "6px 11px", marginLeft: 4 }}>+ Sub-flow</button>
      </div>

      <div style={{ display: "flex", alignItems: "stretch", gap: 10 }}>
      <div style={{ flex: 1, minWidth: 0, overflowX: "auto", border: `1px solid ${BORDER}`, borderRadius: 14, background: CARD_BG, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <table style={{ borderCollapse: "separate", borderSpacing: 0, width: "100%", minWidth: 210 + columns.length * 260 }}>
          <thead>
            <tr>
              <th style={{
                position: isMobile ? "static" : "sticky", left: 0, zIndex: 10, background: "#F5F3EF",
                borderBottom: `2px solid ${ACCENT}`, borderRight: "none",
                padding: "10px 14px", textAlign: "left", minWidth: isMobile ? 150 : 210, width: isMobile ? 150 : 210,
                fontFamily: SANS, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em",
                textTransform: "uppercase", color: MUTED,
              }}>Field</th>
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
                    <IconBtn danger title="Remove step" onClick={() => { if (window.confirm(`Delete the step "${col.name || "this step"}"? This can't be undone.`)) removeColumn(col.id); }}>×</IconBtn>
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
                    position: isMobile ? "static" : "sticky", left: 0, zIndex: 5,
                    background: isAI ? ACCENT_SOFT : "#FBFAF8",
                    borderBottom: ri < ROWS.length - 1 ? `1px solid ${BORDER}` : "none",
                    padding: "10px 14px", verticalAlign: "top",
                    width: isMobile ? 150 : 210, minWidth: isMobile ? 150 : 210,
                    borderRight: `1px solid ${BORDER}`,
                  }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <span style={{
                        fontSize: 12.5, fontWeight: 600, color: isAI ? ACCENT : INK,
                        fontFamily: SANS, lineHeight: 1.3,
                      }}>{row.label}</span>
                      <InfoDot text={row.tip} />
                    </span>
                  </td>
                  {columns.map((col, ci) => {
                    const val = cells[col.id]?.[row.key] || "";
                    const isBranch = row.key === "branches";
                    const linkedIds = isBranch ? subIdList(subflows, col.id) : [];
                    const linkedFlows = linkedIds.map((id) => flows.find((f) => f.id === id)).filter(Boolean);
                    const linkable = flows.filter((f) => f.id !== activeFlowId && !linkedIds.includes(f.id));
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
                          <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            {linkedFlows.map((lf) => (
                              <span key={lf.id} style={{ display: "inline-flex", alignItems: "center", border: `1px solid ${ACCENT}`, background: ACCENT_SOFT, borderRadius: 999, overflow: "hidden" }}>
                                <button onClick={() => setActiveFlowId(lf.id)} title="Open sub-flow" style={{
                                  border: "none", background: "transparent", color: ACCENT,
                                  fontSize: 11, fontWeight: 600, cursor: "pointer", padding: "2px 0 2px 9px", fontFamily: SANS,
                                }}>↳</button>
                                {/* The name is editable right here — autosaves as you type. */}
                                <input
                                  value={lf.name}
                                  onChange={(e) => renameFlow(lf.id, e.target.value)}
                                  onBlur={(e) => { if (!e.target.value.trim()) renameFlow(lf.id, "Sub-flow"); }}
                                  onFocus={(e) => e.target.select()}
                                  size={Math.max((lf.name || "").length, 3)}
                                  title="Click to rename sub-flow"
                                  style={{
                                    border: "none", background: "transparent", color: ACCENT,
                                    fontSize: 10.5, fontWeight: 600, fontFamily: SANS, outline: "none",
                                    padding: "2px 4px", minWidth: 24,
                                  }}
                                />
                                <button onClick={() => unlinkBranch(col.id, lf.id)} title="Unlink sub-flow" style={{
                                  border: "none", background: "transparent", color: ACCENT, fontSize: 11, cursor: "pointer",
                                  padding: "2px 7px 2px 3px", fontFamily: SANS, opacity: 0.7,
                                }}>×</button>
                              </span>
                            ))}
                            <button onClick={() => createSubFlowFromBranch(col.id, val)} style={{
                              border: `1px solid ${BORDER}`, background: CARD_BG, color: ACCENT, borderRadius: 7,
                              fontSize: 10.5, fontWeight: 600, cursor: "pointer", padding: "3px 9px", fontFamily: SANS,
                            }}>+ {linkedFlows.length ? "Add sub-flow" : "Create sub-flow"}</button>
                            {linkable.length > 0 && (
                              <select value="" onChange={(e) => { if (e.target.value) linkBranchToFlow(col.id, e.target.value); }}
                                style={{ fontFamily: SANS, fontSize: 10.5, color: MUTED, background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 7, padding: "3px 6px", cursor: "pointer" }}>
                                <option value="">Link existing…</option>
                                {linkable.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                              </select>
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
        <button onClick={addColumn} title="Add step" style={{
          flex: "0 0 40px", border: `2px dashed ${BORDER}`, borderRadius: 14, background: "transparent",
          color: MUTED, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", gap: 6, fontFamily: SANS, fontSize: 13, fontWeight: 600,
        }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.color = ACCENT; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = MUTED; }}>
          <span style={{ fontSize: 22, lineHeight: 1 }}>+</span>
          <span style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", letterSpacing: ".04em" }}>Add step</span>
        </button>
      </div>

      <p style={{ fontSize: 11.5, color: MUTED, marginTop: 10 }}>
        Tip: hover or tap the <span style={{ fontWeight: 600 }}>ⓘ</span> next to a field for what it means. Use a cell's <span style={{ fontWeight: 600 }}>✚</span> to log a decision pinned to that cell, and a <span style={{ fontWeight: 600 }}>Branches</span> cell to create or link a sub-flow.
      </p>
      </>)}
      </div>

      {/* ---------- Decisions section ---------- */}
      <div style={{ marginTop: 36, paddingTop: 30, borderTop: `1px solid ${BORDER}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
          <h2 style={{ fontFamily: SERIF, fontSize: 23, fontWeight: 600, margin: 0, color: ACCENT, letterSpacing: "-0.01em" }}>Decisions</h2>
          <Pill tone="neutral">{decisions.length} logged</Pill>
          <span style={{ flex: 1 }} />
          {decisions.length > 0 && (
            <div style={{ position: "relative", width: 240 }}>
              <input value={decQuery} onChange={(e) => setDecQuery(e.target.value)} placeholder="Search decisions…"
                style={{ width: "100%", fontFamily: SANS, fontSize: 13, color: INK, background: CARD_BG,
                  border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 38px 8px 11px", outline: "none", boxSizing: "border-box" }} />
              <button onClick={() => setFilterOpen((o) => !o)} title="Filters" style={{
                position: "absolute", right: 5, top: "50%", transform: "translateY(-50%)",
                display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28,
                borderRadius: 6, cursor: "pointer", background: filtersActive ? ACCENT_SOFT : "transparent",
                border: filtersActive ? `1px solid ${ACCENT}` : "1px solid transparent", color: filtersActive ? ACCENT : MUTED,
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
                {filtersActive && <span style={{ position: "absolute", top: 1, right: 1, width: 6, height: 6, borderRadius: "50%", background: ACCENT }} />}
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
          )}
          <Menu label="Export ▾" disabled={decisions.length === 0} items={[
            { label: "Export · Text (.txt)", onClick: () => requestExport("text") },
            { label: "Export · Excel (.csv)", onClick: () => requestExport("excel") },
            { label: "Export · JSON (.json)", onClick: () => requestExport("json") },
            onAddToLog && { divider: true },
            onAddToLog && { label: "Add to Decision Log", onClick: openAddToLog },
          ]} />
          <Btn onClick={() => setShowPreview(true)} disabled={pendingDecisions.length === 0}
            title={pendingDecisions.length === 0 ? "No AI pass-2 cells filled yet" : ""}>
            ✨ Decisions found{pendingDecisions.length > 0 ? ` (${pendingDecisions.length})` : ""}
          </Btn>
          <Btn primary onClick={() => { newDecision({}, { drawer: true }); }}>+ Add decision</Btn>
        </div>
        <p style={{ fontSize: 12.5, color: MUTED, margin: "0 0 14px" }}>
          Notes captured here travel to the Decision Log. Decisions pinned from a grid cell carry a <span style={{ fontWeight: 600 }}>⊙</span> tag back to their cell.
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
                {decView.map((d) => (
                  <DecisionCard key={d.id} d={d} mode="row"
                    highlight={highlightId === d.id}
                    statusStyle={STATUS_STYLE[d.status] || STATUS_STYLE["Proposed"]}
                    anchorRowLabel={anchorRowLabel(d)}
                    flowLabel={anchorFlowLabel(d)}
                    onJumpAnchor={() => jumpToAnchor(d.anchor)}
                    onOpen={() => setDecDrawerId(d.id)}
                    onChange={(nd) => setDecisions((p) => p.map((x) => (x.id === d.id ? nd : x)))}
                    onDelete={() => setDecisions((p) => p.filter((x) => x.id !== d.id))}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ---------- Users info modal ---------- */}
      {usersModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(43,42,39,0.45)", zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 24, overflowY: "auto" }}
          onClick={() => setUsersModalOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "20px 22px", width: "100%", maxWidth: 560, margin: "24px 0", boxShadow: "0 16px 50px rgba(0,0,0,0.28)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <h2 style={{ fontFamily: SERIF, fontSize: 21, fontWeight: 600, margin: 0, color: ACCENT, letterSpacing: "-0.01em" }}>Users & roles</h2>
              <span style={{ flex: 1 }} />
              <button onClick={() => setUsersModalOpen(false)} title="Close" style={{ border: "none", background: "transparent", color: MUTED, cursor: "pointer", fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {users.map((u) => {
                const meta = userGroupMeta(u.type);
                return (
                  <div key={u.id} style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 14px", background: "#fff" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: u.description ? 6 : 0 }}>
                      <Pill tone="accent">{u.role || "Role"}</Pill>
                      <span style={{ fontSize: 12, color: MUTED, fontFamily: SANS }}>
                        {(u.type ? u.type.charAt(0).toUpperCase() + u.type.slice(1) : "")}{u.group ? ` · ${u.group}` : ""}
                      </span>
                    </div>
                    {u.description && <div style={{ fontSize: 12.5, color: INK, fontFamily: SANS, lineHeight: 1.5 }}>{u.description}</div>}
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
              <Btn small onClick={() => { setUsersModalOpen(false); setInfoModalOpen(true); }}>Edit in Workflow info</Btn>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Decision editing drawer ---------- */}
      {(() => {
        const dec = decisions.find((x) => x.id === decDrawerId);
        if (!dec) return null;
        const close = () => setDecDrawerId(null);
        return (
          <>
            <div onClick={close} style={{ position: "fixed", inset: 0, background: "rgba(43,42,39,0.4)", zIndex: 130 }} />
            <aside style={{
              position: "fixed", top: 0, right: 0, height: "100vh", width: "min(480px, 100vw)", zIndex: 131,
              background: BASE_BG, boxShadow: "-10px 0 40px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${BORDER}` }}>
                <h3 style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 600, margin: 0, color: ACCENT }}>Decision</h3>
                <button onClick={close} title="Close" style={{ border: "none", background: "transparent", color: MUTED, cursor: "pointer", fontSize: 22, lineHeight: 1, padding: 4 }}>×</button>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>
                <DecisionCard d={dec} mode="form"
                  statusStyle={STATUS_STYLE[dec.status] || STATUS_STYLE["Proposed"]}
                  onChange={(nd) => setDecisions((p) => p.map((x) => (x.id === dec.id ? nd : x)))}
                  onDelete={() => { setDecisions((p) => p.filter((x) => x.id !== dec.id)); close(); }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 20px", borderTop: `1px solid ${BORDER}` }}>
                <Btn primary onClick={close}>Done</Btn>
              </div>
            </aside>
          </>
        );
      })()}

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

      {/* Create a new decision log to link from Workflow info. */}
      {creatingLogLink && (
        <CreateLogModal
          existingCodes={existingLogCodes}
          initialWorkflowLink={typeof window !== "undefined" ? window.location.href : ""}
          onClose={() => setCreatingLogLink(false)}
          onCreate={(meta) => {
            const id = onCreateLog ? onCreateLog(meta) : null;
            if (id) linkDecisionLog(id);
            setCreatingLogLink(false);
          }}
        />
      )}

      {/* ---------- Add to Decision Log wizard ---------- */}
      {addToLog && addToLog.step === "create" && (
        <CreateLogModal
          existingCodes={existingLogCodes}
          initialWorkflowLink={typeof window !== "undefined" ? window.location.href : ""}
          onClose={() => (logsIndex.length ? setAddToLog((a) => ({ ...a, step: "select" })) : setAddToLog(null))}
          onCreate={(meta) => {
            const id = onCreateLog ? onCreateLog(meta) : null;
            enterReview(id);
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
                  <Btn primary disabled={!addToLog.logId} onClick={() => enterReview(addToLog.logId)}>Continue</Btn>
                </div>
              </>
            )}

            {addToLog.step === "review" && (() => {
              const willAdd = addToLog.items.filter((it) => it.action === "accept").length;
              const willReplace = addToLog.items.filter((it) => it.action === "replace" && it.dupId).length;
              const dupeCount = addToLog.items.filter((it) => it.dupId).length;
              const destTitle = logsIndex.find((l) => l.id === addToLog.logId)?.title || "the decision log";
              return (
                <>
                  <h3 style={{ fontFamily: SERIF, fontSize: 21, fontWeight: 600, margin: "0 0 4px", color: ACCENT }}>Review entries</h3>
                  <p style={{ fontSize: 13, color: MUTED, margin: "0 0 12px" }}>
                    Accept or reject each entry before it's added to “{destTitle}”.
                  </p>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
                    <Btn small onClick={() => setAllAddItems("accept")}>Accept all</Btn>
                    <Btn small onClick={() => setAllAddItems("reject")}>Reject all</Btn>
                    <span style={{ marginLeft: "auto", fontSize: 12, color: MUTED }}>{willAdd} add · {willReplace} replace</span>
                  </div>
                  {dupeCount > 0 && (
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, padding: "8px 11px", background: "#F6EFDC", border: "1px solid #E7D7AE", borderRadius: 9, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#8A6A1F" }}>⚠ {dupeCount} already in this log</span>
                      <span style={{ flex: 1 }} />
                      <Btn small onClick={() => setDupeAction("skip")}>Skip all duplicates</Btn>
                      <Btn small onClick={() => setDupeAction("replace")}>Replace all duplicates</Btn>
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
                    {addToLog.items.map((it, i) => {
                      const ss = STATUS_STYLE[it.d.status] || STATUS_STYLE["Proposed"];
                      const isDup = !!it.dupId;
                      const inactive = it.action === "reject" || it.action === "skip";
                      const borderC = inactive ? BORDER : (it.action === "replace" ? "#8A6A1F" : ACCENT);
                      return (
                        <div key={it.d.id} style={{
                          border: `1px solid ${borderC}`, borderRadius: 10, padding: "10px 12px",
                          background: inactive ? "transparent" : (it.action === "replace" ? "#FBF6E9" : "#F7FAF8"), opacity: inactive ? 0.6 : 1,
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                            {it.d.workflowStep ? <Pill tone="accent">{it.d.workflowStep}</Pill> : null}
                            <Pill bg={ss.bg} fg={ss.fg}>{it.d.status || "Proposed"}</Pill>
                            {isDup && <Pill bg="#F6EFDC" fg="#8A6A1F">Duplicate</Pill>}
                            <span style={{ flex: 1 }} />
                            {isDup ? (
                              <>
                                <Btn small primary={it.action === "replace"} onClick={() => setAddItemAction(i, "replace")}>Replace</Btn>
                                <Btn small primary={it.action === "skip"} onClick={() => setAddItemAction(i, "skip")}>Skip</Btn>
                              </>
                            ) : (
                              <>
                                <Btn small primary={it.action === "accept"} onClick={() => setAddItemAction(i, "accept")}>Accept</Btn>
                                <Btn small onClick={() => setAddItemAction(i, "reject")}>Reject</Btn>
                              </>
                            )}
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
                    <Btn primary disabled={willAdd + willReplace === 0} onClick={confirmAddToLog}>
                      {willReplace > 0 ? `Apply (${willAdd} add, ${willReplace} replace)` : `Add ${willAdd} to log`}
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
