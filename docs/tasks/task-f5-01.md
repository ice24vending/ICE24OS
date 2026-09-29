# TASK-F5-01 — Suscripción, demo y estados de acceso

Apertura: 23/09/2026. Implementación autorizada: 24/09/2026. Revisión local: 25/09/2026.

**Estado: implementada localmente; CI remota, revisión humana y despliegue pendientes.** El gate de Fase 4 permanece aceptado. Esta entrega no declara terminada la Fase 5.

## Resultado y trazabilidad

- Modelo de los ocho estados de RF-SUB-007 y separación de acceso comercial/seguridad.
- Plan único de 39900 centavos MXN y configuración de condiciones antes de activar, sin cuotas de usuarios, sucursales o máquinas.
- Demo de 14 días, extensión con motivo/versionado y vencimiento efectivo sin esperar al scheduler.
- Plantilla sintética independiente de dos sucursales y seis solicitudes borrador, con fechas que abarcan dos meses. Marca visible de datos ficticios; no se simulan módulos futuros.
- Conversión a una cuenta productiva nueva, sin copiar registros ficticios; vínculo único para evitar duplicados y conservación de la demo original.
- Rechazo de pago con acceso de lectura transaccional; reactivación sin levantar suspensiones de seguridad. Cancelación conserva acceso hasta el límite exacto del periodo pagado.
- Auditoría append-only, aislamiento por cuenta, RLS para navegador, control de versión, idempotencia y rollback.
- Consulta privada, extensión administrativa con MFA, OpenAPI, errores normalizados y pantalla de estado con carga/vacío/error.

Fuentes contrastadas: PRD 8.21 RF-SUB-001–013, Database suscripciones/eventos, API Subscription y sección 27, AppFlow 26, UI_UX 28, TRD Subscription y PROJECT_RULES. El resumen de TASKS se completa con pendiente de activación y cancelación programada exigidos por el PRD. El precio mensual y sus periodos no sustituyen la confirmación futura de Stripe.

## Decisión aprobada y límites

El responsable autorizó cliente Stripe nulo antes de activar; queda registrado en [ADR-022](../decisions/adr-022-subscription-preactivation.md), Database y API. No se inventaron IDs de Stripe ni reglas de retención, reembolsos o gracia.

Los comandos de pago y aprovisionamiento son casos de uso internos. Checkout, portal, verificación/reconciliación de eventos son F5-02. El endpoint asíncrono de alta demo `202 Job` y sus consumidores se conectarán con F5-06/F5-07; el panel completo es F5-15. F5-13 conectará la materialización de vencimientos; la restricción efectiva de acceso ya se calcula por reloj. No se expuso una mutación HTTP de estado ni un alta síncrona alternativa.

## Archivos y contratos

| Área                    | Archivos principales                                                                                            |
| ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| Contratos               | `packages/contracts/src/subscription.ts`, export en `index.ts`                                                  |
| Dominio y aplicación    | `apps/api/src/modules/subscriptions/domain`, `application`, puerto transaccional                                |
| Persistencia e interfaz | `infrastructure`, `interface`, módulo Nest y registro en `app.module.ts`                                        |
| Base de datos           | Nueva `supabase/migrations/20260924000100_phase5_subscriptions.sql`; README de database                         |
| Identidad/equipos       | Resolución de acceso en identidad, funciones públicas de cuenta, aprovisionador sintético y aviso demo          |
| Web                     | `features/subscription`, ruta `/subscription`, loading y enlace desde workspace                                 |
| Pruebas                 | Dominio, `tests/integration/subscriptions.test.ts`, fixture de migraciones en equipment y QA local de identidad |
| Documentación           | Database/API, ADR-022, módulo, runbook, estado de fase e índices                                                |

Los cambios en registro de módulos, rutas, identidad/equipos, migraciones Supabase y fixtures son conexiones necesarias a la estructura existente. No se cambiaron migraciones aplicadas ni se eliminaron archivos funcionales. No se añadieron dependencias ni se modificó el lockfile. Se preservaron los cambios de arranque que ya estaban staged.

Endpoints: `GET /v1/subscription` y `POST /v1/admin/demos/{demoId}/extend`. La segunda operación exige `If-Match`, `Idempotency-Key`, MFA y permiso administrativo. Se documentan en `/v1/docs`; DTOs independientes de persistencia.

## Verificación

- `pnpm install --frozen-lockfile`: instalación local reconciliada; Prettier 3.9.6 verificado. El intento de comprobar una actualización de pnpm falló por red, sin impedir la instalación.
- `pnpm format` y `pnpm format:check`: ejecutados. Los scripts locales resuelven Prettier; se documentó el problema de resolución de `pnpm exec` en este entorno.
- `pnpm check`: aprobado; formato, lint, TypeScript, límites de módulos, infraestructura/identidad y 71 pruebas unitarias en 19 archivos.
- `pnpm build`: 14 tareas aprobadas; ruta privada de suscripción incluida.
- Integración: PostgreSQL desechable, HTTP/OpenAPI y Chromium; el resultado final y las condiciones de reproducción se registran en [QA F5-01](../qa/phase-5/README.md).

No se ejecutaron CI remota, migraciones remotas, cobros ni llamadas Stripe reales. La aprobación humana del comportamiento completo y la promoción remota quedan pendientes; el código local no constituye aprobación del gate de Fase 5.

## Seguridad, operación y pendientes

La suscripción resuelve cuenta desde el contexto autenticado. No hay endpoints que acepten pagos confirmados por el navegador. El acceso se vuelve a consultar en identidad; la demo expirada no espera a un job para restringir escritura. Eventos, actualización comercial/acceso y respuesta idempotente comparten transacción. Índices por cuenta/ID y una plantilla acotada evitan consultas crecientes sin límite.

La migración debe preceder al nuevo binario. El rollback conserva tablas y evidencia y requiere revisar vencimientos efectivos, como explica el [runbook](../runbooks/stripe.md). Los logs conservan correlación y duración sin payloads de pago. No hay borrado de historia ni nuevo proveedor.

Validación manual antes de promover: revisar `/subscription` con propietario, demo y cuenta sin suscripción; confirmar precios/permisos en staging; probar extensión con MFA y comprobar cuenta productiva vacía. Resolver DEC-008/DEC-017 antes de políticas comerciales/retención productivas. No sustituir esa revisión con los fixtures sintéticos.
