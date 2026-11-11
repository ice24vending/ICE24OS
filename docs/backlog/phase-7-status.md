# Fase 7 — Estado de implementación

Inicio: 02/11/2026. P0/P1 integrados en main mediante PR #61 y P2 mediante PR #62. Revisión UX pendiente. P3 (F7-03/04) implementado en `feat/f7-03-04-work-orders-state-machine`; entrega y evidencia en el [reporte de publicación](../qa/phase-7/publication-f7-03-04.md). Se conservan los cambios locales anteriores. Gate F6 aprobado con EXC-F6-01; esa excepción sigue vigente.

| Prompt | Tareas                                  | Dependencias | Estado                                                                                                                                                                      |
| ------ | --------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0     | Arranque, decisiones y sala de revisión | Gate F6      | Implementado; revisión UX pendiente                                                                                                                                         |
| P1     | F7-01 Programación y KPI                | P0           | Implementado; revisión UX pendiente                                                                                                                                         |
| P2     | F7-02 Tickets                           | P0           | Implementado; revisión UX pendiente                                                                                                                                         |
| P3     | F7-03/04 Órdenes y estados              | P1, P2       | Implementado; publicación P3 con mejoras UI, revisión UX pendiente; [reporte](../tasks/task-f7-03.md)                                                                       |
| P4     | F7-05/06 Ejecución y evidencia          | P3           | Integrado en main; validación automática pasada, revisión UX pendiente                                                                                                      |
| P5     | F7-07 Revisión                          | P4           | Integrado en main; reapertura aprobada el 04/11/2026, validación automática pasada; revisión UX pendiente                                                                   |
| P6     | F7-09 Base offline                      | P0           | Base v2 validada localmente; shell detrás de bandera desactivada                                                                                                            |
| P7     | F7-08/10 Responsable y descarga         | P3, P6       | Integrado en main; validación automática aprobada; UX aprobada el 06/11/2026; [evidencia](../qa/phase-7/offline-p7-p9.md)                                                   |
| P8     | F7-11/12 Cola y sincronización          | P7           | Integrado en main; validación automática aprobada; UX aprobada el 06/11/2026; [evidencia](../qa/phase-7/offline-p7-p9.md)                                                   |
| P9     | F7-14 UI móvil                          | P4, P8       | Integrado en main; validación automática aprobada; UX aprobada el 06/11/2026; [evidencia](../qa/phase-7/offline-p7-p9.md)                                                   |
| P10    | F7-13/15 Conflictos                     | P8           | Integrado en main; validación automatizada y UX UI-SYNC-01 aprobadas; campo físico pendiente; [reporte](../qa/phase-7/evidence/20261108-suite-campo.md)                     |
| P11    | F7-16 Borrado local                     | P6, P8       | Integrado en main; validación automatizada y UX UI-SYNC-01 aprobadas; campo físico pendiente; [reporte](../qa/phase-7/evidence/20261108-suite-campo.md)                     |
| P12    | F7-17 Suite de campo                    | P9, P10, P11 | Integrado en main; validación automatizada y UX UI-SYNC-01 aprobadas; campo físico pendiente; [reporte](../qa/phase-7/evidence/20261108-suite-campo.md)                     |
| P13    | Gate y pendientes F6                    | Todos        | Preparación P13; cierre rechazado: lectores/campo sin ejecutar; protección main resuelta y #66 integrado; [dictamen](../qa/phase-7/evidence/20261108-declaracion-cierre.md) |

No ejecutar simultáneamente prompts con migraciones. P6 puede avanzar con P1–P5; P9, P10 y P11 pueden avanzar después de sus dependencias.

Mejora local del 06/11/2026: enlace de UI-MNT-01/02 al expediente mediante `/machines?machineId=<uuid>`, con validación del ámbito en servidor y foco/desplazamiento existentes. Evidencia y validaciones en [navegación de máquinas](../qa/phase-7/machine-order-navigation.md). Las aprobaciones UX de P7–P9 y de UI-MNT-01/02, incluido este enlace, están registradas el 06/11/2026. El usuario autorizó commit y push en la rama actual.

