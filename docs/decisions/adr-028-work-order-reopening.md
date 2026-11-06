# ADR-028 — Reapertura autorizada de órdenes

Fecha: 04/11/2026. Estado: aprobado por el usuario solicitante en este chat mediante «Sí, aprobar esa regla». Alcance: reapertura de P5; no constituye aprobación del resto de DEC-022 ni de la política offline.

## Decisión

Dueño o Administrador del ámbito puede reabrir una orden Completada, Con observaciones, No conforme o Corregida a En atención. Se exige permiso efectivo de revisión, motivo obligatorio, versión esperada e idempotencia. Técnico, Auditor e identidades ICE24 no reciben permisos adicionales. Anulada permanece excluida.

Se conservan técnico asignado, definición congelada, vencimientos y todas las versiones. La revisión append-only registra motivo, actor y fecha; el cambio de estado y auditoría forman una transacción. La actividad vinculada vuelve a En atención. El ticket conserva su vínculo y no se inventa un nuevo reporte ni un evento de inicio.

La siguiente ejecución debe guardarse como nuevo borrador antes de cerrar: no se reutiliza un cierre anterior como ejecución nueva. El técnico debe seguir teniendo acceso vigente para ejecutar. El revisor no adquiere permiso de ejecución por reabrir.

## Alternativa y reversión

Se descarta mantener la reapertura bloqueada por ausencia del arco en AppFlow; la aprobación explícita resuelve esa contradicción para P5. No se añaden transiciones desde Anulada ni asignación automática de otro técnico. Para revertir, deshabilitar el comando y su opción UI conservando revisiones, auditoría y versiones; no eliminar registros históricos.

Fuentes actualizadas: AppFlow §15, tabla de dominio y diagrama de mantenimiento, DEC-022, contrato de acciones, API/BFF, demo y UI-WO-04. La aprobación UX adicional del mismo mensaje solo cubre la claridad de requisitos faltantes de UI-WO-03 en móvil.
