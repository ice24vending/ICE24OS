import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  // Component tests render TSX (apps use "jsx": "preserve" for Next.js).
  oxc: { jsx: { runtime: "automatic" } },
  resolve: {
    alias: {
      "@ice24/contracts": fileURLToPath(
        new URL("./packages/contracts/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    coverage: {
      enabled: false,
      provider: "v8",
    },
    environment: "node",
    exclude: ["**/node_modules/**", "**/dist/**", "tests/integration/**"],
    include: ["apps/**/*.test.{ts,tsx}", "packages/**/*.test.ts"],
  },
});
