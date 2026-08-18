# Backlog inicial: épicas, capacidades y releases

Los IDs no sustituyen las 236 tareas de `context/TASKS.md`; las agrupan para planificación y trazabilidad.

| Épica | Fases/tareas | Capacidad verificable | Release |
|---|---|---|---|
| EP-00 Decisiones ejecutivas | F0-01..16 | gates, RACI, ADR y fuentes aprobadas | R0 |
| EP-01 Plataforma web | F1 | monorepo, contratos, CI, pruebas y entorno local | R0 |
| EP-02 Cloud y observabilidad | F2 | URL de development/staging, IaC, despliegue y rollback | R0 |
| EP-03 Identidad multiempresa | F3 | login, contexto, aislamiento y autorización negativa | R0 |
| EP-04 Administración de activos | F4 | cuentas, sucursales, usuarios, máquinas y plantillas | R0/MVP-1 |
| EP-05 Servicios transversales | F5 | archivos, auditoría, jobs, alertas y suscripción sandbox | MVP-1 |
| EP-06 Experiencia PWA | F6 | shell responsive, accesible, instalable y por rol | MVP-1 |
| EP-07 Mantenimiento en campo | F7 | ticket→orden→evidencia→sincronización→historial | MVP-1 |
| EP-08 Sanidad y laboratorio | F8 | bitácoras, límites versionados y restricciones | MVP-2 |
| EP-09 Inventario | F9 | existencias, lotes, consumo y ciclo del componente | R2 |
| EP-10 Documentos y portal | F10 | PDF, publicación deliberada, QR y portal separado | MVP-2/R2 |
| EP-11 Ventas y tarjetas | F11 | importación versionada, dedupe y movimientos | R3 |
| EP-12 Pedidos y reparto | F12 | pedido atómico, elegibilidad, entrega y GPS | R3 |
| EP-13 Analítica | F13 | indicadores medidos sin degradar OLTP | R4 |
| EP-14 Hardening | F14 | seguridad, accesibilidad, migración, carga y DR | GA |
| EP-15 Piloto y operación | F15 | rollout, SLO, soporte, reconciliación y go/no-go | GA |

## Camino crítico para subir a web

`EP-00 -> EP-01 -> EP-02 -> EP-03 -> EP-04 -> EP-05 -> EP-06 -> EP-07`

El primer despliegue a una URL ocurre en EP-02, sin esperar funciones de negocio. Cada épica posterior debe conservar una versión desplegable y promover la misma imagen development→staging→production.

## Criterios de aceptación transversales

- Contrato OpenAPI y migraciones compatibles/versionadas.
- Pruebas de aislamiento, autorización positiva/negativa, auditoría e idempotencia.
- Archivos privados en cuarentena y acceso temporal.
- Telemetría con correlation ID, runbook y rollback.
- Accesibilidad y estados offline/error visibles cuando corresponda.
- Ninguna regla sanitaria, legal, costo o retención se implementa sin fuente aprobada.

## Dependencias externas visibles

- EP-07 necesita F0-11 mantenimiento.
- EP-08/EP-10 públicos necesitan F0-11/F0-12.
- EP-11 necesita F0-10.
- EP-12 necesita decisiones DEC-016 y privacidad de mapas.
- Producción de cualquier épica necesita responsables, presupuesto, soporte y revisión de privacidad.

