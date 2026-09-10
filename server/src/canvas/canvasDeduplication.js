/**
 * mindMesh — Canvas Entity Deduplication & In-Place Mutation Resolver
 * Matches incoming AI actions against active canvas state via semanticKey and fuzzy text overlap.
 * Prevents node duplication when users amend or elaborate on ideas.
 */

/**
 * Tokenize and normalize string for similarity comparison
 */
function tokenize(str) {
  if (!str || typeof str !== "string") return new Set();
  return new Set(
    str
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
}

/**
 * Calculate Jaccard similarity between two token sets
 */
function tokenSimilarity(tokensA, tokensB) {
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersection++;
  }
  const union = tokensA.size + tokensB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Locate a matching existing node using semanticKey or token similarity
 */
export function findMatchingNode(existingNodes = [], targetKey = "", targetText = "") {
  if (!existingNodes || existingNodes.length === 0) return null;

  const normKey = (targetKey || "").toLowerCase().trim();
  const targetTokens = tokenize(targetText || targetKey);

  // 1. Exact semanticKey match
  if (normKey) {
    const keyMatch = existingNodes.find(
      (n) => (n.semanticKey && n.semanticKey.toLowerCase() === normKey) || n.id === normKey
    );
    if (keyMatch) return keyMatch;
  }

  // 2. High text similarity match (> 0.6 Jaccard coefficient)
  let bestMatch = null;
  let highestScore = 0;

  for (const node of existingNodes) {
    const nodeTokens = tokenize(node.text + " " + (node.semanticKey || ""));
    const score = tokenSimilarity(targetTokens, nodeTokens);
    if (score > highestScore && score >= 0.6) {
      highestScore = score;
      bestMatch = node;
    }
  }

  return bestMatch;
}

/**
 * Detect if a CREATE_NODE belongs to an active agenda topic pillar on the canvas.
 * Matches via explicit matchedTopicKey or semantic token similarity.
 */
export function findMatchingAgendaPillar(action, resolvedNodes = []) {
  if (!action || !action.payload) return null;
  const pillars = resolvedNodes.filter(
    (n) => n.metadata?.isAgendaTopic || (n.type === "goal" && typeof n.y === "number" && n.y <= -100)
  );
  if (pillars.length === 0) return null;

  const { matchedTopicKey, semanticKey, text, metadata } = action.payload;
  const reason = action.reason || "";
  const targetTokens = tokenize(`${text} ${semanticKey || ""} ${reason}`);

  // 1. Explicit AI matchedTopicKey match
  const explicitKey = matchedTopicKey || metadata?.matchedTopicKey || metadata?.parentTopicKey;
  if (explicitKey && typeof explicitKey === "string") {
    const keyNorm = explicitKey.toLowerCase().trim();
    const exactPillar = pillars.find(
      (p) => (p.semanticKey && p.semanticKey.toLowerCase() === keyNorm) ||
             (p.id && p.id.toLowerCase() === keyNorm)
    );
    if (exactPillar) return exactPillar;
  }

  // 2. High semantic token overlap with a pillar's title or description
  let bestPillar = null;
  let highestScore = 0;

  for (const pillar of pillars) {
    const pillarTokens = tokenize(`${pillar.text} ${pillar.semanticKey || ""} ${pillar.metadata?.description || ""}`);
    const score = tokenSimilarity(targetTokens, pillarTokens);
    // Threshold (> 0.20 on meaningful words) guarantees real thematic connection while blocking general fluff
    if (score > highestScore && score >= 0.20) {
      highestScore = score;
      bestPillar = pillar;
    }
  }

  return bestPillar;
}

/**
 * Process a batch of validated AIActions against active canvas state:
 * - Turns duplicate CREATE_NODE into in-place UPDATE_NODE when user corrects/amends details
 * - Resolves semanticKeys in CREATE_EDGE to concrete node IDs
 * - Drops redundant duplicate edges
 */
export function deduplicateAndLinkActions(actions = [], existingNodes = [], existingEdges = []) {
  const resolvedNodes = [...existingNodes];
  const finalActions = [];
  const edgeSet = new Set(
    existingEdges.map((e) => `${e.fromId}->${e.toId}:${e.type || ""}`)
  );

  for (const action of actions) {
    if (action.type === "CREATE_NODE") {
      const { text, semanticKey, type, metadata } = action.payload;
      const matched = findMatchingNode(resolvedNodes, semanticKey, text);

      if (matched) {
        // Concept already exists on canvas!
        // Check if there are updated attributes (e.g. assignee, status, priority, or revised text)
        const oldMeta = matched.metadata || {};
        const newMeta = metadata || {};
        const metadataChanged = Object.keys(newMeta).some(
          (k) => newMeta[k] !== undefined && newMeta[k] !== oldMeta[k]
        );
        const textChanged = text && text.toLowerCase().trim() !== matched.text.toLowerCase().trim();

        if (metadataChanged || textChanged) {
          // Convert to in-place UPDATE_NODE targeting the matched node's ID
          const updatedPayload = {
            id: matched.id,
            semanticKey: matched.semanticKey || semanticKey,
            text: textChanged ? text : matched.text,
            metadata: {
              ...oldMeta,
              ...newMeta,
            },
          };

          finalActions.push({
            ...action,
            type: "UPDATE_NODE",
            payload: updatedPayload,
            reason: `In-place revision: ${action.reason || "updated entity details"}`,
          });

          // Update local shadow array for subsequent actions in this batch
          matched.text = updatedPayload.text;
          matched.metadata = updatedPayload.metadata;
        } else {
          // Pure identical duplicate mention; drop to prevent clutter
          continue;
        }
      } else {
        // Brand new concept
        // Check if this node belongs to an active agenda topic pillar
        const matchedPillar = findMatchingAgendaPillar(action, resolvedNodes);
        if (matchedPillar) {
          // 1. Deterministically snap X coordinate to pillar's column
          action.payload.x = matchedPillar.x;

          // 2. Cascade Y coordinate vertically under existing nodes in this column
          const columnNodes = resolvedNodes.filter(
            (n) => n.id !== matchedPillar.id && typeof n.x === "number" && Math.abs(n.x - matchedPillar.x) <= 60 && n.y > matchedPillar.y
          );
          const maxY = columnNodes.length > 0 ? Math.max(...columnNodes.map((n) => n.y)) : matchedPillar.y;
          action.payload.y = maxY + 180;

          if (!action.payload.metadata) action.payload.metadata = {};
          action.payload.metadata.parentTopicKey = matchedPillar.semanticKey || matchedPillar.id;

          finalActions.push(action);
          resolvedNodes.push({
            id: action.payload.id,
            semanticKey: action.payload.semanticKey,
            text: action.payload.text,
            type: action.payload.type,
            metadata: action.payload.metadata,
            x: action.payload.x,
            y: action.payload.y,
          });

          // 3. Synthesize the hierarchical part_of relationship edge
          const edgeId = `edge-${action.payload.id}-${matchedPillar.id}`;
          const edgeAction = {
            type: "CREATE_EDGE",
            confidence: 0.95,
            status: "auto",
            reason: `Hierarchical cascade: part_of ${matchedPillar.text}`,
            payload: {
              id: edgeId,
              fromId: action.payload.id,
              toId: matchedPillar.id,
              fromSemanticKey: action.payload.semanticKey,
              toSemanticKey: matchedPillar.semanticKey || matchedPillar.id,
              type: "part_of",
              label: "part_of",
            },
          };

          const edgeSig = `${action.payload.id}->${matchedPillar.id}:part_of`;
          if (!edgeSet.has(edgeSig)) {
            edgeSet.add(edgeSig);
            finalActions.push(edgeAction);
          }
        } else {
          finalActions.push(action);
          resolvedNodes.push({
            id: action.payload.id,
            semanticKey: action.payload.semanticKey,
            text: action.payload.text,
            type: action.payload.type,
            metadata: action.payload.metadata,
            x: action.payload.x,
            y: action.payload.y,
          });
        }
      }
    } else if (action.type === "UPDATE_NODE") {
      const { id, semanticKey, metadata, text } = action.payload;
      let targetNode = null;
      if (id) {
        targetNode = resolvedNodes.find((n) => n.id === id);
      }
      if (!targetNode && semanticKey) {
        targetNode = findMatchingNode(resolvedNodes, semanticKey, text || "");
      }

      if (targetNode) {
        action.payload.id = targetNode.id;
        if (metadata) {
          action.payload.metadata = {
            ...(targetNode.metadata || {}),
            ...metadata,
          };
          targetNode.metadata = action.payload.metadata;
        }
        finalActions.push(action);
      } else {
        console.warn(`[Deduplication] Dropped UPDATE_NODE because target could not be found:`, action.payload);
      }
    } else if (action.type === "DELETE_NODE") {
      const { id, semanticKey, text } = action.payload || {};
      let targetNode = id
        ? resolvedNodes.find((n) => n.id === id)
        : null;
      if (!targetNode && semanticKey) {
        targetNode = findMatchingNode(resolvedNodes, semanticKey, text || "");
      }

      if (targetNode) {
        action.payload.id = targetNode.id;
        finalActions.push(action);
        // Keep the shadow array consistent for any later action in this same batch
        const idx = resolvedNodes.indexOf(targetNode);
        if (idx !== -1) resolvedNodes.splice(idx, 1);
      } else {
        console.warn(`[Deduplication] Dropped DELETE_NODE because target could not be found:`, action.payload);
      }
    } else if (action.type === "CREATE_EDGE") {
      const payload = action.payload;
      let fromNode = null;
      let toNode = null;

      const fromKey = payload.fromSemanticKey || payload.from;
      const toKey = payload.toSemanticKey || payload.to;

      if (payload.fromId) {
        fromNode = resolvedNodes.find((n) => n.id === payload.fromId);
      } else if (fromKey) {
        fromNode = findMatchingNode(resolvedNodes, fromKey);
      }

      if (payload.toId) {
        toNode = resolvedNodes.find((n) => n.id === payload.toId);
      } else if (toKey) {
        toNode = findMatchingNode(resolvedNodes, toKey);
      }

      if (fromNode && toNode && fromNode.id !== toNode.id) {
        payload.fromId = fromNode.id;
        payload.toId = toNode.id;

        const edgeSignature = `${payload.fromId}->${payload.toId}:${payload.type || ""}`;
        if (!edgeSet.has(edgeSignature)) {
          edgeSet.add(edgeSignature);
          finalActions.push(action);
        }
      } else {
        console.warn(`[Deduplication] Dropped CREATE_EDGE because nodes could not be resolved:`, payload);
      }
    } else {
      finalActions.push(action);
    }
  }

  return finalActions;
}
