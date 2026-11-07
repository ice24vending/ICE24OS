# P7–P9: evidencia y revisión offline

Fecha: 05/11/2026. Implementación local, sin commit ni push. Conserva los cambios previos del expediente y filtros. F7-D03 sigue siendo propuesta; activación productiva pendiente. Aprobación UX P7–P9 registrada el 06/11/2026 en ux-signoff.md.

## Validación

- `pnpm check`: **998 pruebas aprobadas en 126 archivos**, formato, lint, tipos, límites de módulos, infraestructura y contraste correctos. `pnpm build`: **14 tareas correctas**.
- Integración completa con `ICE24_BROWSER_TESTS=1`: **201 pruebas aprobadas en 21 archivos**.
- PostgreSQL de órdenes: **34 pruebas aprobadas**, incluyendo descarga idempotente, diez reenvíos del cierre, otros dispositivos/cuentas, liberación, expiración, permiso revocado y rollback si falla auditoría.
- Cola/base local: **17 pruebas aprobadas**; cifrado, cuota, aislamiento, atomicidad, dependencia de archivos y recuperación de reclamación, incluso tras cerrar el navegador en el último intento automático.
- Recorrido Linux móvil: **1 aprobado** con descarga, red retirada, checklist, diagnóstico, lectura, lote, firma, fotos, recarga y sincronización de dos fotos antes de un único cierre. Axe sin violaciones serias en los puntos comprobados. Verifica también el estado online Completado y está incluido en la suite completa.
- `pnpm test:ui -- --workers=6`: **2.205 pruebas aprobadas en Linux, 15,4 minutos; salida 0**. Inventario: **1.304 baselines**; alcance de aprobación UX en ux-signoff.md. Una pasada anterior detectó cuatro baselines desactualizadas de la matriz offline; se inspeccionaron, actualizaron y revalidaron antes de repetir la suite completa con este resultado verde.
- `pnpm ux:snapshots`: **1.256 capturas**, sin observaciones reportadas. [Abrir galería](../phase-6/ux-review/index.html).
- `pnpm ux:walkthroughs`: **9 recorridos verificados**. [Abrir reproductor](walkthroughs/index.html) y [vídeo de campo](walkthroughs/offline-field.webm). Se inspeccionó un fotograma móvil con el paso de reconexión rotulado. Artefactos generados localmente e ignorados por Git, listos para revisión; no se publicaron.

## Qué abrir

Para integración de navegador, construir como CI con `$env:ICE24_STORAGE_ORIGIN="http://127.0.0.1:54329"; pnpm build` antes de `$env:ICE24_BROWSER_TESTS="1"; pnpm test:integration`. Ese origen es únicamente el doble local de almacenamiento; producción usa su origen privado autorizado. No ampliar CSP con comodines para hacer pasar pruebas.

En revisión local: `$env:ICE24_DEMO_MODE="1"; $env:NEXT_PUBLIC_ICE24_OFFLINE_SHELL="1"; pnpm dev:private`. Entrar en `http://localhost:3000/?demo=1`, persona Técnico, cuenta Polar, conexión normal. Abrir `/maintenance/work-orders/10000000-0000-4000-8000-0000000007d3/execute`, pulsar “Descargar para trabajar sin conexión” y esperar “Disponible sin conexión”. Abrir la descarga antes de salir a campo. Para un teléfono real usar un entorno HTTPS de revisión autorizado; Preview no se activa por esta tarea.

Poner el teléfono en modo avión, completar requisitos y fotos, recargar, revisar y confirmar cierre. Quitar modo avión y observar sincronización. La foto remota del modo demo puede requerir el recorrido automatizado que sustituye el servicio de archivos; no usar el demo como prueba de almacenamiento remoto productivo. El recorrido `pnpm ux:walkthroughs` y el E2E conservan reales IndexedDB, cifrado, service worker, BFF de sincronización y formulario.

Galería: `pnpm ux:snapshots`, sección Mantenimiento y offline. Storybook: `Mantenimiento/Trabajo sin conexión`, controles y Matriz de estados. Vídeo: “Orden completa en campo sin internet”. La aprobación UX de P7–P9 está registrada en ux-signoff.md; no cubre cambios posteriores.

## Checklist UX

1. ¿Se entiende qué se descarga, cuánto ocupa aproximadamente y hasta cuándo se puede usar?
2. ¿Se distingue “Guardado en este dispositivo” de un cierre confirmado por el servidor?
3. ¿Al recargar sin internet continúan checklist, lecturas, lote, firma y fotos sin rehacerlos?
4. ¿Los botones caben a 375 px, se pueden pulsar con una mano y las acciones bloqueadas explican por qué?
5. ¿Se entiende que las fotos se verifican antes del cierre y cómo reintentar sin duplicar?
6. ¿Un administrador entiende la consecuencia de liberar el dispositivo y el motivo obligatorio?

El usuario solicitante aprobó conjuntamente estas pantallas el 06/11/2026; registro en `ux-signoff.md`. El recorrido con lector real sigue pendiente, no sustituido por Axe. P10 y P11 mantienen sus alcances de resolución de conflicto y limpieza por revocación.

## Archivos principales modificados

- Contratos: `packages/contracts/src/private/maintenance/offline.ts`, `work-orders.ts` e `index.ts`.
- Persistencia: `supabase/migrations/20261106000100_phase7_offline_leases.sql`; `apps/api/src/modules/work-orders/infrastructure/work-orders.store.ts`; fachada `application/offline-orders.ts` y módulo de órdenes.
- API: `apps/api/src/modules/synchronization/synchronization.controller.ts`, `synchronization.module.ts` y `apps/api/src/platform/app.module.ts`.
- Worker: `apps/worker/src/processors/scheduler/offline-leases.ts`, `tasks.ts` y `engine.test.ts`.
- Base local: `packages/offline/src/sync-queue.ts`, `sync-queue.test.ts`, `protected-store.ts` e `index.ts`.
- BFF: `apps/private-web/src/app/api/synchronization/[[...path]]/route.ts` y sus pruebas.
- Cliente: `apps/private-web/src/features/sync/` (descarga, lista local, liberación, guardado, transporte, editor y estados); `features/work-orders/execution-screen.tsx`, `work-orders-screen.tsx` y `components/system-state/pending-banner.tsx`.
- Demo: `apps/private-web/src/server/demo/offline-orders.ts`, `offline-state.ts`, `work-orders.ts` y `api.ts`; panel demo y su ruta de selección.
- Shell/build: `apps/private-web/public/sw.js`, `offline-work.html`, `scripts/build-offline.mjs`, scripts de paquetes, `turbo.json`, `eslint.config.mjs` y `.gitignore`.
- Pruebas/evidencia: `tests/integration/work-orders.test.ts` y diagnóstico de CSP en `files.test.ts`; `tests/e2e/maintenance/offline-field-flow.ts`, `offline-field.spec.ts`, `offline-shell.spec.ts` y `machine-order-navigation.spec.ts`; catálogo visual, walkthroughs, baselines y `playwright.config.ts`; ejecutores `scripts/ux-snapshots/run.ts` y `scripts/ux-walkthroughs/run.ts`.
- Documentación: reportes TASK-F7-08/10/11/12/14, estado/trazabilidad de Fase 7, módulo/runbook de mantenimiento, contrato de sincronización, guion de lector y aprobación UX P7–P9 registrada el 06/11/2026.

Los ajustes previos de filtros/acciones, sus pruebas/baselines y los archivos locales de documentación de Fase 6 se conservaron. Las referencias locales de `next-env.d.ts` volvieron a `.next/dev/types` tras compilar.
