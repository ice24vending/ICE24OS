import "@ice24/ui/styles.css";
import "./styles.css";

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { ServiceWorkerRegistration } from "../components/service-worker-registration";

export const metadata: Metadata = {
  title: "ICE24 OS",
  description: "Aplicación privada de operación ICE24",
  applicationName: "ICE24 OS",
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#0b5cab",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es-MX">
      <body>
        <a className="skip-link" href="#main-content">
          Saltar al contenido
        </a>
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
