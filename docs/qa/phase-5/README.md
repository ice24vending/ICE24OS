# QA de Fase 5 — Suscripción, auditoría, archivos, jobs y notificaciones

## Gate de salida (06/10/2026)

**Dictamen: aprobado con pendientes externos.** Revisión `main` `cdbded7`; corrida completa local sobre esa revisión. Declaración: [20261006-declaracion-cierre](evidence/20261006-declaracion-cierre.md). Trazabilidad tarea → criterios → pruebas → evidencia: [matriz](traceability.md).

| Comando                                                          | Resultado                                                                      | Evidencia                                           |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------- |
| `pnpm check`                                                     | 408 pruebas en 68 archivos; formato, lint, tipos y controles aprobados         | [Salida](evidence/20261006-f5-gate-check.txt)       |
| `pnpm build` (con `ICE24_STORAGE_ORIGIN=http://127.0.0.1:54329`) | 14 tareas aprobadas                                                            | [Salida](evidence/20261006-f5-gate-build.txt)       |
| `ICE24_BROWSER_TESTS=1 pnpm test:integration`                    | 106 pruebas en 14 archivos, sin omisiones (incluye Chromium y el E2E de F5-15) | [Salida](evidence/20261006-f5-gate-integration.txt) |
| Suites de los escenarios, reporte detallado                      | 66 pruebas nombradas en 8 archivos                                             | [Salida](evidence/20261006-f5-gate-scenarios.txt)   |
| `supabase db reset`, `db lint`, `supabase test db`               | 23 migraciones; pgTAP 320 pruebas en 15 archivos                               | [Salida](evidence/20261006-f5-gate-supabase.txt)    |

Escenarios del criterio de salida, todos verificados localmente: (a) acción sensible con auditoría y eventos, (b) pago rechazado → solo lectura inmediata, (c) archivo privado sin URL pública permanente, (d) trabajo fallido diagnosticable por correlación y reintentable. Pendientes externos sin resolver: Stripe remoto (F5-02), despliegue, antimalware (ADR-019), proveedor de correo (DEC-025) y recuperación (DEC-024), host del worker (DEC-026), DEC-017 y DEC-008.

### Reproducción en PowerShell

Requiere Docker activo, las versiones de Node/pnpm del repositorio y Supabase CLI. Desde la raíz, detenerse ante el primer fallo:

```powershell
pnpm install --frozen-lockfile
pnpm check
$env:ICE24_STORAGE_ORIGIN = 'http://127.0.0.1:54329'
pnpm build
Remove-Item Env:ICE24_STORAGE_ORIGIN
pnpm exec playwright install chromium
$env:ICE24_BROWSER_TESTS = '1'
pnpm test:integration
Remove-Item Env:ICE24_BROWSER_TESTS
pnpm exec supabase start
pnpm exec supabase db reset --local --no-seed
pnpm exec supabase db lint --local --level error
pnpm exec supabase test db
pnpm exec supabase stop
```

Sin `ICE24_BROWSER_TESTS=1` se omiten las pruebas de navegador y la corrida no acredita los 106 casos. El build debe incluir el origen del doble de Storage para que la CSP permita la carga directa en Chromium.

## QA F5-01 — Suscripción, demo y acceso

Validación local final: 25/09/2026, America/Mexico_City. Entorno: Windows, Node 24.19.0, pnpm 11.24.0, Prettier 3.9.6, Docker Desktop, PostgreSQL 17 desechable y Chromium de Playwright. No se usaron datos reales ni Stripe remoto.

| Comando                                       | Resultado                                                                                                                      | Evidencia                                   |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| `pnpm check`                                  | 71 pruebas unitarias en 19 archivos; formato, lint, TypeScript y controles de arquitectura/infraestructura/identidad aprobados | [Salida](evidence/20260925-check.txt)       |
| `pnpm build`                                  | 14 tareas aprobadas                                                                                                            | [Salida](evidence/20260925-build.txt)       |
| `ICE24_BROWSER_TESTS=1 pnpm test:integration` | 24 pruebas aprobadas, 3 archivos, sin omisiones                                                                                | [Salida](evidence/20260925-integration.txt) |

Las 24 integraciones son 9 de suscripciones, 14 de equipos y 1 PostgreSQL/PostGIS. Las 71 unitarias incluyen 8 del dominio de suscripción. No se suman las comprobaciones internas de cada prueba como si fueran casos independientes.

### Cobertura de las 9 integraciones nuevas

1. HTTP autenticado, errores normalizados, OpenAPI, extensión y ausencia de PATCH de estado.
2. Demo independiente, plantilla de dos meses, periodo de 14 días, idempotencia y contexto ajeno rechazado.
3. Denegación a propietarios sin administración, MFA insuficiente y contexto revocado.
4. Extensiones concurrentes, versión obsoleta y auditoría append-only.
5. Cuenta productiva limpia, conversión única, rechazo/reactivación y suspensión de seguridad conservada.
6. Vencimiento efectivo sin esperar al scheduler y recuperación por extensión.
7. Rollback completo cuando falla la copia de fixtures.
8. Chromium: sesión BFF, demo, expiración/lectura, estado vacío, acceso anónimo, foco de teclado y ancho móvil.
9. Roles del navegador sin acceso SQL, referencia de auditoría entre cuentas rechazada y prohibición de borrado de suscripción.

Capturas revisadas: `tmp/phase5-subscription-desktop.png` (1280×800) y `tmp/phase5-subscription-mobile.png` (375×812). Se corrigió el margen negativo heredado del formulario de acceso; el test verifica que el encabezado permanezca visible y que no haya desbordamiento horizontal. Las capturas son locales y no se versionan.

Durante la preparación se corrigieron un cast UUID en un fixture, el cierre doble de un pool y la espera de redirección de Next.js en Chromium. Tras la interrupción de la sesión fue necesario reabrir Docker. Estos intentos previos no se presentan como aprobados; la salida enlazada corresponde a la corrida final verde.

### Reproducción y límites

Seguir el [runbook](../../runbooks/stripe.md): dependencias del lockfile, Docker activo, Chromium instalado, `pnpm check`, `pnpm build` y la suite de integración con la variable de navegador activada. Las pruebas crean y retiran bases/contenedores desechables.

Quedan pendientes CI remota, validación humana en staging, aplicación de la migración y despliegue. La integración real de Stripe corresponde a F5-02. Estas pruebas no acreditan los gates pendientes de Fase 5 ni módulos operativos futuros.

## F5-10 — Descargas auditadas

219 unitarias, 77 integraciones con Chromium sin omisiones y 197 aserciones pgTAP. Se añadió una prueba contra Storage local real. Resultados, límites y enlaces en [F5-10](../../tasks/task-f5-10.md#evidencias-de-publicación-f5-10).
