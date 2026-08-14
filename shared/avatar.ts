export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  "#1f6f8b",
  "#c9842a",
  "#3d6b4f",
  "#8a3d4a",
  "#2c4a6e",
  "#6b4c2a",
  "#4a5d4a",
  "#7a3e6b",
  "#3a5a6a",
  "#9a4d2e",
  "#2f5d50",
  "#5c4d7a",
];

export function colorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 33 + name.charCodeAt(i)) >>> 0;
  }
  return hash;
}
