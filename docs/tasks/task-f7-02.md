# TASK-F7-02 — Tickets de mantenimiento

Implementación: 02/11/2026. Publicación solicitada: 03/11/2026. Rama `codex/f7-02-tickets`, desde `origin/main` con P0/P1 integrados en PR #61. Cambios locales anteriores conservados fuera del commit de P2.

## Resultado

El usuario autorizado reporta una falla de una máquina, selecciona sistema de su plantilla y componente activo, prioridad y descripción, y adjunta hasta diez fotos mediante archivos privados. Se genera un folio por cuenta y el ticket queda pendiente de asignación. El detalle conserva el reporte original, permite registrar diagnóstico con motivo y muestra el seguimiento cronológico.

Rutas: `/maintenance/tickets`, `/maintenance/tickets/new`, `/maintenance/tickets/:id`; enlaces desde mantenimiento y expediente. UI-TKT-01/02 de la sala de revisión abren las pantallas implementadas. Búsqueda de máquina por código/nombre; `useUnsavedChanges` protege formulario y cargas en curso. Se conservan datos y clave de reintento ante fallos. No se guardan tickets offline.

API `/v1/tickets`: GET lista con cursor, GET `/:id`, GET `/options/:machineId`, POST creación con `Idempotency-Key`, POST `/:id/diagnosis` con `If-Match` e idempotencia. Actividad relacionada validada contra cuenta/máquina. La referencia a orden es necesariamente nula hasta P3. Asignación, ejecución, cierre y transiciones corresponden a P3–P5.

Migración `20261102000200_phase7_tickets.sql`: tablas, índices, permisos y contratos de lectura entre módulos. Autorización dentro de transacción, bloqueo de contexto/cuenta/máquina, ámbito antes de replay, versión esperada y auditoría atómica con actor, contexto, cuenta, sucursal, máquina, correlación, antes/después, motivo y resultado. Folio, reporte y asociaciones iniciales inmutables. RLS y privilegios impiden consultas directas desde roles del navegador.

## Permisos y límites

Inventario: contratos en `packages/contracts/src/private/maintenance/tickets.ts`; módulo API `apps/api/src/modules/tickets`; BFF `apps/private-web/src/app/api/tickets`; pantallas, autorización y estilos en `apps/private-web/src/features/maintenance/tickets-*`; fixtures `server/demo/tickets`; pruebas `tests/integration/tickets.test.ts`, `tests/e2e/maintenance/tickets.spec.ts` y unidades junto al BFF/demo. La galería, Storybook y recorridos incluyen P2. El runner Linux excluye únicamente artefactos generados de revisión al copiar las fuentes.

Integración compartida: `platform/app.module.ts`, filtro de errores de scheduling, rutas `app/(account)/maintenance/tickets` y redirección de revisión, enlaces en `equipment/workspace.tsx` y `maintenance/scheduled-screen.tsx`, breadcrumbs en `navigation/destinations.ts`, permisos de personas demo y despacho de API demo. `files/uploader.tsx` expone confirmación y actividad de la carga; `files/files.test.tsx` y `context/context-selector.tsx` cubren preparación de controles. QA modifica `playwright.config.ts`, `tests/visual/review-page.ts`, `ux-review.routes.ts`, scripts de capturas/recorridos y añade `ticket-photo-flow.ts` y `walkthroughs/tickets.ts`. Documentación: este reporte, módulo, runbook, estado, trazabilidad, decisiones abiertas y `docs/qa/phase-7/tickets-validation.md`, con evidencias y 199 baselines nuevas/modificadas.

| Rol         | Consulta         | Creación y diagnóstico |
| ----------- | ---------------- | ---------------------- |
| Dueño OW    | Ámbito concedido | Sí                     |
| Operador OP | Ámbito concedido | Sí                     |
| Técnico TC  | Ámbito concedido | Sí                     |
| Auditor AU  | Ámbito concedido | No                     |
| ICE24 IO/IA | Ámbito concedido | No                     |

