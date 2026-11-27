// @vitest-environment jsdom
import { createRef } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { FilePicker } from "./file-picker";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("opens the native picker from a Spanish button and shows the selected filename", () => {
  const ref = createRef<HTMLInputElement>();
  render(<FilePicker inputRef={ref} disabled={false} accept="application/pdf" />);
  const click = vi.spyOn(ref.current!, "click");
  fireEvent.click(screen.getByRole("button", { name: "Seleccionar archivo" }));
  expect(click).toHaveBeenCalledOnce();
  fireEvent.change(ref.current!, {
    target: {
      files: [new File(["document"], "Análisis de agua.pdf", { type: "application/pdf" })],
    },
  });
  expect(screen.getByText("Análisis de agua.pdf")).toBeTruthy();
  expect(ref.current!.tabIndex).toBe(-1);
});
it("keeps the photo picker and its trigger disabled together", () => {
  const ref = createRef<HTMLInputElement>();
  render(<FilePicker inputRef={ref} disabled photo />);
  expect(ref.current!.disabled).toBe(true);
  expect(
    (screen.getByRole("button", { name: "Seleccionar foto" }) as HTMLButtonElement).disabled,
  ).toBe(true);
});
