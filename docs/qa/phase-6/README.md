# QA de Fase 6 — Cómo revisar las pantallas

Esta guía es para directivos y revisores sin conocimientos técnicos. Explica tres formas de ver y probar las pantallas de ICE24 OS, de menor a mayor esfuerzo. **Todos los datos son ficticios**: no hay clientes, máquinas ni personas reales.

## 1. Galería de capturas (la más sencilla)

Es una página con fotos de cada pantalla en celular, tableta y computadora, y en cada situación: normal, cargando, error, sin permiso, cuenta en modo lectura y sin conexión.

**Cómo abrirla**

- En un PR de GitHub: pestaña **Checks** → **CI** → al final, en **Artifacts**, descarga `ux-review-gallery`. Descomprime el archivo y abre `index.html` con doble clic.
- En la computadora del equipo técnico: `pnpm ux:snapshots`. Se genera `docs/qa/phase-6/ux-review/index.html`.

**Qué revisar**: cada pantalla trae un recuadro «Qué revisar». Haz clic en una foto para verla completa.

## 2. Catálogo de componentes (Storybook)

Muestra cada pieza de la interfaz (botones, avisos, tablas…) por separado, con controles para cambiar su texto, su estado y el tamaño de pantalla.

**Cómo abrirlo**

- En un PR: en **Artifacts** descarga `storybook-static`, descomprímelo y abre `index.html`. Si el navegador no carga la página al abrirla con doble clic, pide al equipo técnico que la abra con `pnpm storybook`.
- En la computadora del equipo técnico: `pnpm storybook` y abrir http://localhost:6006.

**Qué revisar**: en el panel inferior, pestaña **Controls**, cambia los valores y observa el resultado. La barra superior permite elegir el tamaño (Móvil 375, Tableta 768, Escritorio 1280 o 1440). La pestaña **Accessibility** lista problemas de accesibilidad.

## 3. La aplicación en modo demo (la más completa)

Es la aplicación real, navegable, con personas ficticias. Un panel flotante **Demo** (abajo a la derecha) permite cambiar:

| Opción              | Valores                                                                            |
| ------------------- | ---------------------------------------------------------------------------------- |
| Persona             | Dueño, Administrador de sucursal, Técnico, Solo lectura (Auditor) y Operador ICE24 |
| Cuenta              | Hielo Polar del Norte (cuenta pagada) o Agua y Hielo del Bajío (cuenta demo)       |
| Sucursal asignada   | Solo cambia lo que ven el Administrador de sucursal y el Técnico                   |
| Estado de la cuenta | Activa, Solo lectura (pago rechazado) o Suspendida por ICE24                       |
| Conexión            | Normal, Carga lenta, Error del servicio o Sin conexión                             |

Los permisos de cada persona son **los mismos que usa el sistema real**: si una persona no ve un menú o recibe «sin permiso», así funcionará en producción. Los cambios que hagas en formularios **no se guardan**.

**Cómo abrirlo** (equipo técnico): `ICE24_DEMO_MODE=1 pnpm dev:private` (en PowerShell: `$env:ICE24_DEMO_MODE="1"; pnpm dev:private`) y abrir http://localhost:3000/?demo=1. El modo demo **no funciona** en una versión compilada para producción ni en Vercel; está bloqueado a propósito.

## Qué deben validar en esta etapa (P0)

1. **Se entiende quién soy**: al cambiar de persona en el panel Demo, el menú y las pantallas cambian según el rol. Por ejemplo, el Técnico no ve Auditoría ni Centro de trabajos. Hoy todavía ve el enlace «Suscripción» y al abrirlo recibe «sin permiso»; ocultar los destinos no autorizados es la tarea F6-07.
2. **Modo lectura claro**: con «Solo lectura (pago rechazado)», el aviso amarillo explica qué pasó y qué hacer, y la alerta crítica aparece fijada en Avisos.
3. **Errores sin pánico**: con «Error del servicio» o «Sin conexión», cada pantalla dice qué pasó y que no se perdió nada.
4. **Uso en celular**: en la galería, las capturas de 375 px se leen sin hacer zoom y sin desplazamiento horizontal.
5. **La galería sirve**: la galería y el panel Demo son suficientes para opinar; si falta una pantalla o un estado, indíquenlo para agregarlo.

