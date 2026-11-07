# TASK-F7-08 — Responsable y bloqueo lógico

Implementación local del 05/11/2026, sin commit ni push. Forma parte de P7–P9 solicitados conjuntamente; preserva los cambios locales anteriores.

## Archivos y requisitos

Migración work_order_offline_leases, WorkOrdersStore, OfflineOrders y worker offline-leases.

Lease único por orden; autor/dispositivo/vigencia; trigger de protección; liberación con motivo; vencimiento auditado.

## Validación y límites

Validación automática aprobada; resultados detallados en [evidencia P7–P9](../qa/phase-7/offline-p7-p9.md). pnpm check: 998 pruebas aprobadas; build: 14 tareas correctas; integración completa con navegador: 201 aprobadas (34 de órdenes). Base/cola: 17 pruebas incluidas, con recuperación del último intento tras cerrar el navegador. Linux: 2.205 pruebas aprobadas en la pasada completa final (15,4 min). Galería: 1.256 capturas sin observaciones; nueve recorridos verificados. Evidencia en el reporte compartido; UX aprobada por el usuario solicitante el 06/11/2026.

F7-D03 permanece provisional (72 horas, 50 MB por orden, 250 MB por dispositivo); bandera apagada por defecto. P10 conserva el alcance de resolución de conflictos y P11 el de limpieza por revocación. El demo usa datos ficticios y almacenamiento servidor efímero por sesión; no es persistencia productiva. No se aplicaron migraciones a servicios remotos.

## Checklist de revisión UX

Comandos, rutas, persona, pasos y seis preguntas sí/no en [checklist compartido](../qa/phase-7/offline-p7-p9.md#checklist-ux). Aprobación UX registrada en ux-signoff.md el 06/11/2026. No se acredita un recorrido formal con lector ni un dispositivo concreto.
