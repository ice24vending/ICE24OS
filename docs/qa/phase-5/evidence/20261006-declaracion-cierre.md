# Declaración de cierre de Fase 5

Fecha: 06/10/2026 (America/Mexico_City; las salidas registran 07/10/2026 04:50 UTC). Elaborada por el agente de QA y cierre a partir de corridas reales sobre `main` en `cdbded7` (F5-01 a F5-15 integradas por los PR #9 a #24, más #25). Es un dictamen técnico generado con herramientas; **no sustituye la aprobación ni las firmas de los responsables**, que no se han recibido.

## Dictamen

**Aprobado con pendientes externos.**

Los cuatro escenarios del criterio de salida del [Implementation Plan](../../../../context/Implementation_Plan.md#criterio-de-salida-5) se verificaron localmente con pruebas automatizadas en verde sobre la misma revisión. Ningún criterio de aceptación de F5-01 a F5-15 queda sin evidencia. Los criterios marcados como parciales en la [matriz](../traceability.md) dependen de proveedores, despliegue o decisiones de negocio externos al código, que se listan abajo y **no se dan por resueltos**. El dictamen habilita continuar con la Fase 6 en desarrollo; **no habilita operación productiva** de cobro, correo, archivos reales ni el worker en staging.

## Batería ejecutada

Entorno: Windows 11, Node 24.19.0, pnpm 11.24.0, Docker Desktop 29.7.2, PostgreSQL 17 desechable (Testcontainers), Supabase CLI 2.115.0 local y Chromium de Playwright 1.62.1. Sin datos reales, sin Stripe remoto y sin proveedores reales.

| Comando                                                                                                                          | Resultado                                                                          | Evidencia                                       |
| -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------- |
| `pnpm check` (Prettier, ESLint con 0 advertencias, typecheck, fronteras, infraestructura, identidad, unitarias y de componentes) | Salida 0; 408 pruebas en 68 archivos                                               | [check](20261006-f5-gate-check.txt)             |
| `ICE24_STORAGE_ORIGIN=http://127.0.0.1:54329 pnpm build`                                                                         | Salida 0; 14 tareas                                                                | [build](20261006-f5-gate-build.txt)             |
| `ICE24_BROWSER_TESTS=1 pnpm test:integration` (`vitest.integration.config.ts`, incluye todo el E2E de Chromium)                  | Salida 0; 106 pruebas en 14 archivos, sin omisiones                                | [integration](20261006-f5-gate-integration.txt) |
| Suites de los escenarios con reporte detallado                                                                                   | 66 pruebas en 8 archivos, cada una por nombre                                      | [scenarios](20261006-f5-gate-scenarios.txt)     |
| `supabase start`, `db reset --local --no-seed`, `db lint --local --level error`, `supabase test db`                              | Salida 0 en los cuatro; 23 migraciones aplicadas; pgTAP 320 pruebas en 15 archivos | [supabase](20261006-f5-gate-supabase.txt)       |

Commit, hora y versiones en [environment](20261006-f5-gate-environment.txt); códigos de salida en [exitcodes](20261006-f5-gate-exitcodes.txt). El CI remoto de los PR #24 y #25 terminó en verde (quality, integration, supabase-migrations, Terraform y Vercel en #24; quality, integration y Vercel en #25).

## Escenarios del cierre

| Escenario                                                              | Resultado  | Pruebas principales                                                                                                                                                                                                                        |
| ---------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| a) Una acción sensible produce auditoría y eventos                     | Verificado | `outbox`: auditoría y evento en la misma transacción con el mismo id, y descartados juntos; `audit`: rollback conjunto; `ui-services`: reintento, alertas, descarga y cambio de suscripción auditados, y el evento genera la alerta        |
| b) Un pago rechazado cambia el acceso a solo lectura de inmediato      | Verificado | `subscriptions`: webhook firmado `invoice.payment_failed` → `READ_ONLY` en la misma transacción; `ui-services`: acceso efectivo real, banner, 403 `ACCOUNT_READ_ONLY` en BFF y API, consultas y descargas disponibles, reactivación        |
| c) Un archivo privado no tiene URL pública permanente                  | Verificado | pgTAP: buckets privados; `files` y `file-scans`: solo lecturas firmadas de corta vida tras veredicto limpio; `ui-services`: la URL temporal no queda en la página; sin `getPublicUrl` en el código                                         |
| d) Un trabajo fallido se puede diagnosticar (correlación) y reintentar | Verificado | `jobs`: historial, DLQ y reintento INT-004 auditado e idempotente; `integration-logs`: una correlación de la petición al proveedor y de vuelta; `ui-services`: diagnóstico por correlación, reintento auditado y rechazo por versión vieja |

