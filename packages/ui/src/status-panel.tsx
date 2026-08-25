import type { ReactNode } from "react";

export type StatusPanelTone = "neutral" | "info" | "success" | "warning" | "danger";

export interface StatusPanelProps {
  readonly title: string;
  readonly children: ReactNode;
  readonly tone?: StatusPanelTone;
  readonly role?: "status" | "alert";
}

export const StatusPanel = ({ title, children, tone = "neutral", role }: StatusPanelProps) => (
  <section className={`status-panel status-panel--${tone}`} role={role} aria-labelledby={title}>
    <h2 id={title}>{title}</h2>
    <div>{children}</div>
  </section>
);
