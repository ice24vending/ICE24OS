"use client";
import { useState } from "react";
import type { ExecutionEvidence } from "@ice24/contracts";
import { FileUploader } from "../files/uploader";

import { PhotoCapture } from "@ice24/ui";
export function EvidencePhoto({
  code,
  label,
  machineId,
  contextId,
  csrfToken,
  onVerified,
  onPending,
}: {
  code: string;
  label: string;
  machineId: string;
  contextId: string;
  csrfToken: string;
  onVerified: (evidence: ExecutionEvidence) => void;
  onPending: (pending: boolean) => void;
}) {
  const [original, setOriginal] = useState<File | null>(null);
  const [prepared, setPrepared] = useState<File>();
  const [error, setError] = useState("");
  return (
    <section aria-label={label}>
      <PhotoCapture
        label={label}
        file={prepared}
        disabled={!!original}
        onError={setError}
        onPrepared={(source, derivative) => {
          setOriginal(source);
          setPrepared(derivative);
          setError("");
          onPending(true);
        }}
      />{" "}
      {error && <p role="alert">{error}</p>}
      {prepared && original && (
        <FileUploader
          selectedFile={prepared}
          resources={[{ type: "machine", id: machineId, label: "Máquina de la orden" }]}
          fixedPurpose="equipment_evidence"
          contextId={contextId}
          csrfToken={csrfToken}
          onVerified={(file) => {
            if (!file.currentVersionId) {
              setError("El archivo todavía no tiene una versión verificable.");
              return;
            }
            onVerified({
              type: "photo",
              requirementCode: code,
              fileId: file.id,
              fileVersionId: file.currentVersionId,
            });
            setOriginal(null);
            setPrepared(undefined);
            onPending(false);
          }}
        />
      )}
    </section>
  );
}
