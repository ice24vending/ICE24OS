# Decisión de producto: primer piloto web utilizable

Estado: propuesta para aprobación de Dirección y Producto.

## Decisión

El primer uso real será **MVP-1 — Piloto web de mantenimiento**, una PWA privada desplegada en Google Cloud para ICE24 y una sola cuenta piloto. Entrega un flujo completo y medible: iniciar sesión, seleccionar cuenta, administrar sucursal y máquina, programar/asignar una orden de mantenimiento, ejecutarla con checklist y fotografías, sincronizar, revisar historial y auditoría, y recibir notificaciones.

## Alcance requerido

- Fases técnicas 0–6 como plataforma habilitadora.
- De Fase 7: mantenimiento preventivo/correctivo, tickets, órdenes, evidencias, conflicto e historial.
- Responsive para escritorio y Android/iOS; PWA instalable.
- Un entorno de desarrollo web desde Fase 1, staging desde Fase 2 y producción piloto al completar gates de seguridad.
- Hasta una cuenta piloto, 5 sucursales, 25 máquinas y 20 usuarios como supuesto de capacidad, no como límite comercial codificado.

## Fuera de MVP-1

- Reglas y publicación sanitaria, laboratorio y límites normativos.
- Portal público y QR, inventario avanzado, Excel de ventas, tarjetas, pedidos y reparto.
- Cobro automático: Stripe puede probarse en sandbox, pero no condiciona el primer flujo de mantenimiento.
- Migración masiva; se habilita carga inicial controlada y auditable.

## Release siguiente

**MVP-2 — Piloto técnico-sanitario** agrega Fase 8 y la parte mínima de documentos/portal de Fase 10 después de F0-11 y F0-12. Después se continúa con inventario, ventas y operación comercial según evidencia del piloto.

## Éxito del piloto (primeros 60 días)

| Métrica | Objetivo propuesto |
|---|---:|
| Usuarios invitados que completan primer acceso | >= 80% |
| Órdenes asignadas completadas en la PWA | >= 70% |
| Actividades completadas antes del vencimiento | >= 85% |
| Sincronizaciones sin intervención de soporte | >= 98% |
| Incidentes P0/P1 por pérdida o exposición de datos | 0 |
| Usuarios piloto activos semanalmente | >= 60% |

## Alternativas descartadas

- Fases 0–6 solamente: despliega una web, pero no resuelve un trabajo operativo completo.
- Fases 0–10 como primer piloto: incorpora demasiados dominios bloqueados por validación sanitaria y retrasa evidencia real.
- Construir primero pedidos/reparto: depende de más integraciones y reglas comerciales que mantenimiento.

Consecuencia: el backlog debe priorizar despliegue web continuo y la rebanada vertical de mantenimiento; el alcance integral del PRD permanece como roadmap, no se elimina.
