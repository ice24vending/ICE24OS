// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { focusPageWhenReady, PAGE_FOCUS_TIMEOUT_MS } from "./page-focus";

let stop: () => void = () => undefined;

beforeEach(() => {
  vi.useFakeTimers();
  window.history.replaceState(null, "", "/machines/123");
});

afterEach(() => {
  stop();
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  window.history.replaceState(null, "", "/");
});

describe("page navigation focus", () => {
  it("focuses a ready page without requiring a readiness attribute or a specific route", async () => {
    const { container } = render(
      <main id="main-content">
        <h1>Máquina</h1>
      </main>,
    );
    const main = screen.getByRole("main");
    const mainFocus = vi.spyOn(main, "focus");
    stop = focusPageWhenReady(container);
    expect(document.activeElement).toBe(main);
    await vi.advanceTimersByTimeAsync(PAGE_FOCUS_TIMEOUT_MS * 2);
    expect(mainFocus).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("waits for the generic readiness signal and restores the originating link only once", async () => {
    window.history.replaceState(null, "", "/machines?q=Centro&volverA=fila-m1");
    const { container } = render(
      <main id="main-content" data-page-ready="false">
        <h1>Máquinas</h1>
        <a id="fila-m1" data-row-link href="/machines/m1">
          Centro
        </a>
      </main>,
    );
    const main = screen.getByRole("main");
    const link = screen.getByRole("link");
    const mainFocus = vi.spyOn(main, "focus");
    const linkFocus = vi.spyOn(link, "focus");
    stop = focusPageWhenReady(container);
    expect(document.activeElement).not.toBe(link);
    main.dataset.pageReady = "true";
    await Promise.resolve();
    expect(document.activeElement).toBe(link);
    expect(window.location.search).toBe("?q=Centro");
    await vi.advanceTimersByTimeAsync(PAGE_FOCUS_TIMEOUT_MS * 2);
    expect(mainFocus).not.toHaveBeenCalled();
    expect(linkFocus).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("waits for aria-busy to clear even if the page has already hydrated", async () => {
    const { container } = render(
      <main id="main-content" aria-busy="true" data-page-ready="true">
        <h1>Máquina</h1>
      </main>,
    );
    const main = screen.getByRole("main");
    stop = focusPageWhenReady(container);
    expect(document.activeElement).not.toBe(main);
    main.removeAttribute("aria-busy");
    await Promise.resolve();
    expect(document.activeElement).toBe(main);
  });

  it("waits for streamed main and heading content before the deadline", async () => {
    const { container } = render(<div />);
    stop = focusPageWhenReady(container);
    const main = document.createElement("main");
    main.id = "main-content";
    const mainFocus = vi.spyOn(main, "focus");
    container.append(main);
    await Promise.resolve();
    expect(document.activeElement).not.toBe(main);
    main.append(document.createElement("h1"));
    await Promise.resolve();
    expect(document.activeElement).toBe(main);
    await vi.advanceTimersByTimeAsync(PAGE_FOCUS_TIMEOUT_MS * 2);
    expect(mainFocus).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("focuses main after one second if h1 never appears, without a later focus jump", async () => {
    window.history.replaceState(null, "", "/machines?volverA=fila-m1");
    const { container } = render(
      <>
        <button>Origen</button>
        <main id="main-content">
          <a id="fila-m1" data-row-link href="/machines/m1">
            Centro
          </a>
        </main>
      </>,
    );
    const origin = screen.getByRole("button");
    const main = screen.getByRole("main");
    const mainFocus = vi.spyOn(main, "focus");
    origin.focus();
    stop = focusPageWhenReady(container);
    await vi.advanceTimersByTimeAsync(PAGE_FOCUS_TIMEOUT_MS - 1);
    expect(document.activeElement).toBe(origin);
    await vi.advanceTimersByTimeAsync(1);
    expect(document.activeElement).toBe(main);
    expect(main.getAttribute("tabindex")).toBe("-1");
    expect(window.location.search).toBe("");
    origin.focus();
    main.append(document.createElement("h1"));
    await vi.advanceTimersByTimeAsync(PAGE_FOCUS_TIMEOUT_MS);
    expect(document.activeElement).toBe(origin);
    expect(mainFocus).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("bounds a readiness signal that never finishes and does not refocus after it arrives late", async () => {
    const { container } = render(
      <>
        <button>Otra acción</button>
        <main id="main-content" data-page-ready="false">
          <h1>Máquina</h1>
        </main>
      </>,
    );
    const main = screen.getByRole("main");
    stop = focusPageWhenReady(container);
    await vi.advanceTimersByTimeAsync(PAGE_FOCUS_TIMEOUT_MS);
    expect(document.activeElement).toBe(main);
    screen.getByRole("button").focus();
    main.dataset.pageReady = "true";
    await Promise.resolve();
    expect(document.activeElement).toBe(screen.getByRole("button"));
  });

  it("cancels the timer and observer when navigation moves elsewhere or the shell unmounts", async () => {
    const { container } = render(<main id="main-content" />);
    const main = screen.getByRole("main");
    const mainFocus = vi.spyOn(main, "focus");
    stop = focusPageWhenReady(container);
    stop();
    main.append(document.createElement("h1"));
    await vi.advanceTimersByTimeAsync(PAGE_FOCUS_TIMEOUT_MS * 2);
    expect(mainFocus).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
