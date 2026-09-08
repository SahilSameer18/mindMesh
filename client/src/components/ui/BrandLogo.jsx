/**
 * mindMesh Official Brand Mark
 * Clean, geometric interconnected knowledge mesh representing nodes and semantic relationships.
 */
export default function BrandLogo({ className = "w-4 h-4", size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="mindMesh Logo"
    >
      {/* Outer Interconnected Triangular Mesh */}
      <circle cx="12" cy="4" r="2.5" fill="currentColor" />
      <circle cx="4.5" cy="19" r="2.5" fill="currentColor" />
      <circle cx="19.5" cy="19" r="2.5" fill="currentColor" />
      
      {/* Outer Edge Lines */}
      <line
        x1="12"
        y1="4"
        x2="4.5"
        y2="19"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeOpacity="0.85"
      />
      <line
        x1="12"
        y1="4"
        x2="19.5"
        y2="19"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeOpacity="0.85"
      />
      <line
        x1="4.5"
        y1="19"
        x2="19.5"
        y2="19"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeOpacity="0.85"
      />

      {/* Center Synthesis Node */}
      <circle cx="12" cy="14" r="1.75" fill="currentColor" />
      <line
        x1="12"
        y1="4"
        x2="12"
        y2="14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="2 2"
        strokeOpacity="0.9"
      />
      <line
        x1="4.5"
        y1="19"
        x2="12"
        y2="14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="2 2"
        strokeOpacity="0.9"
      />
      <line
        x1="19.5"
        y1="19"
        x2="12"
        y2="14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="2 2"
        strokeOpacity="0.9"
      />
    </svg>
  );
}
