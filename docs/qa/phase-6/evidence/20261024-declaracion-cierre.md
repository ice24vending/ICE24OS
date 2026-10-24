# Declaración de cierre de Fase 6

Fecha: 24/10/2026 (America/Mexico_City). Elaborada por el agente de QA a partir de revisión del código y corridas reales sobre `baababe` (`origin/main` actualizado; PR #49), rama `chore/f6-gate`. F6-01…F6-12 están integradas. Este dictamen técnico **no sustituye la aprobación ni las firmas de los responsables**.

## Dictamen

**Rechazado.**

No se acredita el criterio completo de salida del Implementation Plan. F6-07 no implementa habilitación de módulos por cuenta (D-01) y falta evidencia de los cuatro flujos con lector de pantalla básico en móvil, tableta y escritorio (D-02). Son bloqueantes, no simples pendientes de marca. Una batería automatizada verde no resuelve estas brechas. La fase no se declara aprobada ni habilita salida por este documento.

## Batería ejecutada

Entorno: Windows, Node 24.19.0, pnpm 11.24.0, Docker 29.7.2. Revisión y versiones en [environment](20261024-f6-gate-environment.txt), códigos en [exitcodes](20261024-f6-gate-exitcodes.txt). `ICE24_BROWSER_TESTS=1`; `ICE24_STORAGE_ORIGIN=http://127.0.0.1:54329` para la compilación y las pruebas, como en la validación de F6-12. Datos locales y ficticios; no se invocan proveedores productivos.

| Comando                                       | Resultado                                                                                                                              | Evidencia                                                                                                                                                   |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                                  | Salida 0; 774/774 pruebas en 103 archivos; 0 fallidas, 0 omitidas                                                                      | [check](20261024-f6-gate-check.txt)                                                                                                                         |
| `pnpm build`                                  | Salida 0; 14/14 tareas (8 de caché); no es un contador de pruebas                                                                      | [build](20261024-f6-gate-build.txt)                                                                                                                         |
| `ICE24_BROWSER_TESTS=1 pnpm test:integration` | Salida 0; 151/151 pruebas en 19 archivos; 0 fallidas, 0 omitidas                                                                       | [integration](20261024-f6-gate-test-integration.txt), [capturas actuales](20261024-integration/README.md)                                                   |
| `pnpm test:ui`                                | Salida 0; 793/793 pruebas en 4 archivos, 15,8 min; 0 fallidas, 0 omitidas, 0 flaky                                                     | [UI](20261024-f6-gate-test-ui.txt), [reporte HTML comprimido](20261024-f6-gate-playwright-report.zip), [datos del reporte](20261024-f6-gate-ui-report.json) |
| `pnpm ux:snapshots`                           | Salida 0; 459 capturas (pantallas e historias, 375/768/1280 px); 0 observaciones ⚠                                                     | [galería](20261024-f6-gate-ux-snapshots.txt); `docs/qa/phase-6/ux-review/index.html` se genera localmente (ignorado por git)                                |
| `pnpm storybook:build`                        | Salida 0; «Storybook build completed successfully». Avisos no bloqueantes de Vite: chunks > 500 kB y directivas de módulo (O-02, baja) | [storybook](20261024-f6-gate-storybook-build.txt)                                                                                                           |

Desglose del reporte de UI: 7 recorridos de teclado, 186 estados de pantalla con axe (375/1280 px), 141 historias de Storybook con axe y 459 comparaciones visuales (375/768/1280 px). Cada grupo reporta 0 omitidas, 0 fallidas y 0 flaky. Descomprimir el ZIP y abrir `index.html` para consultar cada prueba; no se actualizaron las baselines.

El primer intento de `pnpm check` terminó con código 1 antes de ejecutar pruebas por resolución DNS de `registry.npmjs.org` en el entorno restringido: [log inicial](20261024-f6-gate-check-initial.txt). Se conservó y se reintentó con acceso habilitado; no es un fallo de producto. Los números históricos de F6-12 no se reutilizan como resultados de este cierre.

## Escenarios del cierre

| Escenario                                                                                                                       | Resultado                  | Pruebas principales                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Design system usable                                                                                                            | Parcial                    | Tokens, componentes base/dominio, catálogo de historias y tests; firma final pendiente                        |
| Navegación privada responsive sin revelar destinos no autorizados                                                               | Parcial                    | Permisos/MFA, DOM sin enlaces denegados y denegación por URL; falta habilitación de módulos por cuenta (D-01) |
| Estados globales coherentes                                                                                                     | Cobertura implementada     | `SystemState`, matrices, pruebas de estados y layouts; resultado de ejecución en la batería                   |
| Base lista para módulos funcionales                                                                                             | Parcial                    | API de componentes reutilizable, callbacks y tokens; no se autoriza el cierre con D-01/D-02 abiertos          |
| Autenticación, cambio de contexto, dashboard vacío y navegación por rol en móvil/tableta/escritorio con teclado y lector básico | No acreditado por completo | Automatización de integración/teclado/visual; pendiente lector real y matriz completa de recorridos (D-02)    |

Los cuatro riesgos del plan se auditaron en código: reutilización mediante props/callbacks, navegación desde capacidades, axe desde el catálogo y CI, y layout de campo específico con controles de 64 px y acciones inferiores. Detalle, archivos, pruebas y requisitos PRD/TRD/UI_UX/AppFlow por tarea en la [matriz](../traceability.md).

## Verificado localmente frente a pendientes externos

Integración comprobada en el [historial actualizado de main](20261024-f6-gate-commits.txt): F6-01/F6-02 #37; F6-03 #40; F6-04 #42; F6-05 #43; F6-06/F6-07 #44; F6-08 #45; F6-09/F6-10 #47; F6-11 #48; F6-12 #49. La aprobación de paleta fue registrada por Dirección el 15/10/2026 en [ADR-025](../../../decisions/adr-025-brand-palette.md); **no está pendiente**.

| Pendiente                                                  | Referencia                      | Efecto / responsable                                                                        |
| ---------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------- |
| Habilitación de módulos por cuenta                         | D-01, F6-07                     | Bloqueante; Tech Lead / Producto deben implementar y probar o tramitar excepción formal §27 |
| Recorridos con lector de pantalla básico                   | D-02, criterio de salida Fase 6 | Bloqueante; UX / QA deben completar los 12 cruces flujo/dispositivo del formulario          |
| Tipografía y logo oficiales                                | DEC-020 / ADR-025               | Dirección / Marketing; Montserrat y wordmark provisionales                                  |
| Firma final de pantallas y revisión de baselines           | DEC-023                         | Dirección / Producto / UX; llenar [ux-signoff](../ux-signoff.md)                            |
| Navegadores y dispositivos definitivos                     | DEC-018                         | UX / Tech Lead; tamaños de viewport no sustituyen dispositivos reales                       |
| Configurar y acreditar `ui-quality` como requerido en main | F6-12                           | Administrador del repositorio; configuración remota no verificada aquí                      |
| Habilitación segura del demo en Preview                    | F6-00                           | Tech Lead / Seguridad; demo de desarrollo y artefactos locales disponibles                  |

## Límites

- Gate documental: no cambia código de aplicación, contratos, migraciones, autorización ni datos. No modifica baselines ni desactiva pruebas. Sin impacto funcional de seguridad o rendimiento introducido por esta tarea.
- Axe bloquea violaciones serias/críticas; no demuestra conformidad WCAG completa. La excepción A-01 del catálogo excluye exclusivamente contraejemplos deliberados de contraste. La revisión automatizada de pantallas usa 375/1280 px; visual usa también 768 px.
- La UI visual corre sobre demo con `next dev`; no acredita comportamiento de proveedores ni dispositivos físicos. Integración usa web compilada. No se declara CI remoto verde ni aprobación humana a partir de una corrida local.
- No se ejecutaron lector de pantalla, zoom 200 %, luz exterior ni guantes. El formulario incluye instrucciones para completar el criterio obligatorio; las demás revisiones siguen como límites explícitos.
- D-01 y D-02, severidad alta/bloqueante, quedan abiertos. O-01, severidad baja, identifica referencias antiguas a UI_UX §19 en documentos de a11y; la sección vigente es §21. O-02, severidad baja, registra los avisos de tamaño de chunk y directivas de módulo en `pnpm storybook:build`; no afectan el resultado.
- Archivos entregados: matriz, declaración, formulario UX, logs de ejecución y actualización de `docs/backlog/phase-6-status.md`. Sin archivos fuente eliminados. Para reconsiderar el dictamen: cerrar defectos, repetir las verificaciones afectadas, adjuntar evidencia manual y obtener firmas.

## Firmas de responsables

Las firmas siguientes están pendientes. Firmar recepción de este dictamen rechazado no transforma el resultado en aprobado; cualquier excepción requiere el procedimiento de PROJECT_RULES §27.

| Responsable / cargo       | Nombre                        | Dictamen aceptado / observaciones | Firma | Fecha |
| ------------------------- | ----------------------------- | --------------------------------- | ----- | ----- |
| Dirección ICE24           | Axel Quevedo Zamudio          |                                   |       |       |
| Dirección ICE24 / Sponsor | Eduardo Ramos                 |                                   |       |       |
| Tech Lead / QA            | Calixto Isaac Galeana Medrano |                                   |       |       |
| Producto / UX             |                               |                                   |       |       |
