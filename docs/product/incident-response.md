# Estrategia inicial de soporte e incidentes

Estado: propuesta. Responsable nominal, teléfono, correo y herramienta de tickets están pendientes.

## Cobertura

- Desarrollo y staging: horario hábil de Ciudad de México.
- Producción piloto: soporte 8x5; guardia para P0 fuera de horario desde el primer dato real.
- Un Service Owner coordina; Tech Lead es incidente commander técnico hasta delegación.

## Severidades y objetivos

| Sev | Criterio | Acuse | Actualización | Objetivo de mitigación |
|---|---|---:|---:|---:|
| P0 | fuga/pérdida activa, acceso cruzado, plataforma total caída, integridad sanitaria crítica | 15 min | 30 min | 4 h |
| P1 | flujo MVP indisponible para varios usuarios, cola detenida, identidad degradada | 1 h | 2 h | 8 h hábiles |
| P2 | función degradada con alternativa, usuario/cuenta limitada | 4 h hábiles | diario | 3 días hábiles |
| P3 | consulta, defecto menor o mejora | 1 día hábil | por ticket | backlog |

Son objetivos operativos iniciales, no compensaciones contractuales.

## Flujo

1. Detectar por alerta/ticket y asignar `INC-AAAA-NNNNNN`.
2. Clasificar impacto, cuentas, datos, inicio y posible seguridad/sanidad.
3. Contener con feature flag, rollback o aislamiento; preservar evidencia.
4. Comunicar sólo hechos confirmados, alcance y siguiente actualización.
5. Recuperar, verificar métricas y reconciliar jobs/datos.
6. Cerrar con cronología, causa, acciones y aprobación del Service Owner.
7. Postmortem sin culpa en 5 días hábiles para P0/P1; acciones con dueño/fecha.

## Escalamiento

- Seguridad/Privacidad inmediato ante exposición, toma de cuenta o malware.
- Responsable Sanitario inmediato si datos/reglas pueden inducir una decisión sanitaria incorrecta.
- Jurídico/Dirección decide notificaciones externas; Ingeniería no improvisa comunicados regulatorios.
- Proveedor se escala con correlation ID sin enviar datos personales innecesarios.

## Canales por completar

| Uso | Canal | Responsable |
|---|---|---|
| Tickets | Por seleccionar | Service Owner |
| Guardia P0 | Por registrar | Tech Lead |
| Estado interno | Por seleccionar | Incident Commander |
| Comunicación a cliente | Correo/portal por aprobar | Product Owner |

Fuentes: PRD 9.7, preguntas 92–93; TRD 57 y pendiente 20; TASK-F0-15.

