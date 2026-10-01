# QA F5-02 — Webhooks y reconciliación

Validación local: 30/09/2026, America/Mexico_City. PostgreSQL 17 desechable en Docker, PostgreSQL/PostGIS y Chromium. Sin llamadas a Stripe remoto.

| Comando                                       | Resultado final                                                                                                 |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                                  | Aprobado: formato, lint, TypeScript, límites, infraestructura, identidad y 104 pruebas unitarias en 23 archivos |
| `ICE24_BROWSER_TESTS=1 pnpm test:integration` | Aprobado: 36 pruebas en 3 archivos, sin omisiones; 21 de suscripciones                                          |

En PowerShell, establecer `$env:ICE24_BROWSER_TESTS='1'` antes de `pnpm test:integration`. Docker requirió iniciarse y ejecutarse fuera del aislamiento. La primera ejecución detectó una actualización redundante por representar el mismo instante con distintos offsets ISO; se corrigió y las ejecuciones finales pasaron.

## Casos nuevos de integración

1. Firma ausente, alterada, vencida y modo live rechazados antes de persistir.
2. Bytes/hash visibles desde otra conexión antes de consultar Stripe; dos entregas simultáneas producen una consulta y una auditoría. Un mismo ID con otros bytes se rechaza. Evidencia inmutable y RLS.
3. Error externo deja recibo FAILED; reentrega recupera sin duplicar efectos.
4. Rechazo produce READ_ONLY; pago posterior reactiva comercialmente y conserva SUSPENDED. Un rechazo histórico consulta el estado pagado actual sin generar otra versión.
5. Cancelación programada, reversión, conservación del periodo pagado y cierre al finalizarlo.
6. Fallo inducido al insertar auditoría revierte suscripción y acceso; el recibo persiste y el reintento funciona.
7. Recuperación de cuenta sin cliente vinculado usando reserva y metadatos verificados; observación de otra cuenta rechazada.
8. Evento no soportado se conserva como IGNORED sin consultar Stripe.

Las pruebas unitarias cubren además factura pagada con periodo cubierto, factura pagada de otro periodo, factura pendiente/fallida y metadatos de factura de la versión actual de Stripe. Las firmas son reales del SDK fijado; las respuestas de consulta del proveedor son simuladas.

CI remota, Stripe test con cuenta real, staging y despliegue siguen pendientes. Véase [reporte](../../tasks/task-f5-02.md) y [runbook](../../runbooks/stripe.md).
