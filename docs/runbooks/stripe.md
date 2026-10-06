# Operación de suscripciones — F5-01/F5-02

F5-01 implementa el modelo local. F5-02 incorpora Checkout, Portal y recepción/reconciliación de webhooks mediante el SDK. La validación local usa firmas reales del SDK y respuestas de consulta simuladas; Stripe test remoto y staging siguen pendientes antes de promover cobros reales.

## Sesiones F5-02

Aplicar también `20260929000100_phase5_checkout_intents.sql` antes del nuevo binario. Configurar las variables de `.env.example` en el servidor; en local y staging usar Stripe test. El precio debe ser activo, mensual, de una unidad, MXN y coincidir con las condiciones de la suscripción. El portal debe configurarse para el plan único, evitando cambios de cantidad/plan fuera del contrato.

`POST /v1/subscription/checkout` recibe `{returnUrl,cancelUrl}`; `POST /v1/subscription/portal` recibe `{returnUrl}`. Ambos requieren bearer, `X-ICE24-Context-Id`, propietario activo con ámbito de cuenta e `Idempotency-Key` de 8–200 caracteres. Retornos limitados al origen `PRIVATE_WEB_URL`. Respuesta 201 `{url,expiresAt,accountId}`; en Portal expiración nula. Crear otra clave por nueva visita, conservándola solo para reintentar la misma solicitud.

La demo conserva sus datos y la cuenta productiva queda pendiente. Ante 503, reintentar con misma clave/cuerpo: la cuenta y reserva sobreviven al fallo. Un 409 por una reserva incierta de más de 23 horas requiere investigar la sesión/customer en Stripe antes de recuperar manualmente; no borrar la reserva ni crear otra cuenta. Un Checkout vigente con otros retornos/precio también devuelve 409. Una suscripción existente se gestiona por Portal.

Las sesiones/cuentas de Stripe incluyen `ice24AccountId`; IDs de cliente y precio nunca se aceptan del navegador. Sin configuración válida, solo facturación devuelve 503. Logs no deben incluir URLs de sesiones, cuerpos de Stripe ni secretos. Rollback conserva reservas, conversiones y eventos.

## Despliegue compatible

Para webhooks, aplicar también `20260929000200_phase5_stripe_webhooks.sql` tras la migración de reservas. Registra auditoría del proveedor sin usuario humano: `audit.updatedBy` puede ser nulo. Un rollback debe conservar la migración y usar un binario compatible con ese contrato.

## Webhooks y recuperación

Registrar `/v1/webhooks/stripe` en el ambiente correspondiente con versión `2026-08-26.dahlia`. Escuchar `invoice.paid`, `invoice.payment_succeeded`, `invoice.payment_failed`, `invoice.payment_action_required`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `checkout.session.completed` y sus eventos de pago asíncrono. No requiere bearer ni contexto de usuario; requiere firma válida. El listener local y el endpoint remoto tienen secretos distintos.

Para pruebas locales con credenciales de prueba:

```powershell
stripe listen --forward-to http://127.0.0.1:3001/v1/webhooks/stripe
```

Configurar el secreto mostrado por el listener como `STRIPE_WEBHOOK_SECRET` solo en el entorno local. Realizar un Checkout del plan configurado para validar cliente, metadatos, precio y factura; un evento sintético sin relación con una cuenta local puede quedar FAILED por falta de correspondencia.

El receptor conserva bytes/hash antes de consultar Stripe, responde 200 tras aplicar/ignorar y 503 si debe reintentarse. En Stripe, reenviar el mismo evento al endpoint del ambiente para recuperar fallos; el SDK volverá a validar una firma vigente. No editar estados ni eliminar recibos. Revisar únicamente metadatos de diagnóstico:

```sql
select provider_event_id,event_type,status,attempts,deliveries,error_code,correlation_id,received_at
from subscriptions.stripe_webhooks
where status in ('RECEIVED','FAILED') order by received_at limit 100;
```

`DEPENDENCY_UNAVAILABLE`: comprobar conectividad/configuración Stripe. `RECONCILIATION_CONFLICT`: revisar pertenencia de cuenta/cliente, importe y periodos sin modificar evidencia. `PROCESSING_FAILED`: investigar restricciones o disponibilidad de base de datos mediante correlación. Un 409 indica que el mismo ID llegó con otros bytes; conservar ambas entregas en la fuente antes de investigar. No volcar payloads, URLs de sesiones o secretos a logs.

La consulta actual de Stripe evita regresiones por eventos atrasados. Se conserva un periodo ya pagado; un rechazo restringe inmediatamente. Reactivar comercialmente nunca elimina SUSPENDED. La prueba de rollback comprueba que un fallo al insertar auditoría tampoco cambia acceso ni suscripción.

## Despliegue del modelo base

1. Conservar respaldo y evidencia del ambiente objetivo según el runbook de despliegue.
2. Aplicar la nueva migración `20260924000100_phase5_subscriptions.sql` después de Fase 4. No modifica ni inscribe cuentas existentes; las que carecen de suscripción conservan su acceso anterior.
3. Verificar tablas, funciones, permisos y restricciones en un ambiente no productivo. La migración se prueba sobre PostgreSQL 17 desechable en integración.
4. Desplegar API y web después de la migración: identidad y equipos consultan las nuevas funciones de acceso/demo.
5. Revisar `/v1/docs`, consulta de una cuenta autorizada, aislamiento negativo, expiración, suspensión y extensión con MFA.

