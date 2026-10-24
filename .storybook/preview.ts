import type { Preview } from "@storybook/react-vite";

import "../packages/ui/src/styles.css";
import "../apps/private-web/src/app/styles.css";

/** Viewports of the UX review: the same widths the ux:snapshots gallery captures. */
export const REVIEW_VIEWPORTS = {
  mobile: { name: "Móvil 375", styles: { width: "375px", height: "812px" }, type: "mobile" },
  tablet: { name: "Tableta 768", styles: { width: "768px", height: "1024px" }, type: "tablet" },
  desktop: {
    name: "Escritorio 1280",
    styles: { width: "1280px", height: "800px" },
    type: "desktop",
  },
  wide: {
    name: "Escritorio 1440",
    styles: { width: "1440px", height: "900px" },
    type: "desktop",
  },
} as const;

const preview: Preview = {
  parameters: {
    layout: "padded",
    controls: { expanded: true, sort: "requiredFirst" },
    viewport: { options: REVIEW_VIEWPORTS },
    // Violations fail the gate (F6-12, tests/e2e/accessibility/stories.spec.ts).
    a11y: { test: "error" },
    docs: { toc: true },
    // Official catalog order (F6-05): welcome first, then from foundations to screens.
    options: {
      storySort: {
        order: [
          "Catálogo",
          ["Bienvenida"],
          "Fundamentos",
          "Base",
          "Dominio",
          "Patrones",
          "Pantallas",
          ["Introducción", "*"],
        ],
      },
    },
  },
  tags: ["autodocs"],
};

export default preview;
