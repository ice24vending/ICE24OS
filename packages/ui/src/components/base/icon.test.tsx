// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { expectNoAxeViolations } from "./axe.test-utils.js";
import { Icon, ICON_NAMES, Spinner } from "./icon.js";

afterEach(cleanup);

describe("Icon and Spinner", () => {
  it("is decorative without a label and an image with one", () => {
    const { container } = render(
      <>
        <Icon name="tool" />
        <Icon name="danger" label="Error" />
      </>,
    );
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByRole("img", { name: "Error" })).toBeDefined();
  });

  it("draws every icon of the set and a decorative spinner", async () => {
    const { container } = render(
      <main>
        {ICON_NAMES.map((name) => (
          <Icon key={name} name={name} />
        ))}
        <Spinner />
      </main>,
    );
    const svgs = [...container.querySelectorAll("svg")];
    expect(svgs).toHaveLength(ICON_NAMES.length + 1);
    expect(svgs.every((svg) => svg.childElementCount > 0)).toBe(true);
    expect(container.querySelector(".ids-spinner")?.getAttribute("aria-hidden")).toBe("true");
    await expectNoAxeViolations(container);
  });
});
