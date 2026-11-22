import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { AccountPage } from "./account-page";

let pathname = "/notifications";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

describe("account page widths", () => {
  it.each(["/notifications", "/audit", "/files"])("uses the full width for %s", (path) => {
    pathname = path;
    const html = renderToStaticMarkup(
      <AccountPage>
        <main>Contenido original</main>
      </AccountPage>,
    );
    expect(html).toContain("ids-page-width");
    expect(html).not.toContain("ids-page-width--reading");
    expect(html).toContain("<main>Contenido original</main>");
  });

  it("uses the readable width for subscription", () => {
    pathname = "/subscription";
    expect(
      renderToStaticMarkup(
        <AccountPage>
          <main>Suscripción</main>
        </AccountPage>,
      ),
    ).toContain("ids-page-width--reading");
  });

  it.each(["/machines", "/branches", "/maintenance/tickets", "/profile", "/summary"])(
    "leaves %s untouched",
    (path) => {
      pathname = path;
      expect(
        renderToStaticMarkup(
          <AccountPage>
            <main>Contenido</main>
          </AccountPage>,
        ),
      ).toBe("<main>Contenido</main>");
    },
  );
});
