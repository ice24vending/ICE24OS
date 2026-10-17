# TASK-F6-01 — Validar paleta propuesta contra la identidad ICE24

Estado: implementada el 12/10/2026 en la rama `feat/f6-01-02-brand-tokens`, creada desde `main` `c10c137` (F6-00 integrada por #36). Entregada junto con [F6-02](task-f6-02.md) (prompt P1). Paleta **aprobada** por Dirección el 15/10/2026 (DEC-020, [ADR-025](../decisions/adr-025-brand-palette.md)); tipografía provisional.

## Objetivo y criterio

Validar la paleta de UI_UX §6 contra los anclajes de marca y WCAG 2.2 AA, y registrarla como decisión. El criterio «tokens de marca aprobados» **no se cumple todavía**: requiere la firma de Dirección/Marketing.

## Entregables

| Entregable          | Resultado                                                                                                                                                                                                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Script reproducible | `scripts/check-contrast.mjs` (`pnpm check:contrast`, parte de `pnpm check`). Lee `tokens.css`, resuelve cada token semántico y evalúa las combinaciones de `packages/ui/src/tokens/contrast.ts`; `--markdown` genera la tabla de la documentación y `--verbose` lista todas |
| Resultados          | [Tokens del ICE24 Design System](../design-system/tokens.md#contraste-wcag-22-aa): 70 combinaciones en uso, todas cumplen; 6 combinaciones prohibidas documentadas                                                                                                          |
| Decisión            | [ADR-025](../decisions/adr-025-brand-palette.md) con responsable, fecha, alcance, alternativas descartadas, consecuencias y bloque de aprobación vacío                                                                                                                      |

## Escenarios y resultados

| Escenario                      | Datos                                                                                                           | Resultado                                                                                                |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Anclajes de marca (UI_UX §6.5) | Blanco sobre `brand-600`; `brand-900` sobre blanco y sobre `brand-300`                                          | 6.77, 17.36 y 10.89:1, coinciden con los valores citados (6.8, 17.4 y 10.9)                              |
| Texto, enlaces y acciones      | 41 combinaciones sobre superficies y botones                                                                    | Mínimo 5.45:1 (texto auxiliar sobre `surface-subtle`)                                                    |
| Estados (7 tonos × 4 usos)     | Texto sobre fondo suave y sobre blanco, insignia sólida, franja                                                 | Mínimo 4.52:1 (`offline` sobre su fondo)                                                                 |
| Controles y foco (3:1)         | Bordes de campo, selección, límites de botón y anillo de foco                                                   | Mínimo 3.83:1 (borde de campo sobre `surface-canvas`)                                                    |
| Combinaciones prohibidas       | `brand-300`, `brand-400`, `brand-500`, `neutral-500` y `neutral-400` sobre blanco; borde decorativo como límite | 1.59 a 4.42:1: no cumplen, y el script falla si alguna empieza a cumplir sin actualizar la documentación |

## Defectos encontrados en la propuesta de UI_UX

| ID  | Severidad                         | Defecto                                                           | Resolución provisional                                            |
| --- | --------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------- |
| D1  | Alta (WCAG 1.4.11)                | Anillo de foco `brand-400` sobre blanco: 2.70:1                   | `focus-ring` = `brand-600`; `brand-400` solo sobre azul noche     |
| D2  | Media (WCAG 1.4.3)                | Placeholder `neutral-500` sobre blanco: 4.04:1                    | `text-placeholder` = `neutral-600` (6.23:1)                       |
| D3  | Media (WCAG 1.4.11)               | Sin token de borde de control; `neutral-300/400` no llegan a 3:1  | `border-control` = `neutral-500` (4.04:1)                         |
| D4  | Baja                              | Borde estándar `neutral-200` (§8.6) frente a `neutral-300` (§6.2) | `border-default` = `neutral-300`, `border-subtle` = `neutral-200` |
| D5  | Media (WCAG 1.4.11, ya existente) | Campos de auditoría, trabajos y panel demo con borde ≈ 1.6:1      | Migrados a `border-control`                                       |

Los cambios a UI_UX quedan como lista en ADR-025 (Consecuencias); los documentos de autoridad no se editan.

## Archivos

Nuevos: `scripts/check-contrast.mjs`, `scripts/check-contrast.test.mjs`, `packages/ui/src/tokens/contrast.ts`, `docs/design-system/tokens.md`, `docs/decisions/adr-025-brand-palette.md`, este reporte. El resto de archivos de P1 está en [F6-02](task-f6-02.md#archivos).

## Pruebas

`scripts/check-contrast.test.mjs` (9 pruebas): luminancia y razón con valores de referencia (negro/blanco 21:1, `#777777` 4.48:1), simetría, valores de UI_UX §6.5, resolución de `var()` encadenados, rechazo de tokens desconocidos, ciclos y colores translúcidos, truncado (4.48 no pasa), inversión del veredicto de pares prohibidos y la evaluación completa de los tokens reales.

## Validación ejecutada

Véase [F6-02](task-f6-02.md#validación-ejecutada): un único conjunto de comandos para P1.

## Riesgos y deuda

- Si marca cambia un anclaje, la prueba de anclajes y varias combinaciones deben revisarse; el script indica cuáles.
- La galería y Storybook muestran la paleta provisional; un revisor podría tomarla por definitiva. Cada página de Fundamentos lleva el aviso «Provisional no productiva».

## Validación manual pendiente

1. Dirección/Marketing responde la pregunta de aprobación y firma ADR-025 (DEC-020).
2. Revisión con el manual de marca oficial cuando exista.
