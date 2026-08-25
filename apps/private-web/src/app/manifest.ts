import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ICE24 OS",
    short_name: "ICE24",
    description: "Aplicación privada de operación ICE24",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f7f9",
    theme_color: "#0b5cab",
    lang: "es-MX",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
