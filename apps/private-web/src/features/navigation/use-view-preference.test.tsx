// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useViewPreference, viewPreferenceKey } from "./use-view-preference";

const replace = vi.fn();
let query = new URLSearchParams("q=Centro&pagina=2");
const router = { replace };
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/plantillas/lista",
  useSearchParams: () => query,
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  replace.mockReset();
  query = new URLSearchParams("q=Centro&pagina=2");
});

describe("view preference", () => {
  it("defaults to lista and restores the saved preference without changing filters", () => {
    localStorage.setItem(viewPreferenceKey("plantillas/lista"), "bloques");
    const { result } = renderHook(() => useViewPreference("plantillas/lista"));
    expect(result.current.view).toBe("bloques");
    expect(replace).toHaveBeenCalledWith("/plantillas/lista?q=Centro&pagina=2&vista=bloques", {
      scroll: false,
    });
  });

  it("gives an explicit URL priority and follows URL changes from history", () => {
    localStorage.setItem(viewPreferenceKey("plantillas/lista"), "bloques");
    query.set("vista", "lista");
    const { result, rerender } = renderHook(() => useViewPreference("plantillas/lista"));
    expect(result.current.view).toBe("lista");
    expect(replace).not.toHaveBeenCalled();
    query = new URLSearchParams("vista=bloques");
    rerender();
    expect(result.current.view).toBe("bloques");
  });

  it("persists user changes per screen and keeps the rest of the query", () => {
    const { result } = renderHook(() => useViewPreference("plantillas/lista"));
    act(() => result.current.changeView("bloques"));
    expect(localStorage.getItem(viewPreferenceKey("plantillas/lista"))).toBe("bloques");
    expect(localStorage.getItem(viewPreferenceKey("otra"))).toBeNull();
    expect(replace).toHaveBeenCalledWith("/plantillas/lista?q=Centro&pagina=2&vista=bloques", {
      scroll: false,
    });
  });

  it("keeps URL navigation working when storage reads and writes throw", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const { result } = renderHook(() => useViewPreference("plantillas/lista"));
    expect(result.current.view).toBe("lista");
    expect(() => act(() => result.current.changeView("bloques"))).not.toThrow();
    expect(result.current.view).toBe("bloques");
    expect(replace).toHaveBeenCalledWith("/plantillas/lista?q=Centro&pagina=2&vista=bloques", {
      scroll: false,
    });
  });

  it("updates a controlled radio immediately, then lets history choose again", () => {
    query.set("vista", "lista");
    const { result, rerender } = renderHook(() => useViewPreference("plantillas/lista"));
    act(() => result.current.changeView("bloques"));
    expect(result.current.view).toBe("bloques");
    query = new URLSearchParams("q=Centro&pagina=2&vista=bloques");
    rerender();
    query = new URLSearchParams("q=Centro&pagina=2&vista=lista");
    rerender();
    expect(result.current.view).toBe("lista");
  });

  it("does not synchronize legacy screens or react to selecting the current view", () => {
    localStorage.setItem(viewPreferenceKey("plantillas/lista"), "bloques");
    const { result } = renderHook(() => useViewPreference("plantillas/lista", false));
    act(() => result.current.changeView("lista"));
    expect(replace).not.toHaveBeenCalled();
  });
});
