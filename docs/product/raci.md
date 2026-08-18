# Matriz RACI propuesta por dominio

Los cargos son responsables interinos; antes de declarar Fase 0 terminada deben reemplazarse por nombre, correo corporativo y suplente. `A` aprueba, `R` ejecuta, `C` es consultado e `I` informado.

| Dominio | A | R funcional | R técnico | C obligatorios | I |
|---|---|---|---|---|---|
| Dirección, alcance y presupuesto | Dirección ICE24 | Product Owner | Tech Lead | Finanzas, Operación | Equipo |
| Plataforma, CI/CD y observabilidad | Dirección ICE24 | Product Owner | Tech Lead | Seguridad, Operación | Equipo |
| Identidad, seguridad y privacidad | Dirección ICE24 | Responsable de Seguridad/Privacidad | Tech Lead | Jurídico, Soporte | Product Owner |
| Cuentas, sucursales, usuarios y equipos | Product Owner | Operaciones ICE24 | Backend Lead | Soporte, Seguridad | Dirección |
| Mantenimiento, tickets y órdenes | Operaciones ICE24 | Responsable Técnico ICE24 | Backend Lead | Técnicos piloto, UX | Product Owner |
| Sanidad, laboratorio y restricciones | Responsable Sanitario | Responsable Sanitario | Backend Lead | Jurídico, ICE24 Admin | Dirección |
| Inventario y componentes | Operaciones ICE24 | Responsable de Almacén | Backend Lead | Técnico, Finanzas | Product Owner |
| Documentos, reportes y portal público | Product Owner | Operaciones ICE24 | Web Lead | Sanitario, Jurídico, Privacidad | Dirección |
| Ventas Excel y tarjetas | Product Owner | Responsable Comercial | Data/Backend Lead | Finanzas, usuarios piloto | Dirección |
| Negocios, pedidos, reparto y mapas | Product Owner | Responsable Comercial | Web/Backend Lead | Operación, Privacidad | Dirección |
| Suscripción y Stripe | Dirección ICE24 | Finanzas/Comercial | Backend Lead | Jurídico, Soporte | Product Owner |
| Soporte e incidentes | Operaciones ICE24 | Service Owner | Tech Lead/On-call | Seguridad, Producto | Dirección |

## Alcance y consecuencias

- Un mismo nombre puede ocupar varios cargos durante el piloto, pero nunca aprobar su propia recuperación manual de identidad ni un cambio sanitario crítico.
- Seguridad, sanidad, privacidad, costo y publicación requieren aceptación explícita de la persona `A`.
- Si no hay persona nombrada, el dominio permanece bloqueado para producción aunque exista implementación técnica.

Alternativa descartada: asignar todas las aprobaciones al Tech Lead. Mezcla autoridad técnica con decisiones de negocio y regulatorias.

Fuentes: PRD secciones 5, 6, 8 y 15; TRD secciones 23, 31–37 y 80; `Implementation_Plan.md`, Fase 0.

