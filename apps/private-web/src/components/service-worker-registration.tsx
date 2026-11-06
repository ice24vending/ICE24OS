"use client";

import { useEffect } from "react";

export const ServiceWorkerRegistration = () => {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const enabled = process.env.NEXT_PUBLIC_ICE24_OFFLINE_SHELL === "1";
    void navigator.serviceWorker
      .register(enabled ? "/sw.js?offline=1" : "/sw.js")
      .catch((error: unknown) => {
        console.warn("No fue posible registrar el service worker.", error);
      });
  }, []);

  return null;
};
