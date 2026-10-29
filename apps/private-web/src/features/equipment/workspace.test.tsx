// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EquipmentWorkspace } from "./workspace";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("equipment workspace refresh", () => {
  it("refreshes from the page header, reports progress and the update time", async () => {
    const reads: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const path = new URL(url, "http://local").searchParams.get("path")!;
        reads.push(path);
        const body =
          path === "equipment-workspace"
            ? { accessMode: "ACTIVE", canManage: false, hasMfa: true, accountId: "a" }
            : [];
        return new Response(JSON.stringify(body), { status: 200 });
      }),
    );
    render(<EquipmentWorkspace csrfToken="csrf" contextId="context-a" section="branches" />);
    const header = screen.getByRole("banner");
    const refresh = screen.getByRole("button", { name: /Actualizar datos/ });
    expect(header.contains(refresh)).toBe(true);
    expect(refresh.getAttribute("aria-busy")).toBe("true");
    expect(await screen.findByText(/Actualizado a las/)).toBeTruthy();
    expect(refresh.getAttribute("aria-busy")).toBe("false");

    const before = reads.filter((path) => path === "equipment-workspace").length;
    await userEvent.setup().click(refresh);
    await waitFor(() =>
      expect(reads.filter((path) => path === "equipment-workspace").length).toBe(before + 1),
    );
    expect(screen.getAllByRole("button", { name: /Actualizar datos/ })).toHaveLength(1);
  });
});
