// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createRef, useState } from "react";
import { afterEach, expect, it } from "vitest";
import { LiveRegion } from "./live-region.js";
afterEach(cleanup);
it("keeps the same empty polite region before an action without moving focus", () => {
  function Sample() {
    const [message, setMessage] = useState("");
    return (
      <>
        <button onClick={() => setMessage("Cambio auditado")}>Confirmar</button>
        <LiveRegion>{message}</LiveRegion>
      </>
    );
  }
  render(<Sample />);
  const region = screen.getByRole("status");
  expect(region.textContent).toBe("");
  expect(region.classList.contains("ids-visually-hidden")).toBe(true);
  expect(region.getAttribute("aria-live")).toBe("polite");
  expect(region.getAttribute("aria-atomic")).toBe("true");
  const button = screen.getByRole("button");
  button.focus();
  fireEvent.click(button);
  expect(screen.getByRole("status")).toBe(region);
  expect(region.textContent).toBe("Cambio auditado");
  expect(region.classList.contains("ids-visually-hidden")).toBe(false);
  expect(document.activeElement).toBe(button);
});
it("supports a persistent blocking error and preserves an existing focus ref", () => {
  const ref = createRef<HTMLParagraphElement>();
  const { rerender } = render(<LiveRegion role="alert" ref={ref} tabIndex={-1} />);
  const region = screen.getByRole("alert");
  expect(region.textContent).toBe("");
  rerender(
    <LiveRegion role="alert" ref={ref} tabIndex={-1}>
      No se pudo guardar
    </LiveRegion>,
  );
  expect(ref.current).toBe(region);
  expect(screen.getAllByRole("alert")).toHaveLength(1);
  expect(region.textContent).toBe("No se pudo guardar");
  expect(region.getAttribute("aria-live")).toBeNull(); // role=alert is implicitly assertive
});
it("hides an empty block without display none and preserves its node on clearing", () => {
  const { rerender } = render(<LiveRegion as="div">{false}</LiveRegion>);
  const region = screen.getByRole("status");
  expect(region.hidden).toBe(false);
  rerender(
    <LiveRegion as="div">
      <strong>Guardado</strong>
    </LiveRegion>,
  );
  expect(screen.getByRole("status")).toBe(region);
  rerender(<LiveRegion as="div">{null}</LiveRegion>);
  expect(region.className).toContain("ids-visually-hidden");
  expect(region.textContent).toBe("");
});
