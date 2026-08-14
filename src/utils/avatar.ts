const PALETTE_COLORS = [
  '#209dd7', // brand blue
  '#ecad0a', // brand amber
  '#753991', // brand purple
  '#0d9488', // teal
  '#e11d48', // rose
  '#0284c7', // sky
  '#4f46e5', // indigo
  '#16a34a', // green
];

export function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getColorForName(name: string): string {
  if (!name) return PALETTE_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PALETTE_COLORS.length;
  return PALETTE_COLORS[index];
}
