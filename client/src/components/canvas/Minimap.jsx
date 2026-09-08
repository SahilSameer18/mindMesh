import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { Maximize2, Minimize2, Compass } from "lucide-react";
import { NODE_TYPES } from "../../utils/canvasConstants.js";

const RADAR_WIDTH = 210;
const RADAR_HEIGHT = 135;

// Color mapping for miniature node chips
const NODE_COLOR_MAP = {
  [NODE_TYPES.GOAL]: "#06b6d4",
  [NODE_TYPES.IDEA]: "#eab308",
  [NODE_TYPES.TASK]: "#22c55e",
  [NODE_TYPES.DECISION]: "#3b82f6",
  [NODE_TYPES.QUESTION]: "#a855f7",
  [NODE_TYPES.RISK]: "#ef4444",
  [NODE_TYPES.PERSON]: "#ec4899",
  [NODE_TYPES.IMAGE]: "#8b5cf6",
};

export function Minimap({
  nodes = [],
  viewport = { x: 0, y: 0, zoom: 1 },
  peerViewports = [],
  containerRef = null,
  containerRect = null,
  flyTo = null,
  setViewportDirect = null,
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const radarRef = useRef(null);
  const isDraggingRef = useRef(false);

  // Dynamic, reactive container dimensions tracking window resize and layout shifts
  const [containerSize, setContainerSize] = useState(() => {
    if (containerRect?.width && containerRect?.height) {
      return { width: containerRect.width, height: containerRect.height };
    }
    if (typeof window !== "undefined") {
      return { width: window.innerWidth, height: window.innerHeight };
    }
    return { width: 1200, height: 800 };
  });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef?.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setContainerSize({ width: rect.width, height: rect.height });
          return;
        }
      }
      if (typeof window !== "undefined") {
        setContainerSize({ width: window.innerWidth, height: window.innerHeight });
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [containerRef]);

  // Helper to read the freshest container rectangle at the exact moment of interaction
  const getFreshDimensions = useCallback(() => {
    if (containerRef?.current) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return { width: rect.width, height: rect.height };
      }
    }
    if (containerRect?.width && containerRect?.height) {
      return { width: containerRect.width, height: containerRect.height };
    }
    return containerSize;
  }, [containerRef, containerRect, containerSize]);

  // 1. Calculate global canvas bounding box with 0-node and 1-node fallbacks
  const { box, scale, offsetX, offsetY } = useMemo(() => {
    if (!nodes || nodes.length === 0) {
      const b = { minX: -1000, minY: -750, maxX: 1000, maxY: 750, width: 2000, height: 1500 };
      const s = Math.min(RADAR_WIDTH / Math.max(b.width, 1200), RADAR_HEIGHT / Math.max(b.height, 800));
      return {
        box: b,
        scale: s,
        offsetX: (RADAR_WIDTH - b.width * s) / 2,
        offsetY: (RADAR_HEIGHT - b.height * s) / 2,
      };
    }

    if (nodes.length === 1) {
      const n = nodes[0];
      const nx = Number(n.x) || 0;
      const ny = Number(n.y) || 0;
      const b = {
        minX: nx - 600,
        maxX: nx + 600,
        minY: ny - 400,
        maxY: ny + 400,
        width: 1200,
        height: 800,
      };
      const s = Math.min(RADAR_WIDTH / b.width, RADAR_HEIGHT / b.height);
      return {
        box: b,
        scale: s,
        offsetX: (RADAR_WIDTH - b.width * s) / 2,
        offsetY: (RADAR_HEIGHT - b.height * s) / 2,
      };
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const node of nodes) {
      const nx = Number(node.x) || 0;
      const ny = Number(node.y) || 0;
      if (nx < minX) minX = nx;
      if (ny < minY) minY = ny;
      if (nx > maxX) maxX = nx;
      if (ny > maxY) maxY = ny;
    }

    const padding = 250;
    const b = {
      minX: minX - padding,
      maxX: maxX + padding,
      minY: minY - padding,
      maxY: maxY + padding,
      width: Math.max(maxX - minX + padding * 2, 1200),
      height: Math.max(maxY - minY + padding * 2, 800),
    };
    const s = Math.min(RADAR_WIDTH / b.width, RADAR_HEIGHT / b.height);
    return {
      box: b,
      scale: s,
      offsetX: (RADAR_WIDTH - b.width * s) / 2,
      offsetY: (RADAR_HEIGHT - b.height * s) / 2,
    };
  }, [nodes]);

  // Coordinate helper: Canvas coordinate (x, y) -> Minimap pixel (rx, ry)
  const toRadarCoords = useCallback(
    (canvasX, canvasY) => ({
      rx: (canvasX - box.minX) * scale + offsetX,
      ry: (canvasY - box.minY) * scale + offsetY,
    }),
    [box, scale, offsetX, offsetY]
  );

  // Coordinate helper: Minimap pixel (rx, ry) -> Canvas coordinate (cx, cy)
  const toCanvasCoords = useCallback(
    (radarX, radarY) => ({
      cx: (radarX - offsetX) / scale + box.minX,
      cy: (radarY - offsetY) / scale + box.minY,
    }),
    [box, scale, offsetX, offsetY]
  );

  // 2. Compute current user camera rectangle in minimap space
  const userCameraRect = useMemo(() => {
    const { width: cWidth, height: cHeight } = getFreshDimensions();

    const canvasLeft = -viewport.x / viewport.zoom;
    const canvasTop = -viewport.y / viewport.zoom;
    const canvasWidth = cWidth / viewport.zoom;
    const canvasHeight = cHeight / viewport.zoom;

    const topLeft = toRadarCoords(canvasLeft, canvasTop);
    const w = canvasWidth * scale;
    const h = canvasHeight * scale;

    return {
      x: topLeft.rx,
      y: topLeft.ry,
      width: Math.max(w, 8),
      height: Math.max(h, 6),
    };
  }, [viewport, getFreshDimensions, scale, toRadarCoords]);

  // 3. Interactive jump / drag navigation
  const handleJumpTo = useCallback(
    (clientX, clientY, isContinuous = false) => {
      if (!radarRef.current) return;
      const rect = radarRef.current.getBoundingClientRect();
      const clickRx = clientX - rect.left;
      const clickRy = clientY - rect.top;

      const { cx, cy } = toCanvasCoords(clickRx, clickRy);
      const { width: cWidth, height: cHeight } = getFreshDimensions();

      const targetViewportX = cWidth / 2 - cx * viewport.zoom;
      const targetViewportY = cHeight / 2 - cy * viewport.zoom;

      if (isContinuous && setViewportDirect) {
        setViewportDirect(targetViewportX, targetViewportY, viewport.zoom);
      } else if (flyTo) {
        flyTo(targetViewportX, targetViewportY, viewport.zoom, 250);
      } else if (setViewportDirect) {
        setViewportDirect(targetViewportX, targetViewportY, viewport.zoom);
      }
    },
    [getFreshDimensions, viewport.zoom, toCanvasCoords, flyTo, setViewportDirect]
  );

  const handlePointerDown = (e) => {
    e.stopPropagation();
    isDraggingRef.current = true;
    handleJumpTo(e.clientX, e.clientY, false);
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current) return;
    e.stopPropagation();
    handleJumpTo(e.clientX, e.clientY, true);
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  return (
    <aside
      aria-label="Canvas Minimap"
      className="fixed bottom-6 right-6 z-40 select-none transition-all duration-300 pointer-events-auto"
    >
      <div className="bg-surface/90 backdrop-blur-xl border border-border-subtle rounded-2xl shadow-elevated p-2.5 overflow-hidden">
        {/* Radar Header */}
        <div className="flex items-center justify-between px-1 pb-1.5 border-b border-border-subtle text-[11px] font-medium text-text-main">
          <div className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-violet-500" />
            <span>Radar Minimap</span>
            <span className="text-[10px] text-text-muted font-normal">
              ({nodes.length} {nodes.length === 1 ? "node" : "nodes"})
            </span>
          </div>
          <button
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="p-1 text-text-muted hover:text-text-main rounded transition-colors"
            title={isCollapsed ? "Expand minimap" : "Collapse minimap"}
          >
            {isCollapsed ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
          </button>
        </div>

        {/* Radar Viewport Body */}
        {!isCollapsed && (
          <div
            ref={radarRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className="relative cursor-crosshair rounded-xl mt-2 bg-slate-100/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-inner"
            style={{ width: `${RADAR_WIDTH}px`, height: `${RADAR_HEIGHT}px` }}
          >
            {/* Blueprint grid pattern */}
            <div
              className="absolute inset-0 opacity-25 pointer-events-none"
              style={{
                backgroundImage: "radial-gradient(circle, rgba(99, 102, 241, 0.4) 1px, transparent 1px)",
                backgroundSize: "14px 14px",
              }}
            />

            {/* Miniature Node Dots */}
            {nodes.map((node) => {
              const { rx, ry } = toRadarCoords(Number(node.x) || 0, Number(node.y) || 0);
              const nodeColor = NODE_COLOR_MAP[node.type] || "#8b5cf6";
              return (
                <div
                  key={node.id}
                  className="absolute w-2 h-1.5 rounded-full pointer-events-none transition-transform"
                  style={{
                    left: `${rx}px`,
                    top: `${ry}px`,
                    backgroundColor: nodeColor,
                    boxShadow: `0 0 6px ${nodeColor}88`,
                  }}
                />
              );
            })}

            {/* Peer Camera Viewports */}
            {peerViewports.map((pv) => {
              if (!pv?.viewport) return null;
              const { x: px, y: py, zoom: pZoom, width: pw = 1200, height: ph = 800 } = pv.viewport;
              const pCanvasLeft = -px / (pZoom || 1);
              const pCanvasTop = -py / (pZoom || 1);
              const pTopLeft = toRadarCoords(pCanvasLeft, pCanvasTop);
              const pW = (pw / (pZoom || 1)) * scale;
              const pH = (ph / (pZoom || 1)) * scale;
              const pColor = pv.user?.color || "#06b6d4";

              return (
                <div
                  key={pv.socketId}
                  className="absolute pointer-events-none rounded border border-dashed transition-all"
                  style={{
                    left: `${pTopLeft.rx}px`,
                    top: `${pTopLeft.ry}px`,
                    width: `${Math.max(pW, 8)}px`,
                    height: `${Math.max(pH, 6)}px`,
                    borderColor: pColor,
                    backgroundColor: `${pColor}12`,
                  }}
                >
                  <span
                    className="absolute -top-3.5 left-0 text-[8px] font-bold px-1 rounded text-white whitespace-nowrap opacity-80"
                    style={{ backgroundColor: pColor }}
                  >
                    {pv.user?.name?.slice(0, 8) || "Peer"}
                  </span>
                </div>
              );
            })}

            {/* Current User Camera Rectangle */}
            <div
              className="absolute pointer-events-none rounded-lg border-2 border-violet-500 bg-violet-500/10 shadow-[0_0_8px_rgba(139,92,246,0.25)] transition-all"
              style={{
                left: `${userCameraRect.x}px`,
                top: `${userCameraRect.y}px`,
                width: `${userCameraRect.width}px`,
                height: `${userCameraRect.height}px`,
              }}
            >
              <div className="absolute inset-0 border border-violet-400/30 rounded-md" />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

export default Minimap;
