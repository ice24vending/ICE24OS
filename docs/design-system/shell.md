# Shell privado y navegación (F6-06, F6-07, F6-08)

Estado: implementado el 19/10/2026 ([TASK-F6-06](../tasks/task-f6-06.md), [TASK-F6-07](../tasks/task-f6-07.md)); selector de contexto el 20/10/2026 ([TASK-F6-08](../tasks/task-f6-08.md)). Fuentes: UI_UX §10, §11.1, §11.2 y §16; AppFlow FL-02, FL-11 y §5.3; ADR-025 para colores. El wordmark de texto «ICE24 OS» sigue provisional (D7).

## Estructura

| Zona                | Escritorio (≥ 64rem)                                                           | Tableta (48–64rem)             | Móvil (< 48rem)                                                       |
| ------------------- | ------------------------------------------------------------------------------ | ------------------------------ | --------------------------------------------------------------------- |
| Barra superior      | Blanca, borde `border-brand`: wordmark, selector de contexto, avisos y usuario | Igual, con botón «Abrir menú»  | Compacta: menú, wordmark, selector, avisos; nombre oculto visualmente |
| Menú principal      | Barra lateral `brand-900` de 256 px, colapsable a 72 px (iconos + `title`)     | Cajón modal sobre el contenido | Cajón modal desde «Más»                                               |
| Navegación inferior | —                                                                              | —                              | Hasta 4 destinos prioritarios + «Más» (máximo 5, UI_UX §10.3)         |
| Breadcrumbs         | Ruta completa solo en páginas profundas (hoy todas las rutas son de un nivel)  | Igual                          | Regreso al padre + título (componente `Breadcrumbs` de F6-03)         |

- Componentes de `@ice24/ui`: `NavItem` (`sidebar`, `bottom`), `Breadcrumbs` e `Icon`. El shell vive en `apps/private-web/src/features/navigation` (`private-shell.tsx`, `navigation.css`) porque depende del router y de la campana de avisos.
- El cajón es un `<dialog>` nativo con `showModal()`: atrapa el foco, hace inerte la página, cierra con Escape o clic en el fondo y devuelve el foco al botón que lo abrió. No se usa `Dialog` de F6-03 porque es una ventana centrada con título y pie, no un panel lateral.
- Breakpoints: solo `48rem` y `64rem` de los tokens, con la sintaxis `width < 48rem` / `width >= 64rem`. F6-06 normalizó también los valores fuera de escala (`40rem`, `600px`, `767px`) de las pantallas de Fase 4–5.
- Banners globales de modo lectura y sin conexión (F5-15) se conservan dentro del contenido, debajo de la barra superior.

## Accesibilidad

- Enlace «Ir al contenido» como primer elemento enfocable; apunta a `main#main-content` de cada página.
- Landmarks: `header` (barra superior), `nav` «Navegación principal» (barra lateral o cajón; nunca ambos visibles), `nav` «Navegación inferior» (móvil) y el `main` de la página.
- Destino activo con `aria-current="page"` más forma (indicador), no solo color.
- Botones de icono con nombre (`aria-label`); el botón de colapsar expone `aria-expanded`.
- Foco gestionado: al cambiar de ruta en el cliente se cierra el cajón y el foco pasa al contenido; la navegación del menú es por enlaces (carga completa), de modo que el servidor recalcula el menú en cada destino.
- Áreas táctiles de 44 px como mínimo; sin desplazamiento horizontal a 375 px.

## Navegación por permisos (F6-07)

1. **Registro único** (`features/navigation/destinations.ts`): clave, ruta, etiqueta, icono, permiso, MFA, módulo y ubicación (`sidebar` o `bottom`).
2. **Capacidades del contexto:** el layout pide `GET session-contexts/current/capabilities`. La API evalúa cada permiso con `authorize()` de `@ice24/authorization` (membresía, contexto, cuenta suspendida, denegaciones explícitas) y responde los códigos de lectura permitidos y si la sesión tiene MFA.
3. **Filtrado en servidor:** `authorizedDestinations()` deja solo los destinos permitidos y envía al navegador únicamente `key`, `href`, `label`, `icon` y `placement`. Un destino no autorizado no se renderiza ni viaja al cliente.
4. **Acceso por URL:** cada página llama `guardDestination(clave)`. Sin permiso, la página no consulta su servicio y muestra «Sin permiso» con un folio. El BFF registra el intento con `POST session-contexts/current/navigation-denials`; la API vuelve a decidir con `authorize()` y escribe en `audit.events` (`operation = NAVIGATION_DENIED`, `result = DENIED`, actor, contexto, cuenta, correlación, destino y motivo). Si la API considera el destino autorizado, responde 409 y no audita.
5. **Fallo de capacidades:** si la API no responde, el menú lo dice («No fue posible cargar tu menú») y no se deniega ninguna página. Cada servicio sigue aplicando sus permisos, y la API sigue siendo la autoridad.

