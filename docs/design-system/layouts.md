# Layouts de pantalla (F6-09)

Estado: implementado el 22/10/2026 ([TASK-F6-09](../tasks/task-f6-09.md)). Fuentes: UI_UX §4.2, §11.3–11.6, §13.3, §14.3–14.8, §15.1 y §16. Código: `packages/ui/src/patterns/layouts`. Estados que reemplazan el contenido: [Estados globales](states.md).

## Reglas comunes

- **Un solo `h1` por página**, dibujado por `PageHeader` (eyebrow, título, descripción, chips de estado y acciones con la primaria al final). La pantalla de campo tiene su propio encabezado compacto.
- **«Regresar»** (F6-11): `PageHeader`, `DetailLayout` y `WizardLayout` aceptan `backHref` y lo dibujan arriba del título; el origen y los filtros viajan en la URL. Ver [navegación](navigation.md).
- **`status` reemplaza el contenido, no la página.** Cada layout acepta un `SystemState` en `status`: encabezado, filtros y barra de acciones se quedan; lista, pestañas, pasos o tarjetas se sustituyen. Así un error, un vacío o un «sin permiso» se ven igual en todas las pantallas.
- **`banner` no reemplaza nada.** Para avisos que conviven con el contenido: indicador de modo lectura, resultado de una acción, conflicto de versión.
- **Sin estado propio de datos.** Los layouts no piden datos ni deciden permisos; la pantalla pasa lo que el servidor autorizó y omite las acciones que el rol no puede usar.
- **Breakpoints de los tokens:** `width < 48rem` (móvil) y `width < 64rem` (tableta), probados a 375, 768 y 1280 px sin desplazamiento horizontal.

## Plantillas

| Layout                    | Uso (UI_UX)                                                 | Estructura                                                                                                                             | Móvil                                                                                                              |
| ------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `ListLayout`              | Máquinas, órdenes, documentos, auditoría (§11.3)            | Encabezado, acciones, resumen de 2–5 métricas, filtros, `Table` y `Pagination` de F6-03                                                | Filtros detrás del botón «Filtros (n)» con `aria-expanded`; la tabla se vuelve tarjetas; números de página ocultos |
| `DetailLayout`            | Expediente de máquina, orden, documento (§11.4, §14.6)      | Folio arriba del título, chips de estado, acciones, resumen, `Tabs` con «Historial» siempre al final y panel lateral (`complementary`) | El panel lateral baja debajo del contenido desde 64rem                                                             |
| `WizardLayout`            | Alta de equipo, importación, transferencia (§11.6)          | «Paso n de m» + barra de progreso, lista de pasos (hecho / actual / pendiente), validación por paso, «Revisión» final y envío          | La lista de pasos se oculta; quedan el contador y la barra; los botones ocupan el ancho                            |
| `DashboardLayout`         | Inicio por rol, paneles (§14.3, §15.1)                      | `KpiCard` (valor, periodo, alcance, «Datos parciales») en rejilla y tarjetas en 1–3 columnas                                           | Una columna                                                                                                        |
| `MobileOperationalLayout` | Orden de trabajo, bitácora, entrega en campo (§14.4, §14.8) | Volver, título, máquina, estado de sincronización, progreso, contenido y barra de acciones fija abajo                                  | Diseñada para el celular; en escritorio se centra a 40rem                                                          |

### Validación por paso (`WizardLayout`)

Cada paso puede declarar `validate()`, que devuelve los problemas en lenguaje operativo. «Siguiente» no avanza si hay problemas: se muestran en un banner `role="alert"` y el foco va al título del paso. Al cambiar de paso el foco también va al título. Los pasos hechos son botones para volver; el envío final usa `finishing` (no se puede enviar dos veces) y `finishDisabledReason` (modo lectura, sin conexión). La validación del cliente solo guía: el servidor vuelve a validar.

### KPI sin datos

`KpiCard` con `value={null}` dice «Sin datos», nunca 0 (UI_UX §13.3). `completeness="partial"` agrega la etiqueta «Datos parciales» cuando alguna fuente no reportó.

## Pantalla de campo: una mano y guantes

UI_UX pide 44 px como área mínima (§16.2), acciones principales en la primera pantalla para flujos de campo y texto de 16 px o más en móvil (§7.2), pero **no menciona guantes**. Para cubrir ese uso, `MobileOperationalLayout` aplica una regla más estricta, registrada como decisión provisional en [TASK-F6-09](../tasks/task-f6-09.md#decisiones):

- objetivos de **64 px** (`--space-16`) en botones, enlaces, campos y casillas, con 12 px entre acciones;
- texto de 18 px (`font-body-lg`);
- barra de acciones **sticky** en la zona del pulgar, por encima de la barra inferior del shell (`--ids-bottom-offset`), con la acción que avanza la tarea abajo y el guardado local arriba;
- sin gestos de deslizar ni acciones que dependan de pasar el cursor;
- una columna; no reutiliza el layout de escritorio.

## Plantillas de ejemplo (modo demo)

`/plantillas` solo existe en modo demo: el menú «Plantillas» se añade al shell únicamente en sesiones demo y las páginas responden 404 fuera de él. Hay una pantalla por layout con máquinas de hielo ficticias que llegan por la API demo, así que el panel Demo controla persona, modo de cuenta y red. Detalle de cómo forzar cada estado: [Estados globales](states.md#cómo-forzar-cada-estado-en-el-modo-demo).

| Ruta                    | Layout                    | Acción que se puede enviar         |
| ----------------------- | ------------------------- | ---------------------------------- |
| `/plantillas/lista`     | `ListLayout`              | — (solo lectura)                   |
| `/plantillas/detalle`   | `DetailLayout`            | «Registrar lectura»                |
| `/plantillas/asistente` | `WizardLayout`            | «Enviar solicitud»                 |
| `/plantillas/panel`     | `DashboardLayout`         | «Marcar enterado»                  |
| `/plantillas/campo`     | `MobileOperationalLayout` | «Completar orden» y guardado local |

Las acciones pasan por el BFF demo `POST /api/plantillas` con sesión, contexto, CSRF y clave de idempotencia; no guardan nada salvo el folio de cada clave.

## Catálogo y galería

- Storybook: `Layouts/Lista`, `Layouts/Detalle`, `Layouts/Flujo por pasos`, `Layouts/Dashboard`, `Layouts/Pantalla de campo`, cada uno con Normal, Modo lectura, Móvil y **Matriz de estados**. `pnpm check:catalog` exige ahora la matriz también en `packages/ui/src/patterns/*/*.stories.tsx`.
- `pnpm ux:snapshots`: rutas «Plantilla · …» con cada estado en 375, 768 y 1280 px, más las matrices de Storybook.
