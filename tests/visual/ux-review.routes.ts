/**
 * Screens of the UX review gallery (`pnpm ux:snapshots`, F6-00). Each later Phase 6 task adds
 * its screens here; F6-12 reuses this same list for accessibility and visual regression.
 *
 * Every capture runs in the private web's demo mode: the `demo` fields select the fictitious
 * persona, account mode and simulated network (see apps/private-web/src/server/demo).
 */
import type { DemoState } from "../../apps/private-web/src/server/demo/state";

export interface ReviewViewport {
  readonly id: string;
  readonly label: string;
  readonly width: number;
  readonly height: number;
}

/** Same widths as the Storybook viewports (.storybook/preview.ts). */
export const REVIEW_VIEWPORTS: readonly ReviewViewport[] = [
  { id: "movil", label: "Móvil 375", width: 375, height: 812 },
  { id: "tableta", label: "Tableta 768", width: 768, height: 1024 },
  { id: "escritorio", label: "Escritorio 1280", width: 1280, height: 800 },
];

export interface ReviewState {
  readonly id: string;
  readonly label: string;
  /** Demo selection; omitted fields keep the defaults (owner, first account, active, online). */
  readonly demo?: Partial<Pick<DemoState, "persona" | "account" | "mode" | "network">>;
  /** `loading` captures the page while it is still waiting for the (slow) data. */
  readonly capture?: "loaded" | "loading";
  /** Open the floating demo panel before the capture. */
  readonly openDemoPanel?: boolean;
}

export interface ReviewRoute {
  readonly id: string;
  readonly title: string;
  readonly path: string;
  /** What reviewers should look at on this screen. */
  readonly review: string;
  /** Captured without a demo session (public pages). */
  readonly anonymous?: boolean;
  readonly states: readonly ReviewState[];
}

const normal: ReviewState = { id: "normal", label: "Normal (Dueño)" };
const readOnly: ReviewState = {
  id: "lectura",
  label: "Cuenta en modo lectura",
  demo: { mode: "READ_ONLY" },
};
const failing: ReviewState = {
  id: "error",
  label: "Error del servicio",
  demo: { network: "error" },
};
const offline: ReviewState = { id: "offline", label: "Sin conexión", demo: { network: "offline" } };
const loading: ReviewState = {
  id: "carga",
  label: "Cargando",
  demo: { network: "slow" },
  capture: "loading",
};
const forbidden = (persona: "technician" | "admin"): ReviewState => ({
  id: "sin-permiso",
  label: `Sin permiso (${persona === "technician" ? "Técnico" : "Administrador de sucursal"})`,
  demo: { persona },
});

export const REVIEW_ROUTES: readonly ReviewRoute[] = [
  {
    id: "acceso",
    title: "Inicio de sesión",
    path: "/",
    review: "Claridad del acceso y del enlace al modo demo.",
    anonymous: true,
    states: [{ id: "normal", label: "Sin sesión" }],
  },
  {
    id: "contexto",
    title: "Selector de cuenta",
    path: "/access/context",
    review: "Se entiende en qué cuenta y con qué rol se va a trabajar.",
    states: [normal, failing],
  },
  {
    id: "equipos",
    title: "Cuentas y máquinas",
    path: "/workspace",
    review: "Menú por rol: el Administrador de sucursal no ve la configuración de cuenta.",
    states: [
      normal,
      { id: "administrador", label: "Administrador de sucursal", demo: { persona: "admin" } },
      { id: "tecnico", label: "Técnico", demo: { persona: "technician" } },
      { id: "solo-lectura", label: "Solo lectura (Auditor)", demo: { persona: "readonly" } },
      { id: "ice24", label: "Operador ICE24", demo: { persona: "ice24" } },
      readOnly,
      failing,
      { id: "panel-demo", label: "Panel Demo abierto", openDemoPanel: true },
    ],
  },
  {
    id: "avisos",
    title: "Centro de avisos",
    path: "/notifications",
    review: "La alerta crítica fijada y su acción son evidentes; estados de cada aviso.",
    states: [normal, readOnly, loading, failing, offline],
  },
  {
    id: "suscripcion",
    title: "Suscripción",
    path: "/subscription",
    review: "Estado del pago y qué hacer cuando la cuenta queda en solo lectura.",
    states: [
      normal,
      readOnly,
      { id: "demo", label: "Cuenta demo", demo: { account: "bajio" } },
      forbidden("technician"),
      loading,
      failing,
    ],
  },
  {
    id: "auditoria",
    title: "Auditoría",
    path: "/audit",
    review: "Se distingue quién hizo qué, el resultado (incluido «denegado») y la correlación.",
    states: [normal, forbidden("technician"), loading, failing],
  },
  {
    id: "trabajos",
    title: "Centro de trabajos",
    path: "/jobs",
    review: "Un trabajo fallido se identifica y se puede diagnosticar.",
    states: [normal, forbidden("admin"), loading, failing],
  },
  {
    id: "archivos",
    title: "Archivos privados",
    path: "/files",
    review: "Se entiende que no hay enlaces públicos y cómo subir una evidencia.",
    states: [normal, readOnly, offline],
  },
  {
    id: "perfil",
    title: "Perfil y seguridad",
    path: "/profile",
    review: "Datos del usuario y sesiones; acción de cerrar sesiones.",
    states: [normal, failing],
  },
];
