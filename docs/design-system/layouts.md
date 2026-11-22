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

## Base común (UXD-00)

Estos patrones se prueban en ejemplos propios de `/plantillas`. Su adopción en Máquinas,
Sucursales, Tickets y Usuarios corresponde a los pasos posteriores; las rutas existentes
conservan su contenido.

### Ancho de página

`PageWidth`, de `@ice24/ui`, tiene dos variantes: `full` para listas, tablas y paneles, y
`reading` para formularios y lecturas. Ambas comparten el margen izquierdo del shell;
`reading` limita el contenido a 60 rem (960 px con la escala normal) sin centrarlo.
El margen lo proporciona `--ids-page-gutter` con los tokens de espaciado existentes.
No se agrega un segundo margen ni un `max-width` dentro de la pantalla.

El layout `(account)` monta `AccountPage` una vez. En este paso, Avisos, Auditoría y
Archivos adoptan `full`; Suscripción adopta `reading`. La regla está en ese contenedor,
incluidos los estados de carga y error. No cambia los datos, textos ni acciones de estas
cuatro pantallas.

```tsx
<PageWidth as="main" variant="reading" id="main-content" aria-label="Detalle">
  <DetailLayout title="Despachadora Juárez" />
</PageWidth>
```

### Detalle con ruta propia

El registro se abre en `/<modulo>/[id]`; `DetailLayout` acepta `breadcrumbs` y `backLink`
además del `backHref` existente. El contenedor no consulta datos ni decide permisos.
En la app, `ReturnLink` recibe la lista con sus filtros y el identificador estable del
enlace de origen. El shell restaura el foco después de renderizar la lista.

```tsx
<PageWidth
  as="main"
  variant="reading"
  id="main-content"
  aria-label={registro.name}
  data-page-breadcrumbs="true"
  data-page-ready={String(hydrated)}
>
  <DetailLayout
    title={registro.name}
    breadcrumbs={[{ label: "Máquinas", href: origen }, { label: registro.name }]}
    backLink={<ReturnLink href={origen} linkId={rowLinkId(registro.id)} listName="máquinas" />}
  />
</PageWidth>
```

`hydrated` indica que los controles pueden recibir foco. La señal es opcional si no
necesitan esperar hidratación; las migas y la espera pertenecen al contrato de la página,
no a una ruta especial del shell. Véase el límite de espera en la documentación de foco.

La referencia funcional es `/plantillas/detalle/[id]`; las instrucciones están en
`/plantillas/detalle?ejemplo=base`. Véase [retorno y foco](navigation.md#retorno-con-foco-uxd-00)
para la validación del origen y el caso en que la fila dejó de existir.

### Alternador Lista/Bloques

`ViewSwitcher` recibe `value` (`lista` o `bloques`) y `onChange`. Es un grupo de opciones
con nombre, operable con Tab y flechas. Su única región viva, «Cambio de vista», anuncia
una elección del usuario una sola vez; la hidratación y la restauración de preferencias
no producen anuncios.

`useViewPreference("plantillas/lista")` conecta ese control con `?vista=bloques` y
`localStorage`. La URL tiene prioridad, después la preferencia de esa pantalla y al final
`lista`. Leer y escribir el almacenamiento está protegido con `try/catch`; bloquearlo no
impide cambiar de vista. Se conservan los demás filtros y se reemplaza la entrada del
historial para que el selector no agregue pasos al botón Atrás.

```tsx
const { view, changeView } = useViewPreference("plantillas/lista");
<ViewSwitcher value={view} onChange={changeView} />;
```

### Tabla con acceso al detalle

`Table` conserva la semántica de tabla. `getRowHref` agrega un enlace real en la primera
celda; `getRowLinkId` le asigna el identificador usado al volver. La celda inicial debe
producir contenido sin otros controles interactivos. Las filas no se convierten en enlaces
ni reciben una parada adicional de Tab.

```tsx
<Table
  caption="Máquinas de la cuenta"
  rows={registros}
  columns={columnas}
  getRowId={(registro) => registro.id}
  getRowHref={(registro) => withOrigin(`/plantillas/detalle/${registro.id}`, origen)}
  getRowLinkId={(registro) => rowLinkId(registro.id)}
  view={view}
/>
```

Un clic ordinario en otra celda activa el mismo enlace. Seleccionar texto, usar teclas
modificadoras o pulsar botones, casillas y otros enlaces conserva el comportamiento de
esos controles. Para ordenar, cada columna declara `sortValue` o `sortable`; el encabezado
expone `aria-sort`. La variante `bloques` conserva enlaces, datos y controles a cualquier
ancho. La vista de lista sigue adaptándose a móvil.

### Evidencia y estados

Los ejemplos nuevos usan IDs visuales `base-comun-*`, separados de las capturas existentes.
Incluyen registros variados y estados normal, carga, vacío, error con folio, sin conexión
y modo lectura, empezando por Dueño (`OW`) y después Técnico (`TC`), Solo lectura (`AU`)
y Administrador de sucursal (`OP`). No agregan operaciones de escritura.

Los cuatro patrones tienen historias y pruebas unitarias: `Layouts/Ancho de página`,
`Layouts/Detalle` (Ruta propia), `Base/Alternador de vista` y `Base/Table` (Filas con detalle
y Bloques con detalle). `tests/e2e/accessibility/uxd-base-common.spec.ts` comprueba los
recorridos, la persistencia, los anuncios, los permisos y la adaptación a móvil y zoom.
Las rutas registradas entran también en el análisis de accesibilidad y la regresión visual.