## Propuestas provisionales para Dirección

No constituyen aprobaciones. Responsables de decisión: Axel Quevedo Zamudio y Eduardo Ramos, con Responsable Técnico, Seguridad y Tech Lead.

| ID               | Propuesta                                                                                                                                                                                                                                                                               | Alternativas                                                            | Responsable técnico           |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------- |
| F7-D01 / DEC-009 | Evidencia declarada por versión de plantilla: antes/después, pieza, lectura con unidad/rango, lote y firma. Imagen máximo 10 MB; compresión a 1600 px y objetivo 2 MB sin eliminar el original antes de verificar el derivado. Firma: nombre y confirmación accesibles, dibujo opcional | Dibujo obligatorio con alternativa accesible; otros límites versionados | Responsable Técnico           |
| F7-D02 / DEC-022 | Dueño o administrador de la sucursal resuelve: conservar local, servidor o combinar campos, siempre con motivo y versión nueva; ambas fuentes se conservan                                                                                                                              | Solo Dueño; sin combinación                                             | Producto/Seguridad            |
| F7-D03 / DEC-018 | Descarga y bloqueo 72 h; 50 MB por orden y 250 MB por dispositivo. Al vencer, bloquear ejecución y exigir reconexión; administrador puede liberar con motivo. Dispositivo que no vuelve: expiración del bloqueo servidor; borrado local al siguiente acceso                             | 24 h o 7 días; otras cuotas                                             | Tech Lead/Seguridad           |
| F7-D04 / DEC-004 | Dueño revisa, corrige, reabre y anula; administrador solo en su sucursal; técnico ejecuta lo asignado y solicita corrección; auditor solo lee; ICE24 sin acceso implícito adicional                                                                                                     | Reapertura/anulación reservada al Dueño                                 | Producto/Seguridad            |
| F7-D05 / DEC-009 | Próxima desde alert_at; sin anticipación explícita, 7 días. Crítico = actividad vencida cuya plantilla indica criticidad crítica; no escalar por días inventados                                                                                                                        | Toda vencida crítica; umbral configurable                               | Responsable Técnico           |
| F7-D06 / DEC-018 | Frecuencia calendario en zona IANA de sucursal; ancla inicial instalación si existe, después inicio de plantilla/configuración cuando es posterior. Horas inexistentes avanzan al primer instante válido; ambigüedad elige primer instante                                              | Duraciones UTC exactas heredadas de F4                                  | Responsable Técnico/Tech Lead |

P1 debe marcar F7-D05/D06 como provisionales. La relación entre actividades de plantilla y componentes oficiales no existe en F4: se conservan las actividades de plantilla; se filtran las de componentes propios por configuración activa (RA-01-D3). No se inventa esa relación.

## Pendientes heredados

P3 añade F7-D07 / DEC-009: **Propuesta** compatible de procedimiento y piezas opcionales por actividad en nuevas versiones de plantilla; las anteriores explicitan ausencia. Las actividades programadas y asignadas conservan su definición original. Alternativa: exigir migración revisada de plantillas antes de asignar. Responsable Técnico y Dirección; pendiente de aprobación. Detalles en [decisiones](open-decisions.md) y [F7-03](../tasks/task-f7-03.md).

- EXC-F6-01: 12 recorridos con lector, QA/Tech Lead; retirar antes de UI productiva y como máximo en P13.
- `ui-quality` requerido en main: administrador del repositorio; instrucciones en QA.
- Demo en Preview: ADR-026 propuesto, desactivado hasta firma y protección verificada.
- Fuera del gate: DEC-020 tipografía/logo, DEC-018 dispositivos definitivos y O-02 tamaño de chunks Storybook.

