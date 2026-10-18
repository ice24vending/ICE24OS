"use client";

import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

import { IconButton } from "./button.js";
import { cx, FOCUSABLE } from "./shared.js";

export interface DialogProps {
  readonly open: boolean;
  /** Called on Escape, on the close button and on a click outside (when dismissible). */
  readonly onClose: () => void;
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly children?: ReactNode;
  /** Buttons, right-aligned on desktop and stacked on mobile; the primary one last. */
  readonly footer?: ReactNode;
  /** `alertdialog` for confirmations of sensitive actions (UI_UX §13.7). */
  readonly role?: "dialog" | "alertdialog";
  readonly size?: "sm" | "md" | "lg";
  /** Element focused on open; defaults to the first focusable element of the content. */
  readonly initialFocusRef?: RefObject<HTMLElement | null>;
  /**
   * `false` while an action is running: Escape, the close button and the backdrop do nothing,
   * so the user cannot leave a half-sent action.
   */
  readonly dismissible?: boolean;
  readonly closeLabel?: string;
  readonly className?: string;
}

/**
 * Modal dialog (WCAG 2.2: 2.1.2, 2.4.3, 2.4.11). Focus moves inside on open, Tab and Shift+Tab
 * stay inside, Escape closes, the rest of the page is inert and focus returns to the element
 * that opened it. Modals do not stack (UI_UX §13.6).
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  role = "dialog",
  size = "md",
  initialFocusRef,
  dismissible = true,
  closeLabel = "Cerrar",
  className,
}: DialogProps) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return undefined;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const node = panel.current;
    const container = node?.closest<HTMLElement>(".ids-dialog-layer") ?? null;
    // Everything outside the dialog becomes inert: no focus, no clicks, hidden from readers.
    const siblings = [...document.body.children].filter(
      (element): element is HTMLElement =>
        element instanceof HTMLElement && element !== container && !element.inert,
    );
    for (const element of siblings) element.inert = true;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // The close button is skipped: start on the content, or on the dialog itself.
    const first =
      initialFocusRef?.current ??
      node?.querySelector<HTMLElement>(
        `.ids-dialog__body :is(${FOCUSABLE}), .ids-dialog__footer :is(${FOCUSABLE})`,
      ) ??
      node;
    first?.focus();
    return () => {
      for (const element of siblings) element.inert = false;
      document.body.style.overflow = overflow;
      if (opener?.isConnected) opener.focus();
    };
  }, [open, initialFocusRef]);

  if (!open || typeof document === "undefined") return null;

  const keyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      if (dismissible) onCloseRef.current();
      return;
    }
    if (event.key !== "Tab") return;
    const items = [...(panel.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])].filter(
      (item) => !item.closest("[inert]"),
    );
    const firstItem = items[0];
    const lastItem = items.at(-1);
    if (!firstItem || !lastItem) {
      event.preventDefault();
      return;
    }
    const active = document.activeElement;
    if (event.shiftKey && (active === firstItem || active === panel.current)) {
      event.preventDefault();
      lastItem.focus();
    } else if (!event.shiftKey && active === lastItem) {
      event.preventDefault();
      firstItem.focus();
    }
  };
  const backdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && dismissible && role === "dialog") {
      onCloseRef.current();
    }
  };

  return createPortal(
    <div className="ids-dialog-layer" onMouseDown={backdrop}>
      <div
        ref={panel}
        role={role}
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={description ? `${id}-description` : undefined}
        tabIndex={-1}
        className={cx("ids-dialog", `ids-dialog--${size}`, className)}
        onKeyDown={keyDown}
      >
        <header className="ids-dialog__header">
          <h2 id={`${id}-title`} className="ids-dialog__title">
            {title}
          </h2>
          {dismissible && (
            <IconButton
              icon="close"
              label={closeLabel}
              size="sm"
              className="ids-dialog__close"
              onClick={() => onCloseRef.current()}
            />
          )}
        </header>
        {description && (
          <p id={`${id}-description`} className="ids-dialog__description">
            {description}
          </p>
        )}
        {children !== undefined && <div className="ids-dialog__body">{children}</div>}
        {footer && <div className="ids-dialog__footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
