import type { NextConfig } from "next";

/**
 * Origin of private object storage, allowed only in connect-src so the browser can PUT to a
 * signed upload URL (F5-08). Read at build time: set ICE24_STORAGE_ORIGIN (or SUPABASE_URL)
 * in the build environment. Plain http is accepted only for loopback test doubles.
 */
function storageOrigin(raw = process.env.ICE24_STORAGE_ORIGIN ?? process.env.SUPABASE_URL) {
  if (!raw) return "";
  try {
    const url = new URL(raw);
    const loopback = url.hostname === "127.0.0.1" || url.hostname === "localhost";
    return url.protocol === "https:" || (url.protocol === "http:" && loopback) ? url.origin : "";
  } catch {
    return "";
  }
}
const connectSrc = ["'self'", storageOrigin()].filter(Boolean).join(" ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; connect-src ${connectSrc}`,
          },
        ],
      },
    ];
  },
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: ["@ice24/ui"],
};

export default nextConfig;
