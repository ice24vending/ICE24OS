# Fase 6 — Prompts modulares para Claude Code / Codex

Guía para completar la **Fase 6 — Sistema de diseño, shell privado y navegación** (TASK-F6-01 a F6-12) pegando un prompt por sesión. Cada prompt es independiente: abre una sesión nueva del agente en la raíz del repo `ICE24OS` y pega el bloque completo.

## Orden y paralelismo

| Prompt | Tareas                                                                    | Depende de       | ¿Se puede en paralelo? |
| ------ | ------------------------------------------------------------------------- | ---------------- | ---------------------- |
| P0     | Arranque + "sala de revisión" (Storybook, modo demo, galería de capturas) | Fase 5 en `main` | —                      |
| P1     | F6-01 + F6-02 Paleta y tokens                                             | P0               | —                      |
| P2     | F6-03 Componentes base                                                    | P1               | —                      |
| P3     | F6-04 Componentes especializados                                          | P2               | Sí, con P5             |
| P4     | F6-05 Catálogo de componentes y estados                                   | P2, P3           | —                      |
| P5     | F6-06 + F6-07 Shell responsive + navegación por permisos                  | P2               | Sí, con P3             |
| P6     | F6-08 Selector de contexto                                                | P5               | —                      |
| P7     | F6-09 + F6-10 Layouts + estados globales                                  | P2, P5           | —                      |
| P8     | F6-11 Deep links, regresar y cambios no guardados                         | P5               | Sí, con P7             |
| P9     | F6-12 Accesibilidad + visual regression (quality gate)                    | P3, P5           | —                      |
| P10    | Gate de salida de Fase 6                                                  | Todo             | —                      |

> Regla de oro: **un prompt = una rama = un PR**. Haz merge del PR antes de empezar el siguiente prompt que dependa de él (`git checkout main && git pull`).

## Cómo verán las pantallas tus jefes

P0 deja preparadas tres formas, de menor a mayor esfuerzo para ellos:

