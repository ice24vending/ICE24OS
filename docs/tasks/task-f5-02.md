# TASK-F5-02 — Stripe Checkout, Portal y webhooks idempotentes

Apertura: 29/09/2026. Rama: `feat/f5-02-stripe-integration`.

**Estado: preparación de fases 1 y 2 y puerto base; integración funcional pendiente.**

## Alcance autorizado de esta entrega

Reporte y criterios de aceptación, variables de entorno, validación local de configuración, SDK fijado y fábrica sin llamadas remotas, interfaces base de `SubscriptionGateway`. Se detiene antes de implementar el adaptador funcional, endpoints, webhooks, migraciones o UI.

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

Esta validación es sintáctica: no acredita credenciales, permisos, existencia del precio, configuración del portal ni correspondencia del webhook. Las comprobaciones remotas serán parte del adaptador y de la validación con Stripe test. La versión del endpoint de eventos debe alinearse con la fijada al configurarlo. No se requiere clave pública para la redirección a Checkout alojado.

## Puerto de aplicación

`application/subscription.gateway.ts` define contextos de cuenta/correlación/idempotencia, entradas y resultados de Checkout/Portal, referencias y observaciones de suscripción, evento verificado y errores normalizados. Usa tipos propios, sin importar Stripe, NestJS ni persistencia. No traduce observaciones externas directamente en activación local.

El cliente/price/account deben resolverse y autorizarse en servidor. La implementación futura debe contrastar pertenencia de customer/subscription, persistir la clave por cuenta/operación/cuerpo y conservar eventos originales solo en almacenamiento protegido.

## Decisiones pendientes antes de implementar HTTP

- El contrato del portal exige `expiresAt`; el proveedor no expone una expiración precisa en la sesión. El puerto interno permite `null`, sin cambiar todavía el DTO HTTP. Registrar una decisión y alinear API antes de exponer el endpoint; no inventar un vencimiento.
- Cancelación, reversión y reconciliación contratadas como `202 Job`: verificar el soporte de colas existente y su conexión con F5-06/F5-07 antes de prometer esos endpoints. No reemplazar por una respuesta síncrona diferente.
- DEC-017/DEC-008 siguen pendientes para políticas productivas especiales/retención. No añadir gracia, reembolsos o borrado supuesto.

## Archivos y verificación

Cambios: `.env.example`, configuración y pruebas en `packages/config/src/stripe*`, export en config, gateway de aplicación, fábrica/prueba en infraestructura, dependencia de API y lockfile, este reporte e índice de tareas.

Verificación local del 29/09/2026: `pnpm check` aprobado (Prettier, ESLint, TypeScript, límites de módulos, infraestructura, identidad y 84 pruebas en 21 archivos). Incluye 13 pruebas nuevas de configuración y construcción del SDK. `pnpm peers check` no reporta conflictos. No se han realizado peticiones a Stripe ni configurado secretos reales. CI de F5-02 y pruebas de integración real permanecen pendientes.

## Siguientes fases

Implementar adaptador, sesiones privadas, recepción duradera y reconciliación de eventos, UI y pruebas de integración. Actualizar OpenAPI, runbook y evidencia al entregar comportamiento funcional. Esta preparación no acredita F5-02 completa.
