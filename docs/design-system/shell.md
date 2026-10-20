# Shell privado y navegación (F6-06, F6-07)

Estado: implementado el 19/10/2026 ([TASK-F6-06](../tasks/task-f6-06.md), [TASK-F6-07](../tasks/task-f6-07.md)). Fuentes: UI_UX §10, §11.1, §11.2 y §16; AppFlow FL-02, FL-11 y §5.3; ADR-025 para colores. El wordmark de texto «ICE24 OS» sigue provisional (D7).

## Estructura

| Zona                | Escritorio (≥ 64rem)                                                          | Tableta (48–64rem)             | Móvil (< 48rem)                                                     |
| ------------------- | ----------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------- |
| Barra superior      | Blanca, borde `border-brand`: wordmark, cuenta activa, avisos y usuario       | Igual, con botón «Abrir menú»  | Compacta: menú, wordmark, cuenta, avisos; nombre oculto visualmente |
| Menú principal      | Barra lateral `brand-900` de 256 px, colapsable a 72 px (iconos + `title`)    | Cajón modal sobre el contenido | Cajón modal desde «Más»                                             |
| Navegación inferior | —                                                                             | —                              | Hasta 4 destinos prioritarios + «Más» (máximo 5, UI_UX §10.3)       |
| Breadcrumbs         | Ruta completa solo en páginas profundas (hoy todas las rutas son de un nivel) | Igual                          | Regreso al padre + título (componente `Breadcrumbs` de F6-03)       |

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

## Pendiente

- **Módulos habilitados por cuenta:** el registro declara `module`, pero aún no existe en la base de datos una habilitación de módulos por cuenta. Cuando exista, `authorizedDestinations()` debe filtrar también por ella.
- **Búsqueda global** (UI_UX §10.5): no hay endpoint de búsqueda; la barra superior no la muestra.
- **Selector de contexto en la barra superior:** hoy es el enlace «Cambiar» a `/access/context`; el selector con persistencia segura es F6-08.
- **Estado colapsado:** no se recuerda entre cargas.
