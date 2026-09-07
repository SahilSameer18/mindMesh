/**
 * mindMesh — Canvas Geometric Layout Engine
 * Computes deterministic (x, y) coordinates for layout reorganizations:
 * - roadmap: Sequential left-to-right phase/type columns
 * - risks_right: Isolates risk cards to the far right
 * - cluster: Groups cards by type/theme in 2D clusters
 * - grid: Clean symmetrical grid
 */

const CARD_WIDTH = 280;
const CARD_HEIGHT = 140;
const COL_GAP = 80;
const ROW_GAP = 40;

const COL_STRIDE = CARD_WIDTH + COL_GAP; // 360px
const ROW_STRIDE = CARD_HEIGHT + ROW_GAP; // 180px

/**
 * Roadmap Layout:
 * Col 0: Goals
 * Col 1: Ideas & Questions
 * Col 2: Tasks
 * Col 3: Decisions & Outputs
 * Col 4: Risks
 */
export function computeRoadmapLayout(nodes = []) {
  if (!nodes || nodes.length === 0) return [];

  const columns = {
    goal: [],
    idea: [],
    question: [],
    task: [],
    decision: [],
    risk: [],
    other: [],
  };

  for (const node of nodes) {
    const type = (node.type || "idea").toLowerCase();
    if (columns[type]) {
      columns[type].push(node);
    } else {
      columns.other.push(node);
    }
  }

  // Define column groupings
  const colGroups = [
    { name: "Goals", items: columns.goal },
    { name: "Concepts & Questions", items: [...columns.idea, ...columns.question] },
    { name: "Execution Tasks", items: [...columns.task, ...columns.other] },
    { name: "Decisions", items: columns.decision },
    { name: "Risks & Blockers", items: columns.risk },
  ].filter((group) => group.items.length > 0);

  const moves = [];

  colGroups.forEach((group, colIdx) => {
    const x = colIdx * COL_STRIDE;
    group.items.forEach((node, rowIdx) => {
      const y = rowIdx * ROW_STRIDE;
      moves.push({ id: node.id, x, y });
    });
  });

  return moves;
}

/**
 * Risks to Right Layout:
 * Moves all type: "risk" nodes to a dedicated column to the right of all other nodes
 */
export function computeRisksRightLayout(nodes = []) {
  if (!nodes || nodes.length === 0) return [];

  const nonRisks = nodes.filter((n) => (n.type || "").toLowerCase() !== "risk");
  const risks = nodes.filter((n) => (n.type || "").toLowerCase() === "risk");

  if (risks.length === 0) {
    return [];
  }

  // Find max X coordinate of existing non-risk nodes
  let maxX = 0;
  let minY = 0;

  if (nonRisks.length > 0) {
    maxX = Math.max(...nonRisks.map((n) => Number(n.x) || 0));
    minY = Math.min(...nonRisks.map((n) => Number(n.y) || 0));
  }

  const riskColX = maxX + COL_STRIDE;
  const moves = [];

  risks.forEach((riskNode, idx) => {
    moves.push({
      id: riskNode.id,
      x: riskColX,
      y: minY + idx * ROW_STRIDE,
    });
  });

  return moves;
}

/**
 * Cluster Layout:
 * Groups cards by type into distinct 2D clusters
 */
export function computeClusterLayout(nodes = []) {
  if (!nodes || nodes.length === 0) return [];

  const typeMap = new Map();
  for (const node of nodes) {
    const type = (node.type || "idea").toLowerCase();
    if (!typeMap.has(type)) typeMap.set(type, []);
    typeMap.get(type).push(node);
  }

  const moves = [];
  const clusterTypes = Array.from(typeMap.keys());
  const clustersPerRow = 3;
  const clusterWidth = COL_STRIDE * 2;
  const clusterHeight = ROW_STRIDE * 3;

  clusterTypes.forEach((type, clusterIdx) => {
    const clusterNodes = typeMap.get(type) || [];
    const clusterCol = clusterIdx % clustersPerRow;
    const clusterRow = Math.floor(clusterIdx / clustersPerRow);

    const originX = clusterCol * clusterWidth;
    const originY = clusterRow * clusterHeight;

    clusterNodes.forEach((node, nodeIdx) => {
      const subCol = nodeIdx % 2;
      const subRow = Math.floor(nodeIdx / 2);
      moves.push({
        id: node.id,
        x: originX + subCol * COL_STRIDE,
        y: originY + subRow * ROW_STRIDE,
      });
    });
  });

  return moves;
}

/**
 * Grid Layout:
 * Arranges nodes into a clean 3-4 column grid
 */
export function computeGridLayout(nodes = [], columnsCount = 3) {
  if (!nodes || nodes.length === 0) return [];

  const cols = Math.max(1, Math.min(6, columnsCount));
  const moves = [];

  nodes.forEach((node, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    moves.push({
      id: node.id,
      x: col * COL_STRIDE,
      y: row * ROW_STRIDE,
    });
  });

  return moves;
}

