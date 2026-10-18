import type { ReactNode } from "react";

import "./stories.css";

/**
 * Layout helpers of the base component stories (F6-03). Story-only: excluded from the package
 * build like the foundations kit.
 */
export function Showcase({
  title,
  children,
  stack = false,
}: {
  readonly title?: string;
  readonly children: ReactNode;
  /** One item per line (fields, banners) instead of a wrapping row (buttons, tags). */
  readonly stack?: boolean;
}) {
  return (
    <section className="story-showcase">
      {title && <h2 className="story-showcase__title">{title}</h2>}
      <div className={stack ? "story-showcase__stack" : "story-showcase__row"}>{children}</div>
    </section>
  );
}

/** Viewport globals for stories that must open at a given width (same as ux:snapshots). */
export const MOBILE = { viewport: { value: "mobile", isRotated: false } } as const;
