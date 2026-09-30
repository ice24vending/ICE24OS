# TASK-F5-02 — Stripe Checkout, Portal y webhooks idempotentes

Apertura: 29/09/2026. Rama: `feat/f5-02-stripe-integration`.

**Estado: fases 1–4 implementadas y validadas localmente; webhooks y reconciliación pendientes.**

## Alcance autorizado de esta entrega

Preparación registrada en commit `b57c48e` con el mensaje solicitado. La ampliación autorizada incluye adaptador SDK, Checkout y Portal, autorización de propietario, conversión limpia y persistente desde demos y pruebas. No incluye recepción HTTP de webhooks, reconciliación de pagos, jobs ni UI.

## Fuentes y dependencias

- [TASKS F5-02](../../context/TASKS.md#task-f5-02--integrar-stripe-checkoutportal-y-webhooks-idempotentes), PRD RF-SUB-001–013 y RF-INT-001.
- [API](../../context/API.md), secciones 27, 31–33; [Architecture](../../context/Architecture.md), puerto `SubscriptionGateway`; Database, suscripciones y eventos.
- Fase 4 aprobada. F5-01 integrada en `main` mediante PR #9, nueve checks remotos aprobados.
- F2-07 y disponibilidad operativa de colas, objetos, identidad y secretos: confirmar en el ambiente de integración antes de pruebas remotas.
- [ADR-022](../decisions/adr-022-subscription-preactivation.md): cliente nulo antes de activar; obligatorio para suscripción pagada.

## Criterios de aceptación de F5-02 completa

| ID    | Criterio                                                                           | Evidencia requerida                                         | Estado    |
| ----- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------- | --------- |
| AC-01 | Checkout/Portal autorizados por cuenta y propietario, URLs de retorno controladas  | Contrato, autorización y aislamiento negativos              | Pendiente |
| AC-02 | Stripe confirma el pago; volver desde Checkout no activa acceso                    | Prueba de retorno sin pago y pago confirmado                | Pendiente |
| AC-03 | Firma validada sobre cuerpo original y entorno correcto                            | Firma inválida, cuerpo alterado, test/live                  | Pendiente |
| AC-04 | Duplicados y reintentos no repiten efectos; concurrencia y fallos son recuperables | Persistencia, rollback, reentrega y concurrencia            | Pendiente |
| AC-05 | Eventos tardíos/desordenados se reconcilian con Stripe                             | Eventos invertidos y consulta de estado actual              | Pendiente |
| AC-06 | Rechazo restringe escritura; reactivación conserva suspensión de seguridad         | Integración de estados y acceso                             | Pendiente |
| AC-07 | Cancelación conserva acceso hasta fin del periodo pagado                           | Cancelación/reversión y límites temporales                  | Pendiente |
| AC-08 | Contratación desde demo produce cuenta productiva limpia                           | Aislamiento, conversión única y ausencia de datos ficticios | Pendiente |
| AC-09 | Auditoría y correlación permiten investigar fallos sin filtrar credenciales        | Pruebas de observabilidad y recuperación                    | Pendiente |
| AC-10 | Contratos, OpenAPI, documentación y pruebas pasan CI                               | CI, reporte y validación manual con Stripe test             | Pendiente |

## Configuración y SDK preparados

| Variable                         | Requisito                                                                                    |
| -------------------------------- | -------------------------------------------------------------------------------------------- |
| `STRIPE_SECRET_KEY`              | Secreta, `sk_` o `rk_`; test en development/test/staging y live en production                |
| `STRIPE_WEBHOOK_SECRET`          | Secreto `whsec_` del endpoint/listener del ambiente                                          |
| `STRIPE_PRICE_ID`                | ID `price_`; verificar remotamente moneda MXN, recurrencia mensual y condiciones del plan    |
| `STRIPE_PORTAL_CONFIGURATION_ID` | Opcional, `bpc_`; vacío usa configuración predeterminada                                     |
| `PRIVATE_WEB_URL`                | Origen HTTPS sin credenciales, ruta, query ni fragmento; HTTP local solo en development/test |

SDK `stripe@22.6.2` fijado en API y lockfile; versión de API `2026-08-26.dahlia` compatible con sus tipos. Fábrica con timeout de 10 segundos y dos reintentos. No se inicializa al arrancar la aplicación todavía. `parseStripeConfig` valida antes de construir; errores enumeran nombres de variables sin valores. No registrar el objeto de configuración.

La configuración se valida sintácticamente antes de construir el cliente; esto no acredita credenciales ni permisos. El adaptador comprueba precio y pertenencia de cliente al invocarse; su validación con Stripe test permanece pendiente. La versión del endpoint de eventos debe alinearse con la fijada al configurarlo. No se requiere clave pública para la redirección a Checkout alojado.

## Puerto de aplicación

`application/subscription.gateway.ts` define contextos de cuenta/correlación/idempotencia, entradas y resultados de Checkout/Portal, referencias y observaciones de suscripción, evento verificado y errores normalizados. Usa tipos propios, sin importar Stripe, NestJS ni persistencia. No traduce observaciones externas directamente en activación local.

El cliente/price/account se resuelven en servidor. El adaptador contrasta pertenencia de customer/subscription; la aplicación persiste claves por cuenta/operación/cuerpo. La fase de webhooks deberá conservar eventos originales solo en almacenamiento protegido.

## Decisiones pendientes antes de implementar HTTP

- La expiración del Portal queda resuelta en [ADR-023](../decisions/adr-023-stripe-sessions.md): `expiresAt:null`, rutas solicitadas y cuenta objetivo en respuesta. API/OpenAPI alineados.
- Cancelación, reversión y reconciliación contratadas como `202 Job`: verificar el soporte de colas existente y su conexión con F5-06/F5-07 antes de prometer esos endpoints. No reemplazar por una respuesta síncrona diferente.
- DEC-017/DEC-008 siguen pendientes para políticas productivas especiales/retención. No añadir gracia, reembolsos o borrado supuesto.

## Archivos y verificación

Cambios: `.env.example`, configuración y pruebas en `packages/config/src/stripe*`, export en config, gateway de aplicación, fábrica/prueba en infraestructura, dependencia de API y lockfile, este reporte e índice de tareas.

Verificación local del 29/09/2026: `pnpm check` aprobado (Prettier, ESLint, TypeScript, límites de módulos, infraestructura, identidad y 84 pruebas en 21 archivos). Incluye 13 pruebas nuevas de configuración y construcción del SDK. `pnpm peers check` no reporta conflictos. No se han realizado peticiones a Stripe ni configurado secretos reales. CI de F5-02 y pruebas de integración real permanecen pendientes.

## Siguientes fases

Completar recepción duradera y reconciliación de eventos, UI y validación Stripe test. Esta entrega no acredita F5-02 completa.

## Entrega de fases 3 y 4

- Adaptador del SDK: validación de precio/cliente, sesiones con metadatos de cuenta e idempotencia, consulta/cancelación por puerto y verificación criptográfica de eventos sin receptor HTTP.
- Checkout/Portal privados con autorización de cuenta y propietario, retorno al origen permitido, errores normalizados, contratos y OpenAPI.
- Reserva previa durable, cuenta productiva limpia conservada tras fallo y reutilización del vínculo de conversión. No se activa acceso por crear sesión ni por volver del navegador.
- Migración aditiva `20260929000100_phase5_checkout_intents.sql`, RLS, serialización por cuenta y bloqueo de reintentos inciertos tras 23 horas.
- Pruebas nuevas del adaptador y cuatro escenarios HTTP/PostgreSQL: concurrencia, aislamiento/propietario, persistencia tras fallo y Portal sin aprovisionamiento accidental.

Verificación final de fases 3/4: `pnpm check` aprobado con 91 pruebas en 22 archivos; `git diff --check` sin errores. Tras iniciar Docker, `pnpm test:integration` pasó con 26 pruebas y dos de navegador omitidas. Con `ICE24_BROWSER_TESTS=1` pasaron las 28 pruebas en tres archivos, incluidas las 13 de suscripciones, PostgreSQL/PostGIS y Chromium. Fue necesario acceso a Docker fuera del aislamiento. Las llamadas al SDK se prueban con métodos simulados y los endpoints de integración usan gateway simulado; no se hicieron cobros ni peticiones a Stripe remoto.
