# Quality gate de interfaz: accesibilidad y regresión visual

TASK-F6-12. Workflow `.github/workflows/ui-quality.yml`, job **`ui-quality`**. Corre en cada PR y en cada push a `main`.

## Qué revisa

| Prueba                              | Dónde                                      | Qué falla el check                                                                                                                                                                                           |
| ----------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Accesibilidad de pantallas          | `tests/e2e/accessibility/screens.spec.ts`  | Una violación **seria o crítica** de WCAG 2.2 AA (axe, etiquetas `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`) en cualquier ruta y estado de `tests/visual/ux-review.routes.ts`, a 375 y 1280 px   |
| Accesibilidad del sistema de diseño | `tests/e2e/accessibility/stories.spec.ts`  | Lo mismo en cada historia del Storybook compilado                                                                                                                                                            |
| Teclado                             | `tests/e2e/accessibility/keyboard.spec.ts` | «Ir al contenido», el menú recorrido con Tab y foco visible, el drawer, el selector de contexto (foco atrapado, Escape, foco devuelto), el diálogo de cambios no guardados y los errores del flujo por pasos |
| Regresión visual                    | `tests/visual/screens.visual.ts`           | Una pantalla (ruta × estado × 375/768/1280 px) o una matriz o fundamento de Storybook distinta de su baseline aprobada en `tests/visual/__screenshots__`                                                     |

Las rutas son las mismas de la galería (`pnpm ux:snapshots`). Cada pantalla nueva que se agrega a `ux-review.routes.ts` entra sola en las tres pruebas, y cada historia nueva de Storybook también.

No se desactiva ninguna regla de axe. Una excepción inevitable se justifica en [a11y-exceptions.md](a11y-exceptions.md).

## Sin falsos positivos

- **Datos y fechas congelados**: la web corre en modo demo (datos ficticios fijos). El reloj del servidor se congela en `2026-10-20T16:00:00Z` (`scripts/ui-quality/frozen-clock.mjs`, solo en `pnpm test:ui`) y el del navegador en la misma hora (`page.clock.setFixedTime`); así coinciden las fechas y los «hace N min». La zona horaria es `America/Mexico_City` y el idioma `es-MX`.
- **Lo que cambia en cada visita se tapa**: el folio de soporte de «sin permiso por URL» es un identificador nuevo en cada visita, así que se cubre con un rectángulo de color (`mask` en `tests/visual/screens.visual.ts`). Su texto lo validan las pruebas de integración.
- **Animaciones desactivadas** (`animations: "disabled"`, `reducedMotion: "reduce"`). Se espera a `document.fonts.ready` antes de capturar.
- **El mismo entorno que CI**: las baselines se generan en el contenedor oficial `mcr.microsoft.com/playwright:v1.62.1-noble`, el mismo en el que corre el job. Así las fuentes y el suavizado coinciden píxel a píxel.
- La tolerancia es mínima (`maxDiffPixelRatio: 0.001`, una milésima de los píxeles), para absorber solo el ruido del suavizado.

## Cómo correrlo

```bash
pnpm storybook:build   # una vez, o después de cambiar historias
pnpm test:ui           # accesibilidad + regresión visual
pnpm test:ui -- --project=accessibility   # solo una parte
```

En Windows y macOS, `pnpm test:ui` corre dentro de Docker (Docker Desktop encendido): copia el repositorio sin `node_modules`, instala para Linux, compila y prueba. El reporte queda en `playwright-report/` (`pnpm exec playwright show-report`). La primera vez tarda más porque descarga la imagen, Node 24.19 y las dependencias; después usa el volumen `ice24-ui-quality-cache`. En Linux corre directo.

## Actualizar las baselines

Cuando un cambio de pantalla es **intencional**:

```bash
pnpm test:ui:update
```

El comando reescribe `tests/visual/__screenshots__` con las capturas nuevas, generadas en el contenedor. Después se hace commit de los PNG que cambiaron, junto con el código que cambió la pantalla.

**Un cambio de baseline requiere aprobación UX en el PR.** Quien revisa UX abre el reporte del job, compara cada pantalla cambiada (ver «Cómo leer un diff visual») y aprueba el PR con un comentario que diga qué pantallas aprobó. Sin esa aprobación no se integra, aunque el check esté en verde: con las baselines nuevas el check pasa, así que la aprobación humana es la que decide.

## Cómo leer un diff visual

1. En el PR › **Checks** › **UI quality** › **Summary** › **Artifacts**, descargar `playwright-report` y descomprimirlo.
2. Abrirlo: `pnpm exec playwright show-report <carpeta>`, o servir la carpeta y abrir `index.html`.
3. Las pruebas que fallaron aparecen arriba, en rojo. El nombre dice la pantalla, el estado y el tamaño (por ejemplo, «Escritorio 1280 › Plantilla · Lista · Con datos»).
4. Al abrir una, la sección **Image mismatch** tiene cuatro vistas:
   - **Expected**: la pantalla aprobada.
   - **Actual**: cómo se ve con el cambio.
   - **Diff**: la pantalla en gris claro, con **en rojo los píxeles que cambiaron**.
   - **Side by side** y **Slider**: las dos versiones juntas, o una encima de la otra con una barra que se arrastra.
5. Decidir:
   - **Aprobar** si el cambio rojo es justo lo que el PR dice que cambia, y el resto de la pantalla quedó igual.
   - **Rechazar** si algo cambió sin estar en la descripción del PR, si un texto se cortó o encimó, si se perdió contraste o un estado (error, vacío, sin permiso), o si en celular aparece desplazamiento horizontal.
6. Si se aprueba, el autor corre `pnpm test:ui:update` y sube las baselines. Si se rechaza, se corrige el código.

## Protección de rama

En GitHub › **Settings** › **Branches** › regla de `main` › **Require status checks to pass before merging**, marcar como requeridos:

| Check         | Workflow         |
| ------------- | ---------------- |
| `quality`     | `ci.yml`         |
| `integration` | `ci.yml`         |
| `ui-quality`  | `ui-quality.yml` |

`ui-quality` sustituye al antiguo job `ux-review` de `ci.yml`: publica los mismos artefactos (`ux-review-gallery` y `storybook-static`) y además `playwright-report`. Si `ux-review` estaba marcado como requerido, hay que quitarlo de la regla, porque ya no se ejecuta.
