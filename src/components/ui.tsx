import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { CheckInStatus } from "@shared/types";
import { CHECK_IN_LABELS } from "@shared/types";

export function StatusBadge({ status }: { status: CheckInStatus | null }) {
  if (!status) return <span className="text-sm text-muted">Off</span>;
  const styles: Record<CheckInStatus, string> = {
    in_touch: "bg-ok-bg text-ok",
    due_soon: "bg-due-bg text-due",
    overdue: "bg-overdue-bg text-overdue",
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${styles[status]}`}>
      {CHECK_IN_LABELS[status]}
    </span>
  );
}

export function Button({
  children,
  variant = "primary",
  type = "button",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  const styles = {
    primary: "bg-ink text-white hover:bg-black",
    secondary: "bg-white text-ink border border-line hover:bg-paper",
    ghost: "bg-transparent text-ink hover:bg-white",
    danger: "bg-white text-overdue border border-line hover:bg-overdue-bg",
  };
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 text-sm ${className}`}>
      <span className="font-semibold text-muted">{label}</span>
      <span className="block w-full [&>*]:w-full">{children}</span>
    </label>
  );
}

export const inputClass =
  "rounded-lg border border-line bg-white px-3 py-2 text-ink outline-none focus:border-ink";

export function Modal({
  title,
  children,
  onClose,
  wide,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 pt-16" onClick={onClose}>
      <div
        className={`w-full rounded-2xl bg-card p-6 shadow-xl ${wide ? "max-w-3xl" : "max-w-lg"}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id="modal-title" className="font-serif text-2xl">
            {title}
          </h2>
          <button type="button" className="text-muted hover:text-ink" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-relaxed text-muted">{children}</p>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">{children}</h2>
      {action}
    </div>
  );
}
