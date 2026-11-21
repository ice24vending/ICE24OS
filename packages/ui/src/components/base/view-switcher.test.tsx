// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoAxeViolations } from "./axe.test-utils.js";
import { ViewSwitcher, type CollectionView } from "./view-switcher.js";

afterEach(cleanup);

function Example() {
  const [value, setValue] = useState<CollectionView>("lista");
  return <ViewSwitcher value={value} onChange={setValue} />;
}

describe("ViewSwitcher", () => {
  it("is silent on mount and when URL or storage changes the controlled value", () => {
    const change = vi.fn();
    const { rerender } = render(<ViewSwitcher value="bloques" onChange={change} />);
    const status = screen.getByRole("status", { name: "Cambio de vista" });
    expect(status.textContent).toBe("");
    expect((screen.getByRole("radio", { name: "Bloques" }) as HTMLInputElement).checked).toBe(true);
    rerender(<ViewSwitcher value="lista" onChange={change} />);
    expect(status.textContent).toBe("");
    expect(change).not.toHaveBeenCalled();
  });

  it("announces a user change once in the same mounted live region", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const status = screen.getByRole("status", { name: "Cambio de vista" });
    const messages: string[] = [];
    const observer = new MutationObserver(() => messages.push(status.textContent ?? ""));
    observer.observe(status, { childList: true, characterData: true, subtree: true });
    await user.click(screen.getByRole("radio", { name: "Bloques" }));
    await user.click(screen.getByRole("radio", { name: "Bloques" }));
    expect(messages).toEqual(["Vista de bloques."]);
    expect(screen.getAllByRole("status")).toEqual([status]);
    observer.disconnect();
  });

  it("moves selection and focus with all four arrows and wraps within the group", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const list = screen.getByRole("radio", { name: "Lista" });
    const blocks = screen.getByRole("radio", { name: "Bloques" });
    await user.tab();
    expect(document.activeElement).toBe(list);
    for (const key of ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"]) {
      const next = document.activeElement === list ? blocks : list;
      await user.keyboard(`{${key}}`);
      expect(document.activeElement).toBe(next);
      expect((next as HTMLInputElement).checked).toBe(true);
    }
    await user.keyboard(" ");
    expect((list as HTMLInputElement).checked).toBe(true);
  });

  it("announces another user change after a silent preference restoration", async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    const { rerender } = render(<ViewSwitcher value="lista" onChange={change} />);
    const status = screen.getByRole("status", { name: "Cambio de vista" });
    const messages: string[] = [];
    const observer = new MutationObserver(() => messages.push(status.textContent ?? ""));
    observer.observe(status, { childList: true, subtree: true, characterData: true });
    await user.click(screen.getByRole("radio", { name: "Bloques" }));
    rerender(<ViewSwitcher value="bloques" onChange={change} />);
    rerender(<ViewSwitcher value="lista" onChange={change} />);
    await user.click(screen.getByRole("radio", { name: "Bloques" }));
    expect(messages).toEqual(["Vista de bloques.", "Vista de bloques."]);
    observer.disconnect();
  });

  it("does not change when disabled and has accessible group semantics", async () => {
    const change = vi.fn();
    const { container } = render(<ViewSwitcher value="lista" onChange={change} disabled />);
    expect(screen.getByRole("radiogroup", { name: "Vista de los registros" })).toBeTruthy();
    await userEvent.click(screen.getByRole("radio", { name: "Bloques" }));
    expect(change).not.toHaveBeenCalled();
    await expectNoAxeViolations(container);
  });
});
