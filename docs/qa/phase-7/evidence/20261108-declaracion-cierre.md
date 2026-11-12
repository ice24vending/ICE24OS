> Actualización posterior a #68 (11/11/2026): main `cba6e15`, P13 rebasado sin conflictos y publicación autorizada, sin merge. Se corrigió la región de anuncios del Resumen operativo y las superficies auditadas; [evidencia vigente](20261111-p13-live-regions.json), [inventario](../live-region-audit.md). La evidencia previa solo cubría el Dashboard F6. **Declaración pendiente de firmas; gate F7 no aprobado**. Lector, campo físico, UX y contraste indeterminado siguen pendientes de sus responsables. No se modificó la protección de main.

> Estado vigente 11/11/2026: ocho recorridos Windows/Android pendientes; UX especificada aprobada; campo antes de activar offline; decisiones de negocio pendientes. Responsable técnico/QA único: Calixto; aprobadores: Axel y Eduardo por mensaje. Las listas fechadas anteriores son antecedentes. Ver [gate vigente](../gate-f7.md).

# Declaración de cierre de Fase 7

## Preparación vigente — 11/11/2026

**Cierre no aprobado; aprobaciones por mensaje pendientes.** Pulido publicado en [PR #68](https://github.com/ice24vending/ICE24OS/pull/68), sin fusionar. P13 se prepara localmente desde `591fe07`, conserva el respaldo P13/F6 y no tendrá push/PR antes de integrar el pulido. Main `ab00e1f` ya incluye #66/#67. La regla efectiva `ui-quality` de main se verificó de nuevo por lectura el 11/11/2026; «main sin protección» está resuelto, sin cambiar ajustes remotos.

[Checklist completo](../gate-f7.md), [guion de los 12 lectores](../screen-reader-script.md), [10 pruebas físicas](../field-test-protocol.md), [decisiones listas para aprobación por mensaje](../decisions-for-signature.md), [validación del pulido](20261111-f7-gate-polish-validation.json) y [preparación P13](../../../tasks/task-f7-gate.md). Las pruebas automatizadas no sustituyen evidencia humana ni firmas. EXC-F6-01 vence en este gate, sin extensión. Pendientes humanos y responsables detallados en el checklist; se conservan las firmas históricas y no se rellenan nuevas.

Los párrafos posteriores son antecedentes fechados, no la situación de integración vigente.

Instantánea inicial: 08/11/2026 (America/Mexico_City). Preparación P13 en `codex/f7-gate`, sobre candidato `717b7b8`. `origin/main` está en `fbfbcf8`; el [PR #66](https://github.com/ice24vending/ICE24OS/pull/66) de P10–P12 sigue abierto al verificar. Esta rama depende de ese PR: no se presenta como un gate ejecutado sobre main actualizado. No se hizo commit, push, merge ni despliegue de P13.

## Dictamen

**Rechazado para cierre; preparación documental realizada.** Protección de main (G7-03) e integración #66 (G7-04) resueltas y verificadas el 09/11/2026. Los demás requisitos del gate permanecen pendientes.

El usuario confirmó el 08/11/2026: «Aún no los he ejecutado», respecto a los recorridos con lector de pantalla y las pruebas físicas. La aprobación UX de UI-SYNC-01 es válida y se conserva, pero no acredita estas pruebas. EXC-F6-01 continúa vigente y no puede trasladarse a Fase 8 como excepción aceptada: su fecha límite es el gate F7.

## Defectos y bloqueos del gate

| ID    | Severidad / naturaleza                | Resultado y acción necesaria                                                                                                        | Responsable                                   |
| ----- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| G7-01 | Alta / falta de evidencia obligatoria | 12 recorridos SR-01…SR-12 sin ejecutar. Registrar resultados en F6 y F7, corregir fallos y retirar EXC-F6-01 solo si pasan todos    | Tech Lead / QA: Calixto Isaac Galeana Medrano |
| G7-02 | Alta / falta de evidencia obligatoria | 10 escenarios físicos de campo sin ejecutar; tampoco se acreditan recorridos F7 adicionales con lector                              | QA / Técnico / Seguridad                      |
| G7-03 | Alta / control de integración ausente | Resuelto 09/11: ruleset 26916128 activo; ui-quality obligatorio y regla efectiva verificada                                         | Administrador del repositorio                 |
| G7-04 | Dependencia de integración            | Resuelto 09/11: #66 integrado en 233f915; confirmado por GitHub. No constituye aceptación del gate                                  | Tech Lead / revisores                         |
| G7-05 | Aprobaciones pendientes               | Aprobaciones por mensaje de cierre y pantallas aún pendientes en ux-signoff; no inferir aprobación general a partir de UI-SYNC-01   | Axel Quevedo Zamudio / Eduardo Ramos / QA     |
| G7-06 | Validación final pendiente            | Repetir batería completa sobre la base integrada del cierre; los resultados de P10–P12 son antecedentes, no una nueva ejecución P13 | Tech Lead / QA                                |

Estos son bloqueos de aceptación, no afirmaciones de defectos funcionales observados en teléfonos que no se probaron.

## Batería ejecutada y límite de vigencia

P13 modifica documentación. Se revisaron los resultados existentes del 08/11/2026, sin cambiar sus cifras ni presentarlos como repetición del gate. Tras integrar #66 y completar los requisitos humanos se debe ejecutar y registrar la batería completa siguiente. En esta preparación se comprueba formato, enlaces locales y cobertura de las 17 filas de trazabilidad; el informe está en [tarea P13](../../../tasks/task-f7-gate.md).

| Comando                                                  | Último resultado disponible de P10–P12                                                                             | Estado P13                                               |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| `pnpm check`                                             | 1.033/1.033 pruebas, 132 archivos, salida 0                                                                        | Repetición final pendiente                               |
| `ICE24_STORAGE_ORIGIN=http://127.0.0.1:54329 pnpm build` | 14/14 tareas, salida 0                                                                                             | Repetición final pendiente                               |
| `ICE24_BROWSER_TESTS=1 pnpm test:integration`            | 204/204 pruebas, 21 archivos, salida 0                                                                             | Repetición final pendiente                               |
| `pnpm test:ui -- --workers=8`                            | Linux 2.283/2.283, sin reintentos; después 3/3 regresiones de zona horaria                                         | Repetición final pendiente                               |
| `pnpm ux:snapshots`                                      | 1.292 capturas, cero observaciones                                                                                 | Repetición final pendiente                               |
| `pnpm ux:walkthroughs`                                   | 11 recorridos verificados                                                                                          | Repetición final pendiente                               |
| `pnpm storybook:build`                                   | Compilación previa registrada; advertencias `use client` y chunks O-02 conservadas                                 | Repetición final pendiente                               |
| «criterio de salida F7»                                  | Incluido en integración; Chromium, IndexedDB y PostgreSQL reales; transporte y almacenamiento de objetos adaptados | Repetir con `ICE24_BROWSER_TESTS=1` sobre main integrado |

Evidencia: [suite P10–P12](20261108-suite-campo.md), [galería local](../../phase-6/ux-review/index.html), [videos locales](../walkthroughs/index.html), [reporte UI/axe local](../../../../playwright-report/index.html). Los artefactos locales ignorados por Git no se publican mediante enlaces relativos: en CI deben descargarse los artefactos del workflow UI quality del commit revisado. Los tamaños de viewport y axe no sustituyen dispositivos ni lectores reales.

## Verificación de GitHub

[Evidencia de API](20261108-gate-github.json), consultada el 08/11/2026, con instante UTC en el archivo:

- `GET branches/main/protection`: HTTP 404; no se deduce el estado solo de este error.
- `GET branches/main`: `protected=false`, checks requeridos vacíos y enforcement `off`.
- `GET rules/branches/main` y `GET rulesets`: ambos `[]`.
- Resultado conjunto: `ui-quality` no es requerido. El job agregador existe en `.github/workflows/ui-quality.yml`, pero su existencia no configura la protección de GitHub. No se modificó la configuración del repositorio.
- PR #66 abierto al consultar; Vercel aprobado, CI/UI en curso en la instantánea. No se declara aprobado lo que aún no termina.

## Escenarios del criterio de salida y riesgos

| Resultado esperado / riesgo (Implementation_Plan F7)   | Evidencia y límite                                                                                                        |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Mantenimiento preventivo/correctivo, tickets y órdenes | F7-01…07, integrados mediante #61–#65; evidencia por tarea en trazabilidad                                                |
| Evidencia y ejecución offline                          | F7-06/08…12/14, pruebas de contratos, transacciones y navegador; política de evidencia aún provisional                    |
| Detección y resolución auditada, sin duplicar          | F7-13/15/17 en candidato #66; criterio automatizado y pruebas de idempotencia. Campo físico pendiente                     |
| Corrupción/pérdida local                               | Transacciones, protección de escrituras en curso y pruebas de cierre/recarga; apagado real y batería pendientes           |
| Sobrescritura concurrente                              | Versión esperada, originales conservados y confirmación ligada a la versión revisada; pruebas concurrentes de PostgreSQL  |
| Archivos grandes                                       | Compresión, cuotas y rollback probado con `QuotaExceededError` inyectado; cámara y disco físico lleno pendientes          |
| Usuario desactivado conserva datos                     | Verificación al abrir/reconectar y limpieza por ámbito; sin red no se conoce revocación remota hasta reconectar o expirar |
| Calendarios incorrectos                                | Pruebas de recálculo, zona horaria, instalación y plantilla; F7-D05/D06 siguen propuestas                                 |

## Decisiones y pendientes que podrían pasar a Fase 8

No se habilita Fase 8 mientras el gate F7 esté rechazado. Esta tabla clasifica seguimiento; no concede prórrogas a bloqueos.

| Pendiente                                                         | Estado / tratamiento                                                                                                  | Responsable                                                                                           |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| EXC-F6-01, pruebas físicas, protección main, integración y firmas | Bloqueos F7; no trasladar como aceptación tácita                                                                      | Responsables G7-01…06                                                                                 |
| F7-D01 / DEC-009 evidencia y firma                                | Propuesta; decidir antes de uso productivo                                                                            | Calixto Isaac Galeana Medrano (Tech Lead / QA / desarrollador) / Axel Quevedo Zamudio y Eduardo Ramos |
| F7-D02 / DEC-022 resolución                                       | Propuesta; aprobación UX no aprueba política                                                                          | Axel Quevedo Zamudio y Eduardo Ramos                                                                  |
| F7-D03 / DEC-018 vigencia y cuotas                                | Propuesta (72 h, 50 MB/orden, 250 MB/dispositivo)                                                                     | Calixto Isaac Galeana Medrano (Tech Lead / QA / desarrollador) / Axel Quevedo Zamudio y Eduardo Ramos |
| F7-D04 / DEC-004 permisos                                         | Propuesta general; solo reapertura de ADR-028 aprobada el 04/11/2026                                                  | Producto / Seguridad                                                                                  |
| F7-D05 / DEC-009 y F7-D06 / DEC-018                               | Propuestas de criticidad y calendario local                                                                           | Calixto Isaac Galeana Medrano (Tech Lead / QA / desarrollador) / Tech Lead                            |
| F7-D07 / DEC-009 procedimiento y piezas                           | Propuesta compatible, sin inferir piezas ni modificar historia                                                        | Calixto Isaac Galeana Medrano (Tech Lead / QA / desarrollador) / Axel Quevedo Zamudio y Eduardo Ramos |
| Demo Preview / ADR-026                                            | Propuesto, desactivado según ADR; aprobaciones por mensaje y protección sin acreditar. No se cambian variables Vercel | Axel Quevedo Zamudio y Eduardo Ramos / Calixto Isaac Galeana Medrano (Tech Lead / QA / desarrollador) |
| DEC-020 marca                                                     | Pendiente externo, fuera del gate; seguimiento F8                                                                     | Axel Quevedo Zamudio y Eduardo Ramos                                                                  |
| DEC-018 dispositivos definitivos                                  | Propuesta, fuera del gate; no exime las pruebas físicas exigidas en F7                                                | UX / Tech Lead                                                                                        |
| O-02 chunks Storybook                                             | Baja, abierto, fuera del gate; seguimiento F8 sin ocultar warnings                                                    | Tech Lead                                                                                             |

## Aprobaciones por mensaje de responsables

| Responsable / cargo                                  | Nombre                        | Dictamen aceptado / observaciones                    | Aprobación por mensaje | Fecha |
| ---------------------------------------------------- | ----------------------------- | ---------------------------------------------------- | ---------------------- | ----- |
| Axel Quevedo Zamudio y Eduardo Ramos ICE24           | Axel Quevedo Zamudio          | Pendiente; revisar bloqueos                          | Pendiente              | —     |
| Axel Quevedo Zamudio y Eduardo Ramos ICE24 / Sponsor | Eduardo Ramos                 | Pendiente; revisar bloqueos                          | Pendiente              | —     |
| Tech Lead / QA                                       | Calixto Isaac Galeana Medrano | Pendiente; adjuntar evidencia humana y batería final | Pendiente              | —     |

La aprobación de una pantalla no aprueba esta declaración. [Registro UX](../ux-signoff.md), [guion con lector](../screen-reader-walkthroughs.md), [guion físico](../field-tests.md). No se retiró EXC-F6-01 ni se hizo merge.

## Actualización del 09/11/2026 — cierre sigue rechazado

`pnpm check` posterior a la corrección F7-18: aprobado, 1.042 pruebas en 133 archivos; evidencia `tmp/f7-18-expired-check.log`. No constituye batería final ni aprobación P13.

La instantánea inicial se conserva como antecedente. El PR #66 ya está integrado: `merged_at=2026-11-09T05:29:03Z`, por `CalixtoIsaac`; main `233f9158673d46f7213d0894171bd381e552edc6`, 12 check-runs y Vercel exitosos. Se resuelve G7-04. Ninguna fusión se efectuó en esta revisión.

F7-18 incorpora la corrección de reserva vencida sin limpiar, probada con expiración auditada, rollback e idempotencia (40 aprobadas, 1 prueba de navegador omitida por bandera). La aprobación UX final de F7-18 sigue pendiente; no hay commit/PR. El gate UI anterior de A no es un gate P13. B conserva 35/35 hashes y continúa separado; B y C no se declaran terminados. C usará `sanitary.release` explícito.

Antecedente previo a la aplicación por el dueño: main estaba sin protección y se preparó el ruleset. **G7-03 ya está resuelto** mediante el ruleset 26916128, verificado en la sección siguiente. [Configuración exacta y responsables](../../../tasks/task-f7-gate.md#propuesta-de-configuración-no-aplicada).

Pendientes humanos: **12 recorridos con lector** (Calixto Isaac Galeana Medrano, Tech Lead/QA; EXC-F6-01 sin prórroga, antes de UI productiva y como máximo gate F7), **10 escenarios físicos** (QA/Técnico/Seguridad), **UX faltante P0–P5** (Axel Quevedo Zamudio/Eduardo Ramos con QA, preservando aprobaciones parciales), **F7-D07** (Calixto Isaac Galeana Medrano (Tech Lead / QA / desarrollador)/Axel Quevedo Zamudio y Eduardo Ramos) y **aprobaciones por mensaje de Axel Quevedo Zamudio y Eduardo Ramos y QA** (Axel, Eduardo y Calixto). No se firman ni se acreditan resultados humanos. G7-06 mantiene pendiente la batería final del candidato de cierre.

Sin migraciones remotas, commit, push, cambios de protección ni aprobación del gate F7.

### Autorización y acceso — 09/11/2026

El usuario autorizó expresamente aplicar el ruleset preparado. Se intentó el POST con el payload exacto; GitHub respondió 404. La sesión CLI es CalixtoIsaac y los permisos efectivos son push=true, admin=false, maintain=false. En aquel momento, la consulta posterior devolvió rulesets=[] y quedó pendiente el acceso administrativo. Este bloqueo quedó resuelto después por el dueño mediante el ruleset 26916128; no se requiere otra autenticación ni repetir la autorización. Evidencia local: tmp/f7-main-ui-quality-applied.json. No es un rechazo de aprobación automática, sino de acceso de GitHub.

B se restauró por separado en codex/f7-field-usability, worktree C:/Users/isaac/.codex/worktrees/f7-field-usability/ICE24OS, desde el main remoto verificado 233f915. Se verificaron los 35 hashes originales y se excluyeron los hunks de A. Validación B en curso; no se declara terminado ni se publica. C permanece pendiente y usará sanitary.release explícito. El gate F7 sigue rechazado; firmas, lectores, campo y revisiones humanas no cambian.

## Protección main resuelta — 09/11/2026

**G7-03 resuelto.** El dueño del repositorio, cuenta personal `ice24vending`, aplicó el ruleset [26916128: main-require-ui-quality](https://github.com/ice24vending/ICE24OS/rules/26916128). El usuario confirmó que este repositorio personal no permite otorgar Admin a colaboradores. Se verificó de nuevo mediante GET, sin cambiar ajustes remotos:

- `enforcement=active`, ámbito exclusivo `refs/heads/main`, sin exclusiones.
- Check obligatorio `ui-quality`, GitHub Actions app `15368`.
- `strict_required_status_checks_policy=true`; `do_not_enforce_on_create=false`.
- `GET rules/branches/main` devuelve esa regla efectiva con `ruleset_id=26916128`.
- `current_user_can_bypass=never` para `CalixtoIsaac`.

La autorización pendiente de acceso y la observación «main sin protección» quedan superadas por esta evidencia. El intento anterior 404 permanece como antecedente; no se repitió el POST. No se intentó fusionar para comprobar el bloqueo. No se hace commit, push ni migración remota.

El gate F7 **no queda aprobado**: continúan lectores EXC-F6-01 sin ampliar plazo, escenarios físicos, UX faltante P0–P5, F7-D07, batería final del candidato y aprobaciones por mensaje de Axel Quevedo Zamudio y Eduardo Ramos/QA, con los responsables ya registrados. B sigue en validación separada y C pendiente.

[Evidencia JSON](20261109-main-ruleset.json).

## Resultado técnico P13 — 11/11/2026

[Reporte verificable](20261111-p13-preflight.json): check 1.076/1.076, build 14/14, preflight/teclado 19/19, axe Dashboard 30/30, visual 36/36 y Storybook aprobado. Región de anuncios F6 corregida; fallos y reejecuciones previas documentados. Cero baselines modificadas en P13. Revisión manual de contraste indeterminado: pendiente – responsable QA/UX. Lectores, campo, UX, decisiones y firmas continúan pendientes de sus responsables; **gate F7 no aprobado**.

> Organización vigente, 11/11/2026: Calixto Isaac Galeana Medrano (Tech Lead / QA / desarrollador) reúne desarrollo, verificación técnica y QA; no hay áreas separadas de Producto o Seguridad. Las decisiones de negocio corresponden a Axel Quevedo Zamudio y Eduardo Ramos. No se exige firma impresa: aprobación por mensaje, con captura guardada en docs/qa/phase-7/evidence/. Las menciones históricas de responsabilidades se interpretan con esta asignación; no acreditan aprobaciones nuevas.

## Dictamen vigente ajustado al equipo real — 11/11/2026

**Gate F7 pendiente; no aprobado.** Esta actualización prevalece sobre alcances/responsables históricos: Calixto Isaac Galeana Medrano es el único Tech Lead/QA/desarrollador; Axel Quevedo Zamudio y Eduardo Ramos aprueban negocio por mensaje con captura en docs/qa/phase-7/evidence/; no hay áreas separadas ni firma impresa.

UX del pulido #68, UI-TKT-01/02, UI-WO-04 y Resumen KPI aprobada: ratificación del usuario en chat 11/11/2026; aprobación de diseño de jefes por WhatsApp 15/10/2026 comunicada por usuario (captura pendiente de adjuntar). No acredita lector, campo ni decisiones. EXC-F6-01/D-02 ahora exige ocho recorridos Windows/Android, todos pendientes, sin extender vencimiento; Apple es riesgo aceptado hasta disponer de dispositivo. CF-01…CF-10 pendientes antes de activar offline en producción, apagado por defecto en código; confirmar configuración del deployment. Dictámenes técnicos y decisiones de negocio separados en [decisiones](../decisions-for-signature.md). El [gate vigente](../gate-f7.md) enumera cada responsable/condición; main protegido sigue resuelto. Capturas/pruebas automatizadas no sustituyen evidencia humana.

| Aprobador                     | Alcance                                     | Estado    | Fecha / mensaje / captura |
| ----------------------------- | ------------------------------------------- | --------- | ------------------------- |
| Calixto Isaac Galeana Medrano | Ratificación QA del candidato y condiciones | Pendiente | ___                       |
| Axel Quevedo Zamudio          | Decisiones de negocio y cierre              | Pendiente | ___                       |
| Eduardo Ramos                 | Decisiones de negocio y cierre              | Pendiente | ___                       |
