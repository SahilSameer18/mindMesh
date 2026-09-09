/**
 * Layout and Geometric Math utilities for MindMesh Infinite Canvas.
 */

/**
 * Snaps a coordinate pair (x, y) to the nearest canvas grid pitch.
 * @param {number} x
 * @param {number} y
 * @param {number} [gridSize=20]
 * @returns {{ x: number, y: number }}
 */
export function gridSnap(x, y, gridSize = 20) {
  return {
    x: Math.round(x / gridSize) * gridSize,
    y: Math.round(y / gridSize) * gridSize,
  };
}

/**
 * Calculates the aggregate bounding box enclosing an array of cards.
 * @param {Array<{ x: number, y: number, width?: number, height?: number }>} cards
 * @returns {{ minX: number, minY: number, maxX: number, maxY: number, width: number, height: number, centerX: number, centerY: number }}
 */
export function calculateBoundingBox(cards = []) {
  if (!cards.length) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0, centerX: 0, centerY: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const card of cards) {
    const cardW = card.width || 260;
    const cardH = card.height || 160;
    minX = Math.min(minX, card.x);
    minY = Math.min(minY, card.y);
    maxX = Math.max(maxX, card.x + cardW);
    maxY = Math.max(maxY, card.y + cardH);
  }

  const width = maxX - minX;
  const height = maxY - minY;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    centerX: minX + width / 2,
    centerY: minY + height / 2,
  };
}

/**
 * Arranges cards in an orderly 2D grid matrix starting from origin.
 * @param {Array<any>} cards
 * @param {object} [options]
 * @param {number} [options.cols=3]
 * @param {number} [options.startX=100]
 * @param {number} [options.startY=100]
 * @param {number} [options.spacingX=300]
 * @param {number} [options.spacingY=200]
 * @returns {Array<{ cardId: string, x: number, y: number }>}
 */
export function arrangeInGrid(cards = [], options = {}) {
  const {
    cols = 3,
    startX = 100,
    startY = 100,
    spacingX = 300,
    spacingY = 200,
  } = options;

  return cards.map((card, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    return {
      id: card.id,
      x: startX + col * spacingX,
      y: startY + row * spacingY,
    };
  });
}

export const layoutEngine = {
  gridSnap,
  calculateBoundingBox,
  arrangeInGrid,
};

export default layoutEngine;