Detalle por escenario y por tarea en la [matriz de trazabilidad](../traceability.md).

## Verificado localmente frente a pendientes externos

Verificado localmente: modelo de suscripción y estados, conciliación de webhooks firmados contra Stripe simulado, modo lectura centralizado en API y UI, auditoría append-only, outbox transaccional, workers con reintentos y DLQ, Centro de trabajos y reproceso auditado, carga privada, cuarentena y escaneo con clamd local, descargas temporales auditadas, centro de notificaciones, correo con proveedor local, scheduler con adaptador falso de Stripe, logs de integración con correlación y la interfaz de F5-15.

Pendientes externos y de decisión, **no resueltos**:

| Pendiente                                                                        | Referencia         | Efecto                                                                         |
| -------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------ |
| Validación remota de Stripe (test y staging) y reconciliación contra Stripe real | F5-02 AC-10, F5-13 | Sin cobro productivo                                                           |
| Despliegue: migraciones remotas y API, web y worker en staging/producción        | Deploy de Fase 5   | Nada desplegado; ninguna migración de Fase 5 aplicada en remoto por esta tarea |
| Proveedor antimalware productivo                                                 | ADR-019 / DEC-019  | Sin escaneo real; los archivos quedan en cuarentena ante fallo                 |
| Proveedor de correo                                                              | DEC-025 / ADR-019  | Sin envío productivo; mensajes en cola y visibles                              |
| Canal del correo de recuperación                                                 | DEC-024            | Recuperación sigue en Supabase Auth                                            |
| Hospedaje del worker y del scheduler                                             | DEC-026 / ADR-021  | Sin worker en staging                                                          |
| Stripe: mora, reembolsos, contracargos y cancelación                             | DEC-017            | Requisito previo de Fase 5 productiva                                          |
| Retención, privacidad y cancelación                                              | DEC-008            | Purga de logs desactivada; sin borrado de cuentas canceladas                   |
| Adaptador PDF y productor de reportes                                            | F10-08, Fase 10    | F5-12 y F5-14 dejan el punto de integración preparado                          |

## Límites

- Las pruebas usan dobles locales (Storage, clamd, proveedor de correo, Stripe), no servicios reales. No acreditan latencia, disponibilidad ni comportamiento de proveedores reales.
- No se ejecutó ninguna prueba contra un endpoint desplegado ni contra Supabase remoto. No se generaron respaldos, RPO/RTO, escaneos de vulnerabilidades ni evidencia de IAM en este cierre.
- La accesibilidad se comprobó de forma automatizada parcial (sin axe); queda pendiente la prueba manual con lector de pantalla y zoom al 200 %.
- Hallazgos documentales y de contrato que no bloquean el cierre (D-1 a D-3, O-1 a O-4) quedan registrados en la [matriz](../traceability.md#hallazgos-registrados-no-corregidos-en-el-gate); no se corrigieron en esta tarea.
- Responsables (según la declaración de Fase 4): Eduardo, Sponsor / Tutor; Calixto Isaac Galeana Medrano, Becario / Líder Técnico, Tech Lead / QA / SecOps. Firmas no recibidas; la ratificación formal del gate queda a cargo de ellos.
