import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: Object.fromEntries(
      ["contracts", "domain", "authorization"].map((name) => [
        `@ice24/${name}`,
        fileURLToPath(new URL(`./packages/${name}/src/index.ts`, import.meta.url)),
      ]),
    ),
  },
  test: {
    environment: "node",
    fileParallelism: false,
    hookTimeout: 120_000,
    include: ["tests/integration/**/*.test.ts"],
    testTimeout: 30_000,
  },
});
