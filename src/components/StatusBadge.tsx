import type { CheckinInfo } from "../types";
import { checkinLabel } from "../lib/format";

export function StatusBadge({ info }: { info: CheckinInfo }) {
  const { text, tone } = checkinLabel(info);
  const cls =
    tone === "ok" ? "badge-ok" : tone === "soon" ? "badge-soon" : tone === "overdue" ? "badge-overdue" : "badge-off";
  return (
    <span className={`badge ${cls}`}>
      <span className="badge-dot" aria-hidden="true" />
      {text}
    </span>
  );
}
