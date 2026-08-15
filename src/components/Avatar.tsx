import { avatarColor, initials } from "../lib/avatar";
import { api } from "../api";
import type { PersonSummary } from "../types";

interface AvatarProps {
  person: Pick<PersonSummary, "id" | "firstName" | "lastName" | "hasPhoto">;
  size?: "sm" | "lg" | "xl";
}

export function Avatar({ person, size }: AvatarProps) {
  const sizeClass = size === "lg" ? "avatar-lg" : size === "xl" ? "avatar-xl" : "";
  if (person.hasPhoto) {
    return (
      <img
        className={`avatar ${sizeClass}`}
        src={api.photoUrl(person.id)}
        alt={`${person.firstName} ${person.lastName ?? ""}`}
      />
    );
  }
  const color = avatarColor(person.firstName, person.lastName);
  return (
    <span
      className={`avatar avatar-fallback ${sizeClass}`}
      style={{ background: color }}
      aria-hidden="true"
    >
      {initials(person.firstName, person.lastName)}
    </span>
  );
}