## Qué deben validar en P1 (paleta y tokens)

Abrir Storybook (o las capturas `fundamentos-*` de la galería) en **Fundamentos**:

1. **Colores › Marca**: azul noche, azul de acción, celeste hielo y blanco se reconocen como ICE24.
2. **Colores › Estados**: cada estado se distingue por su texto e icono, no solo por el color.
3. **Colores › Contraste**: todas las combinaciones en uso dicen «Cumple»; las «No permitido» no se usarán así.
4. **Tipografía**: los títulos y el texto se leen bien (todavía con fuente de reserva, no la oficial).
5. **Galería**: la pantalla de acceso, equipos y avisos se ven con el azul de marca sin perder información.

La aprobación de marca se registra en [ADR-025](../../decisions/adr-025-brand-palette.md#aprobación-de-marca).

## Qué deben validar en P2 (componentes base)

Abrir Storybook en **Base** (o las capturas `componentes-*` de la galería). Probar **sin ratón**: Tab avanza, Shift+Tab retrocede, Enter o Espacio activan, Esc cierra.

1. **Botones**: hay una acción principal clara; «Cargando» no se puede pulsar dos veces; «Deshabilitado con motivo» explica por qué.
2. **Formularios**: cada campo tiene etiqueta visible; el error dice qué corregir; el modo lectura se distingue (fondo gris y borde punteado).
3. **Diálogo**: se abre y se cierra solo con teclado; el foco no se escapa del diálogo y, al cerrarlo, vuelve al botón que lo abrió.
4. **Tabla**: los folios se leen en monoespaciada; en Móvil 375 cada fila es una tarjeta legible.
5. **Estados**: cada chip y banner se entiende por su texto e icono, no solo por el color.
6. **Navegación**: la barra lateral azul noche y la navegación inferior marcan el destino activo con una forma, no solo con color.

El detalle por componente está en el «Checklist de revisión UX» de [TASK-F6-03](../../tasks/task-f6-03.md#checklist-de-revisión-ux).

## Qué deben validar en P3 (componentes de dominio)

Abrir Storybook en **Dominio** (o las capturas `componentes-triada`, `-alerta-critica`, `-comparador`, `-sincronizacion`, `-modo-lectura` y `-trabajos` de la galería). Revisar también en blanco y negro (filtro de escala de grises del sistema) y en **Móvil 375**.

1. **Tríada de máquina**: operación, técnico y sanitario se leen por separado; el estado crítico dominante resalta y los otros siguen visibles.
2. **Alerta crítica**: se entiende que está fijada hasta «Enterado» y que «Enterado» no la resuelve; en **CriticalAlert › Interactiva**, «Marcar enterado» y luego «Atender» muestran el conflicto dentro de la tarjeta con «Actualizar».
3. **Comparador**: las diferencias se ven sin depender del color («Cambió») y se sabe quién capturó cada versión.
4. **Sincronización**: los ocho estados se distinguen; en **SyncStatus › Reintento**, pulsar «Reintentar» varias veces envía una sola solicitud.
5. **Modo lectura**: barra e indicador comparten color y candado; el formulario dice desde el inicio que no se puede guardar.
6. **Trabajos**: «Requiere revisión» y «Fallido» se distinguen de «Reintento programado»; el reintento pide motivo.

El detalle y las preguntas abiertas están en el «Checklist de revisión UX» de [TASK-F6-04](../../tasks/task-f6-04.md#checklist-de-revisión-ux).

Las observaciones se registran en el PR. A partir del gate (P10) habrá un formulario de aprobación por pantalla (`ux-signoff.md`).
