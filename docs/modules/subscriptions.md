# Suscripción, demo y acceso — F5-01

Responsable técnico: Tech Lead. Reglas: PRD RF-SUB-001–013, AppFlow 26, API 27, Database `subscriptions` y `subscription_events`.

## Modelo

Una suscripción por cuenta, con historia append-only de cada cambio. Estados: `demo`, `pending_activation`, `active`, `payment_failed`, `read_only`, `cancellation_scheduled`, `cancelled`, `reactivated`. El estado comercial y `accessMode` son distintos. No existe PATCH de estado.

- Plan único `ICE24_MONTHLY`, base 39900 centavos MXN, sin cuotas de usuarios, sucursales o máquinas. Las condiciones iniciales pueden configurarse antes de activar; cambios de precio pagado requieren reconciliación Stripe en F5-02.
- Demo: 14 días exactos desde la creación; una extensión debe superar tanto la fecha actual como el vencimiento previo. Expiración a lectura calculada por PostgreSQL aunque el scheduler no haya materializado el estado.
- Pago rechazado: lectura inmediata en la misma transacción que estado y auditoría. La confirmación de pago restaura acceso comercial; nunca levanta `SUSPENDED`.
- Cancelación: acceso durante el periodo pagado, lectura desde su límite exacto. `expire` materializa `cancelled`; la reversión solo se admite antes del cierre. Los límites del periodo provienen de Stripe; no se inventa un calendario de cobro local.
- Reactivación tras cancelación puede registrar una nueva suscripción externa del mismo cliente. El historial conserva el identificador anterior.
- Cliente Stripe nulo antes de activar, autorizado por el responsable el 24/09/2026. Al activar se requieren cliente, suscripción externa y periodo válido. [Decisión](../decisions/adr-022-subscription-preactivation.md).

## Demo y producción

`provisionDemo` crea cuenta y membresía propietaria para una identidad local activa, suscripción y una copia independiente de la plantilla sintética `equipment-v1`, todo en una transacción. La plantilla contiene dos sucursales y seis solicitudes borrador, repartidas desde dos meses antes hasta la fecha de creación. Los IDs son nuevos por cuenta y los textos señalan datos ficticios. Los módulos operativos futuros deberán aportar sus propias plantillas; no se simulan módulos todavía inexistentes.

`provisionProduction` crea otra cuenta, propietario y suscripción pendiente; no copia sucursales, solicitudes, archivos ni otros datos demo. Un vínculo único evita conversiones duplicadas. La demo original y su historia permanecen intactas.

Estos son casos de uso internos de aprovisionamiento, disponibles para los consumidores asíncronos de F5-06/F5-07. Este paquete no expone una creación síncrona de demos por HTTP que contradiga el contrato `202 Job`, ni declara implementado dicho centro de jobs. El alta HTTP asíncrona y el panel completo se conectarán con esos paquetes y F5-15.

## Interfaces y autorización

| Interfaz                               | Control                                                                                                  |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `GET /v1/subscription`                 | Contexto vigente, permiso `subscriptions.read`, ámbito de cuenta; sin ID de cuenta confiado al navegador |
| `POST /v1/admin/demos/{demoId}/extend` | `subscriptions.admin`, ámbito de cuenta, MFA, `If-Match`, `Idempotency-Key` y motivo                     |
| Comandos de pago/cancelación           | Solo caso de uso interno; F5-02 debe verificar firma, evento y estado canónico Stripe antes de invocarlo |

Permisos base: lectura para IA/IO/OW, administración para IA. Revocación, suspensión y denegaciones explícitas se reevalúan en servidor. Respuestas privadas `no-store`; errores normalizados y correlacionados. OpenAPI se publica en `/v1/docs` con esquema de suscripción, precio, auditoría y extensión.

La pantalla `/subscription` usa la sesión BFF exclusivamente en servidor. Muestra estado, precio, periodo, vigencia, datos ficticios, lectura, vacío, carga y error. El espacio de equipos muestra aviso demo para evitar confundir sus registros con producción.

