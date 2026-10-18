import { useId, type ReactNode } from "react";

export type StatusPanelTone = "neutral" | "info" | "success" | "warning" | "danger";

export interface StatusPanelProps {
  readonly title: string;
  readonly children: ReactNode;
  readonly tone?: StatusPanelTone;
  readonly role?: "status" | "alert";
}

export const StatusPanel = ({ title, children, tone = "neutral", role }: StatusPanelProps) => {
  // The title used to be the id: a title with spaces named nothing (fixed in F6-05).
  const titleId = useId();
  return (
    <section className={`status-panel status-panel--${tone}`} role={role} aria-labelledby={titleId}>
      <h2 id={titleId}>{title}</h2>
      <div>{children}</div>
    </section>
  );
};
