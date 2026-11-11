# Fase 7 — Estado de implementación

Inicio: 02/11/2026. P0/P1 integrados en main mediante PR #61 y P2 mediante PR #62. Revisión UX pendiente. P3 (F7-03/04) implementado en `feat/f7-03-04-work-orders-state-machine`; entrega y evidencia en el [reporte de publicación](../qa/phase-7/publication-f7-03-04.md). Se conservan los cambios locales anteriores. Gate F6 aprobado con EXC-F6-01; esa excepción sigue vigente.

| Prompt | Tareas                                  | Dependencias | Estado                                                                                                                                                   |
| ------ | --------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0     | Arranque, decisiones y sala de revisión | Gate F6      | Implementado; revisión UX pendiente                                                                                                                      |
| P1     | F7-01 Programación y KPI                | P0           | Implementado; revisión UX pendiente                                                                                                                      |
| P2     | F7-02 Tickets                           | P0           | Implementado; revisión UX pendiente                                                                                                                      |
| P3     | F7-03/04 Órdenes y estados              | P1, P2       | Implementado; publicación P3 con mejoras UI, revisión UX pendiente; [reporte](../tasks/task-f7-03.md)                                                    |
| P4     | F7-05/06 Ejecución y evidencia          | P3           | Implementado local; validación automática pasada, revisión UX pendiente                                                                                  |
| P5     | F7-07 Revisión                          | P4           | Implementado local; reapertura aprobada el 04/11/2026, validación automática pasada; revisión UX pendiente                                               |
| P6     | F7-09 Base offline                      | P0           | Base v2 validada localmente; shell detrás de bandera desactivada                                                                                         |
| P7     | F7-08/10 Responsable y descarga         | P3, P6       | Implementado local; validación automática aprobada; UX aprobada el 06/11/2026; [evidencia](../qa/phase-7/offline-p7-p9.md)                               |
| P8     | F7-11/12 Cola y sincronización          | P7           | Implementado local; validación automática aprobada; UX aprobada el 06/11/2026; [evidencia](../qa/phase-7/offline-p7-p9.md)                               |
| P9     | F7-14 UI móvil                          | P4, P8       | Implementado local; validación automática aprobada; UX aprobada el 06/11/2026; [evidencia](../qa/phase-7/offline-p7-p9.md)                               |
| P10    | F7-13/15 Conflictos                     | P8           | Implementado local; validación automatizada y UX UI-SYNC-01 aprobadas; campo físico pendiente; [reporte](../qa/phase-7/evidence/20261108-suite-campo.md) |
| P11    | F7-16 Borrado local                     | P6, P8       | Implementado local; validación automatizada y UX UI-SYNC-01 aprobadas; campo físico pendiente; [reporte](../qa/phase-7/evidence/20261108-suite-campo.md) |
| P12    | F7-17 Suite de campo                    | P9, P10, P11 | Implementado local; validación automatizada y UX UI-SYNC-01 aprobadas; campo físico pendiente; [reporte](../qa/phase-7/evidence/20261108-suite-campo.md) |
| P13    | Gate y pendientes F6                    | Todos        | Pendiente                                                                                                                                                |

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

### Corrección F7-18 — revisión UX no aprobada, 09/11/2026

Listado local de órdenes disponible al perder red y al recargar mantenimiento mediante shell público genérico, sin caché autenticada. Ruta lista sin controles de descarga cero y separación del enlace de sincronización. El alcance sigue en sessionStorage; persistencia hasta 72 h es solo propuesta pendiente frente a ADR-027. Validación del 10/11/2026: check 1.052, build 14/14, integración 208/208 y UI Linux integral 2.347/2.347; galería con 1.336 capturas sin observaciones y 12 recorridos verificados. Aviso visible sobre reconexión tras cerrar navegador cubierto por E2E móvil/escritorio. La propuesta de permiso con WebAuthn vive en una rama separada y ADR-027 está pendiente de aprobación, sin implementación en A. Revisión UX F7-18 pendiente; gate F7 no aprobado. Véase task-f7-18.md.

### F7-18 — revisión visual/funcional posterior del 10/11/2026

Nueva solicitud de UX incorporada: descarga explícita y actualización segura, filas compactas, misma pestaña sin pérdida/acortamiento del alcance, explicación del vencimiento después de purga, contexto conocido sin cachear HTML autenticado, sincronización local en consulta y editor con fotos/checklist/acciones accesibles. Reutiliza el design system y la ejecución de F6. Demo e historias ampliados. Validación actual: check 1.059/1.059, build 14/14, integración 208/208, E2E focal 12/12; UI integral Linux con 2.376 pasadas y una pasada al reintentar. La expectativa intermitente de guardado se corrigió y los recorridos afectados pasaron 24/24 sin reintentos. Se inspeccionaron 805 diferencias visuales, incluidas capturas antiguas alineadas con el design system ya presente en HEAD. Detalles y hashes en task-f7-18.md; galería final con 1.356 capturas sin observaciones y 12 recorridos grabados verificados. Los resultados históricos permanecen separados de este candidato. Aprobación UX pendiente en ux-signoff.md; gate F7 no aprobado. B y la propuesta WebAuthn siguen separados; sin commit, push ni migraciones remotas.

### F7-18 — caché del editor y regreso superior (10/11/2026)

Corrección posterior: el build versiona por contenido la caché pública del SW para entregar CSS/JS nuevos sin borrar trabajo local. Navegación superior a órdenes/sincronización, folio/máquina visibles y separación space-4. E2E de actualización v5 → build-hash, vuelta online/offline y confirmación ante fallo de guardado. Validaciones finales: check 1.060/1.060, build 14/14, integración 208/208, E2E focal 7/7, UI Linux 2.380/2.380 sin reintentos, cuatro baselines inspeccionadas, galería con 1.356 capturas sin observaciones y 12 recorridos verificados. Evidencia y archivos en task-f7-18.md; aprobación UX pendiente en ux-signoff.md, gate F7 no aprobado. Sin commit/push ni cambios remotos; B y WebAuthn separados.

Estado vigente al 10/11/2026: UX F7-18 aprobada explícitamente; antecedentes de revisiones pendientes conservados arriba. Véase ux-signoff.md. Gate F7 no aprobado; sin aprobación de F7-D03, ADR-027, lectores ni campo físico.