/**
 * Hierarchical (Dagre-Style) Layout:
 * Arranges nodes in a dependency-aware directed acyclic graph (DAG):
 * 1. Directed prerequisite graph construction (blocks, leads_to, depends_on, part_of).
 * 2. 3-Color DFS cycle breaking: eliminates feedback loops before ranking to prevent recursion crashes.
 * 3. Kahn's Topological Sort: computes exact prerequisite ranks (diamond-safe: A->B, A->C, B->D, C->D => rank(D) = 2).
 * 4. Semantic-Type Fallback for disconnected nodes (goal: 0, idea/question: 1, task: 2, decision: 3, risk: 4).
 * 5. Barycenter crossing minimization: sorts rank members by predecessor position average.
 * 6. Collision-free coordinate bounds: spacing guarantees |xi - xj| >= 280px or |yi - yj| >= 140px.
 */
export function computeHierarchicalLayout(nodes = [], edges = []) {
  if (!nodes || nodes.length === 0) return [];

  const nodeMap = new Map();
  for (const n of nodes) {
    if (n && n.id) {
      nodeMap.set(n.id, n);
    }
  }

  // 1. Build directed prerequisite edges
  // Directed edge u -> v means u is the prerequisite / predecessor of v
  const directedEdges = [];
  const hasDirectedEdge = new Set();

  for (const edge of edges || []) {
    if (!edge || !edge.fromId || !edge.toId || edge.fromId === edge.toId) continue;
    if (!nodeMap.has(edge.fromId) || !nodeMap.has(edge.toId)) continue;

    const edgeType = (edge.type || "").toLowerCase();

    if (edgeType === "blocks" || edgeType === "leads_to") {
      // fromId must precede toId: fromId -> toId
      directedEdges.push({ from: edge.fromId, to: edge.toId });
      hasDirectedEdge.add(edge.fromId);
      hasDirectedEdge.add(edge.toId);
    } else if (edgeType === "depends_on" || edgeType === "part_of") {
      // fromId depends on toId, so toId must precede fromId: toId -> fromId
      directedEdges.push({ from: edge.toId, to: edge.fromId });
      hasDirectedEdge.add(edge.fromId);
      hasDirectedEdge.add(edge.toId);
    }
  }

  // 2. Cycle Detection & Elimination via 3-Color DFS (0=WHITE, 1=GRAY, 2=BLACK)
  const cleanAdj = new Map();
  const color = new Map();

  for (const n of nodes) {
    cleanAdj.set(n.id, new Set());
    color.set(n.id, 0);
  }

  for (const { from, to } of directedEdges) {
    cleanAdj.get(from).add(to);
  }

  function breakCyclesDFS(u) {
    color.set(u, 1); // Mark as currently exploring (GRAY)
    const neighbors = Array.from(cleanAdj.get(u) || []);

    for (const v of neighbors) {
      const vColor = color.get(v);
      if (vColor === 1) {
        // Back-edge detected! Breaking cycle u -> v
        cleanAdj.get(u).delete(v);
      } else if (vColor === 0) {
        breakCyclesDFS(v);
      }
    }

    color.set(u, 2); // Mark as completely finished (BLACK)
  }

  for (const n of nodes) {
    if (color.get(n.id) === 0) {
      breakCyclesDFS(n.id);
    }
  }

  // 3. Compute In-Degrees on the Acyclic Graph
  const inDegree = new Map();
  for (const n of nodes) {
    inDegree.set(n.id, 0);
  }

  for (const [, children] of cleanAdj.entries()) {
    for (const v of children) {
      inDegree.set(v, (inDegree.get(v) || 0) + 1);
    }
  }

  // 4. Kahn's Algorithm for Topological Ranking
  const ranks = new Map();
  const queue = [];

  // Start with nodes that have in-degree 0
  for (const n of nodes) {
    if (inDegree.get(n.id) === 0) {
      queue.push(n.id);
      ranks.set(n.id, 0);
    }
  }

  while (queue.length > 0) {
    const u = queue.shift();
    const uRank = ranks.get(u) ?? 0;
    const children = cleanAdj.get(u) || new Set();

    for (const v of children) {
      const nextRank = Math.max(ranks.get(v) ?? 0, uRank + 1);
      ranks.set(v, nextRank);
      inDegree.set(v, (inDegree.get(v) || 1) - 1);
      if (inDegree.get(v) === 0) {
        queue.push(v);
      }
    }
  }

  // Fallback rank assignment for any unranked nodes (safety guard)
  for (const n of nodes) {
    if (!ranks.has(n.id)) {
      ranks.set(n.id, 0);
    }
  }

  // 5. Semantic-Type Fallback for Disconnected Nodes
  const SEMANTIC_RANKS = {
    goal: 0,
    idea: 1,
    question: 1,
    task: 2,
    decision: 3,
    risk: 4,
  };

  for (const n of nodes) {
    if (!hasDirectedEdge.has(n.id)) {
      const type = (n.type || "idea").toLowerCase();
      const fallbackRank = SEMANTIC_RANKS[type] ?? 1;
      ranks.set(n.id, fallbackRank);
    }
  }

  // 6. Group Nodes by Rank & Apply Barycenter Crossing Minimization
  const maxRank = Math.max(...Array.from(ranks.values()), 0);
  const levels = [];
  for (let r = 0; r <= maxRank; r++) {
    levels[r] = [];
  }

  for (const n of nodes) {
    const r = ranks.get(n.id) ?? 0;
    levels[r].push(n);
  }

  // Build parent map for barycenter calculations: childId -> [parentId]
  const parentMap = new Map();
  for (const n of nodes) {
    parentMap.set(n.id, []);
  }
  for (const [u, children] of cleanAdj.entries()) {
    for (const v of children) {
      parentMap.get(v).push(u);
    }
  }

  // Deterministically sort Rank 0 by existing X coordinate or ID
  levels[0].sort((a, b) => (Number(a.x) || 0) - (Number(b.x) || 0) || a.id.localeCompare(b.id));

  // Barycentric sorting for subsequent levels
  for (let r = 1; r <= maxRank; r++) {
    // Map position indices of nodes in previous level
    const prevLevelPos = new Map();
    levels[r - 1].forEach((node, index) => {
      prevLevelPos.set(node.id, index);
    });

    levels[r].sort((a, b) => {
      const aParents = (parentMap.get(a.id) || []).filter((pId) => prevLevelPos.has(pId));
      const bParents = (parentMap.get(b.id) || []).filter((pId) => prevLevelPos.has(pId));

      const aBary = aParents.length > 0
        ? aParents.reduce((sum, pId) => sum + prevLevelPos.get(pId), 0) / aParents.length
        : (Number(a.x) || 0) / COL_STRIDE;

      const bBary = bParents.length > 0
        ? bParents.reduce((sum, pId) => sum + prevLevelPos.get(pId), 0) / bParents.length
        : (Number(b.x) || 0) / COL_STRIDE;

      if (Math.abs(aBary - bBary) > 0.001) {
        return aBary - bBary;
      }
      return (Number(a.x) || 0) - (Number(b.x) || 0) || a.id.localeCompare(b.id);
    });
  }

  // 7. Spatial Coordinate Assignment with Collision-Free Bounds
  const HIERARCHICAL_ROW_STRIDE = 200; // 140px card height + 60px vertical gap
  const maxRowCols = Math.max(...levels.map((lvl) => lvl.length), 1);
  const totalWidth = maxRowCols * COL_STRIDE;

  const moves = [];

  levels.forEach((lvlNodes, r) => {
    const rowCount = lvlNodes.length;
    if (rowCount === 0) return;

    const rowWidth = rowCount * COL_STRIDE;
    const startX = 40 + (totalWidth - rowWidth) / 2;
    const y = 40 + r * HIERARCHICAL_ROW_STRIDE;

    lvlNodes.forEach((node, colIdx) => {
      const x = startX + colIdx * COL_STRIDE;
      moves.push({
        id: node.id,
        x: Math.round(x),
        y: Math.round(y),
      });
    });
  });

  return moves;
}

