const COLORS = [
  "#209dd7",
  "#753991",
  "#e07b39",
  "#2e9e6b",
  "#c0392b",
  "#8e6f3a",
  "#d35400",
  "#16697a",
  "#6a3093",
  "#a3543c",
];

export function nameColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return COLORS[hash % COLORS.length];
}

export function initials(firstName: string, lastName: string | null): string {
  const first = (firstName || "?").trim().charAt(0).toUpperCase();
  const last = (lastName || "").trim().charAt(0).toUpperCase();
  return first + (last || "");
}

export function fullName(firstName: string, lastName: string | null): string {
  return [firstName, lastName].filter(Boolean).join(" ");
}

export function avatarColor(firstName: string, lastName: string | null): string {
  return nameColor(fullName(firstName, lastName));
}
