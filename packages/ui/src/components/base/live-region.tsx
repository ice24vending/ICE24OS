import type { ComponentPropsWithRef } from "react";
import { cx } from "./shared.js";

/** Mount before an action; update only its content. Never focus or nest another live region.
 * Alert already implies assertive; avoid redundant aria-live on it (VoiceOver duplicate risk). */
export function LiveRegion({
  as: Element = "p",
  role = "status",
  children,
  className,
  ...props
}: Omit<ComponentPropsWithRef<"p">, "role" | "aria-live" | "aria-atomic"> & {
  readonly as?: "p" | "div";
  /** Reserve alert for a failure blocking the current action. */
  readonly role?: "status" | "alert";
}) {
  const empty =
    children === undefined || children === null || children === false || children === "";
  return (
    <Element
      {...props}
      role={role}
      aria-live={role === "status" ? "polite" : undefined}
      aria-atomic="true"
      className={cx(className, empty && "ids-visually-hidden")}
    >
      {children}
    </Element>
  );
}
