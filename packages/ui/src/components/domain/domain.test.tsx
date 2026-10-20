// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { expectNoAxeViolations } from "../base/axe.test-utils.js";
import { Comparator, isChanged, type ComparatorField } from "./comparator.js";
import { CriticalAlert, type CriticalAlertProps } from "./critical-alert.js";
import { JobStatus, JOB_STATES, type JobState } from "./job-status.js";
import { TransitionFeedbackBanner } from "./feedback.js";
import { dominantDimension, MachineTriad } from "./machine-triad.js";
import { ReadOnlyBanner, ReadOnlyIndicator } from "./read-only.js";
import { SYNC_STATES, SyncStatus, type SyncState } from "./sync-status.js";

afterEach(cleanup);

describe("MachineTriad", () => {
  it("shows three separate states with dimension, text and icon", () => {
    render(
      <MachineTriad
        machine="ICE24-000145"
        operational="available"
        technical="preventive_attention"
        sanitary="corrective_action"
      />,
    );
    const list = screen.getByRole("list", { name: "Estado de ICE24-000145" });
    const items = within(list).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual([
      "Operación: Disponible",
      "Técnico: Atención preventiva",
      "Sanitario: Acción correctiva",
    ]);
    for (const item of items) expect(item.querySelector("svg")).not.toBeNull();
  });

  it("lets a critical sanitary state dominate without hiding the others", () => {
    render(<MachineTriad operational="available" technical="critical" sanitary="restricted" />);
    const dominant = document.querySelectorAll("[data-dominant]");
    expect(dominant).toHaveLength(1);
    expect(dominant[0]?.textContent).toContain("Restringido");
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(dominantDimension({ operational: "off", technical: "critical", sanitary: null })).toBe(
      "technical",
    );
    expect(
      dominantDimension({ operational: "available", technical: "optimal", sanitary: "up_to_date" }),
    ).toBeNull();
  });

  it("reads the dimension in chip mode and says «Sin datos» for an unknown state", () => {
    render(
      <MachineTriad display="chips" operational="available" technical={null} sanitary={null} />,
    );
    const items = screen.getAllByRole("listitem");
    expect(items[1]?.textContent).toBe("Técnico: Sin datos");
    expect(items[0]?.querySelector(".ids-visually-hidden")?.textContent).toBe("Operación: ");
  });

  it("marks the loading state as busy", () => {
    render(<MachineTriad loading operational={null} technical={null} sanitary={null} />);
    expect(screen.getByRole("list").getAttribute("aria-busy")).toBe("true");
    expect(screen.getByText("Sanitario: cargando")).toBeDefined();
  });
});

const alert: CriticalAlertProps = {
  title: "Análisis no conforme",
  message: "Concentración fuera de rango en la última bitácora.",
  priority: "critical",
  status: "read",
  pinned: true,
  version: 4,
  elapsed: "hace 7 h",
  occurredAt: "2026-10-16T05:00:00.000Z",
  source: "ICE24-000145 · Sucursal Centro",
  responsible: "Responsable sanitario",
};

