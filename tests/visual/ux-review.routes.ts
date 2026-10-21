/**
 * Screens of the UX review gallery (`pnpm ux:snapshots`, F6-00). Each later Phase 6 task adds
 * its screens here; F6-12 reuses this same list for accessibility and visual regression.
 *
 * Screen captures run in the private web's demo mode: the `demo` fields select the fictitious
 * persona, account mode and simulated network (see apps/private-web/src/server/demo). Routes with
 * `storybook` capture a Storybook story instead (design-system foundations, F6-02).
 */
import { DEMO_ACCOUNTS } from "../../apps/private-web/src/server/demo/fixtures";
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
  readonly demo?: Partial<Pick<DemoState, "persona" | "account" | "mode" | "network" | "focus">>;
  /** `loading` captures the page while it is still waiting for the (slow) data. */
  readonly capture?: "loaded" | "loading";
  /** Open the floating demo panel before the capture. */
  readonly openDemoPanel?: boolean;
  /** Open the topbar context selector before the capture (F6-08). */
  readonly openContextSelector?: boolean;
}

/** Gallery sections (F6-05), in the order of the Storybook catalog. */
export const REVIEW_SECTIONS = {
  pantallas: "Pantallas",
  fundamentos: "Fundamentos",
  base: "Componentes base",
  dominio: "Componentes de dominio",
  matriz: "Matrices de estados",
  patrones: "Patrones",
} as const;
export type ReviewSection = keyof typeof REVIEW_SECTIONS;

