import { useState } from "react";
import DecisionLog, { OUTFIT_ENTRIES } from "./DecisionLogApp";
import { HACKWEEK_ENTRIES } from "./hackweekData";

const SUBTITLE = "A record of what was decided, and why.";

const LOGS = [
  {
    id: "outfit",
    name: "Decision Log: Daily outfit generator",
    code: "DOG-GEN",
    entries: OUTFIT_ENTRIES,
    settings: { prefix: "DOG", workflow: "GEN" },
  },
  {
    id: "hackweek",
    name: "Hackweek - Workflow & Decision Log Process",
    code: "HWK-WDL",
    entries: HACKWEEK_ENTRIES,
    settings: { prefix: "HWK", workflow: "WDL" },
  },
];

function summarize(entries) {
  const dates = entries.map((e) => e.date).filter(Boolean).sort();
  return { count: entries.length, updated: dates[dates.length - 1] || "—" };
}

function Home({ onOpen }) {
  return (
    <div className="home-root">
      <style>{HOME_CSS}</style>
      <header className="home-head">
        <h1>Decision Logs</h1>
        <p>Every decision log across the project — what was decided, and why.</p>
      </header>
      <div className="home-table-wrap">
        <table className="home-tbl">
          <thead>
            <tr>
              <th>Decision log</th>
              <th>Code</th>
              <th className="num-h">Decisions</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {LOGS.map((l) => {
              const s = summarize(l.entries);
              return (
                <tr key={l.id} onClick={() => onOpen(l.id)}>
                  <td className="home-name">{l.name}</td>
                  <td className="mono">{l.code}</td>
                  <td className="num">{s.count}</td>
                  <td className="dim">{s.updated}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("home");
  const active = LOGS.find((l) => l.id === view);

  if (active) {
    return (
      <DecisionLog
        key={active.id}
        title={active.name}
        subtitle={SUBTITLE}
        initialEntries={active.entries}
        initialSettings={active.settings}
        onBack={() => setView("home")}
      />
    );
  }
  return <Home onOpen={setView} />;
}

const HOME_CSS = `
.home-root{
  --paper:#FAF9F6; --surface:#FFFFFF; --ink:#1C1B19; --ink-soft:#57534E;
  --ink-faint:#94908A; --line:#E7E4DD; --line-soft:#F1EEE8;
  --accent:#1F3A34; --accent-tint:#F3F6F4;
  font-family: system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  color:var(--ink); background:var(--paper); min-height:100vh;
  padding:48px clamp(16px,5vw,64px) 80px; box-sizing:border-box;
  -webkit-font-smoothing:antialiased;
}
.home-root *{box-sizing:border-box}
.home-head h1{font-family:Georgia,"Iowan Old Style","Palatino Linotype",serif;font-weight:600;
  letter-spacing:-.01em;margin:0;font-size:32px;line-height:1.1}
.home-head p{margin:8px 0 0;color:var(--ink-soft);font-size:14px;max-width:54ch}
.home-table-wrap{margin-top:28px;border:1px solid var(--line);border-radius:12px;overflow:hidden;
  background:var(--surface);box-shadow:0 1px 2px rgba(0,0,0,.02);max-width:760px}
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
.home-tbl .mono{font-family:"SF Mono",ui-monospace,"JetBrains Mono",monospace;font-size:12px;color:var(--ink-soft)}
.home-tbl .num{text-align:right;font-variant-numeric:tabular-nums;color:var(--ink-soft)}
.home-tbl .dim{color:var(--ink-faint);white-space:nowrap}
`;
