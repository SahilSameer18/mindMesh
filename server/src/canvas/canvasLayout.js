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
 * General layout dispatcher
 * @param {string} layoutType - "roadmap" | "risks_right" | "cluster" | "grid"
 * @param {Array<object>} nodes
 * @param {Array<object>} edges
 * @returns {Array<{ id: string, x: number, y: number }>}
 */
export function computeLayout(layoutType = "grid", nodes = [], edges = []) {
  const normType = String(layoutType || "grid").toLowerCase().trim();

  switch (normType) {
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
