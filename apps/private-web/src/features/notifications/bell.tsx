"use client";
import { useEffect, useState } from "react";
import { notificationSummarySchema, type NotificationSummary } from "@ice24/contracts";
import { SUMMARY_REFRESH_MS, plural } from "./center";

/**
 * Bell for the workspace header (UI/UX 26.2): the badge counts relevant alerts (unread plus
 * pinned critical ones), not the whole history, and refreshes while the tab is visible.
 */
export function NotificationBell({ contextId }: { contextId: string }) {
  const [summary, setSummary] = useState<NotificationSummary | null>(null);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch("/api/notifications?view=summary", {
          cache: "no-store",
          headers: { "x-ice24-workspace-context": contextId },
        });
        if (!response.ok) return;
        const parsed = notificationSummarySchema.parse(await response.json());
        if (!cancelled) setSummary(parsed);
      } catch {
        /* keep the last known count; the center shows errors */
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), SUMMARY_REFRESH_MS);
    document.addEventListener("visibilitychange", load);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
    };
  }, [contextId]);
  const badge = summary?.badge ?? 0;
  const critical = summary?.pinned ?? 0;
  return (
    <a
      href="/notifications"
      className="alert-bell"
      aria-label={
        summary
          ? `Alertas: ${plural(badge, "relevante", "relevantes")}${
              critical
                ? `, ${plural(critical, "crítica sin enterado", "críticas sin enterado")}`
                : ""
            }`
          : "Alertas"
      }
    >
      Alertas
      {badge > 0 && (
        <span
          className={`alert-badge${critical ? " alert-badge--critical" : ""}`}
          aria-hidden="true"
        >
          {badge}
        </span>
      )}
    </a>
  );
}
