// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import {
  EvidenceLot,
  EvidenceReading,
  EvidenceSignature,
  PhotoCapture,
  prepareEvidencePhoto,
} from "./evidence.js";
afterEach(cleanup);
it("retains out-of-range readings and announces the required result", () => {
  const change = vi.fn();
  render(
    <EvidenceReading
      label="Temperatura"
      unit="°C"
      value={10}
      minimum={0}
      maximum={5}
      onChange={change}
    />,
  );
  expect(screen.getByText(/Fuera de rango/)).toBeDefined();
  fireEvent.change(screen.getByLabelText("Temperatura (°C)"), { target: { value: "12" } });
  expect(change).toHaveBeenCalledWith(12);
});
it("requires a named explicit keyboard-accessible confirmation", () => {
  const confirm = vi.fn(),
    invalidate = vi.fn();
  render(
    <EvidenceSignature label="Nombre" value="" onConfirm={confirm} onInvalidate={invalidate} />,
  );
  fireEvent.click(screen.getByRole("button"));
  expect(confirm).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Ana Torres" } });
  expect(invalidate).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button"));
  expect(confirm).toHaveBeenCalledWith("Ana Torres");
});
it("labels lots and photo input and rejects non-photo files before decoding", async () => {
  render(
    <>
      <EvidenceLot label="Lote" value="A1" onChange={vi.fn()} />
      <PhotoCapture label="Foto antes" onPrepared={vi.fn()} onError={vi.fn()} />
    </>,
  );
  expect(screen.getByLabelText("Lote")).toBeDefined();
  expect(screen.getByLabelText("Foto antes").getAttribute("accept")).toContain("image/jpeg");
  await expect(
    prepareEvidencePhoto(new File(["text"], "bad.txt", { type: "text/plain" })),
  ).rejects.toThrow("JPG");
});