1. **Galería de capturas** (`pnpm ux:snapshots`): genera `docs/qa/phase-6/ux-review/index.html` con capturas de cada pantalla en móvil, tablet y escritorio, y en cada estado (carga, vacío, error, sin permiso, lectura, offline). Se abre con doble clic o se adjunta al PR.
2. **Catálogo interactivo (Storybook)** (`pnpm storybook`, http://localhost:6006): cada componente con controles para cambiar texto, estado, tamaño, rol… Se puede publicar como sitio estático (`pnpm storybook:build`) para que lo abran sin instalar nada.
3. **App real en modo demo** (`pnpm dev:private`, http://localhost:3000/?demo=1 o la URL de _Preview_ de Vercel del PR, si está activa): pantallas navegables con personas ficticias (Dueño, Administrador, Técnico, Solo lectura, ICE24) y un panel flotante para cambiar persona, cuenta, modo lectura y conexión. Solo existe con `ICE24_DEMO_MODE=1`; nunca en producción.

Cada prompt termina pidiendo al agente un **"Checklist de revisión UX"** con las URLs y qué deben comprobar tus jefes.

## Referencia visual aprobada (aplica de P1 a P9)

El 15/10/2026 Dirección aprobó la paleta, el foco y la dirección visual del prototipo ([ADR-025](../decisions/adr-025-brand-palette.md)). Al pegar cualquier prompt de P1 a P9, añade al inicio este párrafo:

```text
REFERENCIA VISUAL APROBADA: lee docs/decisions/adr-025-brand-palette.md y revisa las capturas de docs/qa/phase-6/evidence/20261015-identidad-visual/. Son la guía visual aprobada por Dirección: lo que construyas debe parecerse a ellas (barra lateral azul noche, encabezado blanco con contexto, KPI con icono en círculo tenue, alerta crítica fijada, tres chips de estado de máquina, banners, tablas con folios en monoespaciada). Los valores exactos mandan desde context/UI_UX.md. Foco: brand-600 sobre fondos claros, brand-400 sobre azul noche. Los datos de las capturas son ficticios. No copies código del prototipo; reimplementa con los tokens y reglas del proyecto. Montserrat es provisional.
```

## Bloque de push (igual para todos los prompts)

Después de cada prompt hay un bloque **"Push"** con la rama y el mensaje de commit. Puedes pegárselo al mismo agente o ejecutarlo tú (PowerShell en Windows):

```powershell
# 1) Validaciones — TODAS deben salir en verde
pnpm check
pnpm build
$env:ICE24_BROWSER_TESTS="1"; pnpm test:integration
pnpm ux:snapshots          # (desde P0) regenera la galería
pnpm test:ui               # (desde P9) a11y + visual regression

# 2) Solo si todo pasó
git add -A
git commit -m "<mensaje del bloque>"
git push -u origin <rama del bloque>
gh pr create --base main --title "<mensaje del bloque>" --body-file docs/tasks/<reporte>.md
gh pr checks --watch       # esperar CI en verde

# 3) Tras aprobación UX de tus jefes
gh pr merge --squash --delete-branch
git checkout main; git pull
```

Si algo falla: **no hagas push**. Pide al agente: _"La validación X falló con este error: … Corrígelo sin desactivar pruebas ni reglas y vuelve a correr todas las validaciones."_

---

## P0 — Arranque de Fase 6 y "sala de revisión UX"

```text
Eres un ingeniero senior trabajando en el monorepo ICE24OS (pnpm 11 + Turbo, Next.js en apps/private-web, paquete compartido packages/ui, Vitest y Playwright). Vamos a iniciar la Fase 6 (Sistema de diseño, shell privado y navegación).

ANTES DE ESCRIBIR CÓDIGO lee: context/PROJECT_RULES.md, context/Implementation_Plan.md (Fase 6), context/TASKS.md (TASK-F6-01 a F6-12), context/UI_UX.md, context/AppFlow.md, docs/backlog/phase-5-status.md y docs/tasks/task-f5-15.md (la UI de servicios de cuenta que ya existe). Revisa packages/ui/src y apps/private-web/src para reutilizar lo existente.

Crea la rama feat/f6-00-ux-review-harness desde main actualizado.

OBJETIVO: preparar la base de la fase y una forma de que personas no técnicas (mis jefes) VEAN y MANIPULEN las pantallas. No implementes todavía tokens ni componentes nuevos.

Entregables:
1. docs/backlog/phase-6-status.md con el mismo formato que phase-5-status.md: secuencia (P0 a P10 de docs/backlog/phase-6-prompts.md), dependencias, decisiones abiertas (p. ej. aprobación de la paleta por marca) y tabla de estado.
2. Storybook (versión estable reciente compatible con React 19 y Vite/Next) configurado para packages/ui y apps/private-web, con scripts raíz `pnpm storybook` y `pnpm storybook:build` (salida estática en storybook-static/, ignorada por git). Incluye addons de controles, viewport (móvil 375, tablet 768, escritorio 1280/1440) y a11y. Agrega una historia de ejemplo con el StatusPanel existente.
3. "Modo demo" en apps/private-web activado SOLO con la variable ICE24_DEMO_MODE=1 (documentada en .env.example y bloqueada si NODE_ENV=production o VERCEL_ENV=production): datos ficticios (fixtures) con personas Dueño, Administrador, Técnico, Solo lectura y Operador ICE24, y un panel flotante "Demo" que permita cambiar persona, cuenta, sucursal, modo de cuenta (ACTIVE / READ_ONLY / SUSPENDED) y simular offline/carga lenta/error. Debe usar los permisos reales de packages/authorization, no una lógica paralela. Nunca debe saltarse autenticación fuera del modo demo; agrega pruebas que lo demuestren.
4. Script `pnpm ux:snapshots` (Playwright, ya instalado) que levante la app en modo demo, recorra una lista declarativa de pantallas (tests/visual/ux-review.routes.ts) × viewports × estados, y genere docs/qa/phase-6/ux-review/index.html: una galería simple con miniaturas agrupadas por pantalla, nombre del estado, viewport y fecha. Las imágenes van en docs/qa/phase-6/ux-review/img/ (decide si se versionan o se ignoran y documenta por qué; si pesan mucho, ignóralas y súbelas como artefacto de CI).
5. En .github/workflows/ci.yml (o un workflow nuevo) un job que ejecute ux:snapshots en cada PR y suba la galería y storybook-static como artefactos descargables.
6. docs/qa/phase-6/README.md explicando, en lenguaje sencillo para un director, cómo abrir la galería, Storybook y el modo demo, y qué revisar.
7. Reporte docs/tasks/task-f6-00.md con: archivos cambiados, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

Reglas: respeta límites de workspace (pnpm check:boundaries), ESLint con 0 warnings, Prettier, TypeScript estricto, commits convencionales. No toques producción ni secretos. No desactives pruebas existentes.

VALIDACIÓN: ejecuta pnpm check, pnpm build, ICE24_BROWSER_TESTS=1 pnpm test:integration y pnpm ux:snapshots. Corrige hasta que todo pase.

AL TERMINAR muéstrame un "Checklist de revisión UX" con los comandos para abrir cada cosa, las URLs y 5 puntos concretos que mis jefes deben validar.
```

**Push** — rama `feat/f6-00-ux-review-harness` · commit `chore(ui): bootstrap phase 6 and ux review harness (F6-00)` · reporte `docs/tasks/task-f6-00.md`

---

## P1 — F6-01 + F6-02: Paleta de marca y tokens semánticos

```text
Trabajas en el monorepo ICE24OS, Fase 6. Lee context/PROJECT_RULES.md, context/UI_UX.md (sección 6 Paleta de colores y todo lo de tipografía, espaciado, elevación, movimiento y breakpoints), context/TASKS.md (TASK-F6-01 y TASK-F6-02), docs/backlog/phase-6-status.md y docs/qa/phase-6/README.md.

Crea la rama feat/f6-01-02-brand-tokens desde main.

TASK-F6-01 — Validar paleta contra identidad ICE24:
- Toma los anclajes de marca de UI_UX.md (#04144C, #0455C4, #9CD5EF, #FFFFFF) y la escala brand/neutral/estados.
- Calcula el contraste WCAG 2.2 AA de cada combinación texto/fondo que se usará (texto normal 4.5:1, texto grande y UI 3:1) con un script reproducible (scripts/check-contrast.mjs) y registra resultados en docs/design-system/tokens.md.
- docs/decisions/adr-025-brand-palette.md ya registra la aprobación de Dirección (15/10/2026). Añade una sección "Validación de contraste" con los resultados del script; si una combinación falla, ajusta solo tonos intermedios, nunca los cuatro anclajes, y anótalo como pendiente de informar a Dirección. Solo la tipografía queda "provisional".

TASK-F6-02 — Tokens semánticos:
- packages/ui/src/tokens: tokens primitivos (brand, neutral, success, warning, danger, info) y semánticos (surface, text, border, action, focus, status, overlay) + tipografía, espaciado, radios, elevación, movimiento (respetando prefers-reduced-motion), z-index y breakpoints.
- Expórtalos como CSS custom properties y como objeto TypeScript tipado; tema claro obligatorio y oscuro solo si UI_UX.md lo pide.
- Migra apps/private-web y packages/ui/src/styles.css a los tokens sin cambiar el comportamiento de F5-15 (sin colores sueltos en hex; agrega una regla de lint o script que lo detecte).
- Historias de Storybook: "Fundamentos/Colores", "Tipografía", "Espaciado", "Elevación", "Movimiento" con muestras y la razón de contraste visible.
- Añade las páginas de fundamentos a tests/visual/ux-review.routes.ts para que salgan en la galería.
- Pruebas unitarias de tokens y del script de contraste.
- Reportes docs/tasks/task-f6-01.md y task-f6-02.md; actualiza phase-6-status.md.

VALIDACIÓN: pnpm check, pnpm build, ICE24_BROWSER_TESTS=1 pnpm test:integration, pnpm ux:snapshots. Todo en verde; no bajes umbrales.

AL TERMINAR dame el "Checklist de revisión UX": qué historias abrir en Storybook, qué combinaciones de color mostrar a mis jefes y la pregunta exacta de aprobación de marca que deben responder.
```

**Push** — rama `feat/f6-01-02-brand-tokens` · commit `feat(ui): validate brand palette and add semantic design tokens (F6-01, F6-02)` · reporte `docs/tasks/task-f6-02.md`

> ✅ La paleta ya fue aprobada (ADR-025, 15/10/2026). Solo vuelve a pedir aprobación si F6-01 obliga a cambiar algún tono.

---

## P2 — F6-03: Componentes base accesibles

```text
Monorepo ICE24OS, Fase 6. Lee context/PROJECT_RULES.md, context/UI_UX.md (componentes, estados, accesibilidad, breakpoints), context/TASKS.md (TASK-F6-03), docs/design-system/tokens.md y docs/backlog/phase-6-status.md. Los tokens de F6-02 ya están en main.

Crea la rama feat/f6-03-base-components.

Implementa en packages/ui/src/components/base, usando SOLO tokens semánticos:
- Button (primario, secundario, terciario, peligro; tamaños; cargando; deshabilitado con motivo), IconButton con etiqueta accesible.
- Inputs: TextField, TextArea, Select, Checkbox, Radio, Switch, DateField; con label, ayuda, error, requerido y modo solo lectura.
- Table (orden, selección, vacío, carga, columnas responsivas → tarjetas en móvil), Card, Badge/StatusTag.
- Dialog (foco atrapado, Esc, retorno de foco), Toast (aria-live), Banner (info/éxito/advertencia/error/modo lectura), Tabs (flechas), navegación base (NavItem, Breadcrumbs, Pagination).
- Puedes apoyarte en primitivas accesibles sin estilo (p. ej. Radix o React Aria) si encaja con el stack y lo justificas en docs; no metas una librería de estilos completa.
- Cada componente: tipos estrictos, soporte de teclado, foco visible, áreas táctiles ≥ 44px en móvil, props para estados de carga/error/deshabilitado/lectura.
- Pruebas unitarias (Testing Library + vitest-axe o equivalente) de teclado, roles ARIA y axe sin violaciones.
- Historias de Storybook por componente con controles (args) para manipular todos los estados y viewports.
- Reemplaza en apps/private-web los elementos equivalentes hechos a mano en F5-15 cuando sea directo, sin romper sus pruebas.
- docs/design-system/components/base.md con API, cuándo usar cada uno y ejemplos. Reporte docs/tasks/task-f6-03.md y estado actualizado.
- Agrega las historias clave a la galería de ux:snapshots.

VALIDACIÓN: pnpm check, pnpm build, ICE24_BROWSER_TESTS=1 pnpm test:integration, pnpm ux:snapshots. Todo verde.

AL TERMINAR: "Checklist de revisión UX" con la lista de historias y, para cada componente, qué deben probar mis jefes (p. ej. "abre el Dialog solo con teclado").
```

**Push** — rama `feat/f6-03-base-components` · commit `feat(ui): add accessible base components (F6-03)` · reporte `docs/tasks/task-f6-03.md`

---

## P3 — F6-04: Componentes especializados de dominio

```text
Monorepo ICE24OS, Fase 6. Lee context/PROJECT_RULES.md, context/UI_UX.md (componentes de dominio: tríada de máquina, alerta crítica, comparador, sincronización, modo lectura, estado de jobs), context/PRD y TRD en lo que toque, context/TASKS.md (TASK-F6-04), docs/design-system/components/base.md y docs/modules (jobs.md, notifications.md, account-services-ui.md).

Rama feat/f6-04-domain-components.

Implementa en packages/ui/src/components/domain, componiendo los componentes base:
- MachineTriad (estado operativo/sanitario/comercial o lo que defina UI_UX.md) con texto + icono + color (nunca solo color).
- CriticalAlert (fijada hasta "Enterado", alineada con F5-11).
- Comparator (antes/después o esperado/real) con diferencias legibles por lector de pantalla.
- SyncStatus (sincronizado, pendiente, en conflicto, error, offline) con acción de reintento que no duplica efectos.
- ReadOnlyIndicator / ReadOnlyBanner alineado con el modo lectura de F5-03.
- JobStatus (en cola, en curso, ok, fallido, en DLQ, reintentando) alineado con F5-07.
- Los componentes son presentacionales: reciben datos por props; transiciones (p. ej. "Enterado", "Reintentar") se exponen como callbacks que reciben versión esperada y muestran el error 412/conflicto de forma recuperable.
- Pruebas unitarias + axe; historias con controles para todos los estados; añadirlas a la galería.
- Sustituye usos equivalentes en las pantallas de F5-15 donde sea directo.
- docs/design-system/components/domain.md, reporte docs/tasks/task-f6-04.md, estado actualizado.

VALIDACIÓN: pnpm check, pnpm build, ICE24_BROWSER_TESTS=1 pnpm test:integration, pnpm ux:snapshots.

AL TERMINAR: "Checklist de revisión UX" con cada componente, los estados que deben revisar mis jefes y preguntas de negocio abiertas (textos, iconos, prioridad visual).
```

**Push** — rama `feat/f6-04-domain-components` · commit `feat(ui): add specialized domain components (F6-04)` · reporte `docs/tasks/task-f6-04.md`

---

## P4 — F6-05: Catálogo de componentes y estados

```text
Monorepo ICE24OS, Fase 6. Lee context/TASKS.md (TASK-F6-05), docs/design-system/* y docs/qa/phase-6/README.md. F6-03 y F6-04 ya están en main.

Rama feat/f6-05-component-catalog.

- Convierte Storybook en el catálogo oficial: página de bienvenida en español (qué es ICE24 OS, cómo navegar el catálogo), secciones Fundamentos / Base / Dominio / Patrones / Pantallas, y una "matriz de estados" por componente (carga, vacío, error, permiso denegado, modo lectura, deshabilitado, foco) visible en una sola historia.
- Documenta en cada historia: cuándo usar, cuándo NO usar, accesibilidad y textos recomendados.
- docs/design-system/catalog.md con índice y enlace al Storybook publicado como artefacto de CI.
- Prueba automática que falle si un componente exportado por packages/ui no tiene historia ni prueba (script en scripts/ y llamado desde pnpm check).
- Mejora la galería ux:snapshots para incluir la matriz de estados y un índice navegable con filtros simples (pantalla, viewport, estado).
- Reporte docs/tasks/task-f6-05.md y estado actualizado.

VALIDACIÓN: pnpm check, pnpm build, ICE24_BROWSER_TESTS=1 pnpm test:integration, pnpm ux:snapshots, pnpm storybook:build.

AL TERMINAR: "Checklist de revisión UX" con cómo compartir el catálogo estático a mis jefes (descargar artefacto del PR y abrir index.html) y qué revisar.
```

**Push** — rama `feat/f6-05-component-catalog` · commit `docs(ui): publish component and state catalog (F6-05)` · reporte `docs/tasks/task-f6-05.md`

---

## P5 — F6-06 + F6-07: Shell privado responsive y navegación por permisos

```text
Monorepo ICE24OS, Fase 6. Lee context/PROJECT_RULES.md, context/UI_UX.md (shell, navegación, breakpoints), context/AppFlow.md (mapa de navegación por rol), context/TASKS.md (TASK-F6-06, F6-07 y dependencia TASK-F3-07), packages/authorization, apps/private-web/src/app/(account)/layout.tsx y docs/modules/account-services-ui.md.

Rama feat/f6-06-07-shell-navigation.

F6-06 Shell responsive (apps/private-web/src/features/navigation + packages/ui):
- Escritorio: sidebar colapsable + topbar (marca, búsqueda si aplica, avisos, usuario). Tablet: sidebar en overlay. Móvil: topbar compacta + bottom navigation con máximo de destinos definido en UI_UX.md.
- Breadcrumbs generados desde la ruta. Skip link "Ir al contenido", landmarks (header, nav, main), foco gestionado al cambiar de ruta.
- Mantén el banner global de modo lectura de F5-15.

F6-07 Navegación basada en permisos y módulos:
- Un único registro declarativo de destinos (ruta, etiqueta, icono, permiso requerido, módulo/feature requerido, ubicación sidebar/bottom).
- El menú se genera en servidor a partir de las capacidades autorizadas del usuario: los destinos no autorizados NO se renderizan ni viajan al cliente.
- Acceder por URL a un destino no autorizado muestra el estado "sin permiso" y genera auditoría con actor, contexto, correlación y resultado (reutiliza el módulo de auditoría de F5-04).
- Pruebas positivas y negativas por rol y entre cuentas (aislamiento), unitarias e integración con navegador.
- Agrega cada persona del modo demo × viewport a la galería ux:snapshots (el shell visto por Dueño, Técnico, Solo lectura, etc.).
- Docs: docs/design-system/shell.md, reportes docs/tasks/task-f6-06.md y task-f6-07.md, estado actualizado.

VALIDACIÓN: pnpm check, pnpm build, ICE24_BROWSER_TESTS=1 pnpm test:integration, pnpm ux:snapshots.

AL TERMINAR: "Checklist de revisión UX" con: abrir http://localhost:3000/?demo=1, cambiar de persona en el panel Demo y comprobar qué menú ve cada rol; redimensionar a móvil; probar navegación solo con teclado.
```

**Push** — rama `feat/f6-06-07-shell-navigation` · commit `feat(web): add responsive private shell and permission-based navigation (F6-06, F6-07)` · reporte `docs/tasks/task-f6-07.md`

---

## P6 — F6-08: Selector de contexto y persistencia segura

```text
Monorepo ICE24OS, Fase 6. Lee context/PROJECT_RULES.md, context/UI_UX.md, context/AppFlow.md (cambio de cuenta/sucursal/máquina), context/TASKS.md (TASK-F6-08 y TASK-F3-06), docs/modules/identity.md y el código de contexto de cuenta existente en apps/api y apps/private-web.

Rama feat/f6-08-context-selector.

- Componente ContextSelector (apps/private-web/src/features/context) en la topbar: muestra siempre cuenta, rol, sucursal y máquina actuales; en móvil se abre como hoja inferior.
- Solo lista cuentas/sucursales/máquinas a las que el usuario tiene acceso (resuelto en servidor).
- Persistencia segura: el contexto elegido se guarda del lado servidor o en cookie httpOnly firmada/validada; nunca se confía en el valor del cliente sin revalidar permisos en cada petición. Si el permiso se pierde, se vuelve a un contexto válido y se informa al usuario.
- Cambiar de contexto: limpia caches/datos locales del contexto anterior, conserva la ruta si es válida en el nuevo contexto o redirige al inicio del módulo, y genera auditoría.
- Si hay cambios sin guardar, pide confirmación (deja un hook preparado; F6-11 lo completa).
- Pruebas: unitarias, integración (aislamiento entre cuentas, manipulación de cookie, pérdida de permiso) y navegador. Historias de Storybook y galería.
- Si requiere migración, incluye compatibilidad y reversión. Reporte docs/tasks/task-f6-08.md y estado.

VALIDACIÓN: pnpm check, pnpm build, ICE24_BROWSER_TESTS=1 pnpm test:integration, pnpm ux:snapshots.

AL TERMINAR: "Checklist de revisión UX" con los pasos para cambiar de cuenta/sucursal/máquina en modo demo y qué deben verificar mis jefes.
```

**Push** — rama `feat/f6-08-context-selector` · commit `feat(web): add context selector with secure persistence (F6-08)` · reporte `docs/tasks/task-f6-08.md`

---

## P7 — F6-09 + F6-10: Layouts reutilizables y estados globales

```text
Monorepo ICE24OS, Fase 6. Lee context/UI_UX.md (plantillas de pantalla, estados vacíos/carga/error/offline, modo lectura), context/AppFlow.md, context/TASKS.md (TASK-F6-09, F6-10), docs/design-system/* y packages/offline.

Rama feat/f6-09-10-layouts-states.

F6-09 Layouts (packages/ui/src/patterns/layouts + uso en apps/private-web):
- ListLayout (encabezado, acciones, filtros, tabla→tarjetas en móvil, paginación), DetailLayout (resumen, tabs, acciones, historial), WizardLayout (pasos, progreso, anterior/siguiente, validación por paso, resumen final), DashboardLayout (grid de KPIs y tarjetas responsive), MobileOperationalLayout (pantalla de campo: acciones grandes, una mano, accesible con guantes según UI_UX.md, no es una versión reducida del escritorio).
- Crea en modo demo una pantalla de ejemplo por layout con datos ficticios realistas de máquinas de hielo, accesibles desde un menú "Plantillas" visible solo en demo.

F6-10 Estados globales (packages/ui/src/patterns/status + apps/private-web/src/components/system-state):
- Componentes y reglas para: carga (skeleton), vacío (con siguiente acción), error (con reintento idempotente y código de correlación), sin permiso, offline (detección de conexión, cola de acciones pendientes si packages/offline lo soporta), modo lectura y conflicto de versión (412).
- Unifica los estados que hoy existen en F5-15 para que todas las pantallas usen los mismos.
- Valida: pérdida de conexión, reintento, cierre de sesión, pérdida de permiso, conflicto y limpieza de datos locales (pruebas de navegador).
- Añade a ux:snapshots cada layout × estado × viewport (el panel Demo ya permite forzar offline/error/lento).
- Docs: docs/design-system/layouts.md y states.md; reportes task-f6-09.md y task-f6-10.md; estado.

VALIDACIÓN: pnpm check, pnpm build, ICE24_BROWSER_TESTS=1 pnpm test:integration, pnpm ux:snapshots.

AL TERMINAR: "Checklist de revisión UX" con cada plantilla, cómo forzar cada estado desde el panel Demo y qué deben opinar mis jefes (claridad de mensajes, siguiente acción, uso en celular).
```

**Push** — rama `feat/f6-09-10-layouts-states` · commit `feat(ui): add reusable layouts and global system states (F6-09, F6-10)` · reporte `docs/tasks/task-f6-10.md`

---

## P8 — F6-11: Deep links, regresar y cambios no guardados

```text
Monorepo ICE24OS, Fase 6. Lee context/AppFlow.md (deep links, retorno, cambios no guardados, sesión expirada), context/TASKS.md (TASK-F6-11), docs/design-system/shell.md y el código de navegación/contexto de F6-06/07/08.

Rama feat/f6-11-deep-links-unsaved.

- Deep links: cualquier URL privada abierta sin sesión lleva al login y regresa a la URL original tras autenticarse (validando que el destino sea interno — sin open redirects). Si el link apunta a otra cuenta/sucursal, cambia el contexto solo si el usuario tiene acceso; si no, muestra "sin permiso" sin filtrar si el recurso existe.
- Regresar: botón "Regresar" en DetailLayout/WizardLayout que respeta el origen (lista filtrada, búsqueda, página) y funciona con el botón atrás del navegador y del celular; los filtros viven en la URL.
- Cambios no guardados: hook useUnsavedChanges que avisa al navegar dentro de la app, al cambiar de contexto (F6-08), al cerrar pestaña (beforeunload) y al expirar sesión; el diálogo usa el Dialog de F6-03.
- Pruebas de navegador para cada flujo de AppFlow afectado. Agrega a ux:snapshots el diálogo de cambios no guardados y la pantalla de "sin permiso" por deep link.
- Docs en docs/design-system/navigation.md; reporte docs/tasks/task-f6-11.md; estado.

VALIDACIÓN: pnpm check, pnpm build, ICE24_BROWSER_TESTS=1 pnpm test:integration, pnpm ux:snapshots.

AL TERMINAR: "Checklist de revisión UX" con 4–6 recorridos concretos (copiar un link, abrirlo en otra ventana, editar un formulario y salir, etc.) para que mis jefes los prueben.
```

**Push** — rama `feat/f6-11-deep-links-unsaved` · commit `feat(web): handle deep links, back navigation and unsaved changes (F6-11)` · reporte `docs/tasks/task-f6-11.md`

---

## P9 — F6-12: Pruebas automáticas de accesibilidad y visual regression

```text
Monorepo ICE24OS, Fase 6. Lee context/PROJECT_RULES.md, context/TASKS.md (TASK-F6-12), docs/qa/phase-6/README.md, tests/visual/ux-review.routes.ts y .github/workflows/ci.yml.

Rama feat/f6-12-ui-quality-gate.

- tests/e2e/accessibility: Playwright + @axe-core/playwright recorriendo todas las rutas de ux-review.routes.ts y todas las historias de Storybook (test-runner de Storybook o equivalente). Cero violaciones serias/críticas de WCAG 2.2 AA; pruebas de navegación por teclado del shell, diálogos y formularios.
- tests/visual: visual regression con toHaveScreenshot de Playwright sobre la misma lista (rutas × viewports × estados), con datos y fechas congelados, fuentes cargadas y animaciones desactivadas para evitar falsos positivos. Baselines generadas en Linux (contenedor oficial de Playwright) para que coincidan con CI; documenta cómo actualizarlas (`pnpm test:ui:update`) y que un cambio de baseline requiere aprobación UX en el PR.
- Script raíz `pnpm test:ui` que corre ambas.
- .github/workflows/ui-quality.yml: en cada PR ejecuta test:ui, ux:snapshots y storybook:build; sube como artefactos el reporte HTML de Playwright (con diffs visuales), la galería y el Storybook; marca el check como requerido en la documentación de protección de rama.
- Arregla todas las violaciones encontradas sin desactivar reglas (si una excepción es inevitable, justifícala en docs/qa/phase-6/a11y-exceptions.md).
- Reporte docs/tasks/task-f6-12.md y estado.

VALIDACIÓN: pnpm check, pnpm build, ICE24_BROWSER_TESTS=1 pnpm test:integration, pnpm test:ui, pnpm ux:snapshots.

AL TERMINAR: explícame en lenguaje sencillo cómo leer un diff visual en el reporte de Playwright para que mis jefes aprueben o rechacen cambios de pantalla.
```

**Push** — rama `feat/f6-12-ui-quality-gate` · commit `ci(ui): add accessibility and visual regression quality gate (F6-12)` · reporte `docs/tasks/task-f6-12.md`

> Después del merge, en GitHub → Settings → Branches, marca el check **UI Quality** como requerido para `main`.

---

## P10 — Gate de salida de Fase 6

```text
Monorepo ICE24OS. Prepara el gate de salida de la Fase 6 siguiendo exactamente el formato de docs/qa/phase-5 (traceability.md y evidence/AAAAMMDD-declaracion-cierre.md) y context/PROJECT_RULES.md.

Rama chore/f6-gate desde main actualizado.

- docs/qa/phase-6/traceability.md: matriz F6-01…F6-12 → requisitos PRD/TRD/UI_UX/AppFlow → archivos → pruebas → evidencia (capturas de la galería, reporte de a11y, Storybook).
- Ejecuta y registra resultados reales (números de pruebas, sin omisiones): pnpm check, pnpm build, ICE24_BROWSER_TESTS=1 pnpm test:integration, pnpm test:ui, pnpm ux:snapshots, pnpm storybook:build.
- Verifica los "Resultado esperado" y riesgos de la Fase 6 en Implementation_Plan.md (navegación no revela módulos, a11y desde el catálogo, mobile específico, componentes por API y no por pantalla).
- docs/qa/phase-6/evidence/<fecha>-declaracion-cierre.md con dictamen (aprobado / aprobado con pendientes / rechazado), pendientes externos (p. ej. aprobación de marca ADR de paleta) y espacio de firma para mis jefes.
- docs/qa/phase-6/ux-signoff.md: formulario sencillo por pantalla/componente con columnas "Aprobado / Cambios solicitados / Comentario / Revisor / Fecha" para que mis superiores lo llenen.
- Actualiza docs/backlog/phase-6-status.md con el resultado y marca F6-01…F6-12 integradas con sus PRs.
- No inventes resultados: si algo falla, regístralo como defecto con severidad y no lo marques aprobado.
```

**Push** — rama `chore/f6-gate` · commit `docs(qa): phase 6 exit gate` · reporte `docs/qa/phase-6/evidence/<fecha>-declaracion-cierre.md`
