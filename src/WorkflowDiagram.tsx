import { useMemo } from "react";
import { ReactFlow, Background, Controls, MiniMap } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const ACCENT = "#1F3A34";
const ACCENT_SOFT = "#E8EEEC";
const BORDER = "#E5E1DA";
const INK = "#2B2A27";
const MUTED = "#8A857C";
const SANS = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif";

const COL_W = 260;
const ROW_H = 230;

const clip = (s, n = 90) => { const t = (s || "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n) + "…" : t; };

// Build an interactive tree of the whole workflow: each flow's steps as nodes,
// sequential edges within a flow, and "branch" edges into linked sub-flows.
// Nodes are annotated with edge cases (exceptions/pain) and decision counts.
export default function WorkflowDiagram({ flows, decisions, onSelectStep }) {
  const { nodes, edges } = useMemo(() => {
    const nodes = [];
    const edges = [];

    const flowById = {};
    flows.forEach((f) => { flowById[f.id] = f; });

    // "Previous step" columns are reference-only — leave them out of the tree.
    const realCols = (f) => (f.columns || []).filter((c) => c.name !== "Previous step");
    // A step can branch into multiple sub-flows; tolerate the older single-id shape.
    const subList = (v) => (Array.isArray(v) ? v.filter(Boolean) : (v ? [v] : []));
    // How many sub-flows branch off a given (flow, column).
    const subCountOf = (f, colId) => subList(f.subflows && f.subflows[colId]).filter((t) => flowById[t]).length;

    // Which (flow,column) links to each sub-flow → used to position + connect.
    const parentOf = {};
    flows.forEach((f) => {
      Object.entries(f.subflows || {}).forEach(([colId, targetId]) => {
        subList(targetId).forEach((tid) => { if (flowById[tid]) parentOf[tid] = { flowId: f.id, colId }; });
      });
    });

    // Children of each flow, ordered left-to-right by the branching column so
    // the layout reads the same way the grid does.
    const childrenOf = {};
    flows.forEach((f) => {
      const cols = realCols(f);
      const kids = [];
      Object.entries(f.subflows || {}).forEach(([colId, targetId]) => {
        subList(targetId).forEach((tid) => {
          if (!flowById[tid]) return;
          kids.push({ colId, targetId: tid, colIdx: cols.findIndex((c) => c.id === colId) });
        });
      });
      kids.sort((a, b) => a.colIdx - b.colIdx);
      childrenOf[f.id] = kids;
    });

    // Lay out hierarchically: walk the flow tree depth-first so every sub-flow
    // sits directly below its parent. startX is computed top-down and threaded
    // through the lineage, so a sub-flow lines up under its branch column no
    // matter how deeply it is nested. One row per flow keeps lanes from
    // overlapping vertically.
    const startXof = {};
    const rowOf = {};
    let rowCursor = 0;
    const visit = (flow, baseX) => {
      if (!flow || rowOf[flow.id] !== undefined) return;
      startXof[flow.id] = baseX;
      rowOf[flow.id] = rowCursor++;
      (childrenOf[flow.id] || []).forEach(({ colIdx, targetId }) => {
        visit(flowById[targetId], baseX + Math.max(0, colIdx) * COL_W);
      });
    };
    // Start from the main flow (or any root that nothing branches into).
    const roots = flows.filter((f) => !parentOf[f.id]);
    roots.sort((a, b) => (a.id === "main" ? -1 : b.id === "main" ? 1 : 0));
    roots.forEach((r) => visit(r, 0));
    // Safety net: place any flow the walk missed (orphaned links) at the bottom.
    flows.forEach((f) => { if (rowOf[f.id] === undefined) { startXof[f.id] = 0; rowOf[f.id] = rowCursor++; } });

    flows.forEach((f) => {
      const row = rowOf[f.id];
      const startX = startXof[f.id];
      const cols = realCols(f);
      cols.forEach((col, i) => {
        const id = `${f.id}:${col.id}`;
        const cell = (f.cells && f.cells[col.id]) || {};
        const action = clip(cell.step, 90);
        const decCount = decisions.filter((d) => d.anchor && (d.anchor.flowId || "main") === f.id && d.anchor.colId === col.id).length;
        const subCount = subCountOf(f, col.id);
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
                {action ? <div style={{ fontSize: 10.5, color: INK, marginTop: 4, lineHeight: 1.3, opacity: 0.85 }}>{action}</div> : null}
                {decCount > 0 ? <div style={{ fontSize: 10, fontWeight: 600, color: ACCENT, marginTop: 4 }}>⊙ {decCount} decision{decCount === 1 ? "" : "s"}</div> : null}
                {subCount > 0 ? <div style={{ fontSize: 10, fontWeight: 600, color: MUTED, marginTop: 3 }}>⑂ {subCount} sub-flow{subCount === 1 ? "" : "s"}</div> : null}
              </div>
            ),
          },
          style: {
            width: 220, padding: "10px 12px", borderRadius: 12,
            border: `1px solid ${isMain ? ACCENT : BORDER}`,
            background: isMain ? ACCENT_SOFT : "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)", textAlign: "left", cursor: "pointer",
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

    // Branch edges: a branch column → the first step of each linked sub-flow.
    // Stagger each branch's turn distance so parallel drops don't sit on top of
    // one another, and order them by target row so nearer sub-flows turn sooner.
    let branchSeq = 0;
    flows.forEach((f) => {
      const branchList = [];
      Object.entries(f.subflows || {}).forEach(([colId, targetId]) => {
        subList(targetId).forEach((tid) => {
          const target = flowById[tid];
          if (!target || !target.columns.length) return;
          const firstCol = target.columns.find((c) => c.name !== "Previous step") || target.columns[0];
          branchList.push({ colId, tid, firstCol, row: rowOf[tid] ?? 0 });
        });
      });
      branchList.sort((a, b) => a.row - b.row);
      branchList.forEach(({ colId, tid, firstCol }) => {
        const offset = 16 + (branchSeq++ % 5) * 16;
        edges.push({
          id: `${f.id}:${colId}->branch:${tid}`,
          source: `${f.id}:${colId}`,
          target: `${tid}:${firstCol.id}`,
          label: "branch",
          type: "smoothstep",
          animated: true,
          pathOptions: { offset, borderRadius: 14 },
          style: { stroke: ACCENT },
          labelStyle: { fill: ACCENT, fontWeight: 600, fontSize: 10, fontFamily: SANS },
        });
      });
    });

    return { nodes, edges };
  }, [flows, decisions]);

  return (
    <div style={{ height: "72vh", border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden", background: "#FBFAF8" }}>
      <ReactFlow nodes={nodes} edges={edges} fitView minZoom={0.2} proOptions={{ hideAttribution: true }}
        onNodeClick={(_e, node) => {
          if (!onSelectStep) return;
          const i = String(node.id).lastIndexOf(":");
          if (i < 0) return;
          onSelectStep(node.id.slice(0, i), node.id.slice(i + 1));
        }}>
        <Background color="#E5E1DA" gap={20} />
        <MiniMap pannable zoomable />
        <Controls />
      </ReactFlow>
    </div>
  );
}