Ver [guía de revisión](../qa/phase-7/README.md), [módulo](../modules/maintenance.md) y [prompts](phase-7-prompts.md).

Validación local con Docker completada: 154 pruebas de integración y 1687 pruebas Linux en cada pasada (generación y comparación). Las 976 baselines requieren aprobación UX. Ver [evidencia](../qa/phase-7/linux-validation.md). Resultados históricos de P0/P1, posteriormente integrados en PR #61.

## Verificación P13 — 08/11/2026 (instantánea histórica)

La consulta remota confirma P0/P1 en #61, P2 en #62, P3 en #63, P4–P6 en #64 y P7–P9/enlace al expediente en #65. Main: `fbfbcf8`. P10–P12 y aprobación UX UI-SYNC-01: candidato `717b7b8`, [PR #66 abierto](https://github.com/ice24vending/ICE24OS/pull/66), todavía no integrado. Las menciones «local» de la tabla describen el avance de implementación; esta sección establece su integración comprobada.

P13 se prepara en `codex/f7-gate` sobre el candidato por depender de #66, no sobre un main que aún carece de P10–P12. Rebasar/actualizar desde main después de integrar por revisión. Sin commit/push de P13. El usuario confirmó que no ejecutó lectores ni campo físico; EXC-F6-01 continúa. GitHub confirma main sin protección/rulesets: `ui-quality` no requerido. No se modificaron ajustes remotos.

[Declaración de cierre rechazada](../qa/phase-7/evidence/20261108-declaracion-cierre.md): responsables, decisiones, firmas pendientes y condición para Fase 8. La deuda externa DEC-020, dispositivos definitivos DEC-018 y O-02 puede seguirse en F8; los bloqueos obligatorios de F7 no se trasladan como aprobados.

## Extensiones solicitadas — 09/11/2026

- F7-18 / bloque A: descarga múltiple implementada localmente, con las dos revisiones incorporadas (jerarquía visual, orden y exclusión de reservas ajenas). **Gate UI histórico del 09/11/2026, anterior a la revisión bloqueante**: 2.335 pruebas, 1.328 capturas sin observaciones y 12 recorridos verificados. Baselines intactas y B separado. Aprobación UX final pendiente; sin commit ni push. [Evidencia](../tasks/task-f7-18.md).
- F7-19 / bloque B: separado de esta rama y conservado en el respaldo local `tmp/block-b-preserved-20261109/`; no se incluye en el PR de A ni se declara terminado.
- Bloque C: pendiente. La liberación sanitaria requerirá un permiso explícito, conforme a la decisión del usuario; no se concede automáticamente a administradores.

Estos bloques no sustituyen las verificaciones humanas pendientes de P13. No se han publicado ni aplicado migraciones remotas.

## Actualización comprobada — 09/11/2026

`pnpm check` posterior a la corrección F7-18 aprobado: 1.042 pruebas en 133 archivos, formato, lint, tipos y 88 pares de contraste. Sin nueva ejecución integral UI ni aprobación del gate F7.

El PR #66 está **integrado**, no pendiente de merge: GitHub registra `merged_at=2026-11-09T05:29:03Z`, por `CalixtoIsaac`, commit `233f9158673d46f7213d0894171bd381e552edc6`, actual main. Sus 12 check-runs y Vercel figuran exitosos. Esto resuelve la dependencia de integración P10–P12; no aprueba el gate F7. La consulta anterior se conserva como antecedente fechado.

F7-18: corregida descarga ante reserva vencida aún activa en la tabla. Prueba focal de integración: 40 aprobadas y 1 de navegador omitida por bandera; incluye expiración auditada, rollback ante fallo de auditoría e idempotencia. El gate UI anterior corresponde a la versión previa a este cambio de servidor, no a una repetición hoy. B mantiene 35/35 hashes del respaldo, separado. C pendiente con permiso explícito `sanitary.release`.

