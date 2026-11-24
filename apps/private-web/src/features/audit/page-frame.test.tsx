// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import AuditLayout from "../../app/(account)/audit/layout";
import LoadingAudit from "../../app/(account)/audit/loading";
import LoadingDetail from "../../app/(account)/audit/[id]/loading";
import { AuditPageContent } from "./page-frame";

afterEach(cleanup);

const pending = new Promise<never>(() => undefined);
function Pending(): never {
  throw pending;
}

describe("audit page landmark", () => {
  it("renders one unready main on the server, including both streamed loading boundaries", () => {
    const html = renderToStaticMarkup(
      <AuditLayout>
        <LoadingAudit />
        <LoadingDetail />
        <AuditPageContent title="Detalle de auditoría" breadcrumbs>
          <h1>Detalle de auditoría</h1>
        </AuditPageContent>
      </AuditLayout>,
    );
    expect(html.match(/<main\b/g)).toHaveLength(1);
    expect(html.match(/id="main-content"/g)).toHaveLength(1);
    expect(html).toContain('data-page-ready="false"');
    expect(html).toContain('data-page-breadcrumbs="true"');
  });

  it("keeps the same main through loading, hydrated detail and return to the list", () => {
    const { container, rerender } = render(
      <AuditLayout>
        <LoadingAudit />
      </AuditLayout>,
    );
    const main = screen.getByRole("main", { name: "Auditoría" });
    expect(main.getAttribute("data-page-ready")).toBe("false");
    rerender(
      <AuditLayout>
        <Suspense fallback={<LoadingDetail />}>
          <Pending />
        </Suspense>
      </AuditLayout>,
    );
    expect(screen.getByRole("main", { name: "Detalle de auditoría" })).toBe(main);
    expect(main.getAttribute("data-page-ready")).toBe("false");
    expect(main.getAttribute("data-page-breadcrumbs")).toBe("true");
    rerender(
      <AuditLayout>
        <AuditPageContent title="Detalle de auditoría" breadcrumbs>
          <h1>Detalle de auditoría</h1>
        </AuditPageContent>
      </AuditLayout>,
    );
    expect(screen.getByRole("main", { name: "Detalle de auditoría" })).toBe(main);
    expect(main.getAttribute("data-page-ready")).toBe("true");
    expect(main.getAttribute("data-page-breadcrumbs")).toBe("true");
    rerender(
      <AuditLayout>
        <AuditPageContent title="Auditoría">
          <h1>Auditoría</h1>
        </AuditPageContent>
      </AuditLayout>,
    );
    expect(screen.getByRole("main", { name: "Auditoría" })).toBe(main);
    expect(main.getAttribute("data-page-ready")).toBe("true");
    expect(main.hasAttribute("data-page-breadcrumbs")).toBe(false);
    expect(container.querySelectorAll("main")).toHaveLength(1);
  });
});
