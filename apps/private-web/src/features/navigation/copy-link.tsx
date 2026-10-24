"use client";
import { Button } from "@ice24/ui";
import { useState } from "react";

import { shareableLink } from "./deep-links";

/**
 * «Copiar enlace» of a record (F6-11): the current page plus its account, so whoever opens it
 * lands in the right context or gets «sin permiso». The link grants nothing by itself.
 */
export function CopyLinkButton({ accountId }: { readonly accountId: string | null }) {
  const [copied, setCopied] = useState<"done" | "failed" | null>(null);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareableLink(window.location.href, accountId, null));
      setCopied("done");
    } catch {
      setCopied("failed");
    }
  };
  return (
    <>
      <Button variant="secondary" onClick={() => void copy()}>
        Copiar enlace
      </Button>
      <span role="status" className="copy-link__status">
        {copied === "done" && "Enlace copiado."}
        {copied === "failed" && "No pudimos copiar; usa la dirección de la barra del navegador."}
      </span>
    </>
  );
}