| Destino            | Permiso                 | Ubicación | Dueño | Adm. sucursal | Técnico | Solo lectura | Operador ICE24 | Admin ICE24 |
| ------------------ | ----------------------- | --------- | :---: | :-----------: | :-----: | :----------: | :------------: | :---------: |
| Cuentas y máquinas | `equipment.read`        | inferior  |   ✓   |       ✓       |    ✓    |      ✓       |       ✓        |      ✓      |
| Avisos             | `notifications.read`    | inferior  |   ✓   |       ✓       |    ✓    |      ✓       |       ✓        |      ✓      |
| Archivos privados  | `files.read`            | inferior  |   ✓   |       ✓       |    ✓    |      ✓       |       —        |      ✓      |
| Suscripción        | `subscriptions.read`    | lateral   |   ✓   |       —       |    —    |      —       |       ✓        |      ✓      |
| Auditoría          | `audit.read`            | lateral   |   ✓   |       —       |    —    |      ✓       |       —        |      ✓      |
| Centro de trabajos | `jobs.admin-read` + MFA | lateral   |   —   |       —       |    —    |      —       |       —        |      ✓      |
| Perfil             | `identity.profile-read` | inferior  |   ✓   |       ✓       |    ✓    |      ✓       |       ✓        |      ✓      |

La tabla sale de las concesiones de las migraciones (`authz.role_permissions`) y la verifica `navigation.test.tsx` con el `authorize()` real. En una cuenta suspendida no se muestra ningún destino. En modo lectura se muestran todos los de lectura.

## Selector de contexto (F6-08)

El botón de la barra superior muestra siempre **cuenta, rol, sucursal y máquina** en dos líneas (en móvil se recortan con puntos suspensivos y las etiquetas quedan solo para lectores de pantalla). Abre el `Dialog` de F6-03, que en móvil es una hoja inferior.

| Parte              | Origen                                                                                         | Estados                                                                                        |
| ------------------ | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Cuenta y rol       | `GET me/contexts` y `GET session-contexts/current` (membresías activas de la identidad)        | Actual marcada (`aria-current`), «Solo lectura», cargando por opción, error de carga           |
| Sucursal y máquina | `GET session-contexts/current/focus-options`: solo lo que alcanza el ámbito del rol            | Vacío, rol sin elección (403 → «trabaja con toda la cuenta»), error de carga, aplicando        |
| Acceso perdido     | El foco guardado ya no aparece en las opciones (o el rol perdió `equipment.read`)              | Banner «Cambió tu acceso»; el shell ya muestra «Todas»; «Entendido» guarda «Todas» y se audita |
| Contexto perdido   | `GET session-contexts/current` responde 404 (membresía terminada, cuenta suspendida, revocado) | El layout redirige a `/access/context?error=lost` con el motivo                                |

Persistencia y seguridad:

- **Cuenta:** `POST /api/session-context` → API `POST session-contexts` (revoca el contexto anterior y audita `CONTEXT_ACTIVATED`). El foco de la cuenta anterior se descarta.
- **Sucursal y máquina:** `POST /api/session-context/focus` → API `POST session-contexts/current/focus`, que valida contra el ámbito del sujeto (404 si está fuera de alcance, también si es de otra cuenta) y audita `CONTEXT_FOCUS_CHANGED` en `audit.events`. Solo entonces el BFF guarda el foco en la cookie de sesión cifrada (AES-256-GCM, `HttpOnly`); una cookie alterada se descarta entera. En cada carga el shell vuelve a pedir las opciones a la API, así que un valor guardado nunca concede nada.
- **El foco no es un permiso:** cada endpoint sigue autorizando por ámbito. Hoy el foco solo se muestra; las pantallas que lo usen como filtro llegan con sus módulos.
- **Al cambiar:** la respuesta lleva `Clear-Site-Data: "cache"` y el navegador carga el destino como documento nuevo (se descartan árbol de React, caché del router y datos del contexto anterior). En otra cuenta se llega al inicio del mismo módulo si el nuevo rol puede abrirlo; si no, a su primer destino. Dentro de la misma cuenta se conserva la página.
- **Cambios sin guardar:** `useUnsavedChanges(dirty)` registra la pantalla; el selector pide confirmación («Descartar y cambiar») antes de salir. F6-11 extiende el mismo registro a la navegación interna, `beforeunload` y sesión expirada.

## Pendiente

- **Módulos habilitados por cuenta:** el registro declara `module`, pero aún no existe en la base de datos una habilitación de módulos por cuenta. Cuando exista, `authorizedDestinations()` debe filtrar también por ella.
- **Búsqueda global** (UI_UX §10.5): no hay endpoint de búsqueda; la barra superior no la muestra.
- **Foco como filtro:** las pantallas aún no filtran por la sucursal o máquina elegidas (F6-09 en adelante y cada módulo).
- **Estado colapsado:** no se recuerda entre cargas.
