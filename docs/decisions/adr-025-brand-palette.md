# ADR-025 — Paleta de marca y dirección visual de ICE24 OS

Estado: **Aceptada** el 15/10/2026 (DEC-020 y DEC-023, alcance de dirección visual). Tipografía provisional.

| Campo | Valor |
| --- | --- |
| Decisiones | DEC-020 (paleta y tipografía de marca) y DEC-023 (prototipos), en su alcance de dirección visual |
| Fecha | 15/10/2026 |
| Proponente | Becario de desarrollo (Calixto Isaac) |
| Aprobadores | Axel Quevedo Zamudio y Eduardo Ramos (Dirección ICE24) |
| Evidencia | [Aprobación de identidad visual](../qa/phase-6/evidence/20261015-aprobacion-identidad-visual.md) |
| Afecta | F6-01 a F6-12, `context/UI_UX.md` §6, §7 y §8.6 |

## Contexto

`UI_UX.md` definía la paleta derivada de las referencias de marca (`ICE24.pdf`, `Landing page.pdf`, `Seleccion de máquinas 3D.pdf`) como propuesta pendiente de validación, y el estado de Fase 6 impedía integrar P1 sin la aprobación de marca. Para obtenerla se generó un prototipo visual (herramienta Lovable, solo frontend y datos ficticios) a partir de `UI_UX.md` y se presentó a Dirección con la página «Sistema de diseño» y la pantalla «Resumen del propietario».

## Decisión

1. **Paleta oficial (aprobada).** Anclajes `brand-900` #04144C (azul noche), `brand-600` #0455C4 (azul de acción), `brand-300` #9CD5EF (celeste hielo) y #FFFFFF; escalas `brand-50…950` y `neutral-50…950`, y los siete colores semánticos de `UI_UX.md` §6.3, sin cambios de valor.
2. **Foco (cambio aprobado respecto a UI_UX.md §8.6).** Anillo de 3 px separado 2 px: `brand-600` #0455C4 sobre fondos claros (≈ 6.8:1 frente a blanco) y `brand-400` #35A6E8 sobre `brand-900`/`brand-800`. Motivo: #35A6E8 sobre blanco queda por debajo del 3:1 exigido a límites de controles (§6.5).
3. **Dirección visual (aprobada como guía).** El prototipo es la referencia para generar el resto de pantallas: barra lateral `brand-900` con grupos por dominio, encabezado blanco con selector de contexto, búsqueda, sincronización, alertas y usuario; tarjetas KPI con icono en círculo tenue; tarjeta de alerta crítica fijada con «Marcar enterado» y «Atender»; tres chips independientes de estado de máquina (operación, técnico, sanitario) con icono + texto + color; banners por semántica; tablas con folios en monoespaciada; estado vacío con icono y acción.
4. **Tipografía provisional.** Montserrat (fallback Inter, system-ui) hasta recibir la fuente oficial; el logotipo se muestra como wordmark de texto hasta recibir el archivo maestro.

## Alcance y límites

- Se aprueba la **dirección**, no cada píxel: componentes, accesibilidad, estados de carga y error, móvil y textos se validan durante la Fase 6 y se firman en P10 (DEC-023 final).
- El código del prototipo **no** se incorpora al repositorio: usa otro stack y no aplica `authorize()`, contratos ni pruebas. Se reimplementa en `packages/ui` y `apps/private-web` con las reglas del proyecto.
- Los datos de las capturas son ficticios.
- Si el prototipo y `UI_UX.md` difieren en un valor, manda `UI_UX.md` (actualizado por este ADR).

## Alternativas descartadas

- Mantener #35A6E8 como foco universal: no cumple 3:1 sobre fondos claros.
- Aprobar solo la paleta y diferir la dirección visual a P10: retrasaría F6-03 a F6-09 sin referencia común.
- Integrar el código del prototipo: rompería fronteras, permisos y pruebas.

## Consecuencias

- P1 (F6-01/F6-02) deja de estar bloqueado: los tokens pasan de «provisionales no productivos» a aprobados, salvo la tipografía.
- F6-01 sigue debiendo demostrar el contraste con `scripts/check-contrast.mjs` y registrarlo en `docs/design-system/tokens.md`; si una combinación falla, se ajusta un tono intermedio sin tocar los cuatro anclajes y se informa a Dirección.
- Cambiar un anclaje o la dirección visual requiere nueva aprobación de Dirección y una revisión de este ADR.

## Pendientes

- Recibir la fuente oficial y el archivo maestro del logotipo (variantes clara e inversa).
- Exportar el proyecto del prototipo (zip) y guardarlo fuera del árbol compilado como referencia (ver evidencia).
