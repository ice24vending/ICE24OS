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
  { id: "escritorio-amplio", label: "Escritorio 1440", width: 1440, height: 900 },
];

export interface ReviewState {
  /** Build a real encrypted queue through the mobile flow before capturing the center. */
  readonly queuedWorkOrder?: boolean;
  readonly offlineAfterQueue?: boolean;
  readonly id: string;
  readonly label: string;
  /** Demo selection; omitted fields keep the defaults (owner, first account, active, online). */
  readonly demo?: Partial<
    Pick<
      DemoState,
      "persona" | "account" | "mode" | "network" | "focus" | "scenario" | "maintenance"
    >
  >;
  /** `loading` captures the page while it is still waiting for the (slow) data. */
  readonly capture?: "loaded" | "loading";
  /** Open the floating demo panel before the capture. */
  readonly openDemoPanel?: boolean;
  /** Open the topbar context selector before the capture (F6-08). */
  readonly openContextSelector?: boolean;
  /** Interactions before the capture, e.g. sending an action to show its conflict (F6-10). */
  readonly steps?: readonly ReviewStep[];
  /** Wait for intentional focus after an interaction before resetting scroll for capture. */
  readonly focusAfterSteps?: string;
}

/** One interaction, located by accessible role/label like a person would find it. */
export type ReviewStep =
  | { readonly click: string; readonly role?: "button" | "checkbox" | "link" }
  | { readonly fill: string; readonly value: string }
  | { readonly select: string; readonly value: string };