## Límites de módulos y persistencia

`domain` implementa reglas puras; `application` usa `SubscriptionPort`; `infrastructure` aporta transacciones PostgreSQL y `interface` expone HTTP. Se reutilizan los contratos públicos `identity.provision_subscription_account`, `identity.apply_subscription_access`, `subscriptions.effective_access`, `subscriptions.demo_context` y el aprovisionador público de equipos. El controlador no consulta tablas y el dominio no importa NestJS, PostgreSQL ni Stripe.

La migración aditiva `20260924000100_phase5_subscriptions.sql` crea registros, eventos, idempotencia, conversiones, permisos y funciones. Eventos y conversiones son inmutables; la identidad de la suscripción no se modifica ni elimina. IDs externos únicos, FK de auditoría compuesta por cuenta y versión optimista protegen consistencia. Las tablas no son accesibles para roles del navegador.

Las lecturas usan índices por cuenta/ID, sin listas ilimitadas. El aprovisionamiento de la plantilla es acotado. Las mutaciones serializan reintentos por actor, cuenta, operación y clave; una clave con otro cuerpo o versión devuelve conflicto. Auditoría, acceso, resultado idempotente y estado se confirman juntos.

## Observabilidad y límites de entrega

F5-03 incorpora `AccountWriteGuard`, compuesto por `AuthenticationGuard` después de verificar identidad. Las mutaciones privadas consultan el modo efectivo vigente y devuelven `403 ACCOUNT_READ_ONLY` antes del controlador; los controles transaccionales y de permisos se conservan. Las lecturas mantienen autorización normal. Excepciones por método permiten Checkout/Portal y autoservicio de identidad sin habilitar operaciones de negocio. La UI de equipos bloquea formularios y callbacks y reconoce rechazos posteriores a la carga. Alcance, matriz de estados y validación pendiente en [F5-03](../tasks/task-f5-03.md).

F5-02 añade `BillingService`, `StripeSubscriptionGateway` y rutas privadas `/v1/subscription/checkout` y `/v1/subscription/portal`. Ver [ADR-023](../decisions/adr-023-stripe-sessions.md). El SDK vive en infraestructura; contratos y dominio no lo importan. La reserva `subscriptions.checkout_intents` persiste antes de la llamada externa y serializa sesiones por cuenta, incluyendo reintentos desde demo y desde producción. La sesión no activa acceso.

`WebhooksController` recibe `/v1/webhooks/stripe` con firma sobre cuerpo crudo. `WebhookPort` y `WebhookDatabase` conservan el recibo antes de consultar Stripe; `domain/reconciliation` decide el estado a partir de observaciones actuales. Recibos deduplicados, estado comercial, acceso y auditoría de actor STRIPE siguen [ADR-024](../decisions/adr-024-stripe-webhook-reconciliation.md). El procesamiento fallido responde 503 para reentrega; no hay trabajo en memoria tras responder. Los endpoints administrativos de reconciliación `202 Job` siguen pendientes.

Logs `module=subscriptions`, correlación, evento, resultado y duración; sin payload de Stripe ni datos de propietario. Los eventos de negocio conservan actor, contexto, motivo, antes y después. Véase [operación](../runbooks/stripe.md).

F5-02 integra Checkout, portal, webhooks, orden de eventos y reconciliación. F5-03 amplía la matriz transversal de modo lectura. F5-13 materializa los vencimientos desde el scheduler (`subscriptions.expire_due`, actor `SYSTEM`, eventos `DEMO_EXPIRED` y `SUBSCRIPTION_CANCELLED` con la validación de estado del comando `expire`) y registra hallazgos de reconciliación con Stripe sin corregir el estado ([scheduler](scheduler.md)). F5-15 completa las pantallas administrativas. DEC-008 y DEC-017 siguen pendientes para retención, reembolsos y acuerdos comerciales no definidos; este paquete no inventa esas políticas.
