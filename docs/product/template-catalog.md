# Catálogo inicial de plantillas

Estado: estructura lista para catalogar; contenido productivo bloqueado hasta recibir manuales y aprobación técnica/sanitaria.

| ID | Dominio | Equipo/modelo | Nombre | Fuente | Versión fuente | Responsable | Estado |
|---|---|---|---|---|---|---|---|
| MT-PENDING-01 | Mantenimiento | Por definir | Preventivo | Manual por recibir | — | Responsable Técnico | Pendiente externo |
| MT-PENDING-02 | Mantenimiento | Por definir | Correctivo/checklist | Manual por recibir | — | Responsable Técnico | Pendiente externo |
| SN-PENDING-01 | Sanidad | Por definir | Bitácora operativa | Formato por recibir | — | Responsable Sanitario | Pendiente externo |
| LB-PENDING-01 | Laboratorio | General | Captura estructurada | Catálogo/dictamen por recibir | — | Responsable Sanitario | Pendiente externo |

## Metadatos obligatorios para semilla

- Identidad estable, dominio, modelo/sistema/componente compatible y versión inmutable.
- Fuente, fecha de vigencia, aprobador y hash del documento origen.
- Frecuencia, ventana, criticidad, responsables y escalamiento.
- Campos con tipo, unidad, obligatoriedad, evidencia, firma y reglas condicionales.
- Para sanidad: fuente normativa, versión del límite, interpretación y acción; nunca codificar un límite no aprobado.
- Estado borrador/publicada/retirada; publicar crea versión y no reescribe registros históricos.

## Criterio de aceptación de una plantilla

Dos personas comparan definición contra fuente; el responsable de dominio firma; existen casos válido, fuera de criterio, no aplica y dato faltante; migración y rollback están documentados. Las cuatro filas pendientes **no son datos semilla**.

Fuentes: PRD 8.6–8.8, preguntas 21–39; Database y TRD 12.3–12.4.

