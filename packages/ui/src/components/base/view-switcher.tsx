"use client";

import { useId, useState, type KeyboardEvent } from "react";

import { Radio, RadioGroup } from "./choice.js";
import { LiveRegion } from "./live-region.js";

export type CollectionView = "lista" | "bloques";

export interface ViewSwitcherProps {
  readonly value: CollectionView;
  readonly onChange: (value: CollectionView) => void;
  readonly label?: string;
  readonly disabled?: boolean;
}

/** Controlled view choice. URL/storage belong to the host; only user changes are announced here. */
export function ViewSwitcher({
  value,
  onChange,
  label = "Vista de los registros",
  disabled = false,
}: ViewSwitcherProps) {
  const id = useId();
  const [announcement, setAnnouncement] = useState<{ text: string; sequence: number } | null>(null);
  const change = (next: string) => {
    if (disabled || next === value || (next !== "lista" && next !== "bloques")) return;
    onChange(next);
    setAnnouncement((previous) => ({
      text: next === "lista" ? "Vista de lista." : "Vista de bloques.",
      sequence: (previous?.sequence ?? 0) + 1,
    }));
  };
  const move = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key) || disabled)
      return;
    event.preventDefault();
    const next = event.currentTarget.value === "lista" ? "bloques" : "lista";
    event.currentTarget
      .closest("fieldset")
      ?.querySelector<HTMLInputElement>(`input[value="${next}"]`)
      ?.focus();
    change(next);
  };
  return (
    <div className="ids-view-switcher">
      <RadioGroup
        name={`view-${id}`}
        label={label}
        orientation="horizontal"
        value={value}
        onChange={change}
        disabled={disabled}
      >
        <Radio value="lista" label="Lista" onKeyDown={move} />
        <Radio value="bloques" label="Bloques" onKeyDown={move} />
      </RadioGroup>
      <LiveRegion aria-label="Cambio de vista" className="ids-visually-hidden">
        {announcement && <span key={announcement.sequence}>{announcement.text}</span>}
      </LiveRegion>
    </div>
  );
}
