import { colorFromName, initials } from "@shared/avatar";
import { photoUrl } from "../api";

export function Avatar({
  person,
  size = 40,
  className = "",
}: {
  person: { id: string; name: string; hasPhoto: boolean; updatedAt?: string };
  size?: number;
  className?: string;
}) {
  if (person.hasPhoto) {
    return (
      <img
        src={photoUrl(person.id, person.updatedAt)}
        alt=""
        width={size}
        height={size}
        className={`shrink-0 rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${className}`}
      style={{
        width: size,
        height: size,
        background: colorFromName(person.name),
        fontSize: Math.max(11, size * 0.34),
      }}
      aria-hidden
    >
      {initials(person.name)}
    </span>
  );
}