`main` continúa sin protección, reglas efectivas ni rulesets. Propuesta concreta de `ui-quality` preparada y **no aplicada** en [task-f7-gate](../tasks/task-f7-gate.md). Pausa en el paso 4 solicitado, esperando autorización; no se restaura B ni se comienza C antes de resolverla. Commit/PR A condicionado a que el usuario registre aprobación final F7-18 en `ux-signoff.md`; todavía ausente. Solo se incluirá la lista de task-f7-18 y sus hunks propios, excluyendo P13/F6 y phase-6.docx. Sin commit, push ni migraciones remotas.

Pendientes humanos: los 12 recorridos con lector y retiro de EXC-F6-01, sin ampliar plazo (Calixto Isaac Galeana Medrano, Tech Lead/QA); 10 escenarios físicos (QA/Técnico/Seguridad); revisiones UX faltantes P0–P5, conservando aprobaciones parciales (Dirección: Axel Quevedo Zamudio / Eduardo Ramos, con QA); F7-D07 (Responsable Técnico/Dirección); firmas de Dirección y QA (Axel, Eduardo y Calixto). El dictamen sigue **rechazado para cierre**.

### Antecedente de autorización y acceso — 09/11/2026 (resuelto posteriormente)

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

El gate F7 **no queda aprobado**: continúan lectores EXC-F6-01 sin ampliar plazo, escenarios físicos, UX faltante P0–P5, F7-D07, batería final del candidato y firmas de Dirección/QA, con los responsables ya registrados. B sigue en validación separada y C pendiente.

[Evidencia JSON](../qa/phase-7/evidence/20261109-main-ruleset.json).

### Corrección F7-18 — revisión UX no aprobada, 09/11/2026

Listado local de órdenes disponible al perder red y al recargar mantenimiento mediante shell público genérico, sin caché autenticada. Ruta lista sin controles de descarga cero y separación del enlace de sincronización. El alcance sigue en sessionStorage; persistencia hasta 72 h es solo propuesta pendiente frente a ADR-027. Validación del 10/11/2026: check 1.052, build 14/14, integración 208/208 y UI Linux integral 2.347/2.347; galería con 1.336 capturas sin observaciones y 12 recorridos verificados. Aviso visible sobre reconexión tras cerrar navegador cubierto por E2E móvil/escritorio. La propuesta de permiso con WebAuthn vive en una rama separada y ADR-027 está pendiente de aprobación, sin implementación en A. Revisión UX F7-18 pendiente; gate F7 no aprobado. Véase task-f7-18.md.

### F7-18 — revisión visual/funcional posterior del 10/11/2026

Nueva solicitud de UX incorporada: descarga explícita y actualización segura, filas compactas, misma pestaña sin pérdida/acortamiento del alcance, explicación del vencimiento después de purga, contexto conocido sin cachear HTML autenticado, sincronización local en consulta y editor con fotos/checklist/acciones accesibles. Reutiliza el design system y la ejecución de F6. Demo e historias ampliados. Validación actual: check 1.059/1.059, build 14/14, integración 208/208, E2E focal 12/12; UI integral Linux con 2.376 pasadas y una pasada al reintentar. La expectativa intermitente de guardado se corrigió y los recorridos afectados pasaron 24/24 sin reintentos. Se inspeccionaron 805 diferencias visuales, incluidas capturas antiguas alineadas con el design system ya presente en HEAD. Detalles y hashes en task-f7-18.md; galería final con 1.356 capturas sin observaciones y 12 recorridos grabados verificados. Los resultados históricos permanecen separados de este candidato. Aprobación UX pendiente en ux-signoff.md; gate F7 no aprobado. B y la propuesta WebAuthn siguen separados; sin commit, push ni migraciones remotas.

### F7-18 — caché del editor y regreso superior (10/11/2026)

