# Registro normalizado de decisiones abiertas

Este registro agrupa sin perder trazabilidad las 94 preguntas del PRD, 20 pendientes del TRD, 34 preguntas de UI/UX y 20 de AppFlow. Las referencias por rango significan que cada pregunta del rango hereda estado, responsable y fecha objetivo hasta que se descomponga durante su fase.

Prioridad: `P0` bloquea Fase 1/producción inmediata; `P1` bloquea MVP-1; `P2` bloquea una fase posterior; `P3` optimización. Estados: Decidida, Propuesta, Pendiente externo o Diferida.

| ID | Decisión normalizada | Prioridad | Estado | Responsable A | Fecha objetivo | Trazabilidad |
|---|---|---:|---|---|---|---|
| DEC-001 | MVP, módulos y métricas | P0 | Propuesta | Dirección/Product Owner | 21/08/2026 | PRD 1–5; UI 5–6,17; Flow 1 |
| DEC-002 | Cloud, región, dominios y entornos | P0 | Propuesta | Dirección/Tech Lead | 21/08/2026 | TRD 1,11; PRD 86,94 |
| DEC-003 | Stack y runner unitario | P0 | Decidida: Vitest/Node 24 | Tech Lead | 17/08/2026 | PRD 94; Project Rules 5 |
| DEC-004 | Matriz de autorización y sensibilidad | P0 | Propuesta | Seguridad/Product Owner | 28/08/2026 | PRD 6–12,41,46–48,71,80; UI 15–16,27–28; Flow 2,14–15,18 |
| DEC-005 | Identidad, 2FA, recuperación y sesiones | P0 | Propuesta | Seguridad/Operación | 28/08/2026 | PRD 8–11; TRD 6,18; UI 25–26 |
| DEC-006 | Código ICE24, seriales y transferencias | P0 | Propuesta | Operación/Product Owner | 28/08/2026 | PRD 13–20; TRD 12; Flow 3,13 |
| DEC-007 | SLO, capacidad, RPO/RTO y soporte | P0 | Propuesta | Service Owner/Tech Lead | 28/08/2026 | PRD 86,92–93; TRD 2–3,20 |
| DEC-008 | Retención, privacidad y cancelación | P0 | Pendiente externo | Jurídico/Privacidad | 11/09/2026 | PRD 39,46–49,60,84,92; TRD 10,17; UI 20 |
| DEC-009 | Plantillas de mantenimiento y reglas técnicas | P1 | Pendiente externo | Responsable Técnico | 04/09/2026 | PRD 21–26; UI 10–11,14 |
| DEC-010 | Catálogos sanitarios, límites y restricciones | P2 | Pendiente externo | Responsable Sanitario | Antes de Fase 8 | PRD 27–39; TRD 15–17; Flow 4,7,20 |
| DEC-011 | Inventario, refacciones y aprobaciones | P2 | Diferida | Operación/Almacén | Antes de Fase 9 | PRD 40–45 |
| DEC-012 | Documentos, reportes, PDF y autenticidad | P2 | Pendiente externo parcial | Product Owner/Jurídico | Antes de Fase 10 | PRD 46–55; UI 18–21,30,33; Flow 10–11,19 |
| DEC-013 | Portal público, QR y analítica | P2 | Pendiente externo | Product Owner/Privacidad | Antes de Fase 10 | PRD 56–61; TRD 17; UI 18–20,30,33 |
| DEC-014 | Formatos Excel, deduplicación y corrección | P2 | Pendiente externo | Comercial/Data Lead | Antes de Fase 11 | PRD 62–67; TRD 14 |
| DEC-015 | Tarjetas, costos y facturación | P2 | Diferida | Comercial/Finanzas | Antes de Fase 11 | PRD 68–72 |
| DEC-016 | Pedidos, reparto, pago y evidencia | P2 | Diferida | Comercial/Operación | Antes de Fase 12 | PRD 73–81; UI 27–28; Flow 4–5,12 |
| DEC-017 | Stripe, mora, reembolsos y cancelación | P2 | Diferida | Finanzas/Jurídico | Antes de Fase 5 productiva | PRD 82–85; Flow 8 |
| DEC-018 | Navegadores, accesibilidad, dispositivos y offline | P1 | Propuesta | UX/Tech Lead | 04/09/2026 | PRD 87–90; TRD 4–5,19; UI 7–9,12–13,24; Flow 6,9 |
| DEC-019 | Correo, mapas, malware y objetos | P0 | Propuesta | Tech Lead/Privacidad | 28/08/2026 | PRD 91; TRD 7–9 |
| DEC-020 | Marca, tipografía, logo y white label | P1 | Pendiente externo | Dirección/Marketing | 04/09/2026 | UI 1–4 |
| DEC-021 | Búsqueda, personalización y centro de tareas | P3 | Diferida post MVP-1 | Product Owner/UX | Tras piloto | UI 22–23,29,31–32; Flow 16–17 |
| DEC-022 | Reglas de transiciones y resolución humana | P1/P2 | Pendiente por dominio | Product Owner | Antes de cada dominio | Flow 3–14,20; PRD 17–20,25,29–31,65,67,78 |
| DEC-023 | Aprobación de prototipos | P1 | Pendiente externo | Product Owner | Antes de UI productiva | UI 34 |

## Criterio de cierre

Cada decisión debe registrar nombre del aprobador, fecha real, alternativa descartada, consecuencia, documentos impactados y enlace a ADR/catálogo. Si una propuesta cambia un requisito de mayor autoridad, se crea ADR y se actualiza la fuente antes de implementar.

