import { describe, expect, it } from "vitest";

import {
  matrixRoutes,
  REVIEW_VIEWPORTS,
  type ReviewRoute,
} from "../../tests/visual/ux-review.routes";
import { renderGallery, stateOptions } from "./gallery";

const routes: ReviewRoute[] = [
  {
    id: "avisos",
    title: "Centro de avisos",
    path: "/notifications",
    review: "Alertas.",
    states: [
      { id: "normal", label: "Normal (Dueño)" },
      { id: "lectura", label: "Cuenta en modo lectura" },
    ],
  },
  ...matrixRoutes([
    { id: "base-button--matriz-de-estados", title: "Base/Button", type: "story" },
    { id: "base-button--playground", title: "Base/Button", type: "story" },
  ]),
];

describe("UX gallery (F6-05)", () => {
  it("adds one matrix route per «Matriz de estados» story", () => {
    const matrices = routes.filter((route) => route.section === "matriz");
    expect(matrices).toHaveLength(1);
    expect(matrices[0]).toMatchObject({
      id: "matriz-base-button",
      title: "Matriz · Button (Base)",
      storybook: "base-button--matriz-de-estados",
    });
  });

  it("offers each state once, with a generic label for «normal»", () => {
    expect(stateOptions(routes)).toEqual([
      ["normal", "Normal"],
      ["lectura", "Cuenta en modo lectura"],
    ]);
  });

  it("groups by section and tags every capture for the filters", () => {
    const html = renderGallery({
      routes,
      viewports: REVIEW_VIEWPORTS,
      captures: [
        {
          route: "avisos",
          state: "lectura",
          viewport: "movil",
          file: "avisos--lectura--movil.png",
          status: 200,
          problems: [],
        },
      ],
      generatedAt: new Date("2026-10-17T12:00:00Z"),
      commit: "abc1234",
    });
    expect(html).toContain('id="seccion-pantallas"');
    expect(html).toContain('id="seccion-matriz"');
    expect(html).toContain(
      '<figure data-section="pantallas" data-route="avisos" data-viewport="movil" data-state="lectura">',
    );
    expect(html).toContain('<select name="viewport">');
    expect(html).toContain('<button type="reset">Quitar filtros</button>');
    expect(html).toContain('role="status"');
  });
});
