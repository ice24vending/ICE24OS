import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const appDir = __dirname;
// Pages that only redirect never render, so they need no title.
const redirectOnly = new Set(["(account)/workspace/page.tsx"]);

function pages(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? pages(join(dir, entry.name))
      : entry.name === "page.tsx"
        ? [join(dir, entry.name)]
        : [],
  );
}

describe("page titles (SR-05, WCAG 2.4.2)", () => {
  it("every rendered page declares its own title", () => {
    const untitled = pages(appDir)
      .map((file) => relative(appDir, file).replaceAll("\\", "/"))
      .filter((file) => !redirectOnly.has(file))
      .filter(
        (file) =>
          !/export const metadata = \{ title: "[^"]+" \}/.test(
            readFileSync(join(appDir, file), "utf8"),
          ),
      );
    expect(untitled).toEqual([]);
  });
});
