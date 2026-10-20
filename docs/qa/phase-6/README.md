# QA de Fase 6 — Cómo revisar las pantallas

Esta guía es para directivos y revisores sin conocimientos técnicos. Explica tres formas de ver y probar las pantallas de ICE24 OS, de menor a mayor esfuerzo. **Todos los datos son ficticios**: no hay clientes, máquinas ni personas reales.

## 1. Galería de capturas (la más sencilla)

Es una página con fotos de cada pantalla en celular, tableta y computadora, y en cada situación: normal, cargando, error, sin permiso, cuenta en modo lectura y sin conexión. Desde F6-05 incluye también cada componente del catálogo con su **matriz de estados**, los **patrones** y las **maquetas** de pantallas futuras, agrupados por sección.

**Cómo abrirla**

- En un PR de GitHub: pestaña **Checks** → **CI** → al final, en **Artifacts**, descarga `ux-review-gallery`. Descomprime el archivo y abre `index.html` con doble clic.
- En la computadora del equipo técnico: `pnpm ux:snapshots`. Se genera `docs/qa/phase-6/ux-review/index.html`.

**Qué revisar**: cada pantalla trae un recuadro «Qué revisar». Haz clic en una foto para verla completa. Arriba hay **filtros** (Sección, Pantalla o componente, Tamaño y Estado) y un índice: por ejemplo, elige Tamaño «Móvil 375» y Estado «Cuenta en modo lectura» para ver solo eso; «Quitar filtros» vuelve a mostrar todo.

## 2. Catálogo de componentes (Storybook)

Muestra cada pieza de la interfaz (botones, avisos, tablas…) por separado, con controles para cambiar su texto, su estado y el tamaño de pantalla.

**Cómo abrirlo**

- En un PR: en **Artifacts** descarga `storybook-static` y descomprímelo. Los navegadores no permiten abrir este catálogo con doble clic (carga módulos de JavaScript); con Node instalado basta una línea en la carpeta descomprimida: `npx serve storybook-static` y abrir la dirección que muestra. Si no tienes Node, usa la galería (opción 1): trae las mismas matrices en imagen.
- En la computadora del equipo técnico: `pnpm storybook` y abrir http://localhost:6006.

**Cómo está organizado**: empieza en **Catálogo › Bienvenida**; luego Fundamentos, Base, Dominio, Patrones y Pantallas. Cada componente tiene una página **Docs** (cuándo usar, cuándo no, accesibilidad y textos) y una historia **Matriz de estados** con sus ocho estados en una vista.

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

1. **Se entiende quién soy**: al cambiar de persona en el panel Demo, el menú y las pantallas cambian según el rol. Por ejemplo, el Técnico no ve Auditoría, Suscripción ni Centro de trabajos. Desde F6-07 nadie ve un enlace que al abrirlo diga «sin permiso»; si se escribe la dirección a mano, la pantalla lo explica y el intento queda en la auditoría.
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

## Qué deben validar en P4 (catálogo de componentes y estados)

1. **Bienvenida**: alguien que no conoce el proyecto entiende qué es ICE24 OS y cómo recorrer el catálogo.
2. **Matrices de estados**: en cada componente, los ocho estados se distinguen y las celdas «No aplica» tienen una razón convincente.
3. **Docs de cada componente**: los textos recomendados suenan a ICE24 (claros, sin tecnicismos) y las reglas de «Cuándo no usar» son razonables.
4. **Patrones**: el formulario en modo lectura avisa antes de empezar; la confirmación sensible dice qué se conserva; el conflicto exige motivo.
5. **Maqueta del expediente**: la jerarquía (identidad, tres estados, alerta fijada, pestañas) es la que esperan ver en la Fase 7.
6. **Galería**: los filtros encuentran rápido una pantalla en un tamaño y estado concretos.

El detalle está en el «Checklist de revisión UX» de [TASK-F6-05](../../tasks/task-f6-05.md#checklist-de-revisión-ux) y el índice del catálogo en [catalog.md](../../design-system/catalog.md).

## Qué deben validar en P5 (shell y navegación por permisos)

1. **Menú por rol**: en la galería, la ruta «Shell y menú por rol» muestra el menú de cada persona. Nadie ve un destino que no puede abrir (por ejemplo, el Técnico no ve Auditoría ni Suscripción y solo el Administrador ICE24 ve el Centro de trabajos).
2. **Celular**: abajo hay como máximo cinco botones, incluido «Más», que abre el resto. Arriba se ve la cuenta activa y la campana.
3. **Tableta**: el menú se abre con el botón de tres líneas y se cierra con Escape o tocando fuera.
4. **Escritorio**: la barra lateral azul se contrae a iconos y se vuelve a expandir.
5. **Sin permiso por URL**: al escribir a mano una dirección no permitida, la pantalla lo explica y muestra un folio para soporte.
6. **Teclado**: con Tab, lo primero es «Ir al contenido»; todo el menú se recorre con Tab y Enter, con el foco visible.

El detalle está en el «Checklist de revisión UX» de [TASK-F6-07](../../tasks/task-f6-07.md#checklist-de-revisión-ux) y el diseño en [shell.md](../../design-system/shell.md).

Las observaciones se registran en el PR. A partir del gate (P10) habrá un formulario de aprobación por pantalla (`ux-signoff.md`).
