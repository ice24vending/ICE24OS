# ADR-025 — Paleta de marca y tokens del ICE24 Design System

Fecha: 12/10/2026. Estado: **provisional no productiva — pendiente de aprobación de marca**.

| Campo | Valor |
| --- | --- |
| Responsable proponente | Tech Lead (implementación F6-01/F6-02) |
| Responsable de aprobación (RACI) | Dirección/Marketing (DEC-020) |
| Decisión abierta asociada | [DEC-020](../backlog/open-decisions.md) — Marca, tipografía, logo y white label |
| Tareas | [TASK-F6-01](../tasks/task-f6-01.md), [TASK-F6-02](../tasks/task-f6-02.md) |
| Catálogo | [Tokens del ICE24 Design System](../design-system/tokens.md) |

## Aprobación de marca

| Campo | Valor |
| --- | --- |
| Aprobado por (nombre y cargo) | |
| Fecha | |
| Resultado (aprobada / aprobada con cambios / rechazada) | |
| Cambios solicitados | |

Mientras este bloque esté vacío, la paleta y la tipografía son provisionales: se usan en desarrollo, Storybook y la galería de revisión, y el PR de P1 no se integra a `main` (estado de la Fase 6).

## Contexto

UI_UX.md §6 deriva la paleta de tres referencias visuales (`ICE24.pdf`, `Landing page.pdf`, `Seleccion de máquinas 3D.pdf`) y fija cuatro anclajes: azul noche `#04144C`, azul de acción `#0455C4`, celeste hielo `#9CD5EF` y blanco. Los tonos intermedios son extensiones de producto que deben cotejarse con el manual de marca oficial, que todavía no existe. La tipografía (Montserrat) es una aproximación porque los PDF convierten el texto en formas.

Hasta F5-15 la web privada usaba diez variables propias (`--color-info: #0b5cab`, etc.) y unos 60 colores escritos a mano, sin relación con los anclajes de marca.

## Decisión

1. **Paleta.** Se adoptan sin cambios los valores de UI_UX §6.1 (marca), §6.2 (neutros) y §6.3 (estados: éxito, advertencia, error, información, sin datos, auditoría y sin conexión). Se agregan solo los tonos `-800` de éxito, advertencia, error e información para hover y presionado, y tres tonos translúcidos para velo y sombras.
2. **Dos capas.** Los componentes consumen tokens semánticos (`surface`, `text`, `border`, `action`, `focus`, `status`, `overlay`) que apuntan a la paleta. Un ajuste de marca cambia un valor primitivo sin tocar componentes.
3. **Fuente única en TypeScript.** `packages/ui/src/tokens` genera `tokens.css` y exporta objetos tipados. Se rechazan los colores escritos a mano fuera de esa carpeta (`pnpm check:colors`).
4. **Contraste verificable.** `pnpm check:contrast` evalúa 70 combinaciones en uso contra WCAG 2.2 AA y 6 combinaciones prohibidas. Todas las combinaciones en uso cumplen.
5. **Desviaciones de UI_UX por contraste**, propuestas para incorporarlas al documento:
   - Anillo de foco en `brand-600` sobre superficies claras; `brand-400` (2.70:1 sobre blanco) solo sobre azul noche (6.42:1).
   - Placeholder en `neutral-600` en lugar de `neutral-500` (4.04:1).
   - Borde de controles en `neutral-500`; `neutral-300`/`neutral-400` quedan para bordes decorativos.
6. **Solo tema claro.** El modo oscuro sigue abierto (UI_UX §34, pregunta 8).
7. **Tipografía.** Se declara la pila `Montserrat, Inter, system-ui, …` sin distribuir archivos de fuente; la fuente oficial llega con DEC-020.

## Alternativas descartadas

| Alternativa | Motivo |
| --- | --- |
| Conservar las variables de F5-15 (`#0b5cab` como azul principal) | No son colores de marca; no cubren estados, superficies ni foco |
| Derivar una escala nueva con una herramienta (por ejemplo OKLCH automático) | Alteraría tonos ya documentados en UI_UX sin aprobación de marca |
| Mantener `brand-400` como anillo de foco en todas las superficies | No cumple 3:1 sobre blanco (WCAG 1.4.11) |
| Librería de tokens (Style Dictionary u otra) | Dependencia nueva para un problema que resuelven ~150 líneas tipadas; la política de dependencias exige justificarla |
| CSS como fuente y TypeScript derivado | El TypeScript da tipos, pruebas y valores para metadatos (`themeColor`) sin un parser de CSS |
| Incluir tema oscuro | No está pedido; duplicaría la validación de contraste sin decisión de producto |

## Consecuencias

- **Visuales.** La web privada pasa del azul `#0b5cab` al azul de acción de marca `#0455C4`; el panel de acceso usa azul noche; los campos de auditoría, trabajos y el panel demo ganan un borde con contraste 4.04:1 (antes ≈ 1.6:1). El comportamiento de F5-15 (estados, permisos, flujos) no cambia.
- **Documentos afectados** (cambios pendientes, sin editar los documentos de autoridad):
  - UI_UX §6.2: placeholder en `neutral-600`.
  - UI_UX §6.5 y §8.6: anillo de foco `brand-600` sobre fondos claros.
  - UI_UX §6.2 / §8.6: aclarar si el borde estándar es `neutral-200` o `neutral-300`.
  - UI_UX §6.3: tonos `-800` de estados.
- **Si marca rechaza o cambia tonos:** se editan `primitives.ts`, se ejecuta `pnpm tokens:generate` y `pnpm check:contrast` indica qué combinaciones dejan de cumplir. Los anclajes están protegidos por una prueba que también debe actualizarse.
- **Pendientes:** fuente oficial y logotipo (DEC-020), modo oscuro, normalización de media queries fuera de la escala (F6-06).
