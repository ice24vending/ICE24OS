# Referencia visual aprobada — prototipo Lovable

Exportación del prototipo con el que Dirección aprobó la identidad visual el 15/10/2026 ([ADR-025](../../decisions/adr-025-brand-palette.md), [evidencia](../../qa/phase-6/evidence/20261015-aprobacion-identidad-visual.md)). Recibida el 16/10/2026.

## Reglas de uso

- **Solo lectura y solo referencia.** La carpeta `lovable-prototype/` no es un workspace (`pnpm-workspace.yaml` solo incluye `apps/*` y `packages/*`) y está excluida de ESLint y Prettier. No se instala, no se compila y no se importa desde `apps/` ni `packages/`.
- **No se copia código.** El prototipo usa TanStack Start, Tailwind 4 y shadcn/ui, guarda todo en memoria y decide permisos en el cliente (`canAccess`). ICE24 OS reimplementa cada pieza en `packages/ui` y `apps/private-web` con sus tokens, `authorize()`, contratos y pruebas.
- **Qué sí se toma:** valores de tokens, proporciones, jerarquía, composición de pantallas y patrones (ver abajo).
- **Precedencia:** `context/UI_UX.md` > ADR-025 > este prototipo. Si difieren, gana `UI_UX.md` y la diferencia se anota en el reporte de la tarea.
- **Datos ficticios.** `src/data/ice24.ts` y la imagen `src/assets/ice-machine.jpg` son de demostración; no se usan en el producto.
- `LOVABLE_AGENTS.md` es el archivo de instrucciones de la herramienta, renombrado para que ningún agente lo tome como instrucción del repositorio.

## Dónde mirar

| Qué                                                             | Archivo del prototipo                                                                                                                                                     |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tokens y estilos de todos los componentes                       | `src/styles.css`                                                                                                                                                          |
| Shell (barra lateral, encabezado, navegación móvil, panel Demo) | `src/components/ice24/shell.tsx`                                                                                                                                          |
| Primitivas (Status, Banner, Empty, Loading, Sync)               | `src/components/ice24/primitives.tsx`                                                                                                                                     |
| Pantallas                                                       | `src/components/ice24/screens.tsx`, `login.tsx`                                                                                                                           |
| Galería del sistema de diseño                                   | `src/components/ice24/design-system.tsx`                                                                                                                                  |
| Rutas                                                           | `src/routes/*.tsx` (resumen, sucursales y detalle, máquinas y detalle, mantenimiento, tareas, sanidad, documentos, suscripción, auditoría, alertas, login, design-system) |

## Tokens: coincidencia con UI_UX.md

Verificado el 16/10/2026: los 11 tonos `brand`, los 11 `neutral`, blanco y los 7 semánticos (base, fondo suave y borde) de `src/styles.css` coinciden **exactamente** con `UI_UX.md` §6. Radios 6/10/14/18 px como §8.5. Barra lateral de 264 px (colapsada 72 px) y encabezado de 80 px dentro de §10.1.

Semánticos que define el prototipo y conviene conservar en F6-02: `primary` = brand-600, `secondary` = brand-100 / texto brand-900, `muted` = neutral-100 / texto neutral-600, `accent` = brand-50, `border`/`input` = neutral-200, `background` = neutral-50, `card` = blanco, `sidebar` = brand-900, `overlay` = brand-950 al 65 %, sombra flotante brand-950 al 14 %.

## Diferencias que se corrigen al implementar

| #   | En el prototipo                                                                                                                  | Cómo debe quedar                                                                                                                                                                     | Tarea        |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| D1  | `--ring` y `:focus-visible` usan brand-400 en todo el sistema                                                                    | brand-600 sobre fondos claros y brand-400 sobre brand-900/800 (ADR-025). **Resuelto** en P1 (`focus-ring` / `focus-ring-inverse`)                                                    | F6-02 ✓      |
| D2  | Texto base de 14 px y textos de 9–11 px (etiquetas de navegación, pies de KPI, encabezados de tabla, chips, navegación inferior) | Escala de `UI_UX.md` §7.1: cuerpo 16 px en formularios, 14 px en tablas y metadatos, mínimo 12 px (`caption`, `label-sm`). Mantener proporciones y jerarquía, no los tamaños menores | F6-02, F6-03 |
| D3  | Barra de modo lectura en colores de advertencia; el banner de la galería la muestra en neutro                                    | Un solo tratamiento para modo lectura; decidir en F6-04 y aplicarlo igual en barra y banner                                                                                          | F6-04        |
| D4  | Monoespaciada `SFMono-Regular, Consolas`                                                                                         | Usar la pila monoespaciada de los tokens de P1                                                                                                                                       | F6-03        |
| D5  | Puntos de quiebre 600/800/1100 px                                                                                                | Usar los breakpoints de los tokens de P1, alineados con DEC-018 (galería en 375/768/1280)                                                                                            | F6-06        |
| D6  | Permisos y menú decididos en el cliente (`canAccess`)                                                                            | Navegación a partir de los permisos que entrega la API (`authorize()`), sin mostrar módulos no autorizados                                                                           | F6-07        |
| D7  | Wordmark de texto «ICE24 OS»                                                                                                     | Provisional hasta el archivo maestro del logotipo                                                                                                                                    | F6-06        |
| D8  | Montserrat cargada sin fuente oficial                                                                                            | Provisional (ADR-025)                                                                                                                                                                | DEC-020      |

## Patrones a replicar

Barra lateral brand-900 por grupos con destino activo en brand-800 e indicador brand-400; encabezado blanco con borde brand-200, selector de contexto, búsqueda, sincronización, alertas con contador y avatar; tarjetas KPI con icono en recuadro tenue según semántica; tarjeta de alerta crítica fijada con «Marcar enterado» y «Atender»; tres chips independientes de máquina con icono; filas de tareas con chip de prioridad; tablas con folios en monoespaciada y pie de paginación; tablas convertidas en tarjetas en móvil; navegación inferior de cinco destinos con indicador superior brand-600; estado vacío con icono brand-600 y acción primaria; skeleton sin movimiento cuando `prefers-reduced-motion`.
