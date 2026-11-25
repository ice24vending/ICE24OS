"use client";
import { useId, useState, type RefObject } from "react";
import { Button } from "@ice24/ui";

export function FilePicker({
  inputRef,
  accept,
  disabled,
  describedBy,
  photo = false,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  accept?: string | undefined;
  disabled: boolean;
  describedBy?: string | undefined;
  photo?: boolean;
}) {
  const id = useId();
  const [name, setName] = useState("");
  return (
    <div className="file-picker">
      <label htmlFor={id}>{photo ? "Foto de la máquina" : "Archivo a subir"}</label>
      <input
        id={id}
        ref={inputRef}
        type="file"
        className="ids-visually-hidden"
        tabIndex={-1}
        accept={accept}
        disabled={disabled}
        aria-describedby={describedBy}
        onChange={(event) => setName(event.target.files?.[0]?.name ?? "")}
      />
      <Button
        type="button"
        variant="secondary"
        icon="upload"
        disabled={disabled}
        aria-describedby={`${id}-name${describedBy ? ` ${describedBy}` : ""}`}
        onClick={() => inputRef.current?.click()}
      >
        {photo ? "Seleccionar foto" : "Seleccionar archivo"}
      </Button>
      <p id={`${id}-name`} className="file-hint">
        {name || (photo ? "Ninguna foto seleccionada" : "Ningún archivo seleccionado")}
      </p>
    </div>
  );
}