export interface ReviewRoute {
  readonly id: string;
  /** Gallery section; screens of the private web when omitted. */
  readonly section?: ReviewSection;
  readonly title: string;
  readonly path: string;
  /** What reviewers should look at on this screen. */
  readonly review: string;
  /** Captured without a demo session (public pages). */
  readonly anonymous?: boolean;
  /** Storybook story id (`iframe.html?id=…`); the capture comes from the static Storybook. */
  readonly storybook?: string;
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

/** One state per demo persona: the private shell each role receives (F6-06, F6-07). */
const PERSONA_STATES: readonly ReviewState[] = [
  { id: "dueno", label: "Dueño", demo: { persona: "owner" } },
  { id: "administrador", label: "Administrador de sucursal", demo: { persona: "admin" } },
  { id: "tecnico", label: "Técnico", demo: { persona: "technician" } },
  { id: "solo-lectura", label: "Solo lectura (Auditor)", demo: { persona: "readonly" } },
  { id: "operador-ice24", label: "Operador ICE24", demo: { persona: "ice24" } },
  { id: "admin-ice24", label: "Administrador ICE24", demo: { persona: "platform" } },
];

const lightTheme: ReviewState = { id: "normal", label: "Tema claro" };

const foundation = (id: string, title: string, storybook: string, review: string): ReviewRoute => ({
  id: `fundamentos-${id}`,
  section: "fundamentos",
  title: `Fundamentos · ${title}`,
  path: `Storybook · ${storybook}`,
  review,
  anonymous: true,
  storybook,
  states: [lightTheme],
});

/** Design-system foundations (F6-01 and F6-02), brand palette approved 15/10/2026 (ADR-025). */
const FOUNDATION_ROUTES: readonly ReviewRoute[] = [
  foundation(
    "marca",
    "Colores de marca",
    "fundamentos-colores--marca",
    "Los cuatro anclajes ICE24 (azul noche, azul de acción, celeste hielo y blanco) se reconocen como la marca.",
  ),
  foundation(
    "estados",
    "Colores de estado",
    "fundamentos-colores--estados",
    "Cada estado se distingue por texto e icono, no solo por color; los tonos no se confunden con la marca.",
  ),
  foundation(
    "semanticos",
    "Tokens semánticos",
    "fundamentos-colores--semanticos",
    "Superficies, texto, bordes, acciones y foco: qué color usa cada función.",
  ),
  foundation(
    "contraste",
    "Contraste",
    "fundamentos-colores--contraste",
    "Todas las combinaciones en uso cumplen WCAG 2.2 AA; las no permitidas están identificadas.",
  ),
  foundation(
    "tipografia",
    "Tipografía",
    "fundamentos-tipografía--escala",
    "Jerarquía legible de títulos, cuerpo, etiquetas y códigos.",
  ),
  foundation(
    "espaciado",
    "Espaciado",
    "fundamentos-espaciado--escala",
    "Escala de 4 px y área mínima de toque de 44 px.",
  ),
  foundation(
    "radios",
    "Radios",
    "fundamentos-espaciado--radios",
    "Esquinas moderadas: tarjetas que no parecen cápsulas.",
  ),
  foundation(
    "breakpoints",
    "Breakpoints",
    "fundamentos-espaciado--breakpoints",
    "Rangos de teléfono, tableta y escritorio.",
  ),
  foundation(
    "elevacion",
    "Elevación",
    "fundamentos-elevación--sombras",
    "Sombras suaves solo en superficies que flotan; capas ordenadas.",
  ),
  foundation(
    "movimiento",
    "Movimiento",
    "fundamentos-movimiento--duraciones",
    "Transiciones breves; con «reducir movimiento» no hay animación.",
  ),
];

const component = (
  id: string,
  title: string,
  storybook: string,
  review: string,
  section: ReviewSection = "base",
): ReviewRoute => ({
  id: `componentes-${id}`,
  section,
  title: `Componentes · ${title}`,
  path: `Storybook · ${storybook}`,
  review,
  anonymous: true,
  storybook,
  states: [lightTheme],
});

/** Base components of the design system (F6-03), following the approved visual direction. */
const COMPONENT_ROUTES: readonly ReviewRoute[] = [
  component(
    "botones",
    "Botones",
    "base-button--variantes",
    "Primario, secundario, terciario y peligro; cargando y deshabilitado con motivo visible.",
  ),
  component(
    "campos",
    "Campos de formulario",
    "base-campos-de-formulario--estados",
    "Etiqueta visible, obligatorio (*), ayuda, error con icono y modo lectura con borde punteado.",
  ),
  component(
    "seleccion",
    "Casillas, opciones e interruptores",
    "base-selección--estados",
    "Toda la fila se puede tocar; el estado no depende solo del color.",
  ),
  component(
    "chips",
    "Chips de estado",
    "base-statustag-y-badge--estados",
    "Tres estados de máquina por separado, cada uno con texto e icono.",
  ),
  component(
    "banners",
    "Banners",
    "base-banner--tonos",
    "Información, éxito, advertencia, error, modo lectura, sin conexión y auditoría.",
  ),
  component(
    "tarjetas",
    "Tarjetas",
    "base-card--variantes",
    "Superficie blanca con borde e icono en recuadro tenue.",
  ),
  component(
    "tabla",
    "Tabla",
    "base-table--seleccion",
    "Folios en monoespaciada, orden, selección y paginación; en móvil, tarjetas.",
  ),
  component(
    "tabla-vacia",
    "Tabla vacía",
    "base-table--vacia",
    "Estado vacío con icono, explicación y una acción principal.",
  ),
  component(
    "tabla-carga",
    "Tabla cargando",
    "base-table--carga",
    "Esqueleto sin movimiento con «reducir movimiento».",
  ),
  component(
    "dialogo",
    "Diálogo de confirmación",
    "base-dialog--confirmacion",
    "Título, consecuencia, motivo y botones claros; en móvil, hoja inferior.",
  ),
  component(
    "toast",
    "Toast",
    "base-toast--visibles",
    "Confirmaciones breves con acción opcional para deshacer.",
  ),
  component(
    "pestanas",
    "Pestañas",
    "base-tabs--playground",
    "Pestaña activa con subrayado y color; la deshabilitada se distingue.",
  ),
  component(
    "navegacion",
    "Navegación",
    "base-navegación--conjunto",
    "Barra lateral azul noche, navegación inferior móvil, migas de pan y paginación.",
  ),
];

/** Domain components (F6-04), composed from the base components. */
const DOMAIN_ROUTES: readonly ReviewRoute[] = [
  component(
    "triada",
    "Tríada de máquina",
    "dominio-machinetriad--estados",
    "Operación, técnico y sanitario siempre separados, con texto e icono; el crítico dominante resalta sin ocultar los otros.",
    "dominio",
  ),
  component(
    "alerta-critica",
    "Alerta crítica",
    "dominio-criticalalert--estados",
    "Fijada hasta «Enterado»; «Enterado» no resuelve; conflicto (412) explicado en la tarjeta con «Actualizar».",
    "dominio",
  ),
  component(
    "comparador",
    "Comparador",
    "dominio-comparator--estados",
    "Diferencias escritas («Cambió»), autor y fecha por versión, esperado contra real y resolución con motivo.",
    "dominio",
  ),
  component(
    "sincronizacion",
    "Sincronización",
    "dominio-syncstatus--estados",
    "Ocho estados distinguibles sin color; reintento y «Resolver» en la cola local.",
    "dominio",
  ),
  component(
    "modo-lectura",
    "Modo lectura",
    "dominio-modo-lectura--estados",
    "Mismo tratamiento (advertencia + candado) en barra global e indicador local; formulario bloqueado desde el inicio.",
    "dominio",
  ),
  component(
    "trabajos",
    "Estado de trabajos",
    "dominio-jobstatus--estados",
    "En cola, procesando, completado, reintento programado, fallido y en DLQ; reintento con motivo y conflicto.",
    "dominio",
  ),
];

const story = (
  id: string,
  title: string,
  storybook: string,
  review: string,
  section: ReviewSection,
): ReviewRoute => ({
  id,
  section,
  title,
  path: `Storybook · ${storybook}`,
  review,
  anonymous: true,
  storybook,
  states: [lightTheme],
});

/** Catalog patterns and screen mock-ups (F6-05). */
const PATTERN_ROUTES: readonly ReviewRoute[] = [
  story(
    "patron-formulario-lectura",
    "Patrón · Formulario en modo lectura",
    "patrones--formulario-modo-lectura",
    "Se avisa antes de empezar; los valores se leen y el botón explica por qué no guarda.",
    "patrones",
  ),
  story(
    "patron-lista-estados",
    "Patrón · Lista con estados",
    "patrones--lista-con-estados",
    "La lista vive en una tarjeta y resuelve datos, carga, vacío, error y sin permiso en el mismo lugar.",
    "patrones",
  ),
  story(
    "patron-confirmacion",
    "Patrón · Confirmación de acción sensible",
    "patrones--confirmacion-sensible",
    "Entidad, consecuencias, qué se conserva, motivo obligatorio y botón con el verbo.",
    "patrones",
  ),
  story(
    "patron-conflicto",
    "Patrón · Conflicto de sincronización",
    "patrones--conflicto-de-version",
    "La cola lleva al comparador; ninguna versión gana sola y el motivo es obligatorio.",
    "patrones",
  ),
  story(
    "maqueta-expediente",
    "Maqueta · Expediente de máquina",
    "pantallas-expediente-de-máquina--escritorio",
    "Jerarquía del expediente (Fase 7): identidad, tres estados, alerta fijada y dominios en pestañas.",
    "pantallas",
  ),
];

/** A Storybook entry as listed in storybook-static/index.json. */
export interface StoryEntry {
  readonly id: string;
  readonly title: string;
  readonly type?: string;
}

/**
 * One gallery route per «Matriz de estados» story, discovered from the Storybook index so a new
 * component enters the gallery without editing this list (the catalog check requires it).
 */
export const matrixRoutes = (entries: readonly StoryEntry[]): ReviewRoute[] =>
  entries
    .filter((entry) => entry.id.endsWith("--matriz-de-estados"))
    .map((entry) => {
      const [group = "", name = entry.title] = entry.title.split("/");
      return story(
        `matriz-${entry.id.replace(/--matriz-de-estados$/u, "")}`,
        `Matriz · ${name} (${group})`,
        entry.id,
        "Los ocho estados en una vista: normal, carga, vacío, error, permiso denegado, modo lectura, deshabilitado y foco. Los que no aplican dicen por qué.",
        "matriz",
      );
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
    id: "shell",
    title: "Shell y menú por rol",
    path: "/notifications",
    review:
      "Cada rol ve solo sus destinos (escritorio: barra lateral; tableta: botón Menú; móvil: barra inferior con «Más»). Nadie ve un enlace que al abrirlo diga «sin permiso».",
    states: [
      ...PERSONA_STATES,
      { id: "lectura", label: "Dueño · cuenta en modo lectura", demo: { mode: "READ_ONLY" } },
      { id: "error", label: "Menú no disponible (error del servicio)", demo: { network: "error" } },
    ],
  },
  {
    id: "selector-contexto",
    title: "Selector de contexto",
    path: "/files",
    review:
      "La barra superior siempre dice cuenta, rol, sucursal y máquina. Al abrir el selector solo aparecen las cuentas, sucursales y máquinas a las que ese rol tiene acceso; en móvil se abre desde abajo. Si se pierde un acceso, la pantalla lo explica.",
    states: [
      { id: "cerrado", label: "Dueño · todas las sucursales" },
      {
        id: "con-foco",
        label: "Dueño · sucursal y máquina elegidas",
        demo: {
          focus: {
            branchId: DEMO_ACCOUNTS.polar.branches[0]!.id,
            machineId: DEMO_ACCOUNTS.polar.machines[0]!.id,
          },
        },
      },
      { id: "abierto", label: "Dueño · selector abierto", openContextSelector: true },
      {
        id: "administrador",
        label: "Administrador de sucursal · selector abierto",
        demo: { persona: "admin" },
        openContextSelector: true,
      },
      {
        id: "tecnico",
        label: "Técnico · selector abierto",
        demo: { persona: "technician" },
        openContextSelector: true,
      },
      {
        id: "acceso-perdido",
        label: "Administrador · perdió acceso a la sucursal elegida",
        demo: {
          persona: "admin",
          focus: { branchId: DEMO_ACCOUNTS.polar.branches[1]!.id, machineId: null },
        },
      },
      {
        id: "lectura",
        label: "Cuenta en modo lectura · selector abierto",
        demo: { mode: "READ_ONLY" },
        openContextSelector: true,
      },
      {
        id: "error",
        label: "Error del servicio · selector abierto",
        demo: { network: "error" },
        openContextSelector: true,
      },
    ],
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
    review:
      "Un trabajo fallido se identifica y se puede diagnosticar. Solo el Administrador ICE24 lo abre; los demás ven «sin permiso» si llegan por URL.",
    states: [
      { id: "normal", label: "Normal (Administrador ICE24)", demo: { persona: "platform" } },
      { id: "sin-permiso", label: "Sin permiso por URL (Dueño)" },
      {
        id: "carga",
        label: "Cargando",
        demo: { persona: "platform", network: "slow" },
        capture: "loading",
      },
      { id: "error", label: "Error del servicio", demo: { persona: "platform", network: "error" } },
    ],
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
  ...FOUNDATION_ROUTES,
  ...COMPONENT_ROUTES,
  ...DOMAIN_ROUTES,
  ...PATTERN_ROUTES,
];
