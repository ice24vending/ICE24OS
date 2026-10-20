# TASK-F6-06 — Shell privado responsive

Estado: implementada el 19/10/2026 en la rama `feat/f6-06-07-shell-navigation`, creada desde `main` `d02f74f` (prompt P5, junto con [TASK-F6-07](task-f6-07.md)). Sigue la dirección visual aprobada ([ADR-025](../decisions/adr-025-brand-palette.md)); el wordmark de texto sigue provisional (D7).

## Objetivo

Entregar barra lateral, barra superior, navegación inferior y breadcrumbs para las pantallas con contexto de cuenta, accesibles por teclado, en los breakpoints de los tokens, conservando el banner global de modo lectura de F5-15.

## Entregables

| #   | Entregable              | Resultado                                                                                                                                                                                                  |
| --- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Shell                   | `features/navigation/private-shell.tsx`: barra superior (wordmark, cuenta activa con «Cambiar», campana de avisos, usuario), barra lateral colapsable 256 → 72 px, cajón modal y navegación inferior       |
| 2   | Responsive              | Escritorio ≥ 64rem barra lateral persistente; tableta 48–64rem cajón desde «Abrir menú»; móvil < 48rem barra inferior con 4 destinos + «Más» (máximo 5)                                                    |
| 3   | Breadcrumbs             | `breadcrumbsFor()` genera la ruta desde la URL bajo su destino, con el `Breadcrumbs` de F6-03; se muestran solo en páginas profundas (hoy no hay rutas de más de un nivel)                                 |
| 4   | Accesibilidad           | «Ir al contenido», landmarks `header`/`nav`/`main`, `aria-current`, botones de icono con nombre, `aria-expanded` al colapsar, cajón `<dialog>` con foco atrapado, Escape y retorno de foco                 |
| 5   | Foco al cambiar de ruta | Navegación en cliente: cierra el cajón y enfoca `main#main-content`                                                                                                                                        |
| 6   | Modo lectura            | Banners globales de modo lectura y sin conexión (F5-15) dentro del contenido del shell, sin cambios                                                                                                        |
| 7   | Breakpoints             | Media queries de Fase 4–5 fuera de escala (`40rem`, `600px`, `767px`) normalizadas a `width < 48rem`; `account-shell.css` a `width >= 48rem/64rem` (pendiente de [tokens](../design-system/tokens.md))     |
| 8   | Galería                 | Ruta «Shell y menú por rol» en `tests/visual/ux-review.routes.ts`: 6 personas + modo lectura + menú no disponible, en los 3 viewports                                                                      |
| 9   | Documentación           | [Shell y navegación](../design-system/shell.md), [servicios de cuenta](../modules/account-services-ui.md), [referencia D5/D6](../design-system/reference/README.md), [guía de QA](../qa/phase-6/README.md) |

## Decisiones

- **Cajón con `<dialog>` nativo** en lugar del `Dialog` de F6-03: aquel es una ventana centrada con título y pie; el cajón es un panel lateral. `showModal()` da foco atrapado, página inerte, Escape y retorno de foco sin código propio.
- **Enlaces, no `next/link`**: `NavItem` dibuja `<a>`; cada destino se carga completo y el servidor recalcula el menú con los permisos vigentes (F6-07).
- **Búsqueda global omitida**: UI_UX §10.5 la condiciona a «perfiles autorizados» y no existe endpoint. No se dibuja un control sin función.
- Se eliminó `account-nav.tsx` y los estilos `.account-header`/`.account-nav` de F5-15. El enlace «Saltar al contenido» pasa a «Ir al contenido».

## Archivos

- Nuevos: `apps/private-web/src/features/navigation/{private-shell.tsx,navigation.css,destinations.ts,destination-denied.tsx,navigation.test.tsx}`, `docs/design-system/shell.md`, este reporte.
- Modificados: `apps/private-web/src/app/(account)/layout.tsx`, `apps/private-web/src/app/layout.tsx`, `apps/private-web/src/app/styles.css`, `apps/private-web/src/features/{account-shell/account-shell.css,audit/audit.css,demo/demo-panel.css,equipment/equipment.css,jobs/jobs.css,notifications/notifications.css,subscription/subscription.css}`, `tests/visual/ux-review.routes.ts`, `tests/integration/ui-services.test.ts`, documentación listada arriba.
- Eliminados: `apps/private-web/src/features/account-shell/account-nav.tsx`.

## Requisitos cubiertos

UI_UX §10.1–10.4 (barra lateral 248–280 px colapsable a 72 px, barra superior blanca con borde, navegación inferior ≤ 5 con «Más», breadcrumbs con regreso en móvil), §11.1–11.2, §16.1–16.2 (breakpoints, 44 px, sin desplazamiento horizontal); AppFlow §5.3; WCAG 2.2 AA 2.4.1 (saltar bloques), 2.4.3 (orden del foco), 2.4.7/2.4.11 (foco visible), 4.1.2 (nombre y estado).

## Pruebas

Ver [TASK-F6-07 › Validación](task-f6-07.md#validación): las pruebas del shell y de la navegación por permisos se ejecutaron juntas.

## Riesgos y deuda

- El estado colapsado no se recuerda entre cargas.
- Breadcrumbs sin uso real hasta que existan rutas profundas (expediente de máquina, Fase 7).
- Selector de contexto en la barra superior: hoy es un enlace; lo completa F6-08.
