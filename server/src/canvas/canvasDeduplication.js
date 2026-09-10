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
        finalActions.push(action);
        resolvedNodes.push({
          id: action.payload.id,
          semanticKey: action.payload.semanticKey,
          text: action.payload.text,
          type: action.payload.type,
          metadata: action.payload.metadata,
        });
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
