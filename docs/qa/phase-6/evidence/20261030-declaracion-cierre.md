# Declaración de cierre de Fase 6

Fecha: 30/10/2026 (America/Mexico_City). Reemplaza el [dictamen rechazado del 24/10/2026](20261024-declaracion-cierre.md). Batería ejecutada sobre `main` en `fa28b83` (#58), rama `chore/f6-gate-close`. F6-01…F6-12 integradas; correcciones del gate integradas en #51–#58.

## Dictamen

**Aprobado con excepción EXC-F6-01.**

Los defectos D-01 y D-03 del gate anterior están cerrados y la batería completa termina en verde. D-02 (recorridos con lector de pantalla básico) no se acredita: queda diferido por la [excepción EXC-F6-01](20261030-excepcion-d02.md) conforme a PROJECT_RULES §27, con retiro obligatorio antes de la primera UI productiva y, como máximo, en el gate de salida de la Fase 7. Ninguna parte de este documento afirma que esos recorridos se hayan realizado.

## Defectos del gate del 24/10/2026

| ID   | Resultado    | Evidencia                                                                                                                                                                                                                      |
| ---- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D-01 | **Cerrado**  | #51: habilitación de módulos por cuenta, auditada, con pruebas negativas en `tests/integration/ui-services.test.ts`; ver [complemento D-01](../../../tasks/task-f6-07.md#complemento-d-01--habilitación-de-módulos-por-cuenta) |
| D-02 | **Diferido** | [EXC-F6-01](20261030-excepcion-d02.md); las 12 filas de lector siguen pendientes en [ux-signoff](../ux-signoff.md)                                                                                                             |
| D-03 | **Cerrado**  | #52, #53, #54, #55, #56 y #58; aprobación visual de Dirección del 30/10/2026 en [ux-signoff](../ux-signoff.md)                                                                                                                 |
| O-01 | **Cerrado**  | `docs/tasks/task-f6-12.md` cita UI_UX §21 (accesibilidad)                                                                                                                                                                      |
| O-02 | Abierto      | Baja; pasa a la Fase 7                                                                                                                                                                                                         |

## Batería ejecutada

Entorno: Windows, Node, pnpm, Docker y revisión en [environment](20261030-f6-gate-environment.txt); códigos en [exitcodes](20261030-f6-gate-exitcodes.txt); commits desde el gate anterior en [commits](20261030-f6-gate-commits.txt). `ICE24_BROWSER_TESTS=1`; `ICE24_STORAGE_ORIGIN=http://127.0.0.1:54329` para la compilación y las pruebas. Datos locales y ficticios; no se invocan proveedores productivos.

| Comando                                       | Resultado                                                                                       | Evidencia                                            |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `pnpm check`                                  | Salida 0; 790/790 pruebas en 106 archivos                                                       | [check](20261030-f6-gate-check.txt)                  |
| `pnpm build`                                  | Salida 0; 14/14 tareas                                                                          | [build](20261030-f6-gate-build.txt)                  |
| `ICE24_BROWSER_TESTS=1 pnpm test:integration` | Salida 0; 153/153 pruebas en 19 archivos                                                        | [integration](20261030-f6-gate-test-integration.txt) |
| `pnpm test:ui`                                | Salida 0; 838/838 (accesibilidad con axe, teclado y regresión visual a 375/768/1280 px), 17 min | [UI](20261030-f6-gate-test-ui.txt)                   |
| `pnpm ux:snapshots`                           | Salida 0; 486 capturas; 0 observaciones ⚠                                                       | [galería](20261030-f6-gate-ux-snapshots.txt)         |
| `pnpm storybook:build`                        | Salida 0; mismo aviso no bloqueante de chunks > 500 kB (O-02)                                   | [storybook](20261030-f6-gate-storybook-build.txt)    |

En CI, el PR #58 terminó con `quality`, `integration` y `ui-quality` en verde antes de su fusión. No se actualizaron baselines durante esta batería.

## Escenarios del criterio de salida

| Escenario                                                                                                  | Resultado                                                                |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Design system usable                                                                                       | Cumplido: tokens, componentes, catálogo y aprobación visual de Dirección |
| Navegación privada responsive sin revelar destinos no autorizados                                          | Cumplido: permisos, MFA y módulos habilitados (D-01, #51)                |
| Estados globales coherentes                                                                                | Cumplido: `SystemState`, matrices y pruebas de estados                   |
| Base lista para módulos funcionales                                                                        | Cumplido: APIs de componentes reutilizables y layouts                    |
| Autenticación, contexto, dashboard vacío y navegación por rol en tres tamaños, con teclado y lector básico | Teclado y tamaños automatizados; **lector diferido por EXC-F6-01**       |

## Pendientes que pasan a la Fase 7

| Pendiente                                                | Referencia        | Responsable                   |
| -------------------------------------------------------- | ----------------- | ----------------------------- |
| 12 recorridos con lector de pantalla (retirar EXC-F6-01) | D-02, EXC-F6-01   | Tech Lead / QA                |
| Tipografía y logotipo oficiales                          | DEC-020 / ADR-025 | Dirección / Marketing         |
| Navegadores y dispositivos definitivos                   | DEC-018           | UX / Tech Lead                |
| Configurar `ui-quality` como check requerido en `main`   | F6-12             | Administrador del repositorio |
| Habilitación segura del modo demo en Preview             | F6-00             | Tech Lead / Seguridad         |
| Code-splitting del Storybook estático                    | O-02              | Tech Lead                     |

## Límites

- Gate documental: no cambia código de aplicación, contratos, migraciones, autorización ni datos.
- Axe bloquea violaciones serias y críticas; no demuestra conformidad WCAG completa. No se ejecutaron lector de pantalla, zoom al 200 %, luz exterior ni guantes.
- La regresión visual corre sobre el modo demo con `next dev` en Chromium; los tamaños de viewport no sustituyen dispositivos reales (DEC-018).
- Las aprobaciones fueron internas y las registra el Tech Lead por confirmación del responsable del 30/10/2026, igual que en la Fase 5.

## Firmas de responsables

| Responsable / cargo       | Nombre                        | Dictamen aceptado / observaciones                    | Firma                         | Fecha      |
| ------------------------- | ----------------------------- | ---------------------------------------------------- | ----------------------------- | ---------- |
| Dirección ICE24           | Axel Quevedo Zamudio          | Aprobado; diseño aprobado                            | Aprobación interna registrada | 30/10/2026 |
| Dirección ICE24 / Sponsor | Eduardo Ramos                 | Aprobado; diseño aprobado                            | Aprobación interna registrada | 30/10/2026 |
| Tech Lead / QA            | Calixto Isaac Galeana Medrano | Aprobado con EXC-F6-01; aprueba la excepción         | Aprobación interna registrada | 30/10/2026 |
| Producto / UX             | Sin asignar                   | Rol sin titular; lo cubre Dirección para este cierre |                               |            |
