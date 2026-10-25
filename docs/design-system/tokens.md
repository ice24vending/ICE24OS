# Tokens del ICE24 Design System

Estado: **paleta aprobada por Dirección el 15/10/2026** ([ADR-025](../decisions/adr-025-brand-palette.md), DEC-020); tipografía provisional. Fecha: 12/10/2026. Tareas: [F6-01](../tasks/task-f6-01.md) y [F6-02](../tasks/task-f6-02.md).

## Fuente única

| Qué                                                                                     | Dónde                                                                     |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Paleta primitiva (`brand`, `neutral`, estados)                                          | `packages/ui/src/tokens/primitives.ts`                                    |
| Tokens semánticos (`surface`, `text`, `border`, `action`, `focus`, `status`, `overlay`) | `packages/ui/src/tokens/semantic.ts`                                      |
| Tipografía, espaciado, radios, tamaños, elevación, movimiento, capas y breakpoints      | `packages/ui/src/tokens/foundations.ts`                                   |
| Combinaciones de contraste en uso y fórmula WCAG                                        | `packages/ui/src/tokens/contrast.ts`                                      |
| CSS custom properties (generado; no editar)                                             | `packages/ui/src/tokens/tokens.css`, importado por `@ice24/ui/styles.css` |

- **TypeScript:** `import { semanticColors, typeScale, spacing } from "@ice24/ui"`. Úsese solo donde no hay CSS (por ejemplo `themeColor` del manifiesto).
- **CSS:** `var(--color-text-default)`, `var(--space-4)`, `var(--font-heading-2)`, `var(--shadow-md)`, `var(--motion-duration-base)`, `var(--z-modal)`.
- Tras cambiar un token: `pnpm tokens:generate`. Una prueba falla si `tokens.css` no coincide con el TypeScript.
- Solo hay **tema claro**. El modo oscuro es una pregunta abierta de UI_UX §34 (pregunta 8).

## Reglas que se verifican en `pnpm check`

