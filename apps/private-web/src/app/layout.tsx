import "@ice24/ui/styles.css";
import "./styles.css";

import { semanticColors } from "@ice24/ui";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { ServiceWorkerRegistration } from "../components/service-worker-registration";
import { DemoSlot } from "../features/demo/demo-slot";
import { isDemoModeEnabled } from "../server/demo/mode";

export const metadata: Metadata = {
  // Each page sets its own title so screen readers announce where navigation landed (WCAG 2.4.2).
  title: { default: "ICE24 OS", template: "%s · ICE24 OS" },
  description: "Aplicación privada de operación ICE24",
  applicationName: "ICE24 OS",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: semanticColors.surface.brand,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es-MX">
      <body>
        <a className="skip-link" href="#main-content">
          Ir al contenido
        </a>
        {children}
        {isDemoModeEnabled() && (
          <p className="demo-banner" role="note">
            DEMO — datos ficticios
          </p>
        )}
        <DemoSlot />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
