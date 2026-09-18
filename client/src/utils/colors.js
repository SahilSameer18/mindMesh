// Reuses the same 8 tones already locked in for canvas card types (canvasConstants.js)
// instead of a separate bright SaaS palette — one consistent color language app-wide.
export const AVATAR_PALETTES = [
  "#A8542E", // accent (rust)
  "#f59e0b", // amber
  "#059669", // emerald
  "#e11d48", // rose
  "#3B7A78", // teal
  "#8B5A7C", // plum
  "#B5626F", // clay
  "#475569", // slate
];

export function getUserColor(nameOrId = "") {
  if (!nameOrId) return AVATAR_PALETTES[0];
  let hash = 0;
  for (let i = 0; i < nameOrId.length; i++) {
    hash = nameOrId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[index];
}

export function getUserInitials(name = "User") {
  const trimmed = (name || "").trim();
  return trimmed ? trimmed[0].toUpperCase() : "U";
}

export const NODE_COLORS = {};
