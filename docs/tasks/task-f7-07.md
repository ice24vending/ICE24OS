# TASK-F7-07 — Revisión, corrección versionada y reapertura

Implementación local P5, 04/11/2026. UI-WO-04 `/maintenance/work-orders/:id/review`: revisión, solicitud de corrección por técnico asignado, nueva versión corregida por revisor y anulación con motivo. Comparator muestra campos, checklist, refacciones, evidencia, resultado y seguimiento; permite seleccionar una versión conservada y muestra actor/fecha. La versión original nunca se actualiza ni elimina.

POST `/v1/work-orders/:id/reviews` exige motivo, permiso efectivo, ámbito, cuenta escribible, versión esperada e idempotencia. Corrección y anulación usan los arcos vigentes de la máquina de estados. Una anulación solo parte de Completado, según AppFlow §15. La revisión registra su propio evento; fallo de auditoría revierte todos los cambios.

**Reapertura aprobada e implementada (04/11/2026).** Usuario solicitante: «Sí, aprobar esa regla». Dueño/Administrador del ámbito puede reabrir Completado, Con observaciones, No conforme o Corregido a En atención, con motivo obligatorio. La revisión, el cambio de estado y la auditoría son atómicos e idempotentes; se conservan todas las versiones. La nueva ejecución debe guardarse antes del siguiente cierre. Ver ADR-028 y AppFlow §15.

Validación: [registro conjunto](../qa/phase-7/execution-offline-validation.md). Recorrido `execution-correction`, API simulada en navegador; corrección real, aislamiento e historial se prueban en PostgreSQL. Revisión UX/lector pendiente.

## Archivos de la reapertura

- `packages/domain/src/work-order-state.ts` y su prueba: cuatro arcos nuevos, motivo y revisión autorizada.
- Contrato `private/maintenance/work-orders.ts`, `work-orders.store.ts` y BFF `api/work-orders/[[...path]]/route.ts`: permiso de revisión, versión esperada, transacción, idempotencia y nuevo borrador antes de volver a cerrar.
- `execution-screen.tsx`, demo de órdenes y layout del expediente: selección Reabrir, motivo, historial y carga de estilos fuera de la consulta suspendida.
- Pruebas de contratos, BFF, PostgreSQL y navegador; recorrido `execution-reopen`.
- AppFlow §15, ADR-028, DEC-022, módulo, estado, trazabilidad y aprobación UX parcial.

## Checklist UX de reapertura

Ejecutar `pnpm dev:private` con `ICE24_DEMO_MODE=1`; abrir `http://localhost:3000/maintenance/work-orders/10000000-0000-4000-8000-0000000007d4/review`. Usar Dueño o Administrador en el panel Demo. La demo permite revisar controles; el video `execution-reopen` simula el comando y PostgreSQL valida la persistencia real.

1. ¿La acción Reabrir y el motivo obligatorio son claros?
2. ¿El botón permanece bloqueado cuando falta el motivo?
3. ¿Se distinguen la versión conservada y el enlace al historial actualizado después de registrar?
4. ¿Técnico y Auditor carecen de la opción Reabrir?
5. ¿En móvil y con teclado se puede completar la revisión sin perder el contexto de la orden?

Estas preguntas siguen pendientes de validación humana; la aprobación recibida de UI-WO-03 solo cubre los requisitos faltantes de cierre en móvil.
