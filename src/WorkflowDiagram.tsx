import { useMemo } from "react";
import { ReactFlow, Background, Controls, MiniMap } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const ACCENT = "#1F3A34";
const ACCENT_SOFT = "#E8EEEC";
const BORDER = "#E5E1DA";
const INK = "#2B2A27";
const MUTED = "#8A857C";
const SANS = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif";

const COL_W = 250;
const ROW_H = 200;

const clip = (s, n = 90) => { const t = (s || "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n) + "…" : t; };

// Build an interactive tree of the whole workflow: each flow's steps as nodes,
// sequential edges within a flow, and "branch" edges into linked sub-flows.
// Nodes are annotated with edge cases (exceptions/pain) and decision counts.
export default function WorkflowDiagram({ flows, decisions }) {
  const { nodes, edges } = useMemo(() => {
    const nodes = [];
    const edges = [];

    // Which (flow,column) links to each sub-flow → used to position + connect.
    const parentOf = {};
    flows.forEach((f) => {
      Object.entries(f.subflows || {}).forEach(([colId, targetId]) => {
        if (targetId) parentOf[targetId] = { flowId: f.id, colId };
      });
    });

    const flowRow = {};
    flows.forEach((f, i) => { flowRow[f.id] = i; });

    flows.forEach((f) => {
      const row = flowRow[f.id];
      // Offset a sub-flow's start under the branch column it hangs off of.
      let startX = 0;
      const parent = parentOf[f.id];
      if (parent) {
        const pf = flows.find((x) => x.id === parent.flowId);
        const pCols = pf ? pf.columns.filter((c) => c.name !== "Previous step") : [];
        const pIdx = pCols.findIndex((c) => c.id === parent.colId);
        startX = Math.max(0, pIdx) * COL_W + 60;
      }

      // "Previous step" columns are reference-only — leave them out of the tree.
      const cols = (f.columns || []).filter((c) => c.name !== "Previous step");
      cols.forEach((col, i) => {
        const id = `${f.id}:${col.id}`;
        const cell = (f.cells && f.cells[col.id]) || {};
        const exceptions = clip(cell.exceptions, 70);
        const pain = clip(cell.pain, 70);
        const decCount = decisions.filter((d) => d.anchor && (d.anchor.flowId || "main") === f.id && d.anchor.colId === col.id).length;
        const isMain = f.id === "main";
        nodes.push({
          id,
          position: { x: startX + i * COL_W, y: row * ROW_H },
          data: {
            label: (
              <div style={{ textAlign: "left", maxWidth: 200 }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: isMain ? ACCENT : MUTED, marginBottom: 2 }}>
                  {isMain ? "Main flow" : f.name}
                </div>
                <div style={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 700, color: INK, lineHeight: 1.25 }}>{col.name || "Step"}</div>
                {exceptions ? <div style={{ fontSize: 10.5, color: "#9C3D2E", marginTop: 4, lineHeight: 1.3 }}>⚠ {exceptions}</div> : null}
                {pain ? <div style={{ fontSize: 10.5, color: "#8A6A1F", marginTop: 3, lineHeight: 1.3 }}>● {pain}</div> : null}
                {decCount > 0 ? <div style={{ fontSize: 10, fontWeight: 600, color: ACCENT, marginTop: 4 }}>⊙ {decCount} decision{decCount === 1 ? "" : "s"}</div> : null}
              </div>
            ),
          },
          style: {
            width: 220, padding: "10px 12px", borderRadius: 12,
            border: `1px solid ${isMain ? ACCENT : BORDER}`,
            background: isMain ? ACCENT_SOFT : "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)", textAlign: "left",
          },
          sourcePosition: "right",
          targetPosition: "left",
        });

        // Sequential edge to the next step in this flow.
        if (i < cols.length - 1) {
          edges.push({ id: `${id}->seq`, source: id, target: `${f.id}:${cols[i + 1].id}`, type: "smoothstep" });
        }
      });
    });

    // Branch edges: a branch column → the first step of its linked sub-flow.
    flows.forEach((f) => {
      Object.entries(f.subflows || {}).forEach(([colId, targetId]) => {
        const target = flows.find((x) => x.id === targetId);
        if (!target || !target.columns.length) return;
        // Point at the first real step of the sub-flow, skipping "Previous step".
        const firstCol = target.columns.find((c) => c.name !== "Previous step") || target.columns[0];
        edges.push({
          id: `${f.id}:${colId}->branch:${targetId}`,
          source: `${f.id}:${colId}`,
          target: `${targetId}:${firstCol.id}`,
          label: "branch",
          type: "smoothstep",
          animated: true,
          style: { stroke: ACCENT },
          labelStyle: { fill: ACCENT, fontWeight: 600, fontSize: 10, fontFamily: SANS },
        });
      });
    });

    return { nodes, edges };
  }, [flows, decisions]);

  return (
    <div style={{ height: "72vh", border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden", background: "#FBFAF8" }}>
      <ReactFlow nodes={nodes} edges={edges} fitView minZoom={0.2} proOptions={{ hideAttribution: true }}>
        <Background color="#E5E1DA" gap={20} />
        <MiniMap pannable zoomable />
        <Controls />
      </ReactFlow>
    </div>
  );
}
