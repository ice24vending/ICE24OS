"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { Button, IconButton } from "./button.js";
import { Icon, TONE_ICONS } from "./icon.js";
import { cx } from "./shared.js";

export type ToastTone = "info" | "success" | "warning";

export interface ToastOptions {
  readonly tone?: ToastTone | undefined;
  readonly title: string;
  readonly description?: string | undefined;
  /** One reversible action, e.g. "Deshacer". */
  readonly action?: { readonly label: string; readonly onClick: () => void } | undefined;
  /** Milliseconds before it closes; `null` keeps it until the user closes it. */
  readonly duration?: number | null | undefined;
}

interface ToastEntry extends ToastOptions {
  readonly id: number;
}

export interface ToastApi {
  /** Shows a toast and returns its id. */
  readonly show: (toast: ToastOptions) => number;
  readonly dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/**
 * Toasts are for non-critical, reversible confirmations (UI_UX §13.4). Errors that need action
 * and critical alerts use Banner or the alert card instead, so there is no danger tone.
 */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast must be used inside <ToastProvider>.");
  return api;
}

export interface ToastProps extends ToastOptions {
  readonly onDismiss: () => void;
  readonly className?: string;
}

/**
 * One toast. Its timer pauses while the pointer is over it or focus is inside (WCAG 2.2.1), and
 * it never moves focus.
 */
export function Toast({
  tone = "info",
  title,
  description,
  action,
  duration = 6000,
  onDismiss,
  className,
}: ToastProps) {
  const [paused, setPaused] = useState(false);
  const dismissRef = useRef(onDismiss);
  useEffect(() => {
    dismissRef.current = onDismiss;
  });
  useEffect(() => {
    if (duration === null || paused) return undefined;
    const timer = setTimeout(() => dismissRef.current(), duration);
    return () => clearTimeout(timer);
  }, [duration, paused]);
  return (
    <div
      className={cx("ids-toast", `ids-toast--${tone}`, className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <Icon name={TONE_ICONS[tone]} className="ids-toast__icon" />
      <div className="ids-toast__content">
        <p className="ids-toast__title">{title}</p>
        {description && <p className="ids-toast__description">{description}</p>}
      </div>
      {action && (
        <Button
          variant="tertiary"
          size="sm"
          onClick={() => {
            action.onClick();
            onDismiss();
          }}
        >
          {action.label}
        </Button>
      )}
      <IconButton icon="close" label="Cerrar notificación" size="sm" onClick={onDismiss} />
    </div>
  );
}

/**
 * Provides `useToast()` and renders the toast region. The live region is always mounted so new
 * toasts are announced politely by screen readers.
 */
export function ToastProvider({
  children,
  label = "Notificaciones",
}: {
  readonly children: ReactNode;
  readonly label?: string;
}) {
  const [toasts, setToasts] = useState<readonly ToastEntry[]>([]);
  const next = useRef(0);
  const dismiss = useCallback(
    (id: number) => setToasts((current) => current.filter((toast) => toast.id !== id)),
    [],
  );
  const show = useCallback((toast: ToastOptions) => {
    next.current += 1;
    const id = next.current;
    // At most three visible: the oldest leaves first.
    setToasts((current) => [...current.slice(-2), { ...toast, id }]);
    return id;
  }, []);
  const api = useMemo(() => ({ show, dismiss }), [show, dismiss]);
  return (
    <ToastContext.Provider value={api}>
      {children}
      <section className="ids-toast-region" aria-label={label}>
        <div role="status" aria-live="polite" className="ids-toast-region__list">
          {toasts.map(({ id, ...toast }) => (
            <Toast key={id} {...toast} onDismiss={() => dismiss(id)} />
          ))}
        </div>
      </section>
    </ToastContext.Provider>
  );
}
