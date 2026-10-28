import type { ReactNode, SVGProps } from "react";

import { cx, type StatusTone } from "./shared.js";

/**
 * Line icons of the base components (UI_UX §8.7: linear, rounded stroke, 20 or 24 px). Drawn
 * here so the design system needs no icon dependency; the domain icons of F6-04 (tool, shield,
 * drop, sync…) live in the same set.
 */
const PATHS = {
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  "check-circle": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.7 2.7L16 10" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 7.5h.01" />
    </>
  ),
  warning: (
    <>
      <path d="M10.3 4.2L2.8 17.5A2 2 0 0 0 4.5 20.5h15a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z" />
      <path d="M12 9.5v4M12 17h.01" />
    </>
  ),
  danger: (
    <>
      <path d="M8.3 3h7.4L21 8.3v7.4L15.7 21H8.3L3 15.7V8.3z" />
      <path d="M12 8v5M12 16.5h.01" />
    </>
  ),
  nodata: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12h8" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7.5a4 4 0 0 1 8 0V11" />
    </>
  ),
  offline: (
    <>
      <path d="M3 3l18 18M8.5 16.4a5 5 0 0 1 7 0M5 12.6a10 10 0 0 1 4.2-2.4M19 12.6a10 10 0 0 0-2.6-1.8M2 8.8a15 15 0 0 1 4.3-2.6M22 8.8A15 15 0 0 0 11 5M12 20h.01" />
    </>
  ),
  audit: (
    <>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
      <path d="M3.5 4v4.5H8M12 7.5V12l3 2" />
    </>
  ),
  activity: <path d="M3 12h4l3-7 4 14 3-7h4" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  "chevron-left": <path d="M15 5l-7 7 7 7" />,
  "chevron-right": <path d="M9 5l7 7-7 7" />,
  "chevron-up": <path d="M5 15l7-7 7 7" />,
  "chevron-down": <path d="M5 9l7 7 7-7" />,
  sort: <path d="M8 9l4-4 4 4M8 15l4 4 4-4" />,
  empty: (
    <>
      <path d="M3 13h5l1.5 3h5L16 13h5" />
      <path d="M5.5 5h13L21 13v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6z" />
    </>
  ),
  home: (
    <>
      <path d="M3.5 11L12 4l8.5 7" />
      <path d="M5.5 9.5V20h13V9.5" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.4-4.4" />
    </>
  ),
  bell: (
    <>
      <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </>
  ),
  document: (
    <>
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v4h4M10 12h5M10 16h5" />
    </>
  ),
  machine: (
    <>
      <rect x="6" y="3" width="12" height="18" rx="2" />
      <path d="M9 7h6M9 11h6M12 17h.01" />
    </>
  ),
  building: (
    <>
      <path d="M4 21V5l8-2v18M12 8h8v13M2.5 21h19" />
      <path d="M7.5 8h1.5M7.5 12h1.5M7.5 16h1.5M15.5 12h1.5M15.5 16h1.5" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    </>
  ),
  // Domain icons (F6-04): UI_UX §8.7 brand motifs with an unambiguous meaning.
  tool: (
    <path d="M14.7 6.3a4 4 0 0 0 5 5L21 13l-2 2-1.3-1.3a4 4 0 0 0-5-5zM13 11l-8.5 8.5a1.5 1.5 0 0 1-2-2L11 9" />
  ),
  shield: (
    <>
      <path d="M12 3l7.5 3v5.5c0 4.5-3.2 8.2-7.5 9.5-4.3-1.3-7.5-5-7.5-9.5V6z" />
      <path d="M9 12l2.2 2.2L15.5 10" />
    </>
  ),
  drop: <path d="M12 3.5s6 6.4 6 10.5a6 6 0 0 1-12 0c0-4.1 6-10.5 6-10.5z" />,
  power: <path d="M12 3v8M7.1 6.5a7 7 0 1 0 9.8 0" />,
  archive: (
    <>
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4" />
    </>
  ),
  sync: <path d="M20 12a8 8 0 0 1-13.7 5.7M4 12a8 8 0 0 1 13.7-5.7M18 3v4h-4M6 21v-4h4" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  device: (
    <>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2" />
      <path d="M11 18.5h2" />
    </>
  ),
  download: <path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 20h14" />,
  conflict: (
    <>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <path d="M6 8.5V12a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V8.5M12 15v6" />
    </>
  ),
  pin: <path d="M9 4h6l-1 6 3 3v1.5H7V13l3-3zM12 14.5V21" />,
  refresh: <path d="M20 11a8 8 0 1 0-2.3 6.3M20 4v7h-7" />,
  inbox: (
    <>
      <path d="M4 13h4.5l1.5 2.5h4l1.5-2.5H20" />
      <path d="M6 4h12l2 9v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6zM12 7v4M12 13h.01" />
    </>
  ),
  play: <path d="M8 5.5v13l10-6.5z" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  escalate: <path d="M12 20V5M6 11l6-6 6 6M5 20h14" />,
  compare: <path d="M8 3v18M16 3v18M3 8h5M16 16h5M3 16l2-2M21 8l-2 2" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;

export const ICON_NAMES = Object.keys(PATHS) as IconName[];

/** Icon that represents each status tone (UI_UX §6.5: every state has text and icon). */
export const TONE_ICONS: Record<StatusTone, IconName> = {
  success: "check-circle",
  warning: "warning",
  danger: "danger",
  info: "info",
  nodata: "nodata",
  audit: "audit",
  offline: "offline",
};

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "children" | "name"> {
  readonly name: IconName;
  /** Accessible name. Without it the icon is decorative and hidden from screen readers. */
  readonly label?: string | undefined;
  readonly size?: 16 | 20 | 24 | 48;
}

export function Icon({ name, label, size = 20, className, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cx("ids-icon", className)}
      focusable="false"
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}

/** Spinner of loading buttons; static when the user prefers reduced motion. */
export function Spinner({ className }: { readonly className?: string | undefined }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      className={cx("ids-spinner", className)}
      aria-hidden
      focusable="false"
    >
      <circle cx="12" cy="12" r="9" opacity="0.3" />
      <path d="M21 12a9 9 0 0 0-9-9" />
    </svg>
  );
}
