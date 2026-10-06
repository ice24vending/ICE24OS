# Estado de Fase 5 — Suscripción, auditoría, archivos, jobs y notificaciones

Fecha de arranque: 23 de septiembre de 2026.

## Resultado

**F5-01 a F5-13 integradas en `main` (F5-13 en #22); F5-14 implementada localmente; F5-15 pendiente.** Actualización: 06/10/2026. PRs: F5-01 #9, F5-02 #10, F5-03 #11, F5-04 #12, F5-05 #13, F5-06 #14, corrección de prueba #15 F5-07 #16 y F5-08 #17, con CI en verde. F5-05 agrega el outbox transaccional y la cola `domain_events`; F5-06, los workers idempotentes con reintentos y DLQ; F5-07, el registro de trabajos, el Centro de trabajos y el reproceso auditado; F5-08, la carga directa preautorizada al almacenamiento privado con confirmación en cuarentena y lecturas temporales auditadas; F5-09, el worker de `file_scans` con validación de integridad, adaptador antimalware, promoción o rechazo con purga y falla cerrada en cuarentena; F5-11, el centro de notificaciones con alertas persistentes por destinatario, estados no leída/leída/enterado/en atención/resuelta, críticas fijadas hasta «Enterado» y resolución sólo con la condición cerrada; F5-12, el correo transaccional (alertas críticas por correo desde el outbox con plantillas versionadas, idempotencia, reintentos, DLQ, seguimiento firmado de entrega y rebote y estado visible en el centro de avisos; reportes listos para su productor); F5-13, el scheduler con ventanas idempotentes por tarea, arrendamiento en base de datos, registro en el Centro de trabajos, vencimientos de suscripción materializados, cierre de periodos de reporte por outbox y hallazgos de reconciliación con Stripe sin corrección automática (adaptador falso hasta la validación remota); F5-14, los logs de integración con correlación de extremo a extremo (petición HTTP → outbox → cola → worker → proveedor → webhook de vuelta), almacén append-only redactado con una fila por efecto e intento, wrapper común en Stripe, almacenamiento, cola, antimalware y correo, consulta de diagnóstico para ICE24 con MFA y aislamiento por cuenta, y retención configurable sin periodo asumido. Pendientes externos: validación Stripe remota (F5-02), despliegue, proveedor antimalware y proveedor de correo (ADR-019, DEC-025) y canal de recuperación de acceso (DEC-024). El gate final de Fase 5 permanece pendiente. Véanse los reportes [F5-01](../tasks/task-f5-01.md), [F5-02](../tasks/task-f5-02.md), [F5-03](../tasks/task-f5-03.md), [F5-04](../tasks/task-f5-04.md) [F5-05](../tasks/task-f5-05.md), [F5-06](../tasks/task-f5-06.md), [F5-07](../tasks/task-f5-07.md) [F5-08](../tasks/task-f5-08.md), [F5-09](../tasks/task-f5-09.md), [F5-10](../tasks/task-f5-10.md), [F5-11](../tasks/task-f5-11.md), [F5-12](../tasks/task-f5-12.md), [F5-13](../tasks/task-f5-13.md) y [F5-14](../tasks/task-f5-14.md).

Fuentes de alcance: [Implementation Plan, Fase 5](../../context/Implementation_Plan.md#fase-5--suscripción-auditoría-archivos-jobs-y-notificaciones), [TASKS](../../context/TASKS.md) y [reglas del proyecto](../../context/PROJECT_RULES.md), secciones 23 y 25.

## Secuencia de ejecución

La secuencia agrupa trabajo por dependencias; cada tarea conserva las dependencias adicionales indicadas en TASKS.

| Orden | Tareas                        | Entrega                                                 | Estado al 06/10/2026                                                                                  |
| ----- | ----------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 1     | F5-01                         | Suscripción, demo y estados de acceso                   | Integrada                                                                                             |
| 2     | F5-02 → F5-03                 | Stripe y modo lectura centralizado                      | Integradas; Stripe remoto pendiente                                                                   |
| 3     | F5-04 → F5-05 → F5-06 → F5-07 | Auditoría, outbox, consumidores y centro de jobs        | Integradas                                                                                            |
| 4     | F5-08 → F5-09 → F5-10         | Carga privada, cuarentena, versiones y descargas        | F5-08 y F5-09 integradas; F5-10 en validación                                                         |
| 5     | F5-11, F5-12, F5-13, F5-14    | Notificaciones, correo, scheduler y logs de integración | F5-11, F5-12 y F5-13 integradas (DEC-024, DEC-025, DEC-026 pendientes); F5-14 implementada localmente |
| 6     | F5-15                         | UI de servicios transversales                           | Pendiente de servicios requeridos                                                                     |

Primer paquete: [TASK-F5-01](../tasks/task-f5-01.md). La implementación debe partir del PRD RF-SUB-001 a RF-SUB-013: incluye pendiente de activación y cancelación programada aunque el resumen de F5-01 no los enumere.

## Bases existentes a reutilizar

- `packages/authorization/src/index.ts`: modos ACTIVE, READ_ONLY y SUSPENDED; deniega escritura en READ_ONLY.
- `supabase/migrations/20260825000100_phase2_platform.sql`: colas PGMQ, DLQ, políticas y despachos idempotentes.
- `apps/worker/src/processors/scheduling.ts`: base de procesamiento de calendarios.
- Módulos de identidad y equipos: contexto de cuenta, permisos, archivos y auditoría existentes que deben revisarse al conectar los servicios transversales.

La existencia de estas bases no acredita por sí sola F5-03, F5-04, F5-06, F5-08 ni F5-13.

## Dependencias y decisiones por resolver en su alcance

- Verificar disponibilidad de colas, objetos, identidad y secretos en el ambiente de integración. El estado de Fase 2 conserva pendientes antiguos y no basta para afirmar disponibilidad actual; la aprobación de Fase 4 no se revoca por ese desfase documental.
- DEC-017: reglas comerciales especiales, contracargos, pagos pendientes y reembolsos antes de Fase 5 productiva. No agregar periodos de gracia: el PRD exige lectura inmediata al rechazo.
- DEC-008: retención y tratamiento de datos de cuentas canceladas; no introducir borrado ni plazos supuestos.
- ADR-019 / DEC-019: selección de antimalware pendiente y revisión de costo/privacidad de integraciones. Afecta escaneo real y puesta en operación; mantener cuarentena ante fallo.
- DEC-025: activación del proveedor de correo (ADR-019). Sin ella no se envía correo en staging ni producción; los mensajes quedan en cola y visibles.
- DEC-026: hospedaje del worker persistente que ejecuta consumidores y scheduler (ADR-021). F5-13 no depende de un proceso único, pero ningún worker puede operar en staging sin host aprobado.
- DEC-024: canal del correo de recuperación (Supabase Auth hoy, ADR-017) frente al correo transaccional que espera F5-12.

Estas decisiones se resuelven para las tareas afectadas, sin dar por bloqueada toda la fase ni seleccionar proveedores unilateralmente.

## Validación y salida

El arranque del 23/09 fue documental. La entrega F5-01 del 25/09 incluye código y pruebas; su reporte conserva los resultados reales y el alcance de cada comprobación. No se aplicó la migración en remoto ni se desplegó el código. La tabla anterior conserva la secuencia y el estado vigente.

Cada entrega debe conservar evidencia de pruebas pertinentes: aislamiento, autorización, auditoría transaccional, concurrencia, duplicados, fallos y recuperación. Para el gate final, una acción sensible produce auditoría y eventos; un pago rechazado cambia el acceso; un archivo privado carece de URL pública permanente y un job fallido puede diagnosticarse y reintentarse.
