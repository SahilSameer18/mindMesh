import { memo, useState, useEffect } from "react";

/**
 * World-class Multiplayer Cursors Layer
 * Renders real-time remote peer cursors in canvas coordinate space with
 * custom tinted SVG pointers, user name tags, and smooth glide transitions.
 */
function CursorItem({ cursor }) {
  const { user, x, y, timestamp } = cursor;
  const color = user?.color || "#8b5cf6";
  const name = user?.name || "Collaborator";
  const role = user?.role;

  const [isIdle, setIsIdle] = useState(false);

  useEffect(() => {
    setIsIdle(false);
    const timer = setTimeout(() => {
      setIsIdle(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, [x, y, timestamp]);

  return (
    <div
      className={`absolute top-0 left-0 pointer-events-none will-change-transform z-30 transition-opacity duration-300 ${
        isIdle ? "opacity-0" : "opacity-100"
      }`}
      style={{
        transform: `translate3d(${x}px, ${y}px, 0)`,
        transition: "transform 40ms linear, opacity 300ms ease-out",
      }}
    >
      {/* Sleek SVG Cursor Arrow */}
      <svg
        className="w-5 h-5 drop-shadow-md"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ transform: "rotate(-10deg) translate(-2px, -2px)" }}
      >
        <path
          d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z"
          fill={color}
          stroke="#0f172a"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>

      {/* User Name & Role Pill Badge */}
      <div
        className="absolute left-4 top-3 px-2 py-0.5 rounded-full text-[11px] font-medium text-white shadow-lg whitespace-nowrap flex items-center gap-1.5 border border-white/20 select-none"
        style={{ backgroundColor: color }}
      >
        <span>{name}</span>
        {role && (
          <span className="opacity-75 text-[9px] font-normal border-l border-white/30 pl-1">
            {role}
          </span>
        )}
      </div>
    </div>
  );
}

const MemoizedCursorItem = memo(CursorItem);

export function MultiplayerCursors({ cursors = [] }) {
  if (!cursors || cursors.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-visible">
      {cursors.map((cursor) => (
        <MemoizedCursorItem key={cursor.socketId} cursor={cursor} />
      ))}
    </div>
  );
}

export default memo(MultiplayerCursors);
