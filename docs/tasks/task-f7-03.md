# TASK-F7-03 — Asignación y órdenes de trabajo

Implementación local: 03/11/2026. Rama `feat/f7-03-04-work-orders-state-machine`, desde `origin/main` con P2 integrado en PR #62. Este paquete P3 incluye F7-04. Entrega preparada para commit y PR; cambios locales anteriores conservados. La validación de publicación y las correcciones UI acumuladas se detallan en el [reporte de publicación](../qa/phase-7/publication-f7-03-04.md).

## Resultado

Crear una orden desde ticket o actividad programada con técnico elegible, folio por cuenta y definición congelada: checklist, procedimiento, piezas previstas y requisitos de evidencia. Lista UI-WO-01 y detalle, cambio de responsable antes de iniciar, enlace al reporte original y cronología auditada. Los filtros permanecen en URL. La demo no persiste escrituras; el recorrido identifica su doble de API.

OW/OP asignan en su ámbito. TC activo y autorizado en sucursal/máquina ejecuta solo su orden. Lectores/ICE24 no reciben asignación ni acceso global implícito. La API valida nuevamente permisos, versión e idempotencia en cada comando. Referencias únicas impiden dos órdenes para el mismo ticket/actividad; un fallo de auditoría revierte toda la operación.

Las actividades asignadas quedan congeladas ante recálculos y bloquean generación duplicada. Las actividades de componentes propios conservan su definición y metadatos originales. Campos opcionales de procedimiento/piezas extienden de forma compatible nuevas versiones de plantilla; las anteriores muestran ausencia explícita (F7-D07 provisional).

## Archivos

- Contratos: `packages/contracts/src/private/maintenance/work-orders.ts`, `equipment.ts`, enlace del ticket a la orden sin cambiar el enum existente; contratos de vistas en `packages/database/src/maintenance.ts`.
- Migración: `supabase/migrations/20261103000100_phase7_work_orders.sql`; módulo `apps/api/src/modules/work-orders`; integración con tickets y recálculo del worker.
- UI/BFF: `apps/private-web/src/features/work-orders`, rutas `/maintenance/work-orders` y `/api/work-orders`; enlaces desde tickets y actividades.
- Demo, Storybook, galería, recorrido y pruebas unitarias/integración/E2E; [inventario completo](../qa/phase-7/evidence/20261103-f7-03-files.txt).

## Validación

Validación local aprobada: `pnpm check` (938 pruebas), `pnpm build` (14 tareas), integración con navegador (181 pruebas), Linux (2034 pruebas, sin fallos ni flaky), galería (1164 capturas sin observaciones) y cinco recorridos. [Evidencia P3](../qa/phase-7/work-orders-validation.md). No se acredita CI ni aprobación humana; siguen pendientes para publicación/merge.

## Checklist de revisión UX

Con `$env:ICE24_DEMO_MODE='1'; pnpm dev:private`, abrir `http://localhost:3000/?demo=1`.

1. Persona Dueño o Administrador: abrir `/maintenance/tickets`, entrar al ticket y elegir «Asignar técnico». Revisar técnico, actividad y motivo; la demo informa que no guarda cambios reales.
2. Abrir `/maintenance/work-orders` y probar vistas Asignadas, Pendientes y Descargadas; conservar filtros al recargar.
3. Abrir `/maintenance/work-orders/10000000-0000-4000-8000-0000000007d0`; revisar responsable, versión, checklist, procedimiento, piezas, requisitos y seguimiento.
4. Cambiar a Técnico: revisar «Iniciar orden» y explicación de acciones bloqueadas. Cambiar a Solo lectura e ICE24: comprobar consulta sin mutaciones.
5. Activar lectura, error y sin conexión en Demo; comprobar explicación y protección de cambios sin guardar. Repetir a 375, 768, 1280 y 1440 px y con teclado.
6. Generar `pnpm ux:snapshots` y `pnpm ux:walkthroughs`; revisar «Del ticket a la orden asignada — servicios simulados». Storybook incluye «Línea de estados de la orden» y matriz de estados.

Preguntas sí/no para Dirección: ¿se distingue el responsable? ¿se comprende qué definición queda congelada? ¿las piezas previstas y requisitos son claros? ¿los mensajes explican por qué una acción está bloqueada? ¿los filtros y controles son utilizables en móvil y teclado? ¿queda claro que la descarga offline y el cierre completo pertenecen a etapas posteriores?

## Riesgos y pendientes

Requiere aprobación UX de baselines nuevas/modificadas, decisiones F7-D04/F7-D07 y EXC-F6-01. Preview desactivado según ADR-026. Ejecución/evidencia completa y revisión corresponden a P4/P5; descarga y sincronización a P6–P11. No se implementa un arco de reapertura no definido por AppFlow; DEC-022 queda registrado para P5. No se aplicaron migraciones remotas.
