import { ACTION_TYPES } from "./canvasActions.js";
import { validateCanvasAction } from "./canvasValidation.js";
import { loadCanvasState, persistCanvasAction } from "./canvasPersistence.js";

const MOVE_DEBOUNCE_MS = 100;

export class CanvasDocument {
  constructor(roomId) {
    this.roomId = roomId;
    this.nodes = new Map();
    this.edges = new Map();
    this.zones = new Map();
    this.isLoaded = false;
    this.loadPromise = null;
    this.pendingWrites = new Map(); // key -> { action, timer }
  }

  /**
   * Load initial canvas state from database into in-memory maps
   */
  async load() {
    if (this.isLoaded) return this;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      const state = await loadCanvasState(this.roomId);
      this.nodes.clear();
      this.edges.clear();
      this.zones.clear();

      for (const node of state.nodes) {
        this.nodes.set(node.id, node);
      }
      for (const edge of state.edges) {
        this.edges.set(edge.id, edge);
      }
      for (const zone of state.zones) {
        this.zones.set(zone.id, zone);
      }

      this.isLoaded = true;
      this.loadPromise = null;
      return this;
    })();

    return this.loadPromise;
  }

  /**
   * Returns authoritative snapshot of canvas state
   */
  getState() {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
      zones: Array.from(this.zones.values()),
    };
  }

  /**
   * Schedule debounced persistence for high-frequency actions (e.g. MOVE_NODE)
   */
  _scheduleDebouncedWrite(key, action) {
    const existing = this.pendingWrites.get(key);
    if (existing) {
      clearTimeout(existing.timer);
    }

    const timer = setTimeout(async () => {
      this.pendingWrites.delete(key);
      try {
        await persistCanvasAction(this.roomId, action);
      } catch (err) {
        console.error(`[CanvasDocument] Failed debounced persist for ${key}:`, err.message);
      }
    }, MOVE_DEBOUNCE_MS);

    this.pendingWrites.set(key, { action, timer });
  }

  /**
   * Cancel and optionally flush a pending debounced write
   */
  async _cancelPendingWrite(key, flush = false) {
    const existing = this.pendingWrites.get(key);
    if (!existing) return;

    clearTimeout(existing.timer);
    this.pendingWrites.delete(key);

    if (flush) {
      try {
        await persistCanvasAction(this.roomId, existing.action);
      } catch (err) {
        console.error(`[CanvasDocument] Failed flush for ${key}:`, err.message);
      }
    }
  }

  /**
   * Immediately flushes all queued debounced writes
   */
  async flushPendingWrites() {
    const writes = Array.from(this.pendingWrites.values());
    this.pendingWrites.clear();

    for (const item of writes) {
      clearTimeout(item.timer);
      try {
        await persistCanvasAction(this.roomId, item.action);
      } catch (err) {
        console.error(`[CanvasDocument] Error flushing pending write:`, err.message);
      }
    }
  }

  /**
   * Apply an atomic canvas action to memory and manage persistence
   * @param {object} action - The canvas action
   * @param {object} options - Options { skipPersistence = false }
   */
  async applyAction(action, { skipPersistence = false } = {}) {
    const validation = validateCanvasAction(action);
    if (!validation.valid) {
      throw new Error(`[CanvasDocument] Invalid action: ${validation.error}`);
    }

    const { type, payload } = action;

    switch (type) {
      case ACTION_TYPES.CREATE_NODE: {
        await this._cancelPendingWrite(payload.id, false);
        const node = {
          id: payload.id,
          roomId: this.roomId,
          text: payload.text || "",
          type: payload.type || "idea",
          semanticKey: payload.semanticKey || null,
          x: payload.x ?? 0,
          y: payload.y ?? 0,
          metadata: payload.metadata || null,
          sourceType: payload.sourceType || "manual",
          sourceId: payload.sourceId || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        if (!skipPersistence) {
          await persistCanvasAction(this.roomId, action);
        }

        this.nodes.set(payload.id, node);
        break;
      }

      case ACTION_TYPES.UPDATE_NODE: {
        await this._cancelPendingWrite(payload.id, false);
        const existingNode = this.nodes.get(payload.id);
        if (!existingNode) {
          // Node was deleted; ignore update to prevent phantom resurrection
          break;
        }
        const updatedNode = {
          ...existingNode,
          ...payload,
          updatedAt: new Date(),
        };

        if (!skipPersistence) {
          await persistCanvasAction(this.roomId, action);
        }

        this.nodes.set(payload.id, updatedNode);
        break;
      }

      case ACTION_TYPES.MOVE_NODE: {
        const existingNode = this.nodes.get(payload.id);
        if (!existingNode) {
          // Node was deleted; ignore move to prevent phantom resurrection
          break;
        }
        existingNode.x = payload.x;
        existingNode.y = payload.y;
        existingNode.updatedAt = new Date();
        this.nodes.set(payload.id, existingNode);

        if (!skipPersistence) {
          this._scheduleDebouncedWrite(payload.id, action);
        }
        break;
      }

      case ACTION_TYPES.DELETE_NODE: {
        await this._cancelPendingWrite(payload.id, false);

        if (!skipPersistence) {
          await persistCanvasAction(this.roomId, action);
        }

        this.nodes.delete(payload.id);

        // In-memory cascade: remove all connected edges
        for (const [edgeId, edge] of this.edges.entries()) {
          if (edge.fromId === payload.id || edge.toId === payload.id) {
            this.edges.delete(edgeId);
          }
        }
        break;
      }

      case ACTION_TYPES.CREATE_EDGE: {
        const edge = {
          id: payload.id,
          roomId: this.roomId,
          fromId: payload.fromId,
          toId: payload.toId,
          label: payload.label || null,
          type: payload.type || "related_to",
          createdAt: new Date(),
        };

        if (!skipPersistence) {
          await persistCanvasAction(this.roomId, action);
        }

        this.edges.set(payload.id, edge);
        break;
      }

      case ACTION_TYPES.DELETE_EDGE: {
        if (!skipPersistence) {
          await persistCanvasAction(this.roomId, action);
        }

        this.edges.delete(payload.id);
        break;
      }

      default:
        throw new Error(`[CanvasDocument] Unrecognized action type: ${type}`);
    }

    return action;
  }

  /**
   * Destroys document and flushes any pending writes
   */
  async destroy() {
    await this.flushPendingWrites();
    this.nodes.clear();
    this.edges.clear();
    this.zones.clear();
    this.isLoaded = false;
  }
}

// Active document cache per room
const activeDocuments = new Map();

/**
 * Gets or initializes authoritative CanvasDocument for a room
 * @param {string} roomId
 * @returns {Promise<CanvasDocument>}
 */
export async function getCanvasDocument(roomId) {
  if (!roomId) throw new Error("[CanvasDocument] roomId is required");

  let doc = activeDocuments.get(roomId);
  if (!doc) {
    doc = new CanvasDocument(roomId);
    activeDocuments.set(roomId, doc);
  }

  if (!doc.isLoaded) {
    await doc.load();
  }

  return doc;
}

/**
 * Synchronously retrieves active CanvasDocument if already loaded
 * @param {string} roomId
 * @returns {CanvasDocument | undefined}
 */
export function getActiveCanvasDocument(roomId) {
  return activeDocuments.get(roomId);
}

/**
 * Closes and removes a CanvasDocument from memory
 * @param {string} roomId
 */
export async function closeCanvasDocument(roomId) {
  const doc = activeDocuments.get(roomId);
  if (doc) {
    await doc.destroy();
    activeDocuments.delete(roomId);
  }
}
