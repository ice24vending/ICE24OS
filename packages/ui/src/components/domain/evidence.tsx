"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "../base/button.js";

export function PhotoCapture({
  label,
  disabled = false,
  file,
  onPrepared,
  onError,
}: {
  label: string;
  disabled?: boolean;
  file?: File | undefined;
  onPrepared: (original: File, prepared: File) => void;
  onError: (message: string) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!file) return;
    let active = true;
    void createImageBitmap(file)
      .then((bitmap) => {
        if (active && canvas.current) {
          const target = canvas.current;
          target.width = 240;
          target.height = Math.round((240 * bitmap.height) / bitmap.width);
          target.getContext("2d")?.drawImage(bitmap, 0, 0, target.width, target.height);
        }
        bitmap.close();
      })
      .catch(() => onError("No fue posible mostrar la vista previa."));
    return () => {
      active = false;
    };
  }, [file, onError]);
  return (
    <div>
      <label>
        {label}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          disabled={disabled || busy}
          onChange={async (event) => {
            const original = event.target.files?.[0];
            if (!original) return;
            setBusy(true);
            try {
              onPrepared(original, await prepareEvidencePhoto(original));
            } catch (error) {
              onError(error instanceof Error ? error.message : "No fue posible preparar la foto.");
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      {busy && <p role="status">Preparando foto…</p>}
      {file && (
        <canvas
          ref={canvas}
          role="img"
          aria-label={`Vista previa: ${label}`}
          style={{ maxWidth: "100%" }}
        />
      )}
    </div>
  );
}

export function EvidenceReading({
  label,
  unit,
  value,
  onChange,
  minimum,
  maximum,
  disabled = false,
}: {
  label: string;
  unit: string;
  value: number | "";
  onChange: (value: number | "") => void;
  minimum?: number | undefined;
  maximum?: number | undefined;
  disabled?: boolean;
}) {
  const id = useId();
  const outside =
    value !== "" &&
    ((minimum !== undefined && value < minimum) || (maximum !== undefined && value > maximum));
  return (
    <div>
      <label htmlFor={id}>
        {label} ({unit})
      </label>
      <input
        id={id}
        type="number"
        step="any"
        value={value}
        disabled={disabled}
        aria-describedby={`${id}-range`}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
      />
      <p id={`${id}-range`}>
        Rango: {minimum ?? "sin mínimo"} a {maximum ?? "sin máximo"} {unit}.{" "}
        {outside ? "Fuera de rango: conserva el valor real y registra No conforme." : ""}
      </p>
    </div>
  );
}

export function EvidenceLot({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label>
      {label}
      <input
        value={value}
        maxLength={160}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export function EvidenceSignature({
  label,
  value,
  onConfirm,
  onInvalidate,
  disabled = false,
}: {
  label: string;
  value: string;
  onConfirm: (name: string) => void;
  onInvalidate: () => void;
  disabled?: boolean;
}) {
  const [name, setName] = useState(value);
  return (
    <div>
      <label>
        {label}
        <input
          autoComplete="name"
          value={name}
          maxLength={160}
          disabled={disabled}
          onChange={(e) => {
            setName(e.target.value);
            onInvalidate();
          }}
        />
      </label>
      <Button
        icon="check-circle"
        variant="secondary"
        disabled={disabled || name.trim().length < 2}
        onClick={() => onConfirm(name.trim())}
      >
        Confirmo la ejecución
      </Button>
      <p role="status">
        {value
          ? `Confirmación registrada: ${value}`
          : "Escribe tu nombre y confirma. No necesitas dibujar una firma."}
      </p>
    </div>
  );
}
/** The original remains in memory until the derivative has passed server verification. */
export async function prepareEvidencePhoto(original: File): Promise<File> {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(original.type) ||
    original.size > 10 * 1024 * 1024
  )
    throw new Error("Selecciona JPG, PNG o WebP de hasta 10 MB.");
  const bitmap = await createImageBitmap(original);
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error("No fue posible preparar la foto. Conserva el original y reintenta.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    if (!blob || blob.size > 2 * 1024 * 1024)
      throw new Error(
        "La foto preparada supera 2 MB. Selecciona una imagen más pequeña; el original no se modificó.",
      );
    return new File([blob], `${original.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg" });
  } finally {
    bitmap.close();
  }
}