Propuesta P2 para Dirección: operador/técnico pueden documentar diagnóstico mientras el ticket está pendiente de asignación; no asignan ni cierran órdenes. ICE24 no obtiene acceso implícito a otras cuentas. Lectura bloquea mutaciones; módulo deshabilitado bloquea lectura y escritura. Evidencia requiere `files.read`; cargar requiere `files.upload`.

Fotos opcionales JPEG/PNG, máximo 10 MB cada una; originales conservados. Solo cargas confirmadas en verificación o disponibles de la misma cuenta/máquina se vinculan. La descarga sigue pasando por autorización y URL temporal del módulo de archivos, sin evadir cuarentena. La optimización F7-D01 pertenece al flujo de evidencia de P4, no se declara implementada aquí.

## Validación

Validación local completada: `pnpm check` aprobó 831 pruebas en 113 archivos y todas las verificaciones estáticas; `pnpm build`, 14 tareas; `ICE24_BROWSER_TESTS=1 pnpm test:integration`, 166 pruebas en 20 suites; `pnpm test:ui -- --workers=6`, 1830 pruebas Linux sin fallos ni flaky; `pnpm ux:snapshots`, 1052 capturas sin observaciones ni errores HTTP; `pnpm ux:walkthroughs`, cuatro recorridos verificados. [Detalle y evidencia](../qa/phase-7/tickets-validation.md). CI comprueba el commit del PR de publicación.

Suite propia PostgreSQL: 12 pruebas pasando, con concurrencia, roles, cuentas/sucursales, evidencia y rollback de auditoría. BFF: seis pruebas de sesión, contexto, CSRF, validación, idempotencia y versión, más ocho de autorización. Demo: siete pruebas de contratos/aislamiento. Navegador: nueve pruebas de foto confirmada y payload asociado, lista, detalle, lectura, recuperación, axe y reflow a 375/768/1280/1440 px.

Las pruebas detectaron el filtro opcional enviado como `undefined` y controles utilizables antes de hidratación; corregidos. Tickets, selector de contexto y cargador esperan a tener sus manejadores listos. La prueba de archivos verifica bloqueo inicial y habilitación en cliente. Para capturas, `ICE24_DEMO_CAPTURE_LOADING=1` mantiene la carga simulada durante 15 s; la demo interactiva conserva 2.5 s. No se modificaron tolerancias visuales ni tiempos límite de pruebas.

Las simulaciones de almacenamiento de UI/recorrido están identificadas; no sustituyen la persistencia real probada en PostgreSQL ni acreditan análisis antivirus real.

## Revisión de Dirección

Ejecutar `pnpm dev:private` con `ICE24_DEMO_MODE=1`, abrir modo demo y elegir Dueño, Administrador de sucursal, Técnico, Auditor o ICE24. La demo no persiste escrituras. `pnpm ux:snapshots` genera la galería; `pnpm ux:walkthroughs` genera «Reportar una falla con foto desde el celular», con servicios simulados. Preview sigue deshabilitado por ADR-026.

1. Abrir `/maintenance/tickets/new`; buscar máquina, cargar sistemas y completar el reporte.
2. Revisar propósito, formato, límite, progreso y estado de la foto; abandonar cambios para comprobar advertencia.
3. Abrir `/maintenance/tickets`, seleccionar folio y revisar diagnóstico, evidencia, asignación pendiente y cronología.
4. Cambiar persona, activar lectura, módulo deshabilitado y error de red; verificar límites y mensajes.

Preguntas de aprobación (sí/no):

- ¿Se identifica sin ayuda la máquina y el sistema afectado?
- ¿Las explicaciones permiten elegir prioridad sin ambigüedad?
- ¿Se entiende cuándo la foto está confirmada y cuándo sigue en verificación?
- ¿Es claro qué puede hacer cada rol y qué requiere conexión?
- ¿La cronología distingue reporte original y cambios de diagnóstico?
- ¿Se aprueba que operador y técnico registren diagnóstico antes de asignación?

Aprobación UX humana, EXC-F6-01 y decisiones abiertas F7 siguen pendientes; no se sustituyen por pruebas automatizadas.
