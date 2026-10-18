import { describe, expect, it } from "vitest";

import { componentExports, findCatalogGaps, usesComponent } from "./check-ui-catalog.mjs";

describe("UI catalog coverage", () => {
  it("collects PascalCase components, not constants, types or hooks", () => {
    const source = [
      "export function Button({ children }) {}",
      "export function Table<Row>(props) {}",
      "export const Toast = () => null;",
      "export const JOB_STATES = {};",
      "export function useToast() {}",
      "export interface ButtonProps {}",
      "export type Tone = 'a';",
    ].join("\n");
    expect(componentExports(source)).toEqual(["Button", "Table", "Toast"]);
  });

  it("counts rendered usage or the story component, not a prefix match", () => {
    expect(usesComponent("<Button variant='primary'>", "Button")).toBe(true);
    expect(usesComponent("<Button/>", "Button")).toBe(true);
    expect(usesComponent("component: Button,", "Button")).toBe(true);
    expect(usesComponent("<ButtonLink href='#'>", "Button")).toBe(false);
    expect(usesComponent("import { Button } from './button.js';", "Button")).toBe(false);
  });

  it("reports missing story, test and state matrix", () => {
    const gaps = findCatalogGaps({
      components: ["Button", "Card"],
      stories: {
        "packages/ui/src/components/base/button.stories.tsx":
          "component: Button\nexport const MatrizDeEstados = {};",
        "packages/ui/src/components/base/card.stories.tsx": "<Card />",
        "packages/ui/src/foundations/colors.stories.tsx": "no matrix needed",
      },
      tests: { "button.test.tsx": "render(<Button>Ok</Button>)" },
    });
    expect(gaps).toEqual([
      "Card: sin prueba unitaria",
      "packages/ui/src/components/base/card.stories.tsx: falta la historia «Matriz de estados» (MatrizDeEstados)",
    ]);
  });
});
