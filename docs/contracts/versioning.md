# Política de compatibilidad y versionado

- Responsable técnico: Tech Lead.
- Fecha base: 19/08/2026.
- Alcance: API REST, eventos, archivos Excel y esquema offline.
- Estado: adoptada como contrato fundacional de Fase 1; no aprueba formatos Excel ni reglas de negocio pendientes.

## API HTTP

La primera versión mayor usa `/v1`. Cambios aditivos compatibles mantienen la versión mayor; remover o reinterpretar campos, estados o errores requiere una nueva versión mayor y un periodo de convivencia documentado. Los consumidores deben ignorar campos adicionales y no deben depender del orden de propiedades JSON.

## Eventos

El envelope tiene versión propia y cada tipo de evento declara `eventVersion`. Campos nuevos opcionales son compatibles; cambios semánticos o campos obligatorios nuevos incrementan la versión del evento. Los consumidores desconocidos rechazan de forma visible y envían a DLQ; nunca aplican un payload parcialmente comprendido.

## Excel

Cada formato aprobado tendrá identificador y versión. Un importador no adivina columnas ni corrige silenciosamente; valida formato, presenta vista previa y errores por fila. La versión `1` sólo reserva el mecanismo: F0-10 continúa bloqueado hasta recibir archivos reales anonimizados y aprobación funcional.

## Offline

IndexedDB comienza en versión `1`. Cada migración es incremental, conserva operaciones pendientes compatibles y define limpieza ante cierre de sesión o revocación. Una versión incompatible bloquea sincronización y muestra recuperación; nunca sobrescribe cambios concurrentes.

## Alternativas descartadas

- Versionar únicamente por despliegue: no protege consumidores desacoplados.
- Aceptar cualquier Excel por heurística: oculta ambigüedad y corrupción.
- Reutilizar versión de API para eventos/offline: acopla ciclos de vida distintos.

Referencias: `context/API.md`, `context/TRD.md`, `context/PROJECT_RULES.md`, TASK-F1-06.
