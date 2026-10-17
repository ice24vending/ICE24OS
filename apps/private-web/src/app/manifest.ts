import { semanticColors } from "@ice24/ui";
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ICE24 OS",
    short_name: "ICE24",
    description: "Aplicación privada de operación ICE24",
    start_url: "/",
    display: "standalone",
    background_color: semanticColors.surface.canvas,
    theme_color: semanticColors.surface.brand,
    lang: "es-MX",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