/** Gallery sections (F6-05), in the order of the Storybook catalog. */
export const REVIEW_SECTIONS = {
  maintenance: "Fase 7 — Mantenimiento y offline",
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
    "Diez estados distinguibles sin color; reintento, conflicto, almacenamiento lleno y no disponible.",
    "dominio",
  ),
  component(
    "evidencia",
    "Captura de evidencia",
    "dominio-evidencia--matriz-de-estados",
    "Fotos, lecturas con unidad y rango, lote y confirmación por teclado.",
    "dominio",
  ),
  component(
    "almacenamiento-lleno",
    "Almacenamiento lleno",
    "dominio-syncstatus--almacenamiento-lleno",
    "El último cambio no se declara guardado; explica cómo recuperar espacio.",
    "dominio",
  ),
  component(
    "almacenamiento-no-disponible",
    "Almacenamiento no disponible",
    "dominio-syncstatus--almacenamiento-no-disponible",
    "Conserva el formulario y explica el bloqueo de almacenamiento.",
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

/** Steps that send the action of a template, so the panel's scenario shows its answer. */
const SEND_STEPS: Record<string, readonly ReviewStep[]> = {
  detalle: [{ click: "Registrar lectura" }],
  asistente: [
    { select: "Modelo", value: "IC-500" },
    { fill: "Número de serie", value: "FAB-44910" },
    { click: "Siguiente" },
    { select: "Sucursal", value: "Centro Monterrey" },
    { click: "Siguiente" },
    { click: "Adjuntaré la factura", role: "checkbox" },
    { click: "Siguiente" },
    { click: "Enviar solicitud" },
  ],
  panel: [{ click: "Marcar enterado" }],
  campo: [
    { click: "Limpiar tolva", role: "checkbox" },
    { click: "Prueba final de despacho", role: "checkbox" },
    { click: "Completar orden" },
  ],
};

/**
 * «Plantillas» (F6-09/F6-10): every layout in every global state. Network and account mode come
 * from the demo panel; empty, no permission and conflict from its «Escenario de plantillas».
 */
const template = (
  slug: string,
  title: string,
  review: string,
  withConflict = true,
): ReviewRoute => ({
  id: `plantilla-${slug}`,
  title: `Plantilla · ${title}`,
  path: `/plantillas/${slug}`,
  review,
  states: [
    { id: "normal", label: "Con datos" },
    loading,
    { id: "vacio", label: "Vacío", demo: { scenario: "empty" } },
    { ...failing, label: "Error del servicio (con folio y reintento)" },
    { id: "sin-permiso", label: "Sin permiso", demo: { scenario: "forbidden" } },
    offline,
    readOnly,
    ...(withConflict
      ? [
          {
            id: "conflicto",
            label: "Conflicto de versión (412) al enviar",
            demo: { scenario: "conflict" as const },
            steps: SEND_STEPS[slug] ?? [],
          },
        ]
      : []),
  ],
});

const TEMPLATE_ROUTES: readonly ReviewRoute[] = [
  template(
    "lista",
    "Lista",
    "Encabezado, acción, filtros (en celular detrás de «Filtros»), tabla que se vuelve tarjetas y paginación. Cada estado reemplaza la lista y conserva encabezado y filtros.",
    false,
  ),
  template(
    "detalle",
    "Detalle",
    "Identidad y folio arriba, tres estados, acción según permiso, resumen, pestañas con «Historial» al final y panel lateral que baja en tableta y celular.",
  ),
  template(
    "asistente",
    "Flujo por pasos",
    "Se entiende en qué paso se va, qué falta para avanzar y qué se enviará en la revisión final.",
  ),
  template(
    "panel",
    "Dashboard",
    "Indicadores con periodo y «Sin datos» en vez de cero; alertas antes que tareas; la rejilla se adapta al ancho.",
  ),
  template(
    "campo",
    "Pantalla de campo",
    "Se puede usar con una mano y con guantes: botones de 64 px abajo, el estado de conexión junto al título y el guardado local siempre disponible.",
  ),
];

/**
 * Deep links, «Regresar» and unsaved changes (F6-11). A link carries its account in `cuenta`:
 * one of the viewer's accounts asks to switch; any other gets «sin permiso» without saying
 * whether it exists.
 */
const NAVIGATION_ROUTES: readonly ReviewRoute[] = [
  {
    id: "cambios-sin-guardar",
    title: "Cambios no guardados",
    path: "/plantillas/asistente?desde=%2Fplantillas%2Flista%3Fq%3DMTY",
    review:
      "Al salir con datos escritos, la confirmación explica qué se pierde; «Seguir editando» es la opción segura y conserva lo escrito. Lo mismo ocurre con el botón atrás del navegador o del celular.",
    states: [
      {
        id: "regresar",
        label: "«Regresar» con un modelo elegido",
        steps: [
          { select: "Modelo", value: "IC-500" },
          { click: "Regresar", role: "link" },
        ],
      },
    ],
  },
  {
    id: "enlace-otra-cuenta",
    title: "Enlace de otra cuenta",
    path: `/plantillas/detalle?cuenta=${DEMO_ACCOUNTS.bajio.id}`,
    review:
      "Un enlace de otra de tus cuentas dice de cuál es y pide cambiar con un clic; no muestra datos hasta cambiar.",
    states: [{ id: "cambiar", label: "Dueño con acceso a la otra cuenta" }],
  },
  {
    id: "enlace-sin-permiso",
    title: "Enlace sin permiso",
    path: "/plantillas/detalle?cuenta=a0000000-0000-4000-8000-0000000000ff",
    review:
      "Un enlace de una cuenta sin acceso muestra «sin permiso» sin revelar el nombre de la cuenta ni si el registro existe.",
    states: [{ id: "sin-permiso", label: "Cuenta ajena o inexistente" }],
  },
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
    id: "sync-local-queue",
    section: "maintenance",
    title: "Cola local · Sin conexión y conflicto",
    path: "/",
    storybook: "mantenimiento-cola-local--sin-conexion",
    review:
      "Consulta local, conflicto identificado y sincronizar deshabilitado con motivo; sin acciones que requieran servidor.",
    states: [normal],
  },
  {
    id: "route-download-preview",
    section: "maintenance",
    title: "Descargar mi ruta · confirmación",
    path: "/maintenance/work-orders?view=assigned",
    review:
      "Técnico: En atención primero, luego fecha, prioridad e id; reservas ajenas excluidas de cantidad y espacio antes de confirmar.",
    states: [
      {
        id: "tecnico",
        label: "Técnico · ruta del día",
        demo: { persona: "technician" },
        steps: [{ click: "Ver mi ruta" }],
      },
    ],
  },
  ...[
    "confirmacion",
    "lista",
    "descargadas-sin-red",
    "desactualizada",
    "vencida",
    "parcial",
    "en-curso",
    "no-caben",
    "reservada",
    "sin-conexion",
    "modo-lectura",
  ].map((state): ReviewRoute => ({
    id: `route-download-${state}`,
    section: "maintenance",
    title: `Descargar ruta · ${state}`,
    path: "Storybook",
    storybook: `mantenimiento-descarga-de-ruta--${state}`,
    review:
      "Cantidad y cuota legibles; estado individual de cada orden y progreso, sin ocultar exclusiones ni fallos.",
    states: [normal],
  })),
  {
    id: "machine-record",
    title: "Expediente de máquina seleccionado",
    path: "/machines",
    review:
      "El botón Ver / editar enfoca y desplaza al expediente; cuatro iconos distintos y acciones separadas de la cabecera.",
    states: [
      { ...normal, steps: [{ click: "Ver / editar" }], focusAfterSteps: ".machine-record" },
      { ...readOnly, steps: [{ click: "Ver / editar" }], focusAfterSteps: ".machine-record" },
    ],
  },
  {
    id: "work-orders-filtered",
    section: "maintenance",
    title: "Órdenes filtradas",
    path: "/maintenance/work-orders?view=assigned&state=completed",
    review:
      "Filtros compactos y desplegables; estado seleccionado coherente con los resultados y filtros aplicados por servidor.",
    states: [normal],
  },
  {
    id: "machine-from-maintenance",
    section: "maintenance",
    title: "Expediente abierto desde mantenimiento",
    path: "/machines?machineId=c0000000-0000-4000-8000-000000000001",
    review:
      "Enlace directo autorizado: expediente seleccionado y enfocado; navegación activa en Máquinas, sin drawer ni modal.",
    states: [
      { ...normal, focusAfterSteps: ".machine-record" },
      {
        id: "tecnico",
        label: "Técnico",
        demo: { persona: "technician" },
        focusAfterSteps: ".machine-record",
      },
      {
        id: "solo-lectura",
        label: "Solo lectura",
        demo: { persona: "readonly" },
        focusAfterSteps: ".machine-record",
      },
      {
        id: "administrador",
        label: "Administrador de sucursal",
        demo: { persona: "admin" },
        focusAfterSteps: ".machine-record",
      },
    ],
  },
  {
    id: "ticket-order-origin",
    section: "maintenance",
    title: "Ticket desde orden",
    path: "/maintenance/tickets/70000000-0000-4000-8000-000000000384?fromOrder=10000000-0000-4000-8000-0000000007d0",
    review:
      "Tickets activo, breadcrumbs del ticket, referencia a la orden de procedencia y enlace de regreso validado.",
    states: [normal],
  },
  ...[
    { id: "ui-wo-01", title: "UI-WO-01 · Órdenes de trabajo", path: "/maintenance/work-orders" },
    {
      id: "work-order-no-source",
      title: "Asignar técnico · elegir origen",
      path: "/maintenance/work-orders/new",
    },
    {
      id: "work-order-assign",
      title: "Asignar técnico desde ticket",
      path: "/maintenance/work-orders/new?sourceType=ticket&sourceId=70000000-0000-4000-8000-000000000384",
    },
    {
      id: "work-order-detail",
      title: "Orden · Definición y estados",
      path: "/maintenance/work-orders/10000000-0000-4000-8000-0000000007d0",
    },
  ].map((route): ReviewRoute => ({
    ...route,
    section: "maintenance",
    review:
      "Qué revisar: responsable elegible, checklist y procedimiento congelados, piezas previstas y motivos de acciones bloqueadas. Consulta sin controles de escritura; filas compactas, conteo y Cargar más; filtros explícitos y origen guiado.",
    states: [
      ...PERSONA_STATES,
      route.id === "work-order-no-source"
        ? { id: "cargando", label: "Guía de origen con red lenta", demo: { network: "slow" } }
        : loading,
      failing,
      offline,
      readOnly,
      { id: "vacio", label: "Sin órdenes o técnicos", demo: { maintenance: "empty" } },
      { id: "deshabilitado", label: "Módulo deshabilitado", demo: { maintenance: "disabled" } },
    ],
  })),
  ...[
    { id: "ui-tkt-01", title: "UI-TKT-01 · Reportar una falla", path: "/maintenance/tickets/new" },
    {
      id: "ui-tkt-02",
      title: "UI-TKT-02 · Detalle del ticket",
      path: "/maintenance/tickets/70000000-0000-4000-8000-000000000384",
    },
    { id: "tickets-list", title: "Tickets de mantenimiento", path: "/maintenance/tickets" },
  ].map((route): ReviewRoute => ({
    ...route,
    section: "maintenance",
    review:
      "Máquina, sistema, prioridad explicada, evidencia privada, lectura y seguimiento cronológico.",
    states: [
      ...PERSONA_STATES,
      route.id === "ui-tkt-01"
        ? {
            ...loading,
            steps: [{ select: "Máquina", value: "c0000000-0000-4000-8000-000000000001" }],
          }
        : loading,
      failing,
      offline,
      readOnly,
      { id: "vacio", label: "Sin tickets", demo: { maintenance: "empty" } },
      { id: "deshabilitado", label: "Módulo deshabilitado", demo: { maintenance: "disabled" } },
    ],
  })),
  ...[
    {
      id: "ui-wo-02",
      title: "Ejecutar orden",
      path: "/maintenance/work-orders/10000000-0000-4000-8000-0000000007d3/execute",
    },
    {
      id: "ui-wo-03",
      title: "Revisar cierre",
      path: "/maintenance/work-orders/10000000-0000-4000-8000-0000000007d3/close",
    },
    {
      id: "ui-wo-04",
      title: "Revisión de la ejecución",
      path: "/maintenance/work-orders/10000000-0000-4000-8000-0000000007d4/review",
    },
  ].map((route): ReviewRoute => ({
    ...route,
    section: "maintenance",
    review:
      "Checklist y evidencia según la definición congelada; faltantes enlazados, cierre validado en servidor y correcciones versionadas con motivo.",
    states: [
      ...PERSONA_STATES,
      loading,
      failing,
      offline,
      readOnly,
      { id: "vacio", label: "Sin ejecución", demo: { maintenance: "empty" } },
    ],
  })),
  ...[
    "disponible",
    "sin-conexion",
    "fotos-pendientes",
    "almacenamiento-lleno",
    "error",
    "matriz-de-estados",
  ].map((state): ReviewRoute => ({
    id: `offline-work-${state}`,
    section: "maintenance",
    title: `Trabajo local · ${state}`,
    path: "Storybook · Trabajo sin conexión",
    storybook: `maintenance-offline-work--${state}`,
    review:
      "Qué revisar: distinguir copia local de cierre confirmado, fotos pendientes, falta de espacio y error; contraste y lectura a 375 px.",
    states: [normal],
  })),
  {
    id: "offline-work-editor",
    section: "maintenance",
    title: "Editor de orden descargada",
    path: "/maintenance/work-orders/10000000-0000-4000-8000-0000000007d3/execute",
    review:
      "Qué revisar: regreso superior a órdenes y sincronización con separación, folio/máquina visibles, botones de 44 px y checklist/fotos. La recarga sin red, actualización automática de caché y guardado se verifican en E2E.",
    states: [
      {
        id: "descargada",
        label: "Técnico con descarga real",
        demo: { persona: "technician" },
        steps: [
          { click: "Descargar para trabajar sin conexión" },
          { click: "Abrir orden descargada", role: "link" },
        ],
      },
    ],
  },
  ...["UI-SYNC-01"].map((screen): ReviewRoute => ({
    id: screen.toLowerCase(),
    section: "maintenance",
    title: `${screen} · Centro de sincronización`,
    path: `/maintenance/synchronization`,
    review:
      "Qué revisar: versión del dispositivo y servidor, motivo obligatorio, confirmación y versiones originales conservadas; el técnico consulta y el administrador resuelve.",
    states: [
      normal,
      loading,
      failing,
      offline,
      readOnly,
      { id: "vacio", label: "Sin actividades", demo: { maintenance: "empty" } },
      {
        id: "sin-permiso",
        label: "Permiso revocado",
        demo: { persona: "technician", maintenance: "revoked" },
      },
      {
        id: "pendiente",
        label: "Fotos pendientes",
        demo: { persona: "technician", maintenance: "pending" },
        queuedWorkOrder: true,
      },
      {
        id: "cola-sin-red",
        label: "Cola local sin conexión",
        demo: { persona: "technician", maintenance: "pending" },
        queuedWorkOrder: true,
        offlineAfterQueue: true,
      },
      {
        id: "conflicto",
        label: "Comparar versiones",
        demo: { maintenance: "review-conflict" },
        steps: [{ click: "OT-000004 · Revisar conflicto" }],
      },
      {
        id: "tecnico",
        label: "Consulta del técnico",
        demo: { persona: "technician", maintenance: "review-conflict" },
        steps: [{ click: "OT-000004 · Revisar conflicto" }],
      },
    ],
  })),
  ...["administrador", "tecnico", "resuelta"].map((state): ReviewRoute => ({
    id: `sync-comparison-${state}`,
    section: "maintenance",
    title: `Comparador de sincronización · ${state}`,
    path: "/",
    storybook: `mantenimiento-sincronización--${state}`,
    review: "Diferencias legibles, formulario de resolución explícito y versiones conservadas.",
    states: [normal],
  })),
  ...["calendar", "list"].map((view): ReviewRoute => ({
    id: view === "calendar" ? "ui-mnt-01" : "ui-mnt-02",
    section: "maintenance",
    title:
      view === "calendar"
        ? "UI-MNT-01 · Calendario de mantenimiento"
        : "UI-MNT-02 · Actividades programadas",
    path: `/maintenance?view=${view}`,
    review:
      "Qué revisar: Próxima, Vencida y Crítica se entienden por texto; filtros se conservan en URL; el técnico solo ve su ámbito y los atrasos siguen visibles.",
    states: [
      normal,
      loading,
      failing,
      offline,
      readOnly,
      { id: "vacio", label: "Sin actividades", demo: { maintenance: "empty" } },
      {
        id: "sin-permiso",
        label: "Permiso revocado",
        demo: { persona: "technician", maintenance: "revoked" },
      },
      { id: "tecnico", label: "Técnico", demo: { persona: "technician" } },
    ],
  })),
  {
    id: "maintenance-overdue",
    section: "maintenance",
    title: "Actividades vencidas desde Resumen",
    path: "/maintenance?view=list&state=overdue",
    review: "Los atrasos aparecen sin filtro de próximos 7 días y no desaparecen al recalcular.",
    states: [normal],
  },
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
    id: "maquinas",
    title: "Máquinas",
    path: "/machines",
    review:
      "Máquinas y solicitudes de alta en un solo apartado, con filtro por código, serie o nombre.",
    states: [
      normal,
      { id: "tecnico", label: "Técnico", demo: { persona: "technician" } },
      readOnly,
      failing,
      { id: "panel-demo", label: "Panel Demo abierto", openDemoPanel: true },
    ],
  },
  {
    id: "sucursales",
    title: "Sucursales",
    path: "/branches",
    review: "Apartado propio como en la referencia; el filtro busca por nombre o código.",
    states: [
      normal,
      { id: "administrador", label: "Administrador de sucursal", demo: { persona: "admin" } },
    ],
  },
  {
    id: "configuracion-cuenta",
    title: "Configuración de cuenta",
    path: "/account",
    review:
      "Mi cuenta, usuarios, transferencias y componentes; el Administrador de sucursal no la ve en el menú.",
    states: [
      normal,
      { id: "solo-lectura", label: "Solo lectura (Auditor)", demo: { persona: "readonly" } },
      { id: "administrador", label: "Administrador de sucursal", demo: { persona: "admin" } },
    ],
  },
  {
    id: "administracion-ice24",
    title: "Administración ICE24",
    path: "/ice24",
    review: "Solo personal ICE24: catálogos, validaciones, cuentas y panel.",
    states: [
      { id: "ice24", label: "Operador ICE24", demo: { persona: "ice24" } },
      { id: "dueno", label: "Dueño (sin permiso)" },
    ],
  },
  {
    id: "resumen",
    title: "Resumen de la cuenta",
    path: "/summary",
    review:
      "Se parece a la referencia aprobada: indicadores con icono, alerta crítica fijada (modo lectura) y vista rápida de máquinas; tareas reales ordenadas por urgencia, máximo cinco y acceso a todas.",
    states: [
      normal,
      {
        id: "anuncio-enterado",
        label: "Confirmación de alerta en el producto",
        demo: { maintenance: "alert-announcement" },
        steps: [{ click: "Marcar enterado" }],
      },
      ...PERSONA_STATES,
      readOnly,
      loading,
      failing,
      offline,
      { id: "sin-tareas", label: "Módulo activo sin tareas", demo: { maintenance: "empty" } },
      {
        id: "modulo-deshabilitado",
        label: "Módulo deshabilitado",
        demo: { maintenance: "disabled" },
      },
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
  ...TEMPLATE_ROUTES,
  ...NAVIGATION_ROUTES,
  ...FOUNDATION_ROUTES,
  ...COMPONENT_ROUTES,
  ...DOMAIN_ROUTES,
  ...PATTERN_ROUTES,
];