describe("CriticalAlert", () => {
  it("stays pinned until «Enterado» and passes the expected version", async () => {
    const user = userEvent.setup();
    const onAcknowledge = vi.fn();
    const onAttend = vi.fn();
    render(<CriticalAlert {...alert} onAcknowledge={onAcknowledge} onAttend={onAttend} />);
    const card = screen.getByRole("article", { name: "Análisis no conforme" });
    expect(within(card).getByText(/Fijada hasta que marques «Enterado»/u)).toBeDefined();
    expect(within(card).getByText("Crítica").textContent).toBe("Prioridad: Crítica");
    expect(within(card).getByText("Leída").textContent).toBe("Estado: Leída");
    await user.click(within(card).getByRole("button", { name: "Marcar enterado" }));
    expect(onAcknowledge).toHaveBeenCalledWith(4);
    await user.click(within(card).getByRole("button", { name: "Atender" }));
    expect(onAttend).toHaveBeenCalledWith(4);
    expect(within(card).queryByRole("button", { name: "Marcar resuelta" })).toBeNull();
  });

  it("explains why it cannot be resolved yet and keeps the button focusable", async () => {
    const user = userEvent.setup();
    const onResolve = vi.fn();
    render(
      <CriticalAlert
        {...alert}
        status="acknowledged"
        pinned={false}
        onResolve={onResolve}
        resolveBlockedReason="Se podrá resolver cuando la causa esté cerrada."
      />,
    );
    const resolve = screen.getByRole("button", { name: "Marcar resuelta" });
    expect(resolve.getAttribute("aria-disabled")).toBe("true");
    expect(resolve.getAttribute("aria-describedby")).toBeTruthy();
    expect(screen.getByText("Se podrá resolver cuando la causa esté cerrada.")).toBeDefined();
    await user.click(resolve);
    expect(onResolve).not.toHaveBeenCalled();
    expect(screen.queryByText(/Fijada hasta/u)).toBeNull();
  });

  it("locks every action while one is pending", async () => {
    const user = userEvent.setup();
    const onAcknowledge = vi.fn();
    const onAttend = vi.fn();
    render(
      <CriticalAlert
        {...alert}
        pending="acknowledge"
        onAcknowledge={onAcknowledge}
        onAttend={onAttend}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Registrando/u }));
    await user.click(screen.getByRole("button", { name: "Atender" }));
    expect(onAcknowledge).not.toHaveBeenCalled();
    expect(onAttend).not.toHaveBeenCalled();
  });

  it("shows a 412 conflict inside the card with a way to refresh", async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn();
    render(
      <CriticalAlert
        {...alert}
        feedback={{ kind: "conflict", message: "El aviso cambió desde que lo consultaste." }}
        onRefresh={onRefresh}
      />,
    );
    const banner = screen.getByRole("alert");
    expect(within(banner).getByRole("heading", { level: 4 }).textContent).toBe(
      "La información cambió",
    );
    await user.click(within(banner).getByRole("button", { name: "Actualizar" }));
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it("toggles the detail with aria-expanded", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const { rerender } = render(
      <CriticalAlert {...alert} onToggleDetail={onToggle} detail={<p>Canales: correo</p>} />,
    );
    const toggle = screen.getByRole("button", { name: "Ver detalle" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    await user.click(toggle);
    expect(onToggle).toHaveBeenCalledOnce();
    rerender(
      <CriticalAlert
        {...alert}
        onToggleDetail={onToggle}
        detailOpen
        detail={<p>Canales: correo</p>}
      />,
    );
    const open = screen.getByRole("button", { name: "Ocultar detalle" });
    expect(document.getElementById(open.getAttribute("aria-controls") ?? "")?.textContent).toBe(
      "Canales: correo",
    );
  });
});

const fields: ComparatorField[] = [
  { id: "ppm", label: "Concentración", before: "150 ppm", after: "140 ppm" },
  {
    id: "photo",
    label: "Evidencia",
    before: <a href="#a">foto_servidor.jpg</a>,
    after: <a href="#b">foto_local.jpg</a>,
    changed: true,
    beforeText: "foto_servidor.jpg",
    afterText: "foto_local.jpg",
  },
  { id: "lot", label: "Lote", before: "L-2201", after: "L-2201" },
];

