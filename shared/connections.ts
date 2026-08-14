import type { ConnectionType } from "./types.ts";
import { CONNECTION_LABELS } from "./types.ts";

export const CONNECTION_INVERSE: Record<ConnectionType, ConnectionType> = {
  partner: "partner",
  parent: "child",
  child: "parent",
  sibling: "sibling",
  colleague: "colleague",
  introduced: "introduced",
};

export function displayTypeForViewer(
  storedType: ConnectionType,
  viewerIsFrom: boolean,
): ConnectionType {
  if (viewerIsFrom) return storedType;
  if (storedType === "introduced") return "introduced";
  return CONNECTION_INVERSE[storedType];
}

export function connectionPhrase(
  storedType: ConnectionType,
  viewerIsFrom: boolean,
  otherName: string,
): string {
  if (storedType === "introduced") {
    return viewerIsFrom ? `Introduced me to ${otherName}` : `Introduced by ${otherName}`;
  }
  const type = displayTypeForViewer(storedType, viewerIsFrom);
  return CONNECTION_LABELS[type];
}

export function displayLabel(
  storedType: ConnectionType,
  viewerIsFrom: boolean,
): string {
  if (storedType === "introduced") {
    return viewerIsFrom ? "Introduced me to" : "Introduced by";
  }
  return CONNECTION_LABELS[displayTypeForViewer(storedType, viewerIsFrom)];
}
