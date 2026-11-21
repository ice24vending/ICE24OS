// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { resolveReturnFocus, rowLinkId, ReturnLink, withReturnFocus } from "./return-focus";

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

describe("return focus", () => {
  it("keeps filters, pagination and view in a real return link", () => {
    render(
      <ReturnLink
        href="/plantillas/lista?ejemplo=base&q=Norte&pagina=2&vista=bloques"
        linkId={rowLinkId("m1")}
        listName="máquinas"
      />,
    );
    const link = screen.getByRole("link", { name: "Volver a máquinas" });
    const url = new URL(link.getAttribute("href")!, "https://ice24.invalid");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      ejemplo: "base",
      q: "Norte",
      pagina: "2",
      vista: "bloques",
      volverA: "fila-m1",
    });
    expect(withReturnFocus("//evil.test", "fila-m1")).toBe("/plantillas/lista?ejemplo=base");
  });

  it("focuses only the originating row link and consumes the intent once", () => {
    render(
      <main>
        <h1>Máquinas</h1>
        <a id="fila-m1" data-row-link href="/detalle/m1">
          Centro
        </a>
      </main>,
    );
    window.history.replaceState(
      { preserved: true },
      "",
      "/plantillas/lista?q=Centro&volverA=fila-m1",
    );
    const main = screen.getByRole("main");
    expect(resolveReturnFocus(main)).toBe(true);
    expect(document.activeElement).toBe(screen.getByRole("link", { name: "Centro" }));
    expect(window.location.search).toBe("?q=Centro");
    expect(window.history.state).toEqual({ preserved: true });
    expect(resolveReturnFocus(main)).toBe(false);
  });

  it("falls back to the list heading when the row disappeared or is outside main", () => {
    render(
      <>
        <a id="fila-m1" data-row-link href="/otra">
          Fuera
        </a>
        <main>
          <h1>Máquinas</h1>
        </main>
      </>,
    );
    window.history.replaceState(null, "", "/plantillas/lista?volverA=fila-m1");
    expect(resolveReturnFocus(screen.getByRole("main"))).toBe(true);
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Máquinas" }));
    expect(document.activeElement?.getAttribute("tabindex")).toBe("-1");
  });

  it("does not override ordinary navigation or focus arbitrary controls", () => {
    render(
      <main>
        <h1>Máquinas</h1>
        <button id="fila-m1">Acción</button>
      </main>,
    );
    const main = screen.getByRole("main");
    expect(resolveReturnFocus(main)).toBe(false);
    window.history.replaceState(null, "", "/plantillas/lista?volverA=fila-m1");
    expect(resolveReturnFocus(main)).toBe(true);
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Máquinas" }));
  });
});
