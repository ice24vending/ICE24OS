# Operación de suscripciones — F5-01

F5-01 implementa el modelo local. F5-02 incorpora Checkout y Portal mediante el SDK; la recepción HTTP de webhooks y su reconciliación siguen pendientes. No promover cobros reales hasta completar ese flujo y su validación.

## Sesiones F5-02

Aplicar también `20260929000100_phase5_checkout_intents.sql` antes del nuevo binario. Configurar las variables de `.env.example` en el servidor; en local y staging usar Stripe test. El precio debe ser activo, mensual, de una unidad, MXN y coincidir con las condiciones de la suscripción. El portal debe configurarse para el plan único, evitando cambios de cantidad/plan fuera del contrato.

`POST /v1/subscription/checkout` recibe `{returnUrl,cancelUrl}`; `POST /v1/subscription/portal` recibe `{returnUrl}`. Ambos requieren bearer, `X-ICE24-Context-Id`, propietario activo con ámbito de cuenta e `Idempotency-Key` de 8–200 caracteres. Retornos limitados al origen `PRIVATE_WEB_URL`. Respuesta 201 `{url,expiresAt,accountId}`; en Portal expiración nula. Crear otra clave por nueva visita, conservándola solo para reintentar la misma solicitud.

La demo conserva sus datos y la cuenta productiva queda pendiente. Ante 503, reintentar con misma clave/cuerpo: la cuenta y reserva sobreviven al fallo. Un 409 por una reserva incierta de más de 23 horas requiere investigar la sesión/customer en Stripe antes de recuperar manualmente; no borrar la reserva ni crear otra cuenta. Un Checkout vigente con otros retornos/precio también devuelve 409. Una suscripción existente se gestiona por Portal.

Las sesiones/cuentas de Stripe incluyen `ice24AccountId`; IDs de cliente y precio nunca se aceptan del navegador. Sin configuración válida, solo facturación devuelve 503. Logs no deben incluir URLs de sesiones, cuerpos de Stripe ni secretos. Rollback conserva reservas, conversiones y eventos.

## Despliegue compatible

1. Conservar respaldo y evidencia del ambiente objetivo según el runbook de despliegue.
2. Aplicar la nueva migración `20260924000100_phase5_subscriptions.sql` después de Fase 4. No modifica ni inscribe cuentas existentes; las que carecen de suscripción conservan su acceso anterior.
3. Verificar tablas, funciones, permisos y restricciones en un ambiente no productivo. La migración se prueba sobre PostgreSQL 17 desechable en integración.
4. Desplegar API y web después de la migración: identidad y equipos consultan las nuevas funciones de acceso/demo.
5. Revisar `/v1/docs`, consulta de una cuenta autorizada, aislamiento negativo, expiración, suspensión y extensión con MFA.

Rollback: volver al binario anterior y conservar la migración y evidencia append-only. No eliminar tablas ni revertir permisos comerciales mediante borrado. Antes de revertir código, materializar los vencimientos afectados mediante los casos de uso autorizados para que el binario anterior no dependa del cálculo dinámico nuevo. No ejecutar rollback sobre cuentas activas sin revisar ese impacto.

## Diagnóstico

| Síntoma                             | Comprobación                                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 404 de suscripción                  | Contexto y existencia de inscripción; cuentas antiguas no se inscriben automáticamente                              |
| 403 al extender                     | Permiso IA, ámbito de cuenta, MFA, sesión vigente y cuenta administrativa activa                                    |
| 409 al extender                     | Actualizar versión; revisar nueva fecha; conservar clave/cuerpo originales solo para un reintento idéntico          |
| Pago confirmado y cuenta suspendida | `SUSPENDED` es independiente del pago y no debe levantarse comercialmente                                           |
| Demo vencida con estado `demo`      | La lectura efectiva ya está limitada por reloj; `expire` materializa el estado cuando se conecte el scheduler F5-13 |
| Función de acceso inexistente       | Orden de despliegue incorrecto: aplicar migración antes del nuevo binario                                           |

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
