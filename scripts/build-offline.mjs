import { build } from "vite";
import { fileURLToPath } from "node:url";
await build({
  configFile: false,
  publicDir: false,
  // This entry is entirely browser-side; RSC directives have no meaning in its static bundle.
  plugins: [
    {
      name: "offline-client-entry",
      enforce: "pre",
      transform(code, id) {
        if (/\.[cm]?[jt]sx?$/.test(id) && /^\s*["']use client["'];?/.test(code))
          return { code: code.replace(/^\s*["']use client["'];?/, ""), map: null };
      },
    },
  ],
  oxc: { jsx: { runtime: "automatic" } },
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    "process.env.NEXT_PUBLIC_ICE24_OFFLINE_SHELL": JSON.stringify("0"),
  },
  build: {
    outDir: fileURLToPath(new URL("../apps/private-web/public/offline-work", import.meta.url)),
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: Infinity,
    lib: {
      entry: fileURLToPath(
        new URL("../apps/private-web/src/features/sync/offline-work.tsx", import.meta.url),
      ),
      formats: ["es"],
      fileName: () => "app.js",
      cssFileName: "app",
    },
  },
});
