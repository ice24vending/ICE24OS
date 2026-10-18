"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { cx } from "./shared.js";

export interface TabItem {
  readonly id: string;
  readonly label: ReactNode;
  readonly content: ReactNode;
  readonly disabled?: boolean;
  /** Count or StatusTag next to the label. */
  readonly badge?: ReactNode;
}

export interface TabsProps {
  /** Accessible name of the tab list ("Secciones de la máquina"). */
  readonly label: string;
  readonly items: readonly TabItem[];
  readonly value?: string | undefined;
  readonly defaultValue?: string | undefined;
  readonly onChange?: (id: string) => void;
  /**
   * `automatic` selects on arrow keys; `manual` only moves focus and selects with Enter or Space
   * (use it when showing a panel is slow).
   */
  readonly activation?: "automatic" | "manual";
  readonly className?: string;
}

/**
 * Tabs for domains inside one entity, not for global navigation (UI_UX §10.1). WAI-ARIA APG:
 * one tab stop, arrow keys, Home and End move between tabs and Tab moves into the panel.
 */
export function Tabs({
  label,
  items,
  value,
  defaultValue,
  onChange,
  activation = "automatic",
  className,
}: TabsProps) {
  const prefix = useId();
  const enabled = items.filter((item) => !item.disabled);
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? enabled[0]?.id);
  const selected = value ?? uncontrolled;
  const refs = useRef(new Map<string, HTMLButtonElement>());
  const select = (id: string) => {
    if (value === undefined) setUncontrolled(id);
    if (id !== selected) onChange?.(id);
  };
  const keyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const focused = enabled.findIndex((item) => refs.current.get(item.id) === event.target);
    if (focused < 0) return;
    const last = enabled.length - 1;
    const target =
      event.key === "ArrowRight"
        ? focused === last
          ? 0
          : focused + 1
        : event.key === "ArrowLeft"
          ? focused === 0
            ? last
            : focused - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : -1;
    const item = enabled[target];
    if (!item) return;
    event.preventDefault();
    refs.current.get(item.id)?.focus();
    if (activation === "automatic") select(item.id);
  };
  return (
    <div className={cx("ids-tabs", className)}>
      <div role="tablist" aria-label={label} className="ids-tabs__list" onKeyDown={keyDown}>
        {items.map((item) => (
          <button
            key={item.id}
            ref={(node) => {
              if (node) refs.current.set(item.id, node);
              else refs.current.delete(item.id);
            }}
            type="button"
            role="tab"
            id={`${prefix}-tab-${item.id}`}
            className="ids-tabs__tab"
            aria-selected={item.id === selected}
            aria-controls={`${prefix}-panel-${item.id}`}
            aria-disabled={item.disabled || undefined}
            tabIndex={item.id === selected ? 0 : -1}
            onClick={() => {
              if (!item.disabled) select(item.id);
            }}
          >
            {item.label}
            {item.badge}
          </button>
        ))}
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          role="tabpanel"
          id={`${prefix}-panel-${item.id}`}
          aria-labelledby={`${prefix}-tab-${item.id}`}
          className="ids-tabs__panel"
          tabIndex={0}
          hidden={item.id !== selected}
        >
          {item.id === selected && item.content}
        </div>
      ))}
    </div>
  );
}
