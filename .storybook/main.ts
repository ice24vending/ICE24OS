import type { StorybookConfig } from "@storybook/react-vite";

/**
 * Component catalog of ICE24 OS (F6-00). Stories live next to their component in packages/ui
 * and apps/private-web. The framework is React + Vite, so private-web stories must render
 * presentational components that do not need the Next.js runtime (router, headers, server
 * actions); screens that do are reviewed in the app's demo mode instead.
 */
const config: StorybookConfig = {
  stories: [
    "../packages/ui/src/**/*.stories.@(ts|tsx)",
    "../apps/private-web/src/**/*.stories.@(ts|tsx)",
  ],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  framework: { name: "@storybook/react-vite", options: {} },
  core: { disableTelemetry: true },
  typescript: { reactDocgen: "react-docgen-typescript" },
};

export default config;
