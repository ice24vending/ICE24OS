# QA F5-01 — Suscripción, demo y acceso

Validación local final: 25/09/2026, America/Mexico_City. Entorno: Windows, Node 24.19.0, pnpm 11.24.0, Prettier 3.9.6, Docker Desktop, PostgreSQL 17 desechable y Chromium de Playwright. No se usaron datos reales ni Stripe remoto.

| Comando                                       | Resultado                                                                                                                      | Evidencia                                   |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| `pnpm check`                                  | 71 pruebas unitarias en 19 archivos; formato, lint, TypeScript y controles de arquitectura/infraestructura/identidad aprobados | [Salida](evidence/20260925-check.txt)       |
| `pnpm build`                                  | 14 tareas aprobadas                                                                                                            | [Salida](evidence/20260925-build.txt)       |
| `ICE24_BROWSER_TESTS=1 pnpm test:integration` | 24 pruebas aprobadas, 3 archivos, sin omisiones                                                                                | [Salida](evidence/20260925-integration.txt) |

Las 24 integraciones son 9 de suscripciones, 14 de equipos y 1 PostgreSQL/PostGIS. Las 71 unitarias incluyen 8 del dominio de suscripción. No se suman las comprobaciones internas de cada prueba como si fueran casos independientes.

## Cobertura de las 9 integraciones nuevas

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

## Reproducción y límites

Seguir el [runbook](../../runbooks/stripe.md): dependencias del lockfile, Docker activo, Chromium instalado, `pnpm check`, `pnpm build` y la suite de integración con la variable de navegador activada. Las pruebas crean y retiran bases/contenedores desechables.

Quedan pendientes CI remota, validación humana en staging, aplicación de la migración y despliegue. La integración real de Stripe corresponde a F5-02. Estas pruebas no acreditan los gates pendientes de Fase 5 ni módulos operativos futuros.

## F5-10 — Descargas auditadas

219 unitarias, 77 integraciones con Chromium sin omisiones y 197 aserciones pgTAP. Se añadió una prueba contra Storage local real. Resultados, límites y enlaces en [F5-10](../../tasks/task-f5-10.md#evidencias-de-publicación-f5-10).