describe("Comparator", () => {
  it("summarizes the differences and writes each change for screen readers", () => {
    render(
      <Comparator
        title="Conflicto de sincronización SYNC-0038"
        before={{ label: "Versión del servidor", meta: "Actualizada 19:14 por Luis" }}
        after={{ label: "Versión del dispositivo", meta: "Capturada 19:02 por Ana" }}
        fields={fields}
        showUnchanged
      />,
    );
    expect(screen.getByText("2 diferencias: concentración, evidencia.")).toBeDefined();
    const table = screen.getByRole("table");
    expect(table.getAttribute("aria-describedby")).toBeTruthy();
    const rows = within(table).getAllByRole("row").slice(1);
    expect(within(rows[0]!).getByText("Cambió de 150 ppm a 140 ppm")).toBeDefined();
    expect(
      within(rows[1]!).getByText("Cambió de foto_servidor.jpg a foto_local.jpg"),
    ).toBeDefined();
    expect(within(rows[2]!).getByText("Sin cambio")).toBeDefined();
    expect(within(table).getByRole("rowheader", { name: "Concentración" })).toBeDefined();
  });

  it("lists only the changes by default and reveals the rest on demand", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <Comparator
        title="Cambios"
        before={{ label: "Esperado" }}
        after={{ label: "Real" }}
        fields={fields}
      />,
    );
    expect(screen.getAllByRole("row")).toHaveLength(3);
    const toggle = screen.getByRole("button", { name: "Mostrar 1 campo sin cambios" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    await user.click(toggle);
    expect(screen.getAllByRole("row")).toHaveLength(4);
    expect(
      screen
        .getByRole("button", { name: "Ocultar campos sin cambios" })
        .getAttribute("aria-expanded"),
    ).toBe("true");
    expect(isChanged({ id: "x", label: "X", before: null, after: "1" })).toBe(true);
    rerender(
      <Comparator title="Cambios" before={{ label: "A" }} after={{ label: "B" }} fields={[]} />,
    );
    expect(screen.getByText("No hay campos que comparar.")).toBeDefined();
  });
});