Rollback: volver al binario anterior y conservar la migración y evidencia append-only. No eliminar tablas ni revertir permisos comerciales mediante borrado. Antes de revertir código, materializar los vencimientos afectados mediante los casos de uso autorizados para que el binario anterior no dependa del cálculo dinámico nuevo. No ejecutar rollback sobre cuentas activas sin revisar ese impacto.

## Diagnóstico

| Síntoma                             | Comprobación                                                                                                                      |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 404 de suscripción                  | Contexto y existencia de inscripción; cuentas antiguas no se inscriben automáticamente                                            |
| 403 al extender                     | Permiso IA, ámbito de cuenta, MFA, sesión vigente y cuenta administrativa activa                                                  |
| 409 al extender                     | Actualizar versión; revisar nueva fecha; conservar clave/cuerpo originales solo para un reintento idéntico                        |
| Pago confirmado y cuenta suspendida | `SUSPENDED` es independiente del pago y no debe levantarse comercialmente                                                         |
| Demo vencida con estado `demo`      | La lectura efectiva ya está limitada por reloj; `subscriptions.expirations` la materializa cada 5 min ([scheduler](scheduler.md)) |
| Función de acceso inexistente       | Orden de despliegue incorrecto: aplicar migración antes del nuevo binario                                                         |

Consultar eventos de suscripción por cuenta/ID y logs por correlación. No modificar eventos ni imprimir datos personales, tokens o credenciales. No llamar comandos internos de pago a partir de parámetros del navegador.

## Reproducción local

```powershell
pnpm install --frozen-lockfile
pnpm format
pnpm check
pnpm build
$env:ICE24_BROWSER_TESTS = '1'
pnpm test:integration
Remove-Item Env:ICE24_BROWSER_TESTS
```

Requiere Docker Desktop activo y Chromium instalado mediante el Playwright fijado en el lockfile. En este entorno `pnpm exec` no resolvía el binario de Prettier; los scripts `pnpm format` y `pnpm format:check` sí lo resuelven. Alternativa verificable: `node node_modules/prettier/bin/prettier.cjs --check .`. No instalar otra versión global ni cambiar el lockfile para ese problema de resolución.

El aprovisionamiento interno recibe un propietario ya activo y contexto administrativo autorizado. Se integra con jobs en F5-06/F5-07; no tiene todavía un endpoint público de creación. Los datos sintéticos cubren los módulos existentes de sucursales/solicitudes, no mantenimiento o sanidad futuros.

## Modo lectura centralizado — F5-03

Ante `403 ACCOUNT_READ_ONLY`, consultar `/v1/subscription` y el contexto vigente: activación pendiente, pago rechazado, demo vencida o cancelación efectiva pueden restringir escritura. Conservar `correlationId` para diagnóstico. No cambiar manualmente a ACTIVE para resolver un rechazo de pago; seguir reconciliación de Stripe y las reglas aprobadas. No eliminar SUSPENDED para recuperar facturación.

Checkout/Portal permanecen disponibles para propietario autorizado en READ_ONLY. Las consultas y descargas existentes continúan con sus permisos habituales; crear nuevos documentos es una mutación. El cliente puede actualizar datos o seleccionar otro contexto. Si una acción nueva de cuenta no usa `AuthenticationGuard`, debe incorporarse a la autenticación/guardia común antes de publicarla; no añadir excepciones genéricas por prefijo de ruta. Ver [matriz de endpoints y excepciones](../tasks/task-f5-03.md). Implementación local pendiente de suite, según el punto de revisión solicitado.

## Logs de integración y correlación — F5-14

Cada operación del adaptador queda en `infra.integration_logs` (integración `stripe`), con la cuenta, la correlación de la petición, el estado HTTP o código de Stripe y la clave de idempotencia como `effect_key`: `checkout.session.create`, `portal.session.create`, `subscription.retrieve` y `subscription.cancellation.update`. Cada entrega de webhook queda como `webhook.receive` `INBOUND`, con el id del evento y el número de entrega como intento; un 503 se registra como `FAILED` (`WEBHOOK_PROCESSING_FAILED`, reintentable). No se registran payloads, URLs de sesión, metadata completa ni secretos.

- **Correlación de Checkout.** La sesión lleva `metadata.ice24CorrelationId` con la correlación de la petición que la creó. El webhook `checkout.session.*` la retoma: el recibo (`subscriptions.stripe_webhooks.correlation_id`), la reconciliación, la consulta a Stripe, la auditoría y el outbox comparten esa correlación. La correlación de la entrega HTTP queda en `request_correlation_id`. La suscripción no lleva la correlación, de modo que los eventos de renovación conservan la de su primera entrega.
- **Diagnóstico de un pago.** Partir del `correlationId` del error o de `subscriptions.stripe_webhooks`, y consultar `GET /api/v1/admin/integration-logs?correlationId=<uuid>` o `?integration=stripe&status=FAILED`. Un `subscription.retrieve` fallido con `responseCode` 5xx es indisponibilidad de Stripe: el webhook respondió 503 y Stripe reentregará. Un 4xx o `STATE_TRANSITION_INVALID` indica pertenencia de cliente o precio incorrectos y requiere revisión, no reintento.
- **Reintentos.** Las reentregas del mismo evento son intentos nuevos de la misma fila lógica (mismo `effect_key`), así que se ve cuántas veces llegó y con qué resultado. El efecto comercial sigue siendo idempotente por recibo (ADR-024).
- Procedimiento completo por correlación en el [runbook de observabilidad](observability.md#rastrear-un-incidente-por-correlación-f5-14).