Corrección posterior: el build versiona por contenido la caché pública del SW para entregar CSS/JS nuevos sin borrar trabajo local. Navegación superior a órdenes/sincronización, folio/máquina visibles y separación space-4. E2E de actualización v5 → build-hash, vuelta online/offline y confirmación ante fallo de guardado. Validaciones finales: check 1.060/1.060, build 14/14, integración 208/208, E2E focal 7/7, UI Linux 2.380/2.380 sin reintentos, cuatro baselines inspeccionadas, galería con 1.356 capturas sin observaciones y 12 recorridos verificados. Evidencia y archivos en task-f7-18.md; aprobación UX pendiente en ux-signoff.md, gate F7 no aprobado. Sin commit/push ni cambios remotos; B y WebAuthn separados.

Estado vigente al 10/11/2026: UX F7-18 aprobada explícitamente; antecedentes de revisiones pendientes conservados arriba. Véase ux-signoff.md. Gate F7 no aprobado; sin aprobación de F7-D03, ADR-027, lectores ni campo físico.

## Pulido posterior a F7-18 — 11/11/2026

Siete correcciones de consulta, navegación, textos y densidad implementadas en `codex/f7-gate-polish` desde `ab00e1f`. Detalles y validaciones en [task-f7-gate-polish](../tasks/task-f7-gate-polish.md). Revisión UX nueva pendiente; gate F7 no aprobado. P13/F6 preservados aparte, B/WebAuthn separados. Sin cambios de permisos ni migraciones. Publicación del pulido autorizada; aprobación UX nueva pendiente – responsable: Usuario solicitante / Dirección.

Revisión externa del 11/11/2026: carga de tareas paralela y acotada por estado activo (shortcut documentado), tipografía explícitamente provisional y salida del 403 del listado hacia Resumen. Validación del candidato: check 1.076/1.076, build 14/14, integración 208/208 y UI Linux integral 2.537/2.537 sin reintentos. Galería y recorridos se registran en [evidencia del candidato](../qa/phase-7/evidence/20261111-f7-gate-polish-validation.json). Ningún verde técnico aprueba UX, lector, campo físico, decisiones o gate F7.

## P13 preparado para revisión humana — 11/11/2026

Pulido en [PR #68](https://github.com/ice24vending/ICE24OS/pull/68), sin merge; P13 local en `codex/f7-p13-gate` desde `591fe07`. Stash P13/F6 aplicado sin conflictos y conservado. [Gate y responsables](../qa/phase-7/gate-f7.md), [lector](../qa/phase-7/screen-reader-script.md), [campo físico](../qa/phase-7/field-test-protocol.md) y [decisiones para firma](../qa/phase-7/decisions-for-signature.md). Regla efectiva ui-quality verificada por lectura el 11/11; «main sin protección» resuelto.

Pendiente – responsable: Calixto Isaac Galeana Medrano (Tech Lead / QA), los 12 recorridos EXC-F6-01/D-02, sin extender vencimiento. Pendiente – responsable: QA con Técnico/Administrador/Seguridad, los 10 escenarios físicos. Pendiente – responsable: Usuario solicitante / Dirección, UX P0–P5 no cubierta por aprobaciones parciales y UX nueva del pulido. Pendientes F7-D01…D07 según responsables del checklist, ADR-026/027 y firmas de Axel Quevedo Zamudio, Eduardo Ramos y Tech Lead/QA. Gate F7 no aprobado. DEC-020, dispositivos definitivos DEC-018 y O-02 siguen fuera del gate.

## Resultado técnico P13 — 11/11/2026

[Reporte verificable](../qa/phase-7/evidence/20261111-p13-preflight.json): check 1.076/1.076, build 14/14, preflight/teclado 19/19, axe Dashboard 30/30, visual 36/36 y Storybook aprobado. Región de anuncios F6 corregida; fallos y reejecuciones previas documentados. Cero baselines modificadas en P13. Revisión manual de contraste indeterminado: pendiente – responsable QA/UX. Lectores, campo, UX, decisiones y firmas continúan pendientes de sus responsables; **gate F7 no aprobado**.