| Comando                                                  | Qué impide                                                                                                                                                                                                 |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check:colors` (`scripts/check-color-literals.mjs`) | Colores escritos a mano (hex, `rgb()`, `hsl()`, `white`/`black`, también como respaldo de `var()`) en `apps/private-web/src`, `apps/public-portal/src` y `packages/ui/src`, salvo `packages/ui/src/tokens` |
| `pnpm check:contrast` (`scripts/check-contrast.mjs`)     | Una combinación en uso por debajo de WCAG 2.2 AA, o una combinación prohibida que empiece a cumplir sin actualizar la documentación                                                                        |
| Prueba `tokens.test.ts`                                  | `tokens.css` desfasado; anclajes de marca alterados; variables CSS usadas por las hojas de estilo que no existen                                                                                           |

## Convenciones de nombre

- Primitivos: `--color-brand-600`, `--color-neutral-50`, `--color-success-700`.
- Semánticos: `--color-{grupo}-{rol}`; estados: `--color-status-{tono}-{fg|bg|border|emphasis}` con los tonos `success`, `warning`, `danger`, `info`, `nodata`, `audit` y `offline`.
- `fg` es texto sobre `bg` o sobre superficie blanca; `emphasis` es franja, icono o insignia sólida (con `text-inverse` encima).
- Tipografía: `--font-{estilo}` (atajo `font:`) y `--font-{estilo}-size | -line-height | -weight`.

## Decisiones de interpretación

| Tema                        | UI_UX dice                                                  | Token                                                                                                                 | Motivo                                                                                                                                                                    |
| --------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Anillo de foco              | 3 px `brand-400` (§8.6)                                     | `focus-ring` = `brand-600`; `focus-ring-inverse` = `brand-400` sobre azul noche                                       | `brand-400` sobre blanco: 2.70:1 < 3:1 (WCAG 1.4.11)                                                                                                                      |
| Placeholder                 | `neutral-500` (§6.2)                                        | `text-placeholder` = `neutral-600`                                                                                    | `neutral-500` sobre blanco: 4.04:1 < 4.5:1                                                                                                                                |
| Borde de controles          | —                                                           | `border-control` = `neutral-500`                                                                                      | `neutral-400` (2.66:1) y `neutral-300` (1.65:1) no delimitan un control                                                                                                   |
| Borde estándar              | `neutral-200` (§8.6) o `neutral-300` (§6.2)                 | `border-default` = `neutral-300`; `border-subtle` = `neutral-200` para divisores                                      | Contradicción menor entre secciones; `neutral-300` es el más cercano al borde ya aprobado en F5-15                                                                        |
| Navegación sobre azul noche | Destino activo en brand-800 con indicador brand-400 (§10.1) | `surface-brand-hover` = `brand-800`; `border-brand-indicator` = `brand-400`                                           | Agregados en F6-03 para `NavItem`; texto blanco 14.32:1; indicador y foco 6.42:1 sobre brand-900 y 5.30:1 sobre brand-800                                                 |
| Tonos `-800` de estado      | No definidos                                                | `success-800`, `warning-800`, `danger-800`, `info-800`                                                                | Hover y presionado de botones; extensión de producto                                                                                                                      |
| Fuente                      | Montserrat, fallback Inter/sistema (§7)                     | `--font-family-sans` con esa pila; Montserrat autoalojada (`@fontsource-variable/montserrat`, OFL) desde `styles.css` | La fuente oficial está pendiente (DEC-020). Desde el 24/10/2026 (D-03) se distribuye para que app, Storybook y CI se vean como la referencia aprobada; sin CDN de fuentes |

## Contraste WCAG 2.2 AA

Generado con `node scripts/check-contrast.mjs --markdown` el 12/10/2026 y regenerado el 16/10/2026 (F6-03: navegación sobre azul noche). Texto normal 4.5:1; texto grande, controles, foco y gráficos 3:1. Las razones se **truncan** a dos decimales (4.499 no cuenta como 4.5). La misma tabla se ve en Storybook, _Fundamentos/Colores › Contraste_.

| Primer plano                      | Fondo                               | Uso                                       | Tipo         |   Razón | Mínimo | Resultado                |
| --------------------------------- | ----------------------------------- | ----------------------------------------- | ------------ | ------: | -----: | ------------------------ |
| `text-default` #17212B            | `surface-default` #FFFFFF           | Texto principal                           | Texto normal | 16.29:1 |  4.5:1 | Cumple                   |
| `text-default` #17212B            | `surface-canvas` #F7F9FA            | Texto principal                           | Texto normal | 15.42:1 |  4.5:1 | Cumple                   |
| `text-default` #17212B            | `surface-subtle` #EDF0F3            | Texto principal                           | Texto normal | 14.24:1 |  4.5:1 | Cumple                   |
| `text-default` #17212B            | `surface-selected` #E4F5FD          | Texto principal                           | Texto normal | 14.56:1 |  4.5:1 | Cumple                   |
| `text-default` #17212B            | `surface-brand-subtle` #F4FBFE      | Texto principal                           | Texto normal | 15.57:1 |  4.5:1 | Cumple                   |
| `text-default` #17212B            | `surface-highlight` #9CD5EF         | Texto principal                           | Texto normal | 10.22:1 |  4.5:1 | Cumple                   |
| `text-strong` #101820             | `surface-default` #FFFFFF           | Texto de máxima jerarquía                 | Texto normal | 17.89:1 |  4.5:1 | Cumple                   |
| `text-muted` #556270              | `surface-default` #FFFFFF           | Texto auxiliar y metadatos                | Texto normal |  6.23:1 |  4.5:1 | Cumple                   |
| `text-muted` #556270              | `surface-canvas` #F7F9FA            | Texto auxiliar y metadatos                | Texto normal |  5.90:1 |  4.5:1 | Cumple                   |
| `text-muted` #556270              | `surface-subtle` #EDF0F3            | Texto auxiliar y metadatos                | Texto normal |  5.45:1 |  4.5:1 | Cumple                   |
| `text-muted` #556270              | `surface-selected` #E4F5FD          | Texto auxiliar y metadatos                | Texto normal |  5.57:1 |  4.5:1 | Cumple                   |
| `text-placeholder` #556270        | `surface-default` #FFFFFF           | Placeholder                               | Texto normal |  6.23:1 |  4.5:1 | Cumple                   |
| `text-brand` #04144C              | `surface-default` #FFFFFF           | Texto de marca y encabezados              | Texto normal | 17.36:1 |  4.5:1 | Cumple                   |
| `text-brand` #04144C              | `surface-highlight` #9CD5EF         | Texto de marca y encabezados              | Texto normal | 10.89:1 |  4.5:1 | Cumple                   |
| `text-brand` #04144C              | `surface-brand-subtle` #F4FBFE      | Texto de marca y encabezados              | Texto normal | 16.59:1 |  4.5:1 | Cumple                   |
| `text-link` #0455C4               | `surface-default` #FFFFFF           | Enlaces y acentos de acción               | Texto normal |  6.77:1 |  4.5:1 | Cumple                   |
| `text-link` #0455C4               | `surface-canvas` #F7F9FA            | Enlaces y acentos de acción               | Texto normal |  6.41:1 |  4.5:1 | Cumple                   |
| `text-link` #0455C4               | `surface-subtle` #EDF0F3            | Enlaces y acentos de acción               | Texto normal |  5.91:1 |  4.5:1 | Cumple                   |
| `text-link` #0455C4               | `surface-selected` #E4F5FD          | Enlaces y acentos de acción               | Texto normal |  6.05:1 |  4.5:1 | Cumple                   |
| `text-link` #0455C4               | `surface-brand-subtle` #F4FBFE      | Enlaces y acentos de acción               | Texto normal |  6.47:1 |  4.5:1 | Cumple                   |
| `text-link-hover` #033B97         | `surface-default` #FFFFFF           | Enlace en hover                           | Texto normal | 10.11:1 |  4.5:1 | Cumple                   |
| `text-inverse` #FFFFFF            | `surface-brand` #04144C             | Texto sobre azul noche                    | Texto normal | 17.36:1 |  4.5:1 | Cumple                   |
| `text-inverse` #FFFFFF            | `surface-brand-accent` #0455C4      | Texto sobre azul de acción                | Texto normal |  6.77:1 |  4.5:1 | Cumple                   |
| `text-inverse` #FFFFFF            | `surface-inverse` #17212B           | Aviso oscuro (sin conexión)               | Texto normal | 16.29:1 |  4.5:1 | Cumple                   |
| `text-inverse-muted` #C5E8F8      | `surface-brand` #04144C             | Texto secundario sobre azul noche         | Texto normal | 13.45:1 |  4.5:1 | Cumple                   |
| `text-inverse` #FFFFFF            | `surface-brand-hover` #06226F       | Destino activo de la barra lateral        | Texto normal | 14.32:1 |  4.5:1 | Cumple                   |
| `action-primary-fg` #FFFFFF       | `action-primary-bg` #0455C4         | Botón primario                            | Texto normal |  6.77:1 |  4.5:1 | Cumple                   |
| `action-primary-fg` #FFFFFF       | `action-primary-bg-hover` #033B97   | Botón primario                            | Texto normal | 10.11:1 |  4.5:1 | Cumple                   |
| `action-primary-fg` #FFFFFF       | `action-primary-bg-active` #06226F  | Botón primario                            | Texto normal | 14.32:1 |  4.5:1 | Cumple                   |
| `action-secondary-fg` #0455C4     | `action-secondary-bg` #FFFFFF       | Botón secundario                          | Texto normal |  6.77:1 |  4.5:1 | Cumple                   |
| `action-secondary-fg` #0455C4     | `action-secondary-bg-hover` #F4FBFE | Botón secundario                          | Texto normal |  6.47:1 |  4.5:1 | Cumple                   |
| `action-danger-fg` #FFFFFF        | `action-danger-bg` #B42318          | Botón destructivo                         | Texto normal |  6.57:1 |  4.5:1 | Cumple                   |
| `action-danger-fg` #FFFFFF        | `action-danger-bg-hover` #8F1C13    | Botón destructivo                         | Texto normal |  8.96:1 |  4.5:1 | Cumple                   |
| `status-success-fg` #16794D       | `status-success-bg` #E8F6EF         | Aviso o chip                              | Texto normal |  4.86:1 |  4.5:1 | Cumple                   |
| `status-success-fg` #16794D       | `surface-default` #FFFFFF           | Estado en tabla                           | Texto normal |  5.41:1 |  4.5:1 | Cumple                   |
| `text-inverse` #FFFFFF            | `status-success-emphasis` #16794D   | Insignia sólida                           | Texto normal |  5.41:1 |  4.5:1 | Cumple                   |
| `status-success-emphasis` #16794D | `surface-default` #FFFFFF           | Franja e icono de estado                  | UI / gráfico |  5.41:1 |    3:1 | Cumple                   |
| `status-warning-fg` #A15C00       | `status-warning-bg` #FFF4DB         | Aviso o chip                              | Texto normal |  4.74:1 |  4.5:1 | Cumple                   |
| `status-warning-fg` #A15C00       | `surface-default` #FFFFFF           | Estado en tabla                           | Texto normal |  5.18:1 |  4.5:1 | Cumple                   |
| `text-inverse` #FFFFFF            | `status-warning-emphasis` #A15C00   | Insignia sólida                           | Texto normal |  5.18:1 |  4.5:1 | Cumple                   |
| `status-warning-emphasis` #A15C00 | `surface-default` #FFFFFF           | Franja e icono de estado                  | UI / gráfico |  5.18:1 |    3:1 | Cumple                   |
| `status-danger-fg` #B42318        | `status-danger-bg` #FDECEA          | Aviso o chip                              | Texto normal |  5.74:1 |  4.5:1 | Cumple                   |
| `status-danger-fg` #B42318        | `surface-default` #FFFFFF           | Estado en tabla                           | Texto normal |  6.57:1 |  4.5:1 | Cumple                   |
| `text-inverse` #FFFFFF            | `status-danger-emphasis` #B42318    | Insignia sólida                           | Texto normal |  6.57:1 |  4.5:1 | Cumple                   |
| `status-danger-emphasis` #B42318  | `surface-default` #FFFFFF           | Franja e icono de estado                  | UI / gráfico |  6.57:1 |    3:1 | Cumple                   |
| `status-info-fg` #1769AA          | `status-info-bg` #EAF4FC            | Aviso o chip                              | Texto normal |  5.18:1 |  4.5:1 | Cumple                   |
| `status-info-fg` #1769AA          | `surface-default` #FFFFFF           | Estado en tabla                           | Texto normal |  5.77:1 |  4.5:1 | Cumple                   |
| `text-inverse` #FFFFFF            | `status-info-emphasis` #1769AA      | Insignia sólida                           | Texto normal |  5.77:1 |  4.5:1 | Cumple                   |
| `status-info-emphasis` #1769AA    | `surface-default` #FFFFFF           | Franja e icono de estado                  | UI / gráfico |  5.77:1 |    3:1 | Cumple                   |
| `status-nodata-fg` #59636E        | `status-nodata-bg` #F1F3F5          | Aviso o chip                              | Texto normal |  5.49:1 |  4.5:1 | Cumple                   |
| `status-nodata-fg` #59636E        | `surface-default` #FFFFFF           | Estado en tabla                           | Texto normal |  6.11:1 |  4.5:1 | Cumple                   |
| `text-inverse` #FFFFFF            | `status-nodata-emphasis` #59636E    | Insignia sólida                           | Texto normal |  6.11:1 |  4.5:1 | Cumple                   |
| `status-nodata-emphasis` #59636E  | `surface-default` #FFFFFF           | Franja e icono de estado                  | UI / gráfico |  6.11:1 |    3:1 | Cumple                   |
| `status-audit-fg` #6E46A5         | `status-audit-bg` #F3ECFA           | Aviso o chip                              | Texto normal |  5.90:1 |  4.5:1 | Cumple                   |
| `status-audit-fg` #6E46A5         | `surface-default` #FFFFFF           | Estado en tabla                           | Texto normal |  6.81:1 |  4.5:1 | Cumple                   |
| `text-inverse` #FFFFFF            | `status-audit-emphasis` #6E46A5     | Insignia sólida                           | Texto normal |  6.81:1 |  4.5:1 | Cumple                   |
| `status-audit-emphasis` #6E46A5   | `surface-default` #FFFFFF           | Franja e icono de estado                  | UI / gráfico |  6.81:1 |    3:1 | Cumple                   |
| `status-offline-fg` #007B83       | `status-offline-bg` #E4F6F7         | Aviso o chip                              | Texto normal |  4.52:1 |  4.5:1 | Cumple                   |
| `status-offline-fg` #007B83       | `surface-default` #FFFFFF           | Estado en tabla                           | Texto normal |  5.04:1 |  4.5:1 | Cumple                   |
| `text-inverse` #FFFFFF            | `status-offline-emphasis` #007B83   | Insignia sólida                           | Texto normal |  5.04:1 |  4.5:1 | Cumple                   |
| `status-offline-emphasis` #007B83 | `surface-default` #FFFFFF           | Franja e icono de estado                  | UI / gráfico |  5.04:1 |    3:1 | Cumple                   |
| `border-control` #71808F          | `surface-default` #FFFFFF           | Borde de campo                            | UI / gráfico |  4.04:1 |    3:1 | Cumple                   |
| `border-control` #71808F          | `surface-canvas` #F7F9FA            | Borde de campo                            | UI / gráfico |  3.83:1 |    3:1 | Cumple                   |
| `border-selected` #0455C4         | `surface-default` #FFFFFF           | Elemento seleccionado                     | UI / gráfico |  6.77:1 |    3:1 | Cumple                   |
| `action-primary-bg` #0455C4       | `surface-default` #FFFFFF           | Límite de botón                           | UI / gráfico |  6.77:1 |    3:1 | Cumple                   |
| `action-secondary-border` #0455C4 | `surface-default` #FFFFFF           | Límite de botón                           | UI / gráfico |  6.77:1 |    3:1 | Cumple                   |
| `focus-ring` #0455C4              | `surface-default` #FFFFFF           | Anillo de foco                            | UI / gráfico |  6.77:1 |    3:1 | Cumple                   |
| `focus-ring` #0455C4              | `surface-canvas` #F7F9FA            | Anillo de foco                            | UI / gráfico |  6.41:1 |    3:1 | Cumple                   |
| `focus-ring` #0455C4              | `surface-subtle` #EDF0F3            | Anillo de foco                            | UI / gráfico |  5.91:1 |    3:1 | Cumple                   |
| `focus-ring` #0455C4              | `surface-selected` #E4F5FD          | Anillo de foco                            | UI / gráfico |  6.05:1 |    3:1 | Cumple                   |
| `focus-ring-inverse` #35A6E8      | `surface-brand` #04144C             | Foco sobre azul noche                     | UI / gráfico |  6.42:1 |    3:1 | Cumple                   |
| `focus-ring-inverse` #35A6E8      | `surface-brand-hover` #06226F       | Foco sobre azul noche                     | UI / gráfico |  5.30:1 |    3:1 | Cumple                   |
| `border-brand-indicator` #35A6E8  | `surface-brand` #04144C             | Indicador del destino activo              | UI / gráfico |  6.42:1 |    3:1 | Cumple                   |
| `border-brand-indicator` #35A6E8  | `surface-brand-hover` #06226F       | Indicador del destino activo              | UI / gráfico |  5.30:1 |    3:1 | Cumple                   |
| `brand-300` #9CD5EF               | `white` #FFFFFF                     | Celeste hielo como texto, icono o borde   | UI / gráfico |  1.59:1 |    3:1 | No permitido (no cumple) |
| `brand-400` #35A6E8               | `white` #FFFFFF                     | Foco brand-400 sobre blanco (UI_UX §8.6)  | UI / gráfico |  2.70:1 |    3:1 | No permitido (no cumple) |
| `brand-500` #0878DD               | `white` #FFFFFF                     | brand-500 como texto normal               | Texto normal |  4.42:1 |  4.5:1 | No permitido (no cumple) |
| `neutral-500` #71808F             | `white` #FFFFFF                     | neutral-500 como placeholder (UI_UX §6.2) | Texto normal |  4.04:1 |  4.5:1 | No permitido (no cumple) |
| `neutral-400` #94A0AC             | `white` #FFFFFF                     | neutral-400 como borde de control         | UI / gráfico |  2.66:1 |    3:1 | No permitido (no cumple) |
| `border-default` #C2CAD2          | `surface-default` #FFFFFF           | Borde decorativo como límite de control   | UI / gráfico |  1.65:1 |    3:1 | No permitido (no cumple) |

## Escalas

| Grupo       | Valores                                                                                                                                       |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Espaciado   | `--space-0` a `--space-16`: 0, 4, 8, 12, 16, 20, 24, 32, 40, 48 y 64 px (en rem)                                                              |
| Radios      | `sm` 6, `md` 10, `lg` 14, `xl` 18 px; `pill` 999 px                                                                                           |
| Tamaños     | borde 1 y 2 px; foco 3 px con separación 2 px; área de toque 44 px                                                                            |
| Elevación   | `none`; `sm` (superficie apenas elevada); `md` (tarjetas sobre el fondo general, paneles flotantes); `lg` (modales, menús, tarjeta de acceso) |
| Movimiento  | `fast` 120, `base` 180, `slow` 240 ms; easing `standard`, `enter`, `exit`. Con `prefers-reduced-motion: reduce` las duraciones valen 0 ms     |
| Capas       | `base` 0, `raised` 10, `sticky` 100, `header` 200, `dropdown` 300, `floating` 400, `overlay` 500, `modal` 510, `toast` 600, `skip-link` 700   |
| Breakpoints | `sm` 30rem (480), `md` 48rem (768), `lg` 64rem (1024), `xl` 90rem (1440). En `@media` se escribe el valor en rem                              |

## Pendiente

- Aprobación de la tipografía (ADR-025, DEC-020); la paleta se aprobó el 15/10/2026.
- Modo oscuro: sin decisión (UI_UX §34).