/**
 * General layout dispatcher
 * @param {string} layoutType - "hierarchical" | "dagre" | "tree" | "roadmap" | "risks_right" | "cluster" | "grid"
 * @param {Array<object>} nodes
 * @param {Array<object>} edges
 * @returns {Array<{ id: string, x: number, y: number }>}
 */
export function computeLayout(layoutType = "grid", nodes = [], edges = []) {
  const normType = String(layoutType || "grid").toLowerCase().trim();

  switch (normType) {
    case "hierarchical":
    case "dagre":
    case "tree":
    case "dependency":
      return computeHierarchicalLayout(nodes, edges);

    case "roadmap":
    case "timeline":
      return computeRoadmapLayout(nodes);

    case "risks_right":
    case "risks":
      return computeRisksRightLayout(nodes);

    case "cluster":
    case "themes":
    case "group":
      return computeClusterLayout(nodes);

    case "grid":
    default:
      return computeGridLayout(nodes, 3);
  }
}

/**
 * Convert layout movements to validated MOVE_NODE action objects
 */
export function createMoveActionsFromLayout(roomId, nodeMoves = []) {
  return nodeMoves.map((m) => ({
    type: "MOVE_NODE",
    roomId,
    payload: {
      id: m.id,
      x: Math.round(m.x),
      y: Math.round(m.y),
    },
    confidence: 0.9,
    reason: "Layout reorganization",
  }));
}