describe("SyncStatus", () => {
  it("names every state with text and icon", () => {
    const states = Object.keys(SYNC_STATES) as SyncState[];
    render(
      <div>
        {states.map((state) => (
          <SyncStatus key={state} state={state} />
        ))}
      </div>,
    );
    for (const state of states)
      expect(screen.getByText(SYNC_STATES[state].label).textContent).toBe(
        `Sincronización: ${SYNC_STATES[state].label}`,
      );
  });

  it("retries with the same operation id and ignores clicks while retrying", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const { rerender } = render(
      <SyncStatus
        variant="panel"
        state="error"
        operationId="op-7f3a"
        attempt={2}
        onRetry={onRetry}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(onRetry).toHaveBeenCalledWith("op-7f3a");
    rerender(
      <SyncStatus
        variant="panel"
        state="error"
        operationId="op-7f3a"
        attempt={2}
        onRetry={onRetry}
        retrying
      />,
    );
    await user.click(screen.getByRole("button", { name: /Reintentando/u }));
    await user.dblClick(screen.getByRole("button", { name: /Reintentando/u }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("offers «Resolver» only for a conflict and explains a blocked action", async () => {
    const user = userEvent.setup();
    const onResolve = vi.fn();
    render(
      <SyncStatus
        variant="panel"
        state="conflict"
        onResolve={onResolve}
        actionsDisabledReason="Solo perfiles autorizados resuelven conflictos."
      />,
    );
    await user.click(screen.getByRole("button", { name: "Resolver" }));
    expect(onResolve).not.toHaveBeenCalled();
    expect(screen.getByText("Solo perfiles autorizados resuelven conflictos.")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Reintentar" })).toBeNull();
  });

  it("counts pending changes in the chip", () => {
    render(<SyncStatus state="pending" pendingCount={3} />);
    expect(screen.getByRole("status").textContent).toContain("3 cambios sin sincronizar");
  });
});

describe("Read-only", () => {
  it("keeps the live region mounted and shows the bar only while active", () => {
    const { rerender, container } = render(<ReadOnlyBanner active={false} />);
    const region = container.querySelector("[aria-live='polite']");
    expect(region?.childElementCount).toBe(0);
    rerender(
      <ReadOnlyBanner
        active
        reason="El último pago fue rechazado."
        action="Regulariza el pago en Suscripción."
      />,
    );
    const banner = screen.getByRole("region", { name: "Cuenta en modo lectura" });
    expect(banner.textContent).toContain("no crear ni modificar registros. El último pago");
    expect(within(banner).getByRole("link", { name: "Ver suscripción" })).toBeDefined();
    expect(within(banner).queryByRole("button")).toBeNull();
  });

  it("says which kind of read-only applies", () => {
    render(
      <>
        <ReadOnlyIndicator />
        <ReadOnlyIndicator scope="permission" reason="Tu rol solo consulta." />
      </>,
    );
    expect(screen.getByText("Modo lectura")).toBeDefined();
    expect(screen.getByText("Solo consulta")).toBeDefined();
    expect(screen.getByText("Tu rol solo consulta.")).toBeDefined();
  });
});

describe("JobStatus", () => {
  it("labels internal and public states", () => {
    render(
      <div>
        {(Object.keys(JOB_STATES) as JobState[]).map((status) => (
          <JobStatus key={status} status={status} />
        ))}
      </div>,
    );
    expect(screen.getByText("Requiere revisión").textContent).toBe("Trabajo: Requiere revisión");
    expect(screen.getByText("Error reintentable")).toBeDefined();
    expect(screen.getByText("Reintento programado")).toBeDefined();
  });

  it("retries a dead-lettered job with the expected version and shows a 412", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const onRefresh = vi.fn();
    render(
      <JobStatus
        variant="detail"
        status="DEAD_LETTER"
        attemptCount={5}
        maxAttempts={5}
        errorCode="PROVIDER_TIMEOUT"
        version={7}
        onRetry={onRetry}
        feedback={{ kind: "conflict", message: "El trabajo cambió desde que lo abriste." }}
        onRefresh={onRefresh}
      />,
    );
    expect(screen.getByText("5 de 5")).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Reintentar trabajo" }));
    expect(onRetry).toHaveBeenCalledWith(7);
    await user.click(screen.getByRole("button", { name: "Actualizar" }));
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it("does not offer a retry outside FAILED and DEAD_LETTER", () => {
    render(<JobStatus variant="detail" status="RUNNING" version={1} onRetry={() => undefined} />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("domain components accessibility", () => {
  it("has no axe violations in their states", async () => {
    const { container } = render(
      <main>
        <MachineTriad operational="available" technical="critical" sanitary="corrective_action" />
        <MachineTriad display="chips" operational={null} technical={null} sanitary={null} />
        <ul>
          <CriticalAlert
            {...alert}
            as="li"
            onAcknowledge={() => undefined}
            onAttend={() => undefined}
            onToggleDetail={() => undefined}
            detailOpen
            detail={<p>Detalle</p>}
            action={{ href: "/subscription", label: "Ver suscripción" }}
            feedback={{ kind: "error", message: "No se envió ningún cambio." }}
            onRetryFeedback={() => undefined}
          />
          <CriticalAlert
            {...alert}
            as="li"
            title="Pago rechazado"
            status="in_progress"
            pinned={false}
            onResolve={() => undefined}
            resolveBlockedReason="La causa sigue abierta."
          />
        </ul>
        <Comparator
          title="Comparación"
          before={{ label: "Anterior" }}
          after={{ label: "Propuesto" }}
          fields={fields}
        />
        <SyncStatus state="pending" pendingCount={2} />
        <SyncStatus variant="panel" state="error" operationId="op-1" onRetry={() => undefined} />
        <SyncStatus variant="panel" state="conflict" onResolve={() => undefined} />
        <ReadOnlyBanner active reason="Pago rechazado." />
        <ReadOnlyIndicator scope="permission" />
        <JobStatus status="FAILED" />
        <JobStatus variant="detail" status="FAILED" version={1} onRetry={() => undefined} />
      </main>,
    );
    await expectNoAxeViolations(container);
  });
});

describe("TransitionFeedbackBanner", () => {
  it("offers «Actualizar» for a conflict and «Reintentar» for an error", async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn();
    const onRetry = vi.fn();
    const { rerender } = render(
      <TransitionFeedbackBanner
        feedback={{ kind: "conflict", message: "Cambió." }}
        onRefresh={onRefresh}
        onRetry={onRetry}
      />,
    );
    expect(screen.queryByRole("button", { name: "Reintentar" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Actualizar" }));
    expect(onRefresh).toHaveBeenCalledOnce();
    rerender(
      <TransitionFeedbackBanner
        feedback={{ kind: "error", message: "Falló." }}
        onRefresh={onRefresh}
        onRetry={onRetry}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(onRetry).toHaveBeenCalledOnce();
    expect(screen.getByRole("alert").textContent).toContain("No fue posible completar la acción");
  });
});
