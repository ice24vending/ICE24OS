# ADR-022 — Identidad Stripe antes de activar una suscripción

- Fecha: 24/09/2026.
- Estado: aceptada por el responsable en esta tarea.
- Alcance: F5-01, `providerCustomerId` antes de la activación.

Database y API exigían cliente Stripe para todos los estados, mientras el PRD y AppFlow crean la demo antes de contratar. El responsable autorizó expresamente: «Sí, permitir nulo antes de activar».

Se permite `null` en demo y pendiente de activación. Activar una suscripción pagada exige cliente Stripe, suscripción externa y periodo. No se generan IDs externos ficticios. API conserva el campo obligatorio, con valor nullable en preactivación; Database refleja su nulabilidad condicionada.

Se descarta exigir un cliente Stripe al crear una demo. No cambia el proveedor, el precio aprobado ni las políticas comerciales pendientes. El estado Reactivada se incorpora al catálogo físico por trazabilidad directa con RF-SUB-007 y API; no cambia el alcance del PRD.
