/**
 * Reusable Skeleton Loader component adhering to mindMesh design system.
 * Preferred over raw spinners to deliver seamless perceived performance.
 */
export default function SkeletonLoader({
  variant = "text",
  count = 1,
  className = "",
  height,
  width,
}) {
  const items = Array.from({ length: Math.max(1, count) });

  if (variant === "circle") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {items.map((_, i) => (
          <div
            key={i}
            className="rounded-full bg-surface-subtle/90 animate-pulse border border-border-subtle/40 shrink-0"
            style={{
              width: width || "32px",
              height: height || width || "32px",
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className={`grid gap-4 ${className}`}>
        {items.map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-2xl bg-surface border border-border-subtle/60 shadow-subtle space-y-3 animate-pulse"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-surface-subtle" />
                <div className="space-y-1">
                  <div className="h-3.5 w-24 rounded bg-surface-subtle" />
                  <div className="h-2.5 w-16 rounded bg-surface-subtle/70" />
                </div>
              </div>
              <div className="h-5 w-14 rounded-full bg-surface-subtle/60" />
            </div>
            <div className="space-y-2 pt-1">
              <div className="h-3 w-full rounded bg-surface-subtle/80" />
              <div className="h-3 w-4/5 rounded bg-surface-subtle/60" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "workspace") {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
        {items.map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-surface border border-border-subtle shadow-subtle space-y-4 animate-pulse"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-surface-subtle" />
              <div className="h-4 w-16 rounded-md bg-surface-subtle/60" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-3/4 rounded bg-surface-subtle" />
              <div className="h-3 w-1/2 rounded bg-surface-subtle/70" />
            </div>
            <div className="pt-2 border-t border-border-subtle/50 flex items-center justify-between">
              <div className="h-3 w-20 rounded bg-surface-subtle/60" />
              <div className="h-3 w-12 rounded bg-surface-subtle/60" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Default: text line(s)
  return (
    <div className={`space-y-2 ${className}`}>
      {items.map((_, i) => (
        <div
          key={i}
          className="rounded-md bg-surface-subtle/90 animate-pulse"
          style={{
            height: height || "14px",
            width: width || (i === items.length - 1 && items.length > 1 ? "70%" : "100%"),
          }}
        />
      ))}
    </div>
  );
}

export { SkeletonLoader };