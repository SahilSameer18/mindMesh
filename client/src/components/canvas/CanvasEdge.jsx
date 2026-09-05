import { memo } from "react";
import { EDGE_CONFIGS, EDGE_TYPES } from "../../utils/canvasConstants.js";
import { X } from "lucide-react";

const NODE_WIDTH = 256;
const NODE_HEIGHT = 96;

function CanvasEdgeComponent({
  edge,
  fromNode,
  toNode,
  isSelected,
  onSelect,
  onDelete,
}) {
  if (!fromNode || !toNode) return null;

  // Determine closest connection points
  const fromCenterX = fromNode.x + NODE_WIDTH / 2;
  const fromCenterY = fromNode.y + NODE_HEIGHT / 2;
  const toCenterX = toNode.x + NODE_WIDTH / 2;
  const toCenterY = toNode.y + NODE_HEIGHT / 2;

  let x1, y1, x2, y2;

  if (toCenterX > fromCenterX) {
    // Left-to-right connection
    x1 = fromNode.x + NODE_WIDTH;
    y1 = fromCenterY;
    x2 = toNode.x;
    y2 = toCenterY;
  } else {
    // Right-to-left connection
    x1 = fromNode.x;
    y1 = fromCenterY;
    x2 = toNode.x + NODE_WIDTH;
    y2 = toCenterY;
  }

  const dx = Math.max(Math.abs(x2 - x1) * 0.45, 50);
  const pathD = `M ${x1} ${y1} C ${x1 + (x2 > x1 ? dx : -dx)} ${y1}, ${x2 - (x2 > x1 ? dx : -dx)} ${y2}, ${x2} ${y2}`;

  // Cubic Bezier midpoint calculation for t = 0.5
  // B(0.5) = 0.125*P0 + 0.375*P1 + 0.375*P2 + 0.125*P3
  const cp1x = x1 + (x2 > x1 ? dx : -dx);
  const cp1y = y1;
  const cp2x = x2 - (x2 > x1 ? dx : -dx);
  const cp2y = y2;

  const midX = 0.125 * x1 + 0.375 * cp1x + 0.375 * cp2x + 0.125 * x2;
  const midY = 0.125 * y1 + 0.375 * cp1y + 0.375 * cp2y + 0.125 * y2;

  const config = EDGE_CONFIGS[edge.type] || EDGE_CONFIGS[EDGE_TYPES.RELATED_TO];
  const strokeColor = config.color || "#64748b";
  const displayLabel = edge.label || config.label;

  return (
    <g
      id={`canvas-edge-${edge.id}`}
      className="group cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        onSelect(edge.id);
      }}
    >
      {/* Invisible wider hit-area path for easy clicking */}
      <path
        d={pathD}
        fill="none"
        stroke="transparent"
        strokeWidth={18}
        className="cursor-pointer"
      />

      {/* Main Bezier Line */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={isSelected ? 3.5 : config.strokeWidth || 2}
        strokeDasharray={config.strokeDasharray}
        className="transition-all duration-150 group-hover:stroke-sky-300"
        strokeLinecap="round"
      />

      {/* Subtle Glow layer when selected */}
      {isSelected && (
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth={7}
          strokeOpacity={0.3}
          strokeLinecap="round"
        />
      )}

      {/* Centered Badge Label */}
      <foreignObject
        x={midX - 55}
        y={midY - 14}
        width={110}
        height={28}
        className="overflow-visible pointer-events-auto"
      >
        <div
          className={`inline-flex items-center justify-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border backdrop-blur-md shadow-md transition-transform group-hover:scale-105 ${
            isSelected
              ? "bg-slate-900 border-sky-400 text-sky-300"
              : "bg-slate-950/85 border-slate-700/80 text-slate-300 hover:border-slate-500"
          }`}
          style={{ borderColor: isSelected ? undefined : strokeColor }}
        >
          <span className="truncate max-w-[70px]">{displayLabel}</span>
          <button
            type="button"
            title="Delete connection"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(edge.id);
            }}
            className="text-slate-400 hover:text-rose-400 p-0.5 rounded transition-colors"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      </foreignObject>
    </g>
  );
}

export const CanvasEdge = memo(CanvasEdgeComponent);
