# ICE24 OS — TASKS

## Control del documento

| Campo | Valor |
|---|---|
| Documento | Backlog técnico ejecutable por IA |
| Archivo | `TASKS.md` |
| Versión | 1.0 |
| Fecha base | Agosto de 2026 |
| Estado | Línea base propuesta; las decisiones de Fase 0 deben aprobarse antes de implementar alcance productivo |
| Fuente funcional | `ICE24_OS_PRD_v1.0.md` |
| Fuentes técnicas | `ICE24_OS_TRD_v1.0.md`, `Architecture.md`, `Database.md`, `API.md`, `UI_UX.md`, `AppFlow.md`, `Implementation_Plan.md` |

## 1. Propósito

Este documento descompone ICE24 OS en paquetes de trabajo pequeños, trazables y delimitados. Cada tarea puede ser asignada a una IA o a una persona sin permitir que improvise alcance, contratos, reglas sanitarias, permisos, políticas legales o decisiones de infraestructura no aprobadas.

Las rutas indicadas son el **alcance autorizado previsto** dentro del monorepo definido por el TRD. Un patrón como `/apps/api/src/modules/machines` representa los archivos del módulo que deberán crearse o modificarse; no autoriza cambios fuera de ese límite sin actualizar dependencias y registrar la decisión.

## 2. Orden de autoridad documental

1. El PRD gobierna el alcance funcional, roles, reglas y límites del producto.
2. El TRD y `Architecture.md` gobiernan las decisiones técnicas y límites de componentes.
3. `Database.md` gobierna el modelo lógico e integridad de datos.
4. `API.md` gobierna los contratos HTTP, errores, idempotencia y concurrencia.
5. `UI_UX.md` y `AppFlow.md` gobiernan pantallas, navegación, estados visibles y flujos alternativos.
6. `Implementation_Plan.md` gobierna secuencia, gates y riesgos de ejecución.

Cuando dos documentos parezcan incompatibles, la tarea se marca bloqueada: la IA no debe reconciliar la contradicción por su cuenta.

## 3. Reglas para ejecutar una tarea con IA

- Leer la tarea, sus dependencias y las secciones fuente antes de modificar artefactos.
- Limitarse a los archivos listados. Un cambio de alcance requiere una tarea separada o ADR.
- No implementar valores regulatorios, permisos, retención, precios, límites ni proveedores que sigan abiertos.
- Actualizar contratos antes o junto con sus consumidores; nunca exponer entidades ORM como contratos.
- Mantener aislamiento multiempresa, auditoría, idempotencia, concurrencia optimista, privacidad de archivos y no borrado histórico.
- Entregar un reporte final con archivos, pruebas, decisiones, riesgos, deuda y pasos de validación manual.

## 4. Resumen del backlog

| Fase | Nombre | Tareas |
|---:|---|---:|
| 0 | Cierre de decisiones y preparación ejecutiva | 16 |
| 1 | Monorepo, contratos, calidad y entorno local | 12 |
| 2 | Infraestructura, despliegue y observabilidad base | 12 |
| 3 | Identidad, autenticación, multiempresa y autorización | 14 |
| 4 | Cuentas, sucursales, usuarios, equipos y plantillas | 17 |
| 5 | Suscripción, auditoría, archivos, jobs y notificaciones | 15 |
| 6 | Sistema de diseño, shell privado y navegación | 12 |
| 7 | Mantenimiento, tickets, órdenes y offline operativo | 17 |
| 8 | Control sanitario, laboratorio y restricciones | 17 |
| 9 | Inventario y ciclo de vida de componentes | 12 |
| 10 | Documentos, reportes, PDF, portal público y QR | 18 |
| 11 | Ventas Excel, tarjetas y movimientos administrativos | 13 |
| 12 | Negocios, productos, pedidos, reparto y GPS | 20 |
| 13 | Analítica e indicadores | 13 |
| 14 | Endurecimiento, migración, accesibilidad y preparación productiva | 17 |
| 15 | Piloto, despliegue gradual y operación | 11 |
| **Total** |  | **236** |

## 5. Convenciones de estado

- **Bloqueada:** falta una dependencia o decisión material.
- **Lista:** todas las dependencias están satisfechas y los contratos fuente son consistentes.
- **En curso:** una sola IA o responsable tiene propiedad temporal del paquete.
- **En revisión:** implementación terminada, pendiente de quality gates o aprobación humana.
- **Terminada:** cumple todos los criterios de aceptación y Definition of Done.

---

# Fase 0 — Cierre de decisiones y preparación ejecutiva

**Objetivo de fase:** Convertir los documentos existentes en una línea base aprobada y resolver los bloqueos que impedirían implementar de forma determinista.

**Cantidad de tareas:** 16

## TASK-F0-01 — Nombrar responsables funcionales y técnicos por dominio

- **ID:** `TASK-F0-01`
- **Descripción:** Nombrar responsables funcionales y técnicos por dominio.
- **Objetivo:** Eliminar la ambigüedad necesaria para nombrar responsables funcionales y técnicos por dominio, dejando una decisión utilizable y trazable para las fases posteriores.
- **Archivos que se modificarán:**
  - `/docs/product`
  - `/docs/decisions`
  - `/docs/backlog`
  - `/docs/tasks/task-f0-01.md`
- **Dependencias:**
  - Ninguna tarea técnica previa. Requiere acceso a los documentos fuente y a los responsables de decisión.
- **Criterios de aceptación:**
  - Matriz RACI por módulo.
  - La decisión o insumo incluye responsable, fecha, alcance, alternativas descartadas y consecuencias para documentos afectados.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - El artefacto de decisión o catálogo está versionado en `/docs`, enlazado desde el índice correspondiente y no contiene decisiones materiales implícitas.
  - Los documentos derivados afectados fueron actualizados o se creó una lista explícita de cambios pendientes.
  - El responsable humano indicado en la matriz RACI aprobó la salida cuando la decisión es de negocio, seguridad, sanidad, privacidad o costo.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, decisiones, riesgos y validación pendiente.

## TASK-F0-02 — Definir el MVP o primer piloto utilizable

- **ID:** `TASK-F0-02`
- **Descripción:** Definir el MVP o primer piloto utilizable.
- **Objetivo:** Eliminar la ambigüedad necesaria para definir el MVP o primer piloto utilizable, dejando una decisión utilizable y trazable para las fases posteriores.
- **Archivos que se modificarán:**
  - `/docs/product`
  - `/docs/decisions`
  - `/docs/backlog`
  - `/docs/tasks/task-f0-02.md`
- **Dependencias:**
  - Ninguna tarea técnica previa. Requiere acceso a los documentos fuente y a los responsables de decisión.
- **Criterios de aceptación:**
  - Decisión de producto y alcance de release.
  - La decisión o insumo incluye responsable, fecha, alcance, alternativas descartadas y consecuencias para documentos afectados.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - El artefacto de decisión o catálogo está versionado en `/docs`, enlazado desde el índice correspondiente y no contiene decisiones materiales implícitas.
  - Los documentos derivados afectados fueron actualizados o se creó una lista explícita de cambios pendientes.
  - El responsable humano indicado en la matriz RACI aprobó la salida cuando la decisión es de negocio, seguridad, sanidad, privacidad o costo.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, decisiones, riesgos y validación pendiente.

## TASK-F0-03 — Priorizar las preguntas abiertas del PRD, TRD, UI/UX y AppFlow

- **ID:** `TASK-F0-03`
- **Descripción:** Priorizar las preguntas abiertas del PRD, TRD, UI/UX y AppFlow.
- **Objetivo:** Eliminar la ambigüedad necesaria para priorizar las preguntas abiertas del PRD, TRD, UI/UX y AppFlow, dejando una decisión utilizable y trazable para las fases posteriores.
- **Archivos que se modificarán:**
  - `/docs/product`
  - `/docs/decisions`
  - `/docs/backlog`
  - `/docs/tasks/task-f0-03.md`
- **Dependencias:**
  - Ninguna tarea técnica previa. Requiere acceso a los documentos fuente y a los responsables de decisión.
- **Criterios de aceptación:**
  - Registro de decisiones con estado, responsable y fecha objetivo.
  - La decisión o insumo incluye responsable, fecha, alcance, alternativas descartadas y consecuencias para documentos afectados.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - El artefacto de decisión o catálogo está versionado en `/docs`, enlazado desde el índice correspondiente y no contiene decisiones materiales implícitas.
  - Los documentos derivados afectados fueron actualizados o se creó una lista explícita de cambios pendientes.
  - El responsable humano indicado en la matriz RACI aprobó la salida cuando la decisión es de negocio, seguridad, sanidad, privacidad o costo.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, decisiones, riesgos y validación pendiente.

## TASK-F0-04 — Aprobar proveedor cloud, región y estrategia de entornos

- **ID:** `TASK-F0-04`
- **Descripción:** Aprobar proveedor cloud, región y estrategia de entornos.
- **Objetivo:** Eliminar la ambigüedad necesaria para aprobar proveedor cloud, región y estrategia de entornos, dejando una decisión utilizable y trazable para las fases posteriores.
- **Archivos que se modificarán:**
  - `/docs/product`
  - `/docs/decisions`
  - `/docs/backlog`
  - `/docs/tasks/task-f0-04.md`
- **Dependencias:**
  - Ninguna tarea técnica previa. Requiere acceso a los documentos fuente y a los responsables de decisión.
- **Criterios de aceptación:**
  - ADR de plataforma y diagrama de despliegue actualizado.
  - La decisión o insumo incluye responsable, fecha, alcance, alternativas descartadas y consecuencias para documentos afectados.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - El artefacto de decisión o catálogo está versionado en `/docs`, enlazado desde el índice correspondiente y no contiene decisiones materiales implícitas.
  - Los documentos derivados afectados fueron actualizados o se creó una lista explícita de cambios pendientes.
  - El responsable humano indicado en la matriz RACI aprobó la salida cuando la decisión es de negocio, seguridad, sanidad, privacidad o costo.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, decisiones, riesgos y validación pendiente.

## TASK-F0-05 — Aprobar objetivos iniciales de disponibilidad, RPO, RTO y retención

- **ID:** `TASK-F0-05`
- **Descripción:** Aprobar objetivos iniciales de disponibilidad, RPO, RTO y retención.
- **Objetivo:** Eliminar la ambigüedad necesaria para aprobar objetivos iniciales de disponibilidad, RPO, RTO y retención, dejando una decisión utilizable y trazable para las fases posteriores.
- **Archivos que se modificarán:**
  - `/docs/product`
  - `/docs/decisions`
  - `/docs/backlog`
  - `/docs/tasks/task-f0-05.md`
- **Dependencias:**
  - Ninguna tarea técnica previa. Requiere acceso a los documentos fuente y a los responsables de decisión.
- **Criterios de aceptación:**
  - SLO/SLI preliminares y política de continuidad.
  - La decisión o insumo incluye responsable, fecha, alcance, alternativas descartadas y consecuencias para documentos afectados.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - El artefacto de decisión o catálogo está versionado en `/docs`, enlazado desde el índice correspondiente y no contiene decisiones materiales implícitas.
  - Los documentos derivados afectados fueron actualizados o se creó una lista explícita de cambios pendientes.
  - El responsable humano indicado en la matriz RACI aprobó la salida cuando la decisión es de negocio, seguridad, sanidad, privacidad o costo.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, decisiones, riesgos y validación pendiente.

## TASK-F0-06 — Confirmar stack recomendado y elegir Vitest o Jest

- **ID:** `TASK-F0-06`
- **Descripción:** Confirmar stack recomendado y elegir Vitest o Jest.
- **Objetivo:** Eliminar la ambigüedad necesaria para confirmar stack recomendado y elegir Vitest o Jest, dejando una decisión utilizable y trazable para las fases posteriores.
- **Archivos que se modificarán:**
  - `/docs/product`
  - `/docs/decisions`
  - `/docs/backlog`
  - `/docs/tasks/task-f0-06.md`
- **Dependencias:**
  - Ninguna tarea técnica previa. Requiere acceso a los documentos fuente y a los responsables de decisión.
- **Criterios de aceptación:**
  - ADR de stack y política de versiones.
  - La decisión o insumo incluye responsable, fecha, alcance, alternativas descartadas y consecuencias para documentos afectados.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - El artefacto de decisión o catálogo está versionado en `/docs`, enlazado desde el índice correspondiente y no contiene decisiones materiales implícitas.
  - Los documentos derivados afectados fueron actualizados o se creó una lista explícita de cambios pendientes.
  - El responsable humano indicado en la matriz RACI aprobó la salida cuando la decisión es de negocio, seguridad, sanidad, privacidad o costo.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, decisiones, riesgos y validación pendiente.

## TASK-F0-07 — Aprobar estrategia de identidad: Supabase Auth, 2FA, recuperación y sesiones

- **ID:** `TASK-F0-07`
- **Descripción:** Aprobar estrategia de identidad: Supabase Auth, 2FA, recuperación y sesiones.
- **Objetivo:** Eliminar la ambigüedad necesaria para aprobar estrategia de identidad: Supabase Auth, 2FA, recuperación y sesiones, dejando una decisión utilizable y trazable para las fases posteriores.
- **Archivos que se modificarán:**
  - `/docs/product`
  - `/docs/decisions`
  - `/docs/backlog`
  - `/docs/tasks/task-f0-07.md`
- **Dependencias:**
  - Ninguna tarea técnica previa. Requiere acceso a los documentos fuente y a los responsables de decisión.
- **Criterios de aceptación:**
  - ADR de identidad y runbook de recuperación.
  - La decisión o insumo incluye responsable, fecha, alcance, alternativas descartadas y consecuencias para documentos afectados.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - El artefacto de decisión o catálogo está versionado en `/docs`, enlazado desde el índice correspondiente y no contiene decisiones materiales implícitas.
  - Los documentos derivados afectados fueron actualizados o se creó una lista explícita de cambios pendientes.
  - El responsable humano indicado en la matriz RACI aprobó la salida cuando la decisión es de negocio, seguridad, sanidad, privacidad o costo.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, decisiones, riesgos y validación pendiente.

## TASK-F0-08 — Aprobar la matriz base de roles, acciones, ámbitos y datos sensibles

- **ID:** `TASK-F0-08`
- **Descripción:** Aprobar la matriz base de roles, acciones, ámbitos y datos sensibles.
- **Objetivo:** Eliminar la ambigüedad necesaria para aprobar la matriz base de roles, acciones, ámbitos y datos sensibles, dejando una decisión utilizable y trazable para las fases posteriores.
- **Archivos que se modificarán:**
  - `/docs/product`
  - `/docs/decisions`
  - `/docs/backlog`
  - `/docs/tasks/task-f0-08.md`
- **Dependencias:**
  - Ninguna tarea técnica previa. Requiere acceso a los documentos fuente y a los responsables de decisión.
- **Criterios de aceptación:**
  - Matriz de autorización versionada.
  - La decisión o insumo incluye responsable, fecha, alcance, alternativas descartadas y consecuencias para documentos afectados.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - El artefacto de decisión o catálogo está versionado en `/docs`, enlazado desde el índice correspondiente y no contiene decisiones materiales implícitas.
  - Los documentos derivados afectados fueron actualizados o se creó una lista explícita de cambios pendientes.
  - El responsable humano indicado en la matriz RACI aprobó la salida cuando la decisión es de negocio, seguridad, sanidad, privacidad o costo.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, decisiones, riesgos y validación pendiente.

## TASK-F0-09 — Definir convenciones definitivas del Código ICE24 OS y folios

- **ID:** `TASK-F0-09`
- **Descripción:** Definir convenciones definitivas del Código ICE24 OS y folios.
- **Objetivo:** Eliminar la ambigüedad necesaria para definir convenciones definitivas del Código ICE24 OS y folios, dejando una decisión utilizable y trazable para las fases posteriores.
- **Archivos que se modificarán:**
  - `/docs/product`
  - `/docs/decisions`
  - `/docs/backlog`
  - `/docs/tasks/task-f0-09.md`
- **Dependencias:**
  - Ninguna tarea técnica previa. Requiere acceso a los documentos fuente y a los responsables de decisión.
- **Criterios de aceptación:**
  - Especificación de identificadores visibles.
  - La decisión o insumo incluye responsable, fecha, alcance, alternativas descartadas y consecuencias para documentos afectados.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - El artefacto de decisión o catálogo está versionado en `/docs`, enlazado desde el índice correspondiente y no contiene decisiones materiales implícitas.
  - Los documentos derivados afectados fueron actualizados o se creó una lista explícita de cambios pendientes.
  - El responsable humano indicado en la matriz RACI aprobó la salida cuando la decisión es de negocio, seguridad, sanidad, privacidad o costo.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, decisiones, riesgos y validación pendiente.

## TASK-F0-10 — Obtener formatos Excel reales y catalogarlos por modelo/versión

- **ID:** `TASK-F0-10`
- **Descripción:** Obtener formatos Excel reales y catalogarlos por modelo/versión.
- **Objetivo:** Eliminar la ambigüedad necesaria para obtener formatos Excel reales y catalogarlos por modelo/versión, dejando una decisión utilizable y trazable para las fases posteriores.
- **Archivos que se modificarán:**
  - `/docs/product`
  - `/docs/decisions`
  - `/docs/backlog`
  - `/docs/tasks/task-f0-10.md`
- **Dependencias:**
  - Ninguna tarea técnica previa. Requiere acceso a los documentos fuente y a los responsables de decisión.
- **Criterios de aceptación:**
  - Muestras anonimizadas y matriz de formatos.
  - La decisión o insumo incluye responsable, fecha, alcance, alternativas descartadas y consecuencias para documentos afectados.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - El artefacto de decisión o catálogo está versionado en `/docs`, enlazado desde el índice correspondiente y no contiene decisiones materiales implícitas.
  - Los documentos derivados afectados fueron actualizados o se creó una lista explícita de cambios pendientes.
  - El responsable humano indicado en la matriz RACI aprobó la salida cuando la decisión es de negocio, seguridad, sanidad, privacidad o costo.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, decisiones, riesgos y validación pendiente.

## TASK-F0-11 — Recopilar plantillas iniciales de mantenimiento y sanidad

- **ID:** `TASK-F0-11`
- **Descripción:** Recopilar plantillas iniciales de mantenimiento y sanidad.
- **Objetivo:** Eliminar la ambigüedad necesaria para recopilar plantillas iniciales de mantenimiento y sanidad, dejando una decisión utilizable y trazable para las fases posteriores.
- **Archivos que se modificarán:**
  - `/docs/product`
  - `/docs/decisions`
  - `/docs/backlog`
  - `/docs/tasks/task-f0-11.md`
- **Dependencias:**
  - Ninguna tarea técnica previa. Requiere acceso a los documentos fuente y a los responsables de decisión.
- **Criterios de aceptación:**
  - Catálogo versionado listo para datos semilla.
  - La decisión o insumo incluye responsable, fecha, alcance, alternativas descartadas y consecuencias para documentos afectados.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - El artefacto de decisión o catálogo está versionado en `/docs`, enlazado desde el índice correspondiente y no contiene decisiones materiales implícitas.
  - Los documentos derivados afectados fueron actualizados o se creó una lista explícita de cambios pendientes.
  - El responsable humano indicado en la matriz RACI aprobó la salida cuando la decisión es de negocio, seguridad, sanidad, privacidad o costo.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, decisiones, riesgos y validación pendiente.

## TASK-F0-12 — Validar parámetros, límites, reglas de publicación y leyendas con responsables sanitario y jurídico

- **ID:** `TASK-F0-12`
- **Descripción:** Validar parámetros, límites, reglas de publicación y leyendas con responsables sanitario y jurídico.
- **Objetivo:** Eliminar la ambigüedad necesaria para validar parámetros, límites, reglas de publicación y leyendas con responsables sanitario y jurídico, dejando una decisión utilizable y trazable para las fases posteriores.
- **Archivos que se modificarán:**
  - `/docs/product`
  - `/docs/decisions`
  - `/docs/backlog`
  - `/docs/tasks/task-f0-12.md`
- **Dependencias:**
  - Ninguna tarea técnica previa. Requiere acceso a los documentos fuente y a los responsables de decisión.
- **Criterios de aceptación:**
  - Documento de validación y fuentes autorizadas.
  - La decisión o insumo incluye responsable, fecha, alcance, alternativas descartadas y consecuencias para documentos afectados.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - El artefacto de decisión o catálogo está versionado en `/docs`, enlazado desde el índice correspondiente y no contiene decisiones materiales implícitas.
  - Los documentos derivados afectados fueron actualizados o se creó una lista explícita de cambios pendientes.
  - El responsable humano indicado en la matriz RACI aprobó la salida cuando la decisión es de negocio, seguridad, sanidad, privacidad o costo.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, decisiones, riesgos y validación pendiente.

## TASK-F0-13 — Definir proveedores de correo, mapas, antivirus y almacenamiento

- **ID:** `TASK-F0-13`
- **Descripción:** Definir proveedores de correo, mapas, antivirus y almacenamiento.
- **Objetivo:** Eliminar la ambigüedad necesaria para definir proveedores de correo, mapas, antivirus y almacenamiento, dejando una decisión utilizable y trazable para las fases posteriores.
- **Archivos que se modificarán:**
  - `/docs/product`
  - `/docs/decisions`
  - `/docs/backlog`
  - `/docs/tasks/task-f0-13.md`
- **Dependencias:**
  - Ninguna tarea técnica previa. Requiere acceso a los documentos fuente y a los responsables de decisión.
- **Criterios de aceptación:**
  - ADR por integración y presupuesto inicial.
  - La decisión o insumo incluye responsable, fecha, alcance, alternativas descartadas y consecuencias para documentos afectados.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - El artefacto de decisión o catálogo está versionado en `/docs`, enlazado desde el índice correspondiente y no contiene decisiones materiales implícitas.
  - Los documentos derivados afectados fueron actualizados o se creó una lista explícita de cambios pendientes.
  - El responsable humano indicado en la matriz RACI aprobó la salida cuando la decisión es de negocio, seguridad, sanidad, privacidad o costo.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, decisiones, riesgos y validación pendiente.

## TASK-F0-14 — Definir navegadores, dispositivos y condiciones de conectividad objetivo

- **ID:** `TASK-F0-14`
- **Descripción:** Definir navegadores, dispositivos y condiciones de conectividad objetivo.
- **Objetivo:** Eliminar la ambigüedad necesaria para definir navegadores, dispositivos y condiciones de conectividad objetivo, dejando una decisión utilizable y trazable para las fases posteriores.
- **Archivos que se modificarán:**
  - `/docs/product`
  - `/docs/decisions`
  - `/docs/backlog`
  - `/docs/tasks/task-f0-14.md`
- **Dependencias:**
  - Ninguna tarea técnica previa. Requiere acceso a los documentos fuente y a los responsables de decisión.
- **Criterios de aceptación:**
  - Matriz de soporte y escenarios de campo.
  - La decisión o insumo incluye responsable, fecha, alcance, alternativas descartadas y consecuencias para documentos afectados.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - El artefacto de decisión o catálogo está versionado en `/docs`, enlazado desde el índice correspondiente y no contiene decisiones materiales implícitas.
  - Los documentos derivados afectados fueron actualizados o se creó una lista explícita de cambios pendientes.
  - El responsable humano indicado en la matriz RACI aprobó la salida cuando la decisión es de negocio, seguridad, sanidad, privacidad o costo.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, decisiones, riesgos y validación pendiente.

## TASK-F0-15 — Establecer estrategia de soporte, severidades, guardias y comunicación de incidentes

- **ID:** `TASK-F0-15`
- **Descripción:** Establecer estrategia de soporte, severidades, guardias y comunicación de incidentes.
- **Objetivo:** Eliminar la ambigüedad necesaria para establecer estrategia de soporte, severidades, guardias y comunicación de incidentes, dejando una decisión utilizable y trazable para las fases posteriores.
- **Archivos que se modificarán:**
  - `/docs/product`
  - `/docs/decisions`
  - `/docs/backlog`
  - `/docs/tasks/task-f0-15.md`
- **Dependencias:**
  - Ninguna tarea técnica previa. Requiere acceso a los documentos fuente y a los responsables de decisión.
- **Criterios de aceptación:**
  - Runbook operativo inicial.
  - La decisión o insumo incluye responsable, fecha, alcance, alternativas descartadas y consecuencias para documentos afectados.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - El artefacto de decisión o catálogo está versionado en `/docs`, enlazado desde el índice correspondiente y no contiene decisiones materiales implícitas.
  - Los documentos derivados afectados fueron actualizados o se creó una lista explícita de cambios pendientes.
  - El responsable humano indicado en la matriz RACI aprobó la salida cuando la decisión es de negocio, seguridad, sanidad, privacidad o costo.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, decisiones, riesgos y validación pendiente.

## TASK-F0-16 — Convertir las fases en épicas, capacidades y paquetes de trabajo trazables

- **ID:** `TASK-F0-16`
- **Descripción:** Convertir las fases en épicas, capacidades y paquetes de trabajo trazables.
- **Objetivo:** Eliminar la ambigüedad necesaria para convertir las fases en épicas, capacidades y paquetes de trabajo trazables, dejando una decisión utilizable y trazable para las fases posteriores.
- **Archivos que se modificarán:**
  - `/docs/product`
  - `/docs/decisions`
  - `/docs/backlog`
  - `/docs/tasks/task-f0-16.md`
- **Dependencias:**
  - Ninguna tarea técnica previa. Requiere acceso a los documentos fuente y a los responsables de decisión.
  - `TASK-F0-02`
  - `TASK-F0-03`
  - `TASK-F0-04`
  - `TASK-F0-05`
  - `TASK-F0-06`
  - `TASK-F0-07`
  - `TASK-F0-08`
  - `TASK-F0-09`
- **Criterios de aceptación:**
  - Backlog inicial con IDs y criterios de aceptación.
  - La decisión o insumo incluye responsable, fecha, alcance, alternativas descartadas y consecuencias para documentos afectados.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - El artefacto de decisión o catálogo está versionado en `/docs`, enlazado desde el índice correspondiente y no contiene decisiones materiales implícitas.
  - Los documentos derivados afectados fueron actualizados o se creó una lista explícita de cambios pendientes.
  - El responsable humano indicado en la matriz RACI aprobó la salida cuando la decisión es de negocio, seguridad, sanidad, privacidad o costo.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, decisiones, riesgos y validación pendiente.

---

# Fase 1 — Monorepo, contratos, calidad y entorno local

**Objetivo de fase:** Crear la estructura de ingeniería reproducible sobre la que se implementarán todos los módulos.

**Cantidad de tareas:** 12

## TASK-F1-01 — Crear el monorepo con pnpm workspaces y Turborepo

- **ID:** `TASK-F1-01`
- **Descripción:** Crear el monorepo con pnpm workspaces y Turborepo.
- **Objetivo:** Entregar estructura raíz definida en el TRD sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/docs/engineering`
  - `/docs/templates`
  - `/package.json`
  - `/pnpm-workspace.yaml`
  - `/turbo.json`
  - `/docs/tasks/task-f1-01.md`
- **Dependencias:**
  - Gate de salida de Fase 0 aprobado.
- **Criterios de aceptación:**
  - Estructura raíz definida en el TRD.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F1-02 — Crear aplicaciones vacías para PWA privada, portal público, API, worker y PDF worker

- **ID:** `TASK-F1-02`
- **Descripción:** Crear aplicaciones vacías para PWA privada, portal público, API, worker y PDF worker.
- **Objetivo:** Entregar cada aplicación compila y se ejecuta aisladamente sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/docs/engineering`
  - `/docs/templates`
  - `/apps/private-web`
  - `/apps/public-portal`
  - `/apps/api`
  - `/apps/worker`
  - `/apps/pdf-worker`
  - `/docs/tasks/task-f1-02.md`
- **Dependencias:**
  - Gate de salida de Fase 0 aprobado.
  - `TASK-F1-01`
- **Criterios de aceptación:**
  - Cada aplicación compila y se ejecuta aisladamente.
  - La interfaz cubre carga, vacío, error, permiso denegado y modo lectura; funciona en los breakpoints definidos.
  - Los controles son navegables por teclado y cumplen el objetivo WCAG 2.2 AA aplicable.
  - Los archivos permanecen privados, validados y vinculados mediante metadatos; no existen URLs públicas permanentes.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - OpenAPI, errores, idempotencia, concurrencia y ejemplos de contrato fueron actualizados y validados.
  - La pantalla o componente tiene estados completos, prueba de accesibilidad y evidencia responsive/visual en los dispositivos objetivo.
  - Se validaron límites, tipo, integridad, privacidad, manejo de malware/fallo y eliminación temporal de derivados cuando corresponda.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F1-03 — Crear paquetes compartidos de contratos, UI, dominio, autorización, datos, offline, configuración, observabilidad y testing

- **ID:** `TASK-F1-03`
- **Descripción:** Crear paquetes compartidos de contratos, UI, dominio, autorización, datos, offline, configuración, observabilidad y testing.
- **Objetivo:** Entregar dependencias internas explícitas y sin ciclos sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/docs/engineering`
  - `/docs/templates`
  - `/packages/contracts`
  - `/packages/ui`
  - `/packages/domain`
  - `/packages/authorization`
  - `/packages/database`
  - `/packages/offline`
  - `/packages/config`
- **Dependencias:**
  - Gate de salida de Fase 0 aprobado.
  - `TASK-F1-01`
- **Criterios de aceptación:**
  - Dependencias internas explícitas y sin ciclos.
  - Existen pruebas positivas y negativas que demuestran aislamiento entre cuentas, ámbitos y acciones.
  - Los reintentos no duplican efectos y los conflictos o fallos quedan visibles y recuperables.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - La migración o cambio de datos incluye estrategia de compatibilidad, validación y reversión operativa; no elimina historial requerido.
  - OpenAPI, errores, idempotencia, concurrencia y ejemplos de contrato fueron actualizados y validados.
  - Se validaron pérdida de conexión, reintento, cierre de sesión, pérdida de permiso, conflicto y limpieza de datos locales.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F1-04 — Configurar TypeScript estricto y convenciones de importación

- **ID:** `TASK-F1-04`
- **Descripción:** Configurar TypeScript estricto y convenciones de importación.
- **Objetivo:** Entregar compilación estricta en todo el repositorio sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/docs/engineering`
  - `/docs/templates`
  - `/tsconfig.base.json`
  - `/packages/config/tsconfig`
  - `/docs/tasks/task-f1-04.md`
- **Dependencias:**
  - Gate de salida de Fase 0 aprobado.
  - `TASK-F1-01`
  - `TASK-F1-02`
  - `TASK-F1-03`
- **Criterios de aceptación:**
  - Compilación estricta en todo el repositorio.
  - Los reintentos no duplican efectos y los conflictos o fallos quedan visibles y recuperables.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F1-05 — Configurar formatter, lint, hooks y validación de commits

- **ID:** `TASK-F1-05`
- **Descripción:** Configurar formatter, lint, hooks y validación de commits.
- **Objetivo:** Entregar quality checks locales y en CI sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/docs/engineering`
  - `/docs/templates`
  - `/eslint.config.*`
  - `/prettier.config.*`
  - `/.husky`
  - `/commitlint.config.*`
  - `/docs/tasks/task-f1-05.md`
- **Dependencias:**
  - Gate de salida de Fase 0 aprobado.
  - `TASK-F1-04`
- **Criterios de aceptación:**
  - Quality checks locales y en CI.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F1-06 — Definir versionado de API, eventos, formatos Excel y esquemas offline

- **ID:** `TASK-F1-06`
- **Descripción:** Definir versionado de API, eventos, formatos Excel y esquemas offline.
- **Objetivo:** Dejar resuelto el alcance de “Definir versionado de API, eventos, formatos Excel y esquemas offline” con una salida verificable: política de compatibilidad documentada.
- **Archivos que se modificarán:**
  - `/docs/engineering`
  - `/docs/templates`
  - `/packages/contracts`
  - `/docs/contracts`
  - `/docs/tasks/task-f1-06.md`
- **Dependencias:**
  - Gate de salida de Fase 0 aprobado.
  - `TASK-F0-06`
  - `TASK-F1-03`
- **Criterios de aceptación:**
  - Política de compatibilidad documentada.
  - Los reintentos no duplican efectos y los conflictos o fallos quedan visibles y recuperables.
  - Los archivos permanecen privados, validados y vinculados mediante metadatos; no existen URLs públicas permanentes.
  - La decisión o insumo incluye responsable, fecha, alcance, alternativas descartadas y consecuencias para documentos afectados.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - El artefacto de decisión o catálogo está versionado en `/docs`, enlazado desde el índice correspondiente y no contiene decisiones materiales implícitas.
  - Los documentos derivados afectados fueron actualizados o se creó una lista explícita de cambios pendientes.
  - El responsable humano indicado en la matriz RACI aprobó la salida cuando la decisión es de negocio, seguridad, sanidad, privacidad o costo.
  - OpenAPI, errores, idempotencia, concurrencia y ejemplos de contrato fueron actualizados y validados.
  - Se validaron pérdida de conexión, reintento, cierre de sesión, pérdida de permiso, conflicto y limpieza de datos locales.
  - Se validaron límites, tipo, integridad, privacidad, manejo de malware/fallo y eliminación temporal de derivados cuando corresponda.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F1-07 — Incorporar los contratos iniciales de errores, paginación, identidad, contexto, idempotencia y concurrencia

- **ID:** `TASK-F1-07`
- **Descripción:** Incorporar los contratos iniciales de errores, paginación, identidad, contexto, idempotencia y concurrencia.
- **Objetivo:** Entregar paquete `contracts` consumible sin ORM sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/docs/engineering`
  - `/docs/templates`
  - `/packages/contracts`
  - `/docs/contracts`
  - `/docs/tasks/task-f1-07.md`
- **Dependencias:**
  - Gate de salida de Fase 0 aprobado.
  - `TASK-F1-03`
  - `TASK-F1-06`
- **Criterios de aceptación:**
  - Paquete `contracts` consumible sin ORM.
  - Los reintentos no duplican efectos y los conflictos o fallos quedan visibles y recuperables.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - OpenAPI, errores, idempotencia, concurrencia y ejemplos de contrato fueron actualizados y validados.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F1-08 — Configurar dependencias locales: PostgreSQL/PostGIS, Supabase local y servicios simulados

- **ID:** `TASK-F1-08`
- **Descripción:** Configurar dependencias locales: PostgreSQL/PostGIS, Supabase local y servicios simulados.
- **Objetivo:** Entregar arranque local documentado y repetible sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/docs/engineering`
  - `/docs/templates`
  - `/infra/containers`
  - `/docker-compose.yml`
  - `/docs/runbooks/local-development.md`
  - `/docs/tasks/task-f1-08.md`
- **Dependencias:**
  - Gate de salida de Fase 0 aprobado.
  - `TASK-F1-01`
  - `TASK-F0-04`
  - `TASK-F0-07`
- **Criterios de aceptación:**
  - Arranque local documentado y repetible.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F1-09 — Configurar framework único de pruebas unitarias y Testcontainers

- **ID:** `TASK-F1-09`
- **Descripción:** Configurar framework único de pruebas unitarias y Testcontainers.
- **Objetivo:** Entregar prueba de referencia unitaria e integración sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/docs/engineering`
  - `/docs/templates`
  - `/packages/testing`
  - `/vitest.config.*`
  - `/tests/integration`
  - `/docs/tasks/task-f1-09.md`
- **Dependencias:**
  - Gate de salida de Fase 0 aprobado.
  - `TASK-F1-04`
  - `TASK-F1-08`
- **Criterios de aceptación:**
  - Prueba de referencia unitaria e integración.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F1-10 — Crear pipeline inicial de CI

- **ID:** `TASK-F1-10`
- **Descripción:** Crear pipeline inicial de CI.
- **Objetivo:** Entregar build, lint, tipos, tests y escaneo de secretos en cada PR sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/docs/engineering`
  - `/docs/templates`
  - `/eslint.config.*`
  - `/prettier.config.*`
  - `/.husky`
  - `/commitlint.config.*`
  - `/.github/workflows/ci.yml`
  - `/docs/tasks/task-f1-10.md`
- **Dependencias:**
  - Gate de salida de Fase 0 aprobado.
  - `TASK-F1-04`
  - `TASK-F1-05`
  - `TASK-F1-09`
- **Criterios de aceptación:**
  - Build, lint, tipos, tests y escaneo de secretos en cada PR.
  - La configuración es reproducible por entorno y cuenta con evidencia de despliegue o restauración según corresponda.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El cambio se probó en un entorno no productivo y cuenta con pasos de promoción, rollback y monitoreo documentados.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F1-11 — Crear plantillas de ADR, runbook, threat model y documentación de módulo

- **ID:** `TASK-F1-11`
- **Descripción:** Crear plantillas de ADR, runbook, threat model y documentación de módulo.
- **Objetivo:** Entregar documentación normalizada sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/docs/engineering`
  - `/docs/templates`
  - `/docs/tasks/task-f1-11.md`
- **Dependencias:**
  - Gate de salida de Fase 0 aprobado.
  - `TASK-F1-01`
- **Criterios de aceptación:**
  - Documentación normalizada.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F1-12 — Definir fixtures y datos semilla no sensibles para desarrollo

- **ID:** `TASK-F1-12`
- **Descripción:** Definir fixtures y datos semilla no sensibles para desarrollo.
- **Objetivo:** Dejar resuelto el alcance de “Definir fixtures y datos semilla no sensibles para desarrollo” con una salida verificable: dataset de prueba controlado.
- **Archivos que se modificarán:**
  - `/docs/engineering`
  - `/docs/templates`
  - `/packages/testing/src/fixtures`
  - `/packages/database/src/seeds`
  - `/docs/tasks/task-f1-12.md`
- **Dependencias:**
  - Gate de salida de Fase 0 aprobado.
  - `TASK-F1-08`
  - `TASK-F0-11`
- **Criterios de aceptación:**
  - Dataset de prueba controlado.
  - Toda acción sensible genera auditoría con actor, contexto, correlación, valores relevantes y resultado.
  - La decisión o insumo incluye responsable, fecha, alcance, alternativas descartadas y consecuencias para documentos afectados.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - El artefacto de decisión o catálogo está versionado en `/docs`, enlazado desde el índice correspondiente y no contiene decisiones materiales implícitas.
  - Los documentos derivados afectados fueron actualizados o se creó una lista explícita de cambios pendientes.
  - El responsable humano indicado en la matriz RACI aprobó la salida cuando la decisión es de negocio, seguridad, sanidad, privacidad o costo.
  - La migración o cambio de datos incluye estrategia de compatibilidad, validación y reversión operativa; no elimina historial requerido.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

---

# Fase 2 — Infraestructura, despliegue y observabilidad base

**Objetivo de fase:** Proveer ambientes aislados, despliegue repetible, secretos protegidos y telemetría desde el primer módulo funcional.

**Cantidad de tareas:** 12

## TASK-F2-01 — Modelar infraestructura como código para red, cómputo, base, objetos, colas, secretos y DNS

- **ID:** `TASK-F2-01`
- **Descripción:** Modelar infraestructura como código para red, cómputo, base, objetos, colas, secretos y DNS.
- **Objetivo:** Entregar módulos Terraform versionados sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/infra/terraform`
  - `/infra/containers`
  - `/docs/runbooks`
  - `/docs/adr`
  - `/infra/terraform/modules/messaging`
  - `/docs/runbooks/queues.md`
  - `/infra/terraform/modules/secrets`
  - `/docs/runbooks/secrets.md`
  - `/docs/tasks/task-f2-01.md`
- **Dependencias:**
  - Gate de salida de Fase 0 aprobado.
  - `TASK-F1-01`
  - `TASK-F1-04`
  - `TASK-F1-10`
- **Criterios de aceptación:**
  - Módulos Terraform versionados.
  - Los reintentos no duplican efectos y los conflictos o fallos quedan visibles y recuperables.
  - La configuración es reproducible por entorno y cuenta con evidencia de despliegue o restauración según corresponda.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - La migración o cambio de datos incluye estrategia de compatibilidad, validación y reversión operativa; no elimina historial requerido.
  - El cambio se probó en un entorno no productivo y cuenta con pasos de promoción, rollback y monitoreo documentados.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F2-02 — Crear ambientes `development`, `test`, `staging` y `production`

- **ID:** `TASK-F2-02`
- **Descripción:** Crear ambientes `development`, `test`, `staging` y `production`.
- **Objetivo:** Entregar cuentas/proyectos y variables aisladas sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/infra/terraform`
  - `/infra/containers`
  - `/docs/runbooks`
  - `/docs/adr`
  - `/infra/terraform/environments`
  - `/packages/config/src/environments`
  - `/docs/tasks/task-f2-02.md`
- **Dependencias:**
  - Gate de salida de Fase 0 aprobado.
  - `TASK-F1-01`
  - `TASK-F1-04`
  - `TASK-F1-10`
  - `TASK-F2-01`
- **Criterios de aceptación:**
  - Cuentas/proyectos y variables aisladas.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F2-03 — Configurar RDS PostgreSQL/PostGIS o equivalente administrado

- **ID:** `TASK-F2-03`
- **Descripción:** Configurar RDS PostgreSQL/PostGIS o equivalente administrado.
- **Objetivo:** Entregar instancia privada, cifrada y respaldada sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/infra/terraform`
  - `/infra/containers`
  - `/docs/runbooks`
  - `/docs/adr`
  - `/infra/terraform/modules/database`
  - `/docs/runbooks/database.md`
  - `/docs/tasks/task-f2-03.md`
- **Dependencias:**
  - Gate de salida de Fase 0 aprobado.
  - `TASK-F1-01`
  - `TASK-F1-04`
  - `TASK-F1-10`
  - `TASK-F2-01`
  - `TASK-F2-02`
- **Criterios de aceptación:**
  - Instancia privada, cifrada y respaldada.
  - La configuración es reproducible por entorno y cuenta con evidencia de despliegue o restauración según corresponda.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F2-04 — Configurar almacenamiento de objetos privado y ciclo de vida inicial

- **ID:** `TASK-F2-04`
- **Descripción:** Configurar almacenamiento de objetos privado y ciclo de vida inicial.
- **Objetivo:** Entregar buckets separados por ambiente y clase de archivo sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/infra/terraform`
  - `/infra/containers`
  - `/docs/runbooks`
  - `/docs/adr`
  - `/infra/terraform/modules/object-storage`
  - `/docs/runbooks/object-storage.md`
  - `/docs/tasks/task-f2-04.md`
- **Dependencias:**
  - Gate de salida de Fase 0 aprobado.
  - `TASK-F1-01`
  - `TASK-F1-04`
  - `TASK-F1-10`
  - `TASK-F2-01`
  - `TASK-F2-02`
- **Criterios de aceptación:**
  - Buckets separados por ambiente y clase de archivo.
  - Los archivos permanecen privados, validados y vinculados mediante metadatos; no existen URLs públicas permanentes.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - Se validaron límites, tipo, integridad, privacidad, manejo de malware/fallo y eliminación temporal de derivados cuando corresponda.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F2-05 — Configurar cola general, cola PDF, DLQ y scheduler

- **ID:** `TASK-F2-05`
- **Descripción:** Configurar cola general, cola PDF, DLQ y scheduler.
- **Objetivo:** Entregar mensajes de prueba con reintento y DLQ sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/infra/terraform`
  - `/infra/containers`
  - `/docs/runbooks`
  - `/docs/adr`
  - `/infra/terraform/modules/messaging`
  - `/docs/runbooks/queues.md`
  - `/docs/tasks/task-f2-05.md`
- **Dependencias:**
  - Gate de salida de Fase 0 aprobado.
  - `TASK-F1-01`
  - `TASK-F1-04`
  - `TASK-F1-10`
  - `TASK-F2-01`
  - `TASK-F2-02`
- **Criterios de aceptación:**
  - Mensajes de prueba con reintento y DLQ.
  - Los reintentos no duplican efectos y los conflictos o fallos quedan visibles y recuperables.
  - Los archivos permanecen privados, validados y vinculados mediante metadatos; no existen URLs públicas permanentes.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - Se validaron límites, tipo, integridad, privacidad, manejo de malware/fallo y eliminación temporal de derivados cuando corresponda.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F2-06 — Configurar Supabase Auth en entorno no productivo

- **ID:** `TASK-F2-06`
- **Descripción:** Configurar Supabase Auth en un proyecto no productivo aislado.
- **Objetivo:** Entregar endpoint OIDC funcional en entorno no productivo sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/infra/terraform`
  - `/infra/containers`
  - `/docs/runbooks`
  - `/docs/adr`
  - `/infra/terraform/modules/identity`
  - `/docs/security/identity.md`
  - `/infra/terraform/modules/backup`
  - `/docs/runbooks/backup-restore.md`
  - `/docs/tasks/task-f2-06.md`
- **Dependencias:**
  - Gate de salida de Fase 0 aprobado.
  - `TASK-F1-01`
  - `TASK-F1-04`
  - `TASK-F1-10`
  - `TASK-F2-01`
  - `TASK-F2-02`
  - `TASK-F0-07`
- **Criterios de aceptación:**
  - Endpoint OIDC funcional en entorno no productivo.
  - La configuración es reproducible por entorno y cuenta con evidencia de despliegue o restauración según corresponda.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - La migración o cambio de datos incluye estrategia de compatibilidad, validación y reversión operativa; no elimina historial requerido.
  - OpenAPI, errores, idempotencia, concurrencia y ejemplos de contrato fueron actualizados y validados.
  - El cambio se probó en un entorno no productivo y cuenta con pasos de promoción, rollback y monitoreo documentados.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F2-07 — Configurar secretos, llaves de cifrado, certificados y rotación

- **ID:** `TASK-F2-07`
- **Descripción:** Configurar secretos, llaves de cifrado, certificados y rotación.
- **Objetivo:** Entregar ningún secreto almacenado en repositorio o imagen sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/infra/terraform`
  - `/infra/containers`
  - `/docs/runbooks`
  - `/docs/adr`
  - `/infra/terraform/modules/secrets`
  - `/docs/runbooks/secrets.md`
  - `/docs/tasks/task-f2-07.md`
- **Dependencias:**
  - Gate de salida de Fase 0 aprobado.
  - `TASK-F1-01`
  - `TASK-F1-04`
  - `TASK-F1-10`
  - `TASK-F2-01`
  - `TASK-F2-02`
- **Criterios de aceptación:**
  - Ningún secreto almacenado en repositorio o imagen.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F2-08 — Configurar logs estructurados, métricas y trazas OpenTelemetry

- **ID:** `TASK-F2-08`
- **Descripción:** Configurar logs estructurados, métricas y trazas OpenTelemetry.
- **Objetivo:** Entregar correlación desde web/API a worker sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/infra/terraform`
  - `/infra/containers`
  - `/docs/runbooks`
  - `/docs/adr`
  - `/packages/observability`
  - `/infra/terraform/modules/observability`
  - `/docs/runbooks/observability.md`
  - `/docs/tasks/task-f2-08.md`
- **Dependencias:**
  - Gate de salida de Fase 0 aprobado.
  - `TASK-F1-01`
  - `TASK-F1-04`
  - `TASK-F1-10`
  - `TASK-F2-01`
  - `TASK-F1-03`
- **Criterios de aceptación:**
  - Correlación desde web/API a worker.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - OpenAPI, errores, idempotencia, concurrencia y ejemplos de contrato fueron actualizados y validados.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F2-09 — Definir health checks, readiness, liveness y dashboards básicos

- **ID:** `TASK-F2-09`
- **Descripción:** Definir health checks, readiness, liveness y dashboards básicos.
- **Objetivo:** Dejar resuelto el alcance de “Definir health checks, readiness, liveness y dashboards básicos” con una salida verificable: estado de cada contenedor visible.
- **Archivos que se modificarán:**
  - `/infra/terraform`
  - `/infra/containers`
  - `/docs/runbooks`
  - `/docs/adr`
  - `/infra/terraform/modules/database`
  - `/docs/runbooks/database.md`
  - `/apps/api/src/health`
  - `/apps/worker/src/health`
  - `/apps/pdf-worker/src/health`
- **Dependencias:**
  - Gate de salida de Fase 0 aprobado.
  - `TASK-F1-01`
  - `TASK-F1-04`
  - `TASK-F1-10`
  - `TASK-F2-08`
- **Criterios de aceptación:**
  - Estado de cada contenedor visible.
  - La configuración es reproducible por entorno y cuenta con evidencia de despliegue o restauración según corresponda.
  - La decisión o insumo incluye responsable, fecha, alcance, alternativas descartadas y consecuencias para documentos afectados.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - El artefacto de decisión o catálogo está versionado en `/docs`, enlazado desde el índice correspondiente y no contiene decisiones materiales implícitas.
  - Los documentos derivados afectados fueron actualizados o se creó una lista explícita de cambios pendientes.
  - El responsable humano indicado en la matriz RACI aprobó la salida cuando la decisión es de negocio, seguridad, sanidad, privacidad o costo.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F2-10 — Crear pipeline de despliegue con promoción entre ambientes

- **ID:** `TASK-F2-10`
- **Descripción:** Crear pipeline de despliegue con promoción entre ambientes.
- **Objetivo:** Entregar despliegue reproducible y rollback documentado sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/infra/terraform`
  - `/infra/containers`
  - `/docs/runbooks`
  - `/docs/adr`
  - `/infra/terraform/environments`
  - `/packages/config/src/environments`
  - `/.github/workflows/deploy.yml`
  - `/docs/tasks/task-f2-10.md`
- **Dependencias:**
  - Gate de salida de Fase 0 aprobado.
  - `TASK-F1-01`
  - `TASK-F1-04`
  - `TASK-F1-10`
  - `TASK-F2-01`
  - `TASK-F2-02`
- **Criterios de aceptación:**
  - Despliegue reproducible y rollback documentado.
  - La configuración es reproducible por entorno y cuenta con evidencia de despliegue o restauración según corresponda.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El cambio se probó en un entorno no productivo y cuenta con pasos de promoción, rollback y monitoreo documentados.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F2-11 — Configurar WAF/CDN para portal y controles perimetrales iniciales

- **ID:** `TASK-F2-11`
- **Descripción:** Configurar WAF/CDN para portal y controles perimetrales iniciales.
- **Objetivo:** Entregar reglas y rate limits de referencia sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/infra/terraform`
  - `/infra/containers`
  - `/docs/runbooks`
  - `/docs/adr`
  - `/infra/terraform/modules/edge`
  - `/docs/security/edge.md`
  - `/docs/tasks/task-f2-11.md`
- **Dependencias:**
  - Gate de salida de Fase 0 aprobado.
  - `TASK-F1-01`
  - `TASK-F1-04`
  - `TASK-F1-10`
  - `TASK-F2-01`
  - `TASK-F2-02`
- **Criterios de aceptación:**
  - Reglas y rate limits de referencia.
  - Existen pruebas positivas y negativas que demuestran aislamiento entre cuentas, ámbitos y acciones.
  - La configuración es reproducible por entorno y cuenta con evidencia de despliegue o restauración según corresponda.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F2-12 — Probar backup y restauración inicial de base y objetos

- **ID:** `TASK-F2-12`
- **Descripción:** Probar backup y restauración inicial de base y objetos.
- **Objetivo:** Entregar evidencia de recuperación en entorno de prueba sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/infra/terraform`
  - `/infra/containers`
  - `/docs/runbooks`
  - `/docs/adr`
  - `/infra/terraform/modules/backup`
  - `/docs/runbooks/backup-restore.md`
  - `/docs/tasks/task-f2-12.md`
- **Dependencias:**
  - Gate de salida de Fase 0 aprobado.
  - `TASK-F1-01`
  - `TASK-F1-04`
  - `TASK-F1-10`
  - `TASK-F2-03`
  - `TASK-F2-04`
  - `TASK-F0-05`
- **Criterios de aceptación:**
  - Evidencia de recuperación en entorno de prueba.
  - La configuración es reproducible por entorno y cuenta con evidencia de despliegue o restauración según corresponda.
  - El reporte registra escenarios, datos utilizados, resultados, defectos, severidad y criterio de aprobación.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - La migración o cambio de datos incluye estrategia de compatibilidad, validación y reversión operativa; no elimina historial requerido.
  - El cambio se probó en un entorno no productivo y cuenta con pasos de promoción, rollback y monitoreo documentados.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

---

# Fase 3 — Identidad, autenticación, multiempresa y autorización

**Objetivo de fase:** Implementar una identidad única con sesiones seguras, múltiples contextos, aislamiento por cuenta y permisos RBAC/ABAC.

**Cantidad de tareas:** 14

## TASK-F3-01 — Configurar realm, clientes OIDC, flujos de primer acceso, recuperación y TOTP

- **ID:** `TASK-F3-01`
- **Descripción:** Configurar realm, clientes OIDC, flujos de primer acceso, recuperación y TOTP.
- **Objetivo:** Entregar flujos probados contra Supabase Auth sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/identity`
  - `/packages/database`
  - `/docs/modules/identity.md`
  - `/infra/terraform/modules/identity`
  - `/docs/security/identity.md`
  - `/apps/private-web/src/features/auth`
  - `/apps/private-web/src/server/session`
  - `/apps/api/src/modules/identity`
  - `/docs/tasks/task-f3-01.md`
- **Dependencias:**
  - Gate de salida de Fase 1.
  - Infraestructura mínima de Fase 2 disponible en el entorno objetivo.
  - `TASK-F0-07`
  - `TASK-F0-08`
- **Criterios de aceptación:**
  - Flujos probados contra Supabase Auth.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F3-02 — Implementar perfil local de usuario y enlace con identidad externa

- **ID:** `TASK-F3-02`
- **Descripción:** Implementar perfil local de usuario y enlace con identidad externa.
- **Objetivo:** Entregar usuario único por subject/correo/username según reglas sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/identity`
  - `/packages/database`
  - `/docs/modules/identity.md`
  - `/apps/api/src/modules/identity`
  - `/packages/database/src/schema/identity`
  - `/docs/tasks/task-f3-02.md`
- **Dependencias:**
  - Gate de salida de Fase 1.
  - Infraestructura mínima de Fase 2 disponible en el entorno objetivo.
  - `TASK-F0-07`
  - `TASK-F0-08`
  - `TASK-F3-01`
- **Criterios de aceptación:**
  - Usuario único por subject/correo/username según reglas.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F3-03 — Implementar sesiones BFF seguras para la PWA privada

- **ID:** `TASK-F3-03`
- **Descripción:** Implementar sesiones BFF seguras para la PWA privada.
- **Objetivo:** Entregar cookies seguras, rotación y protección CSRF sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/identity`
  - `/packages/database`
  - `/docs/modules/identity.md`
  - `/apps/private-web/src/features/auth`
  - `/apps/private-web/src/server/session`
  - `/apps/api/src/modules/identity`
  - `/docs/tasks/task-f3-03.md`
- **Dependencias:**
  - Gate de salida de Fase 1.
  - Infraestructura mínima de Fase 2 disponible en el entorno objetivo.
  - `TASK-F0-07`
  - `TASK-F0-08`
  - `TASK-F3-01`
  - `TASK-F3-02`
- **Criterios de aceptación:**
  - Cookies seguras, rotación y protección CSRF.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F3-04 — Implementar creación de cuentas por ICE24 y propietario principal

- **ID:** `TASK-F3-04`
- **Descripción:** Implementar creación de cuentas por ICE24 y propietario principal.
- **Objetivo:** Entregar alta privada sin registro público sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/identity`
  - `/packages/database`
  - `/docs/modules/identity.md`
  - `/apps/api/src/modules/accounts`
  - `/apps/api/src/modules/identity`
  - `/docs/tasks/task-f3-04.md`
- **Dependencias:**
  - Gate de salida de Fase 1.
  - Infraestructura mínima de Fase 2 disponible en el entorno objetivo.
  - `TASK-F0-07`
  - `TASK-F0-08`
  - `TASK-F3-02`
  - `TASK-F3-03`
- **Criterios de aceptación:**
  - Alta privada sin registro público.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F3-05 — Implementar membresías, roles, ámbitos y asociaciones

- **ID:** `TASK-F3-05`
- **Descripción:** Implementar membresías, roles, ámbitos y asociaciones.
- **Objetivo:** Entregar usuario con múltiples cuentas y roles sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/identity`
  - `/packages/database`
  - `/docs/modules/identity.md`
  - `/apps/api/src/modules/memberships`
  - `/packages/authorization`
  - `/docs/tasks/task-f3-05.md`
- **Dependencias:**
  - Gate de salida de Fase 1.
  - Infraestructura mínima de Fase 2 disponible en el entorno objetivo.
  - `TASK-F0-07`
  - `TASK-F0-08`
  - `TASK-F3-04`
- **Criterios de aceptación:**
  - Usuario con múltiples cuentas y roles.
  - Existen pruebas positivas y negativas que demuestran aislamiento entre cuentas, ámbitos y acciones.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F3-06 — Implementar selector y sesión de contexto

- **ID:** `TASK-F3-06`
- **Descripción:** Implementar selector y sesión de contexto.
- **Objetivo:** Entregar cambio de cuenta/rol sin nuevo login sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/identity`
  - `/packages/database`
  - `/docs/modules/identity.md`
  - `/apps/private-web/src/features/context`
  - `/apps/api/src/modules/context`
  - `/docs/tasks/task-f3-06.md`
- **Dependencias:**
  - Gate de salida de Fase 1.
  - Infraestructura mínima de Fase 2 disponible en el entorno objetivo.
  - `TASK-F0-07`
  - `TASK-F0-08`
  - `TASK-F3-05`
- **Criterios de aceptación:**
  - Cambio de cuenta/rol sin nuevo login.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F3-07 — Implementar paquete de autorización híbrida RBAC/ABAC

- **ID:** `TASK-F3-07`
- **Descripción:** Implementar paquete de autorización híbrida RBAC/ABAC.
- **Objetivo:** Entregar evaluación por organización, sucursal, máquina, módulo, acción y sensibilidad sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/identity`
  - `/packages/database`
  - `/docs/modules/identity.md`
  - `/packages/authorization`
  - `/apps/api/src/common/authorization`
  - `/packages/testing/src/isolation`
  - `/docs/tasks/task-f3-07.md`
- **Dependencias:**
  - Gate de salida de Fase 1.
  - Infraestructura mínima de Fase 2 disponible en el entorno objetivo.
  - `TASK-F0-07`
  - `TASK-F0-08`
  - `TASK-F1-07`
- **Criterios de aceptación:**
  - Evaluación por organización, sucursal, máquina, módulo, acción y sensibilidad.
  - Existen pruebas positivas y negativas que demuestran aislamiento entre cuentas, ámbitos y acciones.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F3-08 — Incorporar guards y políticas en API y BFF

- **ID:** `TASK-F3-08`
- **Descripción:** Incorporar guards y políticas en API y BFF.
- **Objetivo:** Entregar endpoints privados niegan acceso por defecto sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/identity`
  - `/packages/database`
  - `/docs/modules/identity.md`
  - `/packages/authorization`
  - `/apps/api/src/common/authorization`
  - `/packages/testing/src/isolation`
  - `/docs/tasks/task-f3-08.md`
- **Dependencias:**
  - Gate de salida de Fase 1.
  - Infraestructura mínima de Fase 2 disponible en el entorno objetivo.
  - `TASK-F0-07`
  - `TASK-F0-08`
  - `TASK-F3-07`
- **Criterios de aceptación:**
  - Endpoints privados niegan acceso por defecto.
  - La configuración es reproducible por entorno y cuenta con evidencia de despliegue o restauración según corresponda.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - OpenAPI, errores, idempotencia, concurrencia y ejemplos de contrato fueron actualizados y validados.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F3-09 — Implementar cierre de sesión individual, por usuario y global

- **ID:** `TASK-F3-09`
- **Descripción:** Implementar cierre de sesión individual, por usuario y global.
- **Objetivo:** Entregar revocación efectiva y auditada sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/identity`
  - `/packages/database`
  - `/docs/modules/identity.md`
  - `/apps/api/src/modules/identity`
  - `/apps/private-web/src/features/auth`
  - `/docs/tasks/task-f3-09.md`
- **Dependencias:**
  - Gate de salida de Fase 1.
  - Infraestructura mínima de Fase 2 disponible en el entorno objetivo.
  - `TASK-F0-07`
  - `TASK-F0-08`
  - `TASK-F3-03`
  - `TASK-F3-05`
- **Criterios de aceptación:**
  - Revocación efectiva y auditada.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F3-10 — Implementar recuperación manual como proceso administrativo controlado

- **ID:** `TASK-F3-10`
- **Descripción:** Implementar recuperación manual como proceso administrativo controlado.
- **Objetivo:** Entregar solicitud, evidencia, aprobación y auditoría sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/identity`
  - `/packages/database`
  - `/docs/modules/identity.md`
  - `/apps/private-web/src/features/auth`
  - `/apps/private-web/src/server/session`
  - `/apps/api/src/modules/identity`
  - `/apps/api/src/modules/identity-recovery`
  - `/apps/private-web/src/features/admin/identity-recovery`
  - `/docs/tasks/task-f3-10.md`
- **Dependencias:**
  - Gate de salida de Fase 1.
  - Infraestructura mínima de Fase 2 disponible en el entorno objetivo.
  - `TASK-F0-07`
  - `TASK-F0-08`
  - `TASK-F3-02`
- **Criterios de aceptación:**
  - Solicitud, evidencia, aprobación y auditoría.
  - Las transiciones validan estado previo, permiso, precondiciones, versión esperada y motivo cuando aplica.
  - Toda acción sensible genera auditoría con actor, contexto, correlación, valores relevantes y resultado.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F3-11 — Implementar protección de deep links y resolución de contexto

- **ID:** `TASK-F3-11`
- **Descripción:** Implementar protección de deep links y resolución de contexto.
- **Objetivo:** Entregar 401/403/404 sin filtración de recursos sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/identity`
  - `/packages/database`
  - `/docs/modules/identity.md`
  - `/apps/private-web/src/features/context`
  - `/apps/api/src/modules/context`
  - `/docs/tasks/task-f3-11.md`
- **Dependencias:**
  - Gate de salida de Fase 1.
  - Infraestructura mínima de Fase 2 disponible en el entorno objetivo.
  - `TASK-F0-07`
  - `TASK-F0-08`
  - `TASK-F3-03`
  - `TASK-F3-06`
  - `TASK-F3-08`
- **Criterios de aceptación:**
  - 401/403/404 sin filtración de recursos.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F3-12 — Agregar auditoría de seguridad inicial

- **ID:** `TASK-F3-12`
- **Descripción:** Agregar auditoría de seguridad inicial.
- **Objetivo:** Dejar resuelto el alcance de “Agregar auditoría de seguridad inicial” con una salida verificable: login, fallo, recuperación, 2FA y cierre registrados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/identity`
  - `/packages/database`
  - `/docs/modules/identity.md`
  - `/infra/terraform/modules/identity`
  - `/docs/security/identity.md`
  - `/apps/private-web/src/features/auth`
  - `/apps/private-web/src/server/session`
  - `/apps/api/src/modules/identity`
  - `/apps/api/src/modules/audit`
- **Dependencias:**
  - Gate de salida de Fase 1.
  - Infraestructura mínima de Fase 2 disponible en el entorno objetivo.
  - `TASK-F0-07`
  - `TASK-F0-08`
  - `TASK-F3-02`
  - `TASK-F1-07`
- **Criterios de aceptación:**
  - Login, fallo, recuperación, 2FA y cierre registrados.
  - Toda acción sensible genera auditoría con actor, contexto, correlación, valores relevantes y resultado.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F3-13 — Crear pruebas de aislamiento multiempresa

- **ID:** `TASK-F3-13`
- **Descripción:** Crear pruebas de aislamiento multiempresa.
- **Objetivo:** Entregar suite negativa entre dos o más cuentas sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/identity`
  - `/packages/database`
  - `/docs/modules/identity.md`
  - `/packages/authorization`
  - `/apps/api/src/common/authorization`
  - `/packages/testing/src/isolation`
  - `/docs/tasks/task-f3-13.md`
- **Dependencias:**
  - Gate de salida de Fase 1.
  - Infraestructura mínima de Fase 2 disponible en el entorno objetivo.
  - `TASK-F0-07`
  - `TASK-F0-08`
  - `TASK-F3-05`
  - `TASK-F3-07`
  - `TASK-F3-08`
- **Criterios de aceptación:**
  - Suite negativa entre dos o más cuentas.
  - Existen pruebas positivas y negativas que demuestran aislamiento entre cuentas, ámbitos y acciones.
  - El reporte registra escenarios, datos utilizados, resultados, defectos, severidad y criterio de aprobación.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F3-14 — Implementar UI de acceso, primer ingreso, 2FA, selector y perfil

- **ID:** `TASK-F3-14`
- **Descripción:** Implementar UI de acceso, primer ingreso, 2FA, selector y perfil.
- **Objetivo:** Entregar pantallas accesibles y responsive sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/identity`
  - `/packages/database`
  - `/docs/modules/identity.md`
  - `/infra/terraform/modules/identity`
  - `/docs/security/identity.md`
  - `/apps/private-web/src/features/auth`
  - `/apps/private-web/src/server/session`
  - `/apps/api/src/modules/identity`
  - `/apps/private-web/src/features/context`
- **Dependencias:**
  - Gate de salida de Fase 1.
  - Infraestructura mínima de Fase 2 disponible en el entorno objetivo.
  - `TASK-F0-07`
  - `TASK-F0-08`
  - `TASK-F3-01`
  - `TASK-F3-03`
  - `TASK-F3-06`
- **Criterios de aceptación:**
  - Pantallas accesibles y responsive.
  - La interfaz cubre carga, vacío, error, permiso denegado y modo lectura; funciona en los breakpoints definidos.
  - Los controles son navegables por teclado y cumplen el objetivo WCAG 2.2 AA aplicable.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - La pantalla o componente tiene estados completos, prueba de accesibilidad y evidencia responsive/visual en los dispositivos objetivo.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

---

# Fase 4 — Cuentas, sucursales, usuarios, equipos y plantillas

**Objetivo de fase:** Construir el núcleo organizacional y el expediente permanente de cada máquina, incluyendo validación y configuración oficial versionada.

**Cantidad de tareas:** 17

## TASK-F4-01 — Implementar cuenta titular, datos de contacto, fiscales y configuración de módulos

- **ID:** `TASK-F4-01`
- **Descripción:** Implementar cuenta titular, datos de contacto, fiscales y configuración de módulos.
- **Objetivo:** Entregar cuenta persona física o moral administrable sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private`
  - `/packages/database`
  - `/docs/modules`
  - `/apps/api/src/modules/accounts`
  - `/apps/private-web/src/features/accounts`
  - `/docs/tasks/task-f4-01.md`
- **Dependencias:**
  - Gate de salida de Fase 3.
  - `TASK-F0-09`
  - `TASK-F0-11`
- **Criterios de aceptación:**
  - Cuenta persona física o moral administrable.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - La migración o cambio de datos incluye estrategia de compatibilidad, validación y reversión operativa; no elimina historial requerido.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F4-02 — Implementar sucursales, dirección, coordenadas, zona horaria, horario y teléfonos

- **ID:** `TASK-F4-02`
- **Descripción:** Implementar sucursales, dirección, coordenadas, zona horaria, horario y teléfonos.
- **Objetivo:** Entregar cRUD controlado y archivado histórico sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private`
  - `/packages/database`
  - `/docs/modules`
  - `/apps/api/src/modules/branches`
  - `/apps/private-web/src/features/branches`
  - `/docs/tasks/task-f4-02.md`
- **Dependencias:**
  - Gate de salida de Fase 3.
  - `TASK-F0-09`
  - `TASK-F0-11`
  - `TASK-F4-01`
- **Criterios de aceptación:**
  - CRUD controlado y archivado histórico.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F4-03 — Implementar usuarios, invitaciones/asociaciones y permisos delegados

- **ID:** `TASK-F4-03`
- **Descripción:** Implementar usuarios, invitaciones/asociaciones y permisos delegados.
- **Objetivo:** Entregar relaciones globales sin duplicar identidad sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private`
  - `/packages/database`
  - `/docs/modules`
  - `/apps/api/src/modules/users`
  - `/apps/api/src/modules/memberships`
  - `/apps/private-web/src/features/users`
  - `/docs/tasks/task-f4-03.md`
- **Dependencias:**
  - Gate de salida de Fase 3.
  - `TASK-F0-09`
  - `TASK-F0-11`
  - `TASK-F4-01`
  - `TASK-F3-05`
- **Criterios de aceptación:**
  - Relaciones globales sin duplicar identidad.
  - Existen pruebas positivas y negativas que demuestran aislamiento entre cuentas, ámbitos y acciones.
  - Toda acción sensible genera auditoría con actor, contexto, correlación, valores relevantes y resultado.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F4-04 — Implementar catálogo de fabricantes, modelos, sistemas, componentes y características

- **ID:** `TASK-F4-04`
- **Descripción:** Implementar catálogo de fabricantes, modelos, sistemas, componentes y características.
- **Objetivo:** Entregar catálogos administrados por ICE24 sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private`
  - `/packages/database`
  - `/docs/modules`
  - `/apps/api/src/modules/catalogs`
  - `/apps/private-web/src/features/catalogs`
  - `/docs/tasks/task-f4-04.md`
- **Dependencias:**
  - Gate de salida de Fase 3.
  - `TASK-F0-09`
  - `TASK-F0-11`
- **Criterios de aceptación:**
  - Catálogos administrados por ICE24.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - La migración o cambio de datos incluye estrategia de compatibilidad, validación y reversión operativa; no elimina historial requerido.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F4-05 — Implementar versiones de plantillas y sus definiciones declarativas

- **ID:** `TASK-F4-05`
- **Descripción:** Implementar versiones de plantillas y sus definiciones declarativas.
- **Objetivo:** Entregar versiones inmutables publicables sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private`
  - `/packages/database`
  - `/docs/modules`
  - `/apps/api/src/modules/templates`
  - `/apps/private-web/src/features/templates`
  - `/docs/tasks/task-f4-05.md`
- **Dependencias:**
  - Gate de salida de Fase 3.
  - `TASK-F0-09`
  - `TASK-F0-11`
  - `TASK-F4-04`
- **Criterios de aceptación:**
  - Versiones inmutables publicables.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F4-06 — Implementar actividades, frecuencias, checklists, evidencia y escalamiento dentro de plantillas

- **ID:** `TASK-F4-06`
- **Descripción:** Implementar actividades, frecuencias, checklists, evidencia y escalamiento dentro de plantillas.
- **Objetivo:** Entregar plantilla completa validable antes de publicar sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private`
  - `/packages/database`
  - `/docs/modules`
  - `/apps/api/src/modules/templates`
  - `/apps/private-web/src/features/templates`
  - `/docs/tasks/task-f4-06.md`
- **Dependencias:**
  - Gate de salida de Fase 3.
  - `TASK-F0-09`
  - `TASK-F0-11`
  - `TASK-F4-05`
- **Criterios de aceptación:**
  - Plantilla completa validable antes de publicar.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F4-07 — Implementar solicitud de alta de máquina en borrador

- **ID:** `TASK-F4-07`
- **Descripción:** Implementar solicitud de alta de máquina en borrador.
- **Objetivo:** Entregar captura progresiva con documentos y fotografías sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private`
  - `/packages/database`
  - `/docs/modules`
  - `/apps/api/src/modules/machines`
  - `/apps/private-web/src/features/machines/onboarding`
  - `/docs/tasks/task-f4-07.md`
- **Dependencias:**
  - Gate de salida de Fase 3.
  - `TASK-F0-09`
  - `TASK-F0-11`
  - `TASK-F4-01`
  - `TASK-F4-02`
  - `TASK-F4-04`
- **Criterios de aceptación:**
  - Captura progresiva con documentos y fotografías.
  - Los archivos permanecen privados, validados y vinculados mediante metadatos; no existen URLs públicas permanentes.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - Se validaron límites, tipo, integridad, privacidad, manejo de malware/fallo y eliminación temporal de derivados cuando corresponda.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F4-08 — Implementar flujo de envío, revisión, información faltante, aprobación y rechazo

- **ID:** `TASK-F4-08`
- **Descripción:** Implementar flujo de envío, revisión, información faltante, aprobación y rechazo.
- **Objetivo:** Entregar máquina no activa sin plantilla y validación sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private`
  - `/packages/database`
  - `/docs/modules`
  - `/apps/api/src/modules/machines`
  - `/apps/private-web/src/features/machines/onboarding`
  - `/docs/tasks/task-f4-08.md`
- **Dependencias:**
  - Gate de salida de Fase 3.
  - `TASK-F0-09`
  - `TASK-F0-11`
  - `TASK-F4-07`
  - `TASK-F3-07`
- **Criterios de aceptación:**
  - Máquina no activa sin plantilla y validación.
  - Las transiciones validan estado previo, permiso, precondiciones, versión esperada y motivo cuando aplica.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F4-09 — Generar código permanente ICE24 OS y folios definidos

- **ID:** `TASK-F4-09`
- **Descripción:** Generar código permanente ICE24 OS y folios definidos.
- **Objetivo:** Entregar código único, inmutable y verificable sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private`
  - `/packages/database`
  - `/docs/modules`
  - `/apps/api/src/modules/identifiers`
  - `/packages/domain/src/identifiers`
  - `/docs/tasks/task-f4-09.md`
- **Dependencias:**
  - Gate de salida de Fase 3.
  - `TASK-F0-09`
  - `TASK-F0-11`
  - `TASK-F4-08`
- **Criterios de aceptación:**
  - Código único, inmutable y verificable.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F4-10 — Crear expediente de máquina con estados operativo, técnico, sanitario y publicación separados

- **ID:** `TASK-F4-10`
- **Descripción:** Crear expediente de máquina con estados operativo, técnico, sanitario y publicación separados.
- **Objetivo:** Entregar vista integral y API coherente sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private`
  - `/packages/database`
  - `/docs/modules`
  - `/apps/api/src/modules/machines`
  - `/apps/private-web/src/features/machines/detail`
  - `/docs/tasks/task-f4-10.md`
- **Dependencias:**
  - Gate de salida de Fase 3.
  - `TASK-F0-09`
  - `TASK-F0-11`
  - `TASK-F4-08`
  - `TASK-F4-09`
- **Criterios de aceptación:**
  - Vista integral y API coherente.
  - Las transiciones validan estado previo, permiso, precondiciones, versión esperada y motivo cuando aplica.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - OpenAPI, errores, idempotencia, concurrencia y ejemplos de contrato fueron actualizados y validados.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F4-11 — Implementar periodos de propiedad, ubicación y asignación de plantilla

- **ID:** `TASK-F4-11`
- **Descripción:** Implementar periodos de propiedad, ubicación y asignación de plantilla.
- **Objetivo:** Entregar historia sin solapamientos sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private`
  - `/packages/database`
  - `/docs/modules`
  - `/apps/api/src/modules/machines`
  - `/apps/api/src/modules/machine-transfers`
  - `/docs/tasks/task-f4-11.md`
- **Dependencias:**
  - Gate de salida de Fase 3.
  - `TASK-F0-09`
  - `TASK-F0-11`
  - `TASK-F4-10`
- **Criterios de aceptación:**
  - Historia sin solapamientos.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F4-12 — Implementar traslado, retiro y transferencia controlada

- **ID:** `TASK-F4-12`
- **Descripción:** Implementar traslado, retiro y transferencia controlada.
- **Objetivo:** Entregar historia técnica obligatoria y comercial opcional sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private`
  - `/packages/database`
  - `/docs/modules`
  - `/apps/api/src/modules/machines`
  - `/apps/api/src/modules/machine-transfers`
  - `/docs/tasks/task-f4-12.md`
- **Dependencias:**
  - Gate de salida de Fase 3.
  - `TASK-F0-09`
  - `TASK-F0-11`
  - `TASK-F4-11`
- **Criterios de aceptación:**
  - Historia técnica obligatoria y comercial opcional.
  - Las transiciones validan estado previo, permiso, precondiciones, versión esperada y motivo cuando aplica.
  - Toda acción sensible genera auditoría con actor, contexto, correlación, valores relevantes y resultado.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F4-13 — Generar calendarios iniciales al activar máquina

- **ID:** `TASK-F4-13`
- **Descripción:** Generar calendarios iniciales al activar máquina.
- **Objetivo:** Entregar actividades futuras ligadas a versión de plantilla sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private`
  - `/packages/database`
  - `/docs/modules`
  - `/apps/api/src/modules/scheduling`
  - `/apps/worker/src/processors/scheduling`
  - `/docs/tasks/task-f4-13.md`
- **Dependencias:**
  - Gate de salida de Fase 3.
  - `TASK-F0-09`
  - `TASK-F0-11`
  - `TASK-F4-06`
  - `TASK-F4-08`
  - `TASK-F4-10`
- **Criterios de aceptación:**
  - Actividades futuras ligadas a versión de plantilla.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F4-14 — Implementar aplicación de nueva versión a actividades futuras

- **ID:** `TASK-F4-14`
- **Descripción:** Implementar aplicación de nueva versión a actividades futuras.
- **Objetivo:** Entregar históricos conservan definición original sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private`
  - `/packages/database`
  - `/docs/modules`
  - `/apps/api/src/modules/scheduling`
  - `/apps/worker/src/processors/scheduling`
  - `/docs/tasks/task-f4-14.md`
- **Dependencias:**
  - Gate de salida de Fase 3.
  - `TASK-F0-09`
  - `TASK-F0-11`
  - `TASK-F4-05`
  - `TASK-F4-06`
  - `TASK-F4-13`
- **Criterios de aceptación:**
  - Históricos conservan definición original.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F4-15 — Crear paneles ICE24 de cuentas, validaciones y plantillas

- **ID:** `TASK-F4-15`
- **Descripción:** Crear paneles ICE24 de cuentas, validaciones y plantillas.
- **Objetivo:** Entregar operación central inicial sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private`
  - `/packages/database`
  - `/docs/modules`
  - `/apps/api/src/modules/templates`
  - `/apps/private-web/src/features/templates`
  - `/apps/private-web/src/features/admin`
  - `/docs/tasks/task-f4-15.md`
- **Dependencias:**
  - Gate de salida de Fase 3.
  - `TASK-F0-09`
  - `TASK-F0-11`
  - `TASK-F4-01`
  - `TASK-F4-07`
  - `TASK-F4-08`
- **Criterios de aceptación:**
  - Operación central inicial.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F4-16 — Implementar pantallas de cuenta, sucursal, usuarios, máquinas y expediente

- **ID:** `TASK-F4-16`
- **Descripción:** Implementar pantallas de cuenta, sucursal, usuarios, máquinas y expediente.
- **Objetivo:** Entregar flujos definidos en UI/UX y AppFlow sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private`
  - `/packages/database`
  - `/docs/modules`
  - `/apps/api/src/modules/users`
  - `/apps/api/src/modules/memberships`
  - `/apps/private-web/src/features/users`
  - `/apps/private-web/src/features/accounts`
  - `/apps/private-web/src/features/branches`
  - `/apps/private-web/src/features/machines`
- **Dependencias:**
  - Gate de salida de Fase 3.
  - `TASK-F0-09`
  - `TASK-F0-11`
  - `TASK-F4-01`
  - `TASK-F4-02`
  - `TASK-F4-03`
  - `TASK-F4-10`
- **Criterios de aceptación:**
  - Flujos definidos en UI/UX y AppFlow.
  - La interfaz cubre carga, vacío, error, permiso denegado y modo lectura; funciona en los breakpoints definidos.
  - Los controles son navegables por teclado y cumplen el objetivo WCAG 2.2 AA aplicable.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - La pantalla o componente tiene estados completos, prueba de accesibilidad y evidencia responsive/visual en los dispositivos objetivo.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F4-17 — Probar transferencias, discrepancias de contexto y concurrencia

- **ID:** `TASK-F4-17`
- **Descripción:** Probar transferencias, discrepancias de contexto y concurrencia.
- **Objetivo:** Entregar suite de integridad y auditoría sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private`
  - `/packages/database`
  - `/docs/modules`
  - `/apps/api/src/modules/machines`
  - `/apps/api/src/modules/machine-transfers`
  - `/docs/tasks/task-f4-17.md`
- **Dependencias:**
  - Gate de salida de Fase 3.
  - `TASK-F0-09`
  - `TASK-F0-11`
  - `TASK-F4-11`
  - `TASK-F4-12`
  - `TASK-F3-13`
- **Criterios de aceptación:**
  - Suite de integridad y auditoría.
  - Toda acción sensible genera auditoría con actor, contexto, correlación, valores relevantes y resultado.
  - El reporte registra escenarios, datos utilizados, resultados, defectos, severidad y criterio de aprobación.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

---

# Fase 5 — Suscripción, auditoría, archivos, jobs y notificaciones

**Objetivo de fase:** Implementar los servicios transversales requeridos por los módulos operativos y comerciales.

**Cantidad de tareas:** 15

## TASK-F5-01 — Implementar modelo de suscripción, demo y estados de acceso

- **ID:** `TASK-F5-01`
- **Descripción:** Implementar modelo de suscripción, demo y estados de acceso.
- **Objetivo:** Entregar demo, activa, pago rechazado, lectura, cancelada y reactivada sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts`
  - `/packages/database`
  - `/packages/observability`
  - `/docs/modules`
  - `/apps/api/src/modules/subscriptions`
  - `/apps/private-web/src/features/subscription`
  - `/docs/runbooks/stripe.md`
  - `/docs/tasks/task-f5-01.md`
- **Dependencias:**
  - Gate de salida de Fase 4.
  - Infraestructura de colas, objetos, identidad y secretos disponible.
- **Criterios de aceptación:**
  - Demo, activa, pago rechazado, lectura, cancelada y reactivada.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - La migración o cambio de datos incluye estrategia de compatibilidad, validación y reversión operativa; no elimina historial requerido.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F5-02 — Integrar Stripe Checkout/portal y webhooks idempotentes

- **ID:** `TASK-F5-02`
- **Descripción:** Integrar Stripe Checkout/portal y webhooks idempotentes.
- **Objetivo:** Entregar estado conciliado con Stripe como fuente comercial sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts`
  - `/packages/database`
  - `/packages/observability`
  - `/docs/modules`
  - `/apps/api/src/modules/subscriptions`
  - `/apps/private-web/src/features/subscription`
  - `/docs/runbooks/stripe.md`
  - `/docs/tasks/task-f5-02.md`
- **Dependencias:**
  - Gate de salida de Fase 4.
  - Infraestructura de colas, objetos, identidad y secretos disponible.
  - `TASK-F5-01`
  - `TASK-F2-07`
- **Criterios de aceptación:**
  - Estado conciliado con Stripe como fuente comercial.
  - Los reintentos no duplican efectos y los conflictos o fallos quedan visibles y recuperables.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - OpenAPI, errores, idempotencia, concurrencia y ejemplos de contrato fueron actualizados y validados.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F5-03 — Implementar modo lectura centralizado

- **ID:** `TASK-F5-03`
- **Descripción:** Implementar modo lectura centralizado.
- **Objetivo:** Entregar aPI y UI bloquean mutaciones sin impedir consulta permitida sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts`
  - `/packages/database`
  - `/packages/observability`
  - `/docs/modules`
  - `/apps/api/src/modules/subscriptions`
  - `/apps/private-web/src/features/subscription`
  - `/docs/runbooks/stripe.md`
  - `/docs/tasks/task-f5-03.md`
- **Dependencias:**
  - Gate de salida de Fase 4.
  - Infraestructura de colas, objetos, identidad y secretos disponible.
  - `TASK-F5-01`
  - `TASK-F5-02`
- **Criterios de aceptación:**
  - API y UI bloquean mutaciones sin impedir consulta permitida.
  - Las transiciones validan estado previo, permiso, precondiciones, versión esperada y motivo cuando aplica.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - OpenAPI, errores, idempotencia, concurrencia y ejemplos de contrato fueron actualizados y validados.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F5-04 — Implementar auditoría append-only y filtros globales/de cuenta

- **ID:** `TASK-F5-04`
- **Descripción:** Implementar auditoría append-only y filtros globales/de cuenta.
- **Objetivo:** Entregar eventos sensibles consultables e inmutables sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts`
  - `/packages/database`
  - `/packages/observability`
  - `/docs/modules`
  - `/apps/api/src/modules/audit`
  - `/apps/private-web/src/features/audit`
  - `/docs/tasks/task-f5-04.md`
- **Dependencias:**
  - Gate de salida de Fase 4.
  - Infraestructura de colas, objetos, identidad y secretos disponible.
  - `TASK-F3-02`
  - `TASK-F1-07`
- **Criterios de aceptación:**
  - Eventos sensibles consultables e inmutables.
  - Toda acción sensible genera auditoría con actor, contexto, correlación, valores relevantes y resultado.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F5-05 — Implementar patrón outbox en transacciones

- **ID:** `TASK-F5-05`
- **Descripción:** Implementar patrón outbox en transacciones.
- **Objetivo:** Entregar eventos se publican sin ventana de pérdida sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts`
  - `/packages/database`
  - `/packages/observability`
  - `/docs/modules`
  - `/packages/database/src/outbox`
  - `/packages/contracts/src/events`
  - `/docs/tasks/task-f5-05.md`
- **Dependencias:**
  - Gate de salida de Fase 4.
  - Infraestructura de colas, objetos, identidad y secretos disponible.
  - `TASK-F5-04`
- **Criterios de aceptación:**
  - Eventos se publican sin ventana de pérdida.
  - Los reintentos no duplican efectos y los conflictos o fallos quedan visibles y recuperables.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F5-06 — Implementar workers, reintentos, DLQ e idempotencia de consumidor

- **ID:** `TASK-F5-06`
- **Descripción:** Implementar workers, reintentos, DLQ e idempotencia de consumidor.
- **Objetivo:** Entregar jobs resistentes a duplicados y fallos temporales sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts`
  - `/packages/database`
  - `/packages/observability`
  - `/docs/modules`
  - `/apps/worker`
  - `/docs/runbooks/queues.md`
  - `/docs/tasks/task-f5-06.md`
- **Dependencias:**
  - Gate de salida de Fase 4.
  - Infraestructura de colas, objetos, identidad y secretos disponible.
  - `TASK-F5-05`
  - `TASK-F2-05`
- **Criterios de aceptación:**
  - Jobs resistentes a duplicados y fallos temporales.
  - Los reintentos no duplican efectos y los conflictos o fallos quedan visibles y recuperables.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F5-07 — Implementar registro de trabajos asíncronos y centro de estado

- **ID:** `TASK-F5-07`
- **Descripción:** Implementar registro de trabajos asíncronos y centro de estado.
- **Objetivo:** Entregar pendiente, procesando, completado, error y reintento sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts`
  - `/packages/database`
  - `/packages/observability`
  - `/docs/modules`
  - `/apps/api/src/modules/jobs`
  - `/apps/private-web/src/features/jobs`
  - `/docs/tasks/task-f5-07.md`
- **Dependencias:**
  - Gate de salida de Fase 4.
  - Infraestructura de colas, objetos, identidad y secretos disponible.
  - `TASK-F5-06`
- **Criterios de aceptación:**
  - Pendiente, procesando, completado, error y reintento.
  - Los reintentos no duplican efectos y los conflictos o fallos quedan visibles y recuperables.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F5-08 — Implementar flujo de carga de archivos con preautorización

- **ID:** `TASK-F5-08`
- **Descripción:** Implementar flujo de carga de archivos con preautorización.
- **Objetivo:** Entregar carga directa privada y confirmación de metadatos sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts`
  - `/packages/database`
  - `/packages/observability`
  - `/docs/modules`
  - `/apps/api/src/modules/files`
  - `/apps/worker/src/processors/files`
  - `/apps/private-web/src/features/files`
  - `/docs/security/files.md`
  - `/docs/tasks/task-f5-08.md`
- **Dependencias:**
  - Gate de salida de Fase 4.
  - Infraestructura de colas, objetos, identidad y secretos disponible.
  - `TASK-F2-04`
  - `TASK-F2-07`
- **Criterios de aceptación:**
  - Carga directa privada y confirmación de metadatos.
  - Existen pruebas positivas y negativas que demuestran aislamiento entre cuentas, ámbitos y acciones.
  - Los archivos permanecen privados, validados y vinculados mediante metadatos; no existen URLs públicas permanentes.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - La migración o cambio de datos incluye estrategia de compatibilidad, validación y reversión operativa; no elimina historial requerido.
  - Se validaron límites, tipo, integridad, privacidad, manejo de malware/fallo y eliminación temporal de derivados cuando corresponda.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F5-09 — Implementar cuarentena, validación, escaneo y versiones de archivo

- **ID:** `TASK-F5-09`
- **Descripción:** Implementar cuarentena, validación, escaneo y versiones de archivo.
- **Objetivo:** Entregar archivo no utilizable antes de validación sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts`
  - `/packages/database`
  - `/packages/observability`
  - `/docs/modules`
  - `/apps/api/src/modules/files`
  - `/apps/worker/src/processors/files`
  - `/apps/private-web/src/features/files`
  - `/docs/security/files.md`
  - `/docs/tasks/task-f5-09.md`
- **Dependencias:**
  - Gate de salida de Fase 4.
  - Infraestructura de colas, objetos, identidad y secretos disponible.
  - `TASK-F5-08`
  - `TASK-F0-13`
- **Criterios de aceptación:**
  - Archivo no utilizable antes de validación.
  - Los archivos permanecen privados, validados y vinculados mediante metadatos; no existen URLs públicas permanentes.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - Se validaron límites, tipo, integridad, privacidad, manejo de malware/fallo y eliminación temporal de derivados cuando corresponda.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F5-10 — Implementar URLs temporales y registro de descargas

- **ID:** `TASK-F5-10`
- **Descripción:** Implementar URLs temporales y registro de descargas.
- **Objetivo:** Entregar descarga privada protegida y auditada sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts`
  - `/packages/database`
  - `/packages/observability`
  - `/docs/modules`
  - `/apps/api/src/modules/files`
  - `/apps/worker/src/processors/files`
  - `/apps/private-web/src/features/files`
  - `/docs/security/files.md`
  - `/docs/tasks/task-f5-10.md`
- **Dependencias:**
  - Gate de salida de Fase 4.
  - Infraestructura de colas, objetos, identidad y secretos disponible.
  - `TASK-F5-08`
  - `TASK-F5-09`
  - `TASK-F5-04`
- **Criterios de aceptación:**
  - Descarga privada protegida y auditada.
  - Toda acción sensible genera auditoría con actor, contexto, correlación, valores relevantes y resultado.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F5-11 — Implementar centro de notificaciones y estados no leída/leída/enterado/en atención/resuelta

- **ID:** `TASK-F5-11`
- **Descripción:** Implementar centro de notificaciones y estados no leída/leída/enterado/en atención/resuelta.
- **Objetivo:** Entregar alertas persistentes sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts`
  - `/packages/database`
  - `/packages/observability`
  - `/docs/modules`
  - `/apps/api/src/modules/notifications`
  - `/apps/worker/src/processors/notifications`
  - `/apps/private-web/src/features/notifications`
  - `/docs/runbooks/email.md`
  - `/docs/tasks/task-f5-11.md`
- **Dependencias:**
  - Gate de salida de Fase 4.
  - Infraestructura de colas, objetos, identidad y secretos disponible.
  - `TASK-F5-04`
  - `TASK-F5-05`
- **Criterios de aceptación:**
  - Alertas persistentes.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - La migración o cambio de datos incluye estrategia de compatibilidad, validación y reversión operativa; no elimina historial requerido.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F5-12 — Integrar correo transaccional con plantillas y tracking técnico

- **ID:** `TASK-F5-12`
- **Descripción:** Integrar correo transaccional con plantillas y tracking técnico.
- **Objetivo:** Entregar recuperación, alertas críticas y reportes soportados sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts`
  - `/packages/database`
  - `/packages/observability`
  - `/docs/modules`
  - `/apps/api/src/modules/notifications`
  - `/apps/worker/src/processors/notifications`
  - `/apps/private-web/src/features/notifications`
  - `/docs/runbooks/email.md`
  - `/docs/tasks/task-f5-12.md`
- **Dependencias:**
  - Gate de salida de Fase 4.
  - Infraestructura de colas, objetos, identidad y secretos disponible.
  - `TASK-F5-06`
  - `TASK-F0-13`
- **Criterios de aceptación:**
  - Recuperación, alertas críticas y reportes soportados.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F5-13 — Implementar scheduler para vencimientos, reportes y reconciliaciones

- **ID:** `TASK-F5-13`
- **Descripción:** Implementar scheduler para vencimientos, reportes y reconciliaciones.
- **Objetivo:** Entregar ejecuciones idempotentes observables sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts`
  - `/packages/database`
  - `/packages/observability`
  - `/docs/modules`
  - `/apps/api/src/modules/notifications`
  - `/apps/worker/src/processors/notifications`
  - `/apps/private-web/src/features/notifications`
  - `/docs/runbooks/email.md`
  - `/docs/tasks/task-f5-13.md`
- **Dependencias:**
  - Gate de salida de Fase 4.
  - Infraestructura de colas, objetos, identidad y secretos disponible.
  - `TASK-F5-06`
  - `TASK-F2-05`
- **Criterios de aceptación:**
  - Ejecuciones idempotentes observables.
  - Los reintentos no duplican efectos y los conflictos o fallos quedan visibles y recuperables.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F5-14 — Implementar logs de integración con correlación

- **ID:** `TASK-F5-14`
- **Descripción:** Implementar logs de integración con correlación.
- **Objetivo:** Entregar diagnóstico de Stripe, correo, objetos, cola y PDF sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts`
  - `/packages/database`
  - `/packages/observability`
  - `/docs/modules`
  - `/infra/terraform/modules/observability`
  - `/docs/runbooks/observability.md`
  - `/apps/api/src/modules/subscriptions`
  - `/apps/private-web/src/features/subscription`
  - `/docs/runbooks/stripe.md`
- **Dependencias:**
  - Gate de salida de Fase 4.
  - Infraestructura de colas, objetos, identidad y secretos disponible.
  - `TASK-F2-08`
  - `TASK-F5-06`
- **Criterios de aceptación:**
  - Diagnóstico de Stripe, correo, objetos, cola y PDF.
  - Los reintentos no duplican efectos y los conflictos o fallos quedan visibles y recuperables.
  - Los archivos permanecen privados, validados y vinculados mediante metadatos; no existen URLs públicas permanentes.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - Se validaron límites, tipo, integridad, privacidad, manejo de malware/fallo y eliminación temporal de derivados cuando corresponda.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F5-15 — Crear UI de suscripción, modo lectura, auditoría, archivos, notificaciones y jobs

- **ID:** `TASK-F5-15`
- **Descripción:** Crear UI de suscripción, modo lectura, auditoría, archivos, notificaciones y jobs.
- **Objetivo:** Entregar estados y errores completos sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts`
  - `/packages/database`
  - `/packages/observability`
  - `/docs/modules`
  - `/apps/api/src/modules/subscriptions`
  - `/apps/private-web/src/features/subscription`
  - `/docs/runbooks/stripe.md`
  - `/apps/api/src/modules/audit`
  - `/apps/private-web/src/features/audit`
- **Dependencias:**
  - Gate de salida de Fase 4.
  - Infraestructura de colas, objetos, identidad y secretos disponible.
  - `TASK-F5-01`
  - `TASK-F5-03`
  - `TASK-F5-04`
  - `TASK-F5-07`
  - `TASK-F5-10`
  - `TASK-F5-11`
- **Criterios de aceptación:**
  - Estados y errores completos.
  - Las transiciones validan estado previo, permiso, precondiciones, versión esperada y motivo cuando aplica.
  - Toda acción sensible genera auditoría con actor, contexto, correlación, valores relevantes y resultado.
  - Los archivos permanecen privados, validados y vinculados mediante metadatos; no existen URLs públicas permanentes.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - Se validaron límites, tipo, integridad, privacidad, manejo de malware/fallo y eliminación temporal de derivados cuando corresponda.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

---

# Fase 6 — Sistema de diseño, shell privado y navegación

**Objetivo de fase:** Implementar la base visual y de navegación común para que todos los módulos mantengan consistencia, accesibilidad y responsive design.

**Cantidad de tareas:** 12

## TASK-F6-01 — Validar paleta propuesta contra la identidad ICE24

- **ID:** `TASK-F6-01`
- **Descripción:** Validar paleta propuesta contra la identidad ICE24.
- **Objetivo:** Dejar resuelto el alcance de “Validar paleta propuesta contra la identidad ICE24” con una salida verificable: tokens de marca aprobados.
- **Archivos que se modificarán:**
  - `/packages/ui`
  - `/apps/private-web/src`
  - `/docs/design-system`
  - `/packages/ui/src/tokens`
  - `/docs/design-system/tokens.md`
  - `/docs/tasks/task-f6-01.md`
- **Dependencias:**
  - Gate de salida de Fase 3.
  - Decisiones visuales aprobadas o registradas como provisionales no productivas.
- **Criterios de aceptación:**
  - Tokens de marca aprobados.
  - La interfaz cubre carga, vacío, error, permiso denegado y modo lectura; funciona en los breakpoints definidos.
  - Los controles son navegables por teclado y cumplen el objetivo WCAG 2.2 AA aplicable.
  - La decisión o insumo incluye responsable, fecha, alcance, alternativas descartadas y consecuencias para documentos afectados.
  - El reporte registra escenarios, datos utilizados, resultados, defectos, severidad y criterio de aprobación.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - El artefacto de decisión o catálogo está versionado en `/docs`, enlazado desde el índice correspondiente y no contiene decisiones materiales implícitas.
  - Los documentos derivados afectados fueron actualizados o se creó una lista explícita de cambios pendientes.
  - El responsable humano indicado en la matriz RACI aprobó la salida cuando la decisión es de negocio, seguridad, sanidad, privacidad o costo.
  - La pantalla o componente tiene estados completos, prueba de accesibilidad y evidencia responsive/visual en los dispositivos objetivo.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F6-02 — Implementar tokens semánticos de color, tipografía, espaciado, elevación y movimiento

- **ID:** `TASK-F6-02`
- **Descripción:** Implementar tokens semánticos de color, tipografía, espaciado, elevación y movimiento.
- **Objetivo:** Entregar tema consumible por aplicaciones sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/ui`
  - `/apps/private-web/src`
  - `/docs/design-system`
  - `/packages/ui/src/tokens`
  - `/docs/design-system/tokens.md`
  - `/docs/tasks/task-f6-02.md`
- **Dependencias:**
  - Gate de salida de Fase 3.
  - Decisiones visuales aprobadas o registradas como provisionales no productivas.
  - `TASK-F6-01`
- **Criterios de aceptación:**
  - Tema consumible por aplicaciones.
  - La interfaz cubre carga, vacío, error, permiso denegado y modo lectura; funciona en los breakpoints definidos.
  - Los controles son navegables por teclado y cumplen el objetivo WCAG 2.2 AA aplicable.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - La pantalla o componente tiene estados completos, prueba de accesibilidad y evidencia responsive/visual en los dispositivos objetivo.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F6-03 — Implementar componentes base accesibles

- **ID:** `TASK-F6-03`
- **Descripción:** Implementar componentes base accesibles.
- **Objetivo:** Entregar inputs, botones, tablas, cards, dialog, toast, banner, tabs y navegación sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/ui`
  - `/apps/private-web/src`
  - `/docs/design-system`
  - `/packages/ui/src/components/base`
  - `/docs/design-system/components/base.md`
  - `/apps/private-web/src/app`
  - `/apps/private-web/src/features/navigation`
  - `/apps/private-web/src/features/context`
  - `/docs/tasks/task-f6-03.md`
- **Dependencias:**
  - Gate de salida de Fase 3.
  - Decisiones visuales aprobadas o registradas como provisionales no productivas.
  - `TASK-F6-02`
- **Criterios de aceptación:**
  - Inputs, botones, tablas, cards, dialog, toast, banner, tabs y navegación.
  - La interfaz cubre carga, vacío, error, permiso denegado y modo lectura; funciona en los breakpoints definidos.
  - Los controles son navegables por teclado y cumplen el objetivo WCAG 2.2 AA aplicable.
  - La configuración es reproducible por entorno y cuenta con evidencia de despliegue o restauración según corresponda.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - La migración o cambio de datos incluye estrategia de compatibilidad, validación y reversión operativa; no elimina historial requerido.
  - La pantalla o componente tiene estados completos, prueba de accesibilidad y evidencia responsive/visual en los dispositivos objetivo.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F6-04 — Implementar componentes especializados

- **ID:** `TASK-F6-04`
- **Descripción:** Implementar componentes especializados.
- **Objetivo:** Entregar tríada de máquina, alerta crítica, comparador, sync, modo lectura y job status sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/ui`
  - `/apps/private-web/src`
  - `/docs/design-system`
  - `/packages/ui/src/components/domain`
  - `/docs/design-system/components/domain.md`
  - `/docs/tasks/task-f6-04.md`
- **Dependencias:**
  - Gate de salida de Fase 3.
  - Decisiones visuales aprobadas o registradas como provisionales no productivas.
  - `TASK-F6-03`
- **Criterios de aceptación:**
  - Tríada de máquina, alerta crítica, comparador, sync, modo lectura y job status.
  - Las transiciones validan estado previo, permiso, precondiciones, versión esperada y motivo cuando aplica.
  - La interfaz cubre carga, vacío, error, permiso denegado y modo lectura; funciona en los breakpoints definidos.
  - Los controles son navegables por teclado y cumplen el objetivo WCAG 2.2 AA aplicable.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - La pantalla o componente tiene estados completos, prueba de accesibilidad y evidencia responsive/visual en los dispositivos objetivo.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F6-05 — Crear catálogo de componentes y estados

- **ID:** `TASK-F6-05`
- **Descripción:** Crear catálogo de componentes y estados.
- **Objetivo:** Entregar documentación visual y pruebas sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/ui`
  - `/apps/private-web/src`
  - `/docs/design-system`
  - `/packages/ui/src/stories`
  - `/docs/design-system/catalog.md`
  - `/docs/tasks/task-f6-05.md`
- **Dependencias:**
  - Gate de salida de Fase 3.
  - Decisiones visuales aprobadas o registradas como provisionales no productivas.
  - `TASK-F6-03`
  - `TASK-F6-04`
- **Criterios de aceptación:**
  - Documentación visual y pruebas.
  - La interfaz cubre carga, vacío, error, permiso denegado y modo lectura; funciona en los breakpoints definidos.
  - Los controles son navegables por teclado y cumplen el objetivo WCAG 2.2 AA aplicable.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - La pantalla o componente tiene estados completos, prueba de accesibilidad y evidencia responsive/visual en los dispositivos objetivo.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F6-06 — Implementar shell privado responsive

- **ID:** `TASK-F6-06`
- **Descripción:** Implementar shell privado responsive.
- **Objetivo:** Entregar sidebar, topbar, bottom navigation y breadcrumbs sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/ui`
  - `/apps/private-web/src`
  - `/docs/design-system`
  - `/apps/private-web/src/app`
  - `/apps/private-web/src/features/navigation`
  - `/apps/private-web/src/features/context`
  - `/docs/tasks/task-f6-06.md`
- **Dependencias:**
  - Gate de salida de Fase 3.
  - Decisiones visuales aprobadas o registradas como provisionales no productivas.
  - `TASK-F6-02`
  - `TASK-F6-03`
- **Criterios de aceptación:**
  - Sidebar, topbar, bottom navigation y breadcrumbs.
  - La interfaz cubre carga, vacío, error, permiso denegado y modo lectura; funciona en los breakpoints definidos.
  - Los controles son navegables por teclado y cumplen el objetivo WCAG 2.2 AA aplicable.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - La pantalla o componente tiene estados completos, prueba de accesibilidad y evidencia responsive/visual en los dispositivos objetivo.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F6-07 — Implementar navegación basada en permisos y módulos habilitados

- **ID:** `TASK-F6-07`
- **Descripción:** Implementar navegación basada en permisos y módulos habilitados.
- **Objetivo:** Entregar destinos no autorizados ausentes sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/ui`
  - `/apps/private-web/src`
  - `/docs/design-system`
  - `/apps/private-web/src/app`
  - `/apps/private-web/src/features/navigation`
  - `/apps/private-web/src/features/context`
  - `/docs/tasks/task-f6-07.md`
- **Dependencias:**
  - Gate de salida de Fase 3.
  - Decisiones visuales aprobadas o registradas como provisionales no productivas.
  - `TASK-F6-06`
  - `TASK-F3-07`
- **Criterios de aceptación:**
  - Destinos no autorizados ausentes.
  - Existen pruebas positivas y negativas que demuestran aislamiento entre cuentas, ámbitos y acciones.
  - Toda acción sensible genera auditoría con actor, contexto, correlación, valores relevantes y resultado.
  - La interfaz cubre carga, vacío, error, permiso denegado y modo lectura; funciona en los breakpoints definidos.
  - Los controles son navegables por teclado y cumplen el objetivo WCAG 2.2 AA aplicable.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - La pantalla o componente tiene estados completos, prueba de accesibilidad y evidencia responsive/visual en los dispositivos objetivo.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F6-08 — Implementar selector de contexto y persistencia segura

- **ID:** `TASK-F6-08`
- **Descripción:** Implementar selector de contexto y persistencia segura.
- **Objetivo:** Entregar cuenta, rol, sucursal y máquina visibles sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/ui`
  - `/apps/private-web/src`
  - `/docs/design-system`
  - `/apps/private-web/src/app`
  - `/apps/private-web/src/features/navigation`
  - `/apps/private-web/src/features/context`
  - `/docs/tasks/task-f6-08.md`
- **Dependencias:**
  - Gate de salida de Fase 3.
  - Decisiones visuales aprobadas o registradas como provisionales no productivas.
  - `TASK-F6-06`
  - `TASK-F3-06`
- **Criterios de aceptación:**
  - Cuenta, rol, sucursal y máquina visibles.
  - La interfaz cubre carga, vacío, error, permiso denegado y modo lectura; funciona en los breakpoints definidos.
  - Los controles son navegables por teclado y cumplen el objetivo WCAG 2.2 AA aplicable.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - La migración o cambio de datos incluye estrategia de compatibilidad, validación y reversión operativa; no elimina historial requerido.
  - La pantalla o componente tiene estados completos, prueba de accesibilidad y evidencia responsive/visual en los dispositivos objetivo.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F6-09 — Implementar layouts de lista, detalle, wizard, dashboard y pantalla móvil operativa

- **ID:** `TASK-F6-09`
- **Descripción:** Implementar layouts de lista, detalle, wizard, dashboard y pantalla móvil operativa.
- **Objetivo:** Entregar plantillas reutilizables sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/ui`
  - `/apps/private-web/src`
  - `/docs/design-system`
  - `/apps/private-web/src/app`
  - `/apps/private-web/src/features/navigation`
  - `/apps/private-web/src/features/context`
  - `/docs/tasks/task-f6-09.md`
- **Dependencias:**
  - Gate de salida de Fase 3.
  - Decisiones visuales aprobadas o registradas como provisionales no productivas.
  - `TASK-F6-03`
  - `TASK-F6-06`
- **Criterios de aceptación:**
  - Plantillas reutilizables.
  - La interfaz cubre carga, vacío, error, permiso denegado y modo lectura; funciona en los breakpoints definidos.
  - Los controles son navegables por teclado y cumplen el objetivo WCAG 2.2 AA aplicable.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - La pantalla o componente tiene estados completos, prueba de accesibilidad y evidencia responsive/visual en los dispositivos objetivo.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F6-10 — Implementar estados globales de carga, vacío, error, offline y lectura

- **ID:** `TASK-F6-10`
- **Descripción:** Implementar estados globales de carga, vacío, error, offline y lectura.
- **Objetivo:** Entregar experiencia coherente sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/ui`
  - `/apps/private-web/src`
  - `/docs/design-system`
  - `/packages/ui/src/patterns/status`
  - `/apps/private-web/src/components/system-state`
  - `/docs/tasks/task-f6-10.md`
- **Dependencias:**
  - Gate de salida de Fase 3.
  - Decisiones visuales aprobadas o registradas como provisionales no productivas.
  - `TASK-F6-03`
  - `TASK-F6-06`
- **Criterios de aceptación:**
  - Experiencia coherente.
  - Los reintentos no duplican efectos y los conflictos o fallos quedan visibles y recuperables.
  - La interfaz cubre carga, vacío, error, permiso denegado y modo lectura; funciona en los breakpoints definidos.
  - Los controles son navegables por teclado y cumplen el objetivo WCAG 2.2 AA aplicable.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - La pantalla o componente tiene estados completos, prueba de accesibilidad y evidencia responsive/visual en los dispositivos objetivo.
  - Se validaron pérdida de conexión, reintento, cierre de sesión, pérdida de permiso, conflicto y limpieza de datos locales.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F6-11 — Implementar manejo de deep links, regresar y cambios no guardados

- **ID:** `TASK-F6-11`
- **Descripción:** Implementar manejo de deep links, regresar y cambios no guardados.
- **Objetivo:** Entregar flujos definidos en AppFlow sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/ui`
  - `/apps/private-web/src`
  - `/docs/design-system`
  - `/apps/private-web/src/app`
  - `/apps/private-web/src/features/navigation`
  - `/apps/private-web/src/features/context`
  - `/docs/tasks/task-f6-11.md`
- **Dependencias:**
  - Gate de salida de Fase 3.
  - Decisiones visuales aprobadas o registradas como provisionales no productivas.
  - `TASK-F6-06`
  - `TASK-F6-07`
- **Criterios de aceptación:**
  - Flujos definidos en AppFlow.
  - La interfaz cubre carga, vacío, error, permiso denegado y modo lectura; funciona en los breakpoints definidos.
  - Los controles son navegables por teclado y cumplen el objetivo WCAG 2.2 AA aplicable.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - La pantalla o componente tiene estados completos, prueba de accesibilidad y evidencia responsive/visual en los dispositivos objetivo.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F6-12 — Configurar pruebas automáticas de accesibilidad y visual regression

- **ID:** `TASK-F6-12`
- **Descripción:** Configurar pruebas automáticas de accesibilidad y visual regression.
- **Objetivo:** Entregar quality gate de componentes sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/ui`
  - `/apps/private-web/src`
  - `/docs/design-system`
  - `/tests/e2e/accessibility`
  - `/tests/visual`
  - `/.github/workflows/ui-quality.yml`
  - `/docs/tasks/task-f6-12.md`
- **Dependencias:**
  - Gate de salida de Fase 3.
  - Decisiones visuales aprobadas o registradas como provisionales no productivas.
  - `TASK-F6-03`
  - `TASK-F6-04`
  - `TASK-F6-06`
- **Criterios de aceptación:**
  - Quality gate de componentes.
  - La interfaz cubre carga, vacío, error, permiso denegado y modo lectura; funciona en los breakpoints definidos.
  - Los controles son navegables por teclado y cumplen el objetivo WCAG 2.2 AA aplicable.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - La pantalla o componente tiene estados completos, prueba de accesibilidad y evidencia responsive/visual en los dispositivos objetivo.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

---

# Fase 7 — Mantenimiento, tickets, órdenes y offline operativo

**Objetivo de fase:** Implementar el control técnico preventivo y correctivo con evidencia, componentes y trabajo offline controlado.

**Cantidad de tareas:** 17

## TASK-F7-01 — Implementar generación y recalculo de actividades programadas

- **ID:** `TASK-F7-01`
- **Descripción:** Implementar generación y recalculo de actividades programadas.
- **Objetivo:** Entregar próximas, vencidas y completadas sin borrar atrasos sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/maintenance`
  - `/packages/database`
  - `/docs/modules/maintenance.md`
  - `/apps/api/src/modules/maintenance/scheduling`
  - `/apps/worker/src/processors/maintenance-scheduling`
  - `/docs/tasks/task-f7-01.md`
- **Dependencias:**
  - Gate de salida de Fase 4.
  - `TASK-F5-04`
  - `TASK-F5-05`
  - `TASK-F5-06`
  - Gate de salida de Fase 6.
- **Criterios de aceptación:**
  - Próximas, vencidas y completadas sin borrar atrasos.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F7-02 — Implementar tickets con máquina, sistema, prioridad, descripción y evidencia

- **ID:** `TASK-F7-02`
- **Descripción:** Implementar tickets con máquina, sistema, prioridad, descripción y evidencia.
- **Objetivo:** Entregar incidencia trazable sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/maintenance`
  - `/packages/database`
  - `/docs/modules/maintenance.md`
  - `/apps/api/src/modules/tickets`
  - `/apps/private-web/src/features/tickets`
  - `/apps/api/src/modules/maintenance`
  - `/apps/private-web/src/features/maintenance`
  - `/docs/tasks/task-f7-02.md`
- **Dependencias:**
  - Gate de salida de Fase 4.
  - `TASK-F5-04`
  - `TASK-F5-05`
  - `TASK-F5-06`
  - Gate de salida de Fase 6.
  - `TASK-F4-10`
- **Criterios de aceptación:**
  - Incidencia trazable.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F7-03 — Implementar asignación y orden de trabajo

- **ID:** `TASK-F7-03`
- **Descripción:** Implementar asignación y orden de trabajo.
- **Objetivo:** Entregar responsable, checklist, procedimiento y piezas sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/maintenance`
  - `/packages/database`
  - `/docs/modules/maintenance.md`
  - `/apps/api/src/modules/work-orders`
  - `/apps/private-web/src/features/work-orders`
  - `/docs/tasks/task-f7-03.md`
- **Dependencias:**
  - Gate de salida de Fase 4.
  - `TASK-F5-04`
  - `TASK-F5-05`
  - `TASK-F5-06`
  - Gate de salida de Fase 6.
  - `TASK-F7-02`
  - `TASK-F4-03`
- **Criterios de aceptación:**
  - Responsable, checklist, procedimiento y piezas.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F7-04 — Implementar máquina de estados de mantenimiento y guardas

- **ID:** `TASK-F7-04`
- **Descripción:** Implementar máquina de estados de mantenimiento y guardas.
- **Objetivo:** Entregar transiciones explícitas y auditadas sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/maintenance`
  - `/packages/database`
  - `/docs/modules/maintenance.md`
  - `/apps/api/src/modules/maintenance`
  - `/apps/private-web/src/features/maintenance`
  - `/docs/tasks/task-f7-04.md`
- **Dependencias:**
  - Gate de salida de Fase 4.
  - `TASK-F5-04`
  - `TASK-F5-05`
  - `TASK-F5-06`
  - Gate de salida de Fase 6.
  - `TASK-F7-01`
  - `TASK-F7-03`
- **Criterios de aceptación:**
  - Transiciones explícitas y auditadas.
  - Las transiciones validan estado previo, permiso, precondiciones, versión esperada y motivo cuando aplica.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F7-05 — Implementar ejecución, diagnóstico, pruebas, recomendación y evidencia

- **ID:** `TASK-F7-05`
- **Descripción:** Implementar ejecución, diagnóstico, pruebas, recomendación y evidencia.
- **Objetivo:** Entregar cierre solo con requisitos completos sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/maintenance`
  - `/packages/database`
  - `/docs/modules/maintenance.md`
  - `/apps/api/src/modules/maintenance`
  - `/apps/private-web/src/features/maintenance`
  - `/docs/tasks/task-f7-05.md`
- **Dependencias:**
  - Gate de salida de Fase 4.
  - `TASK-F5-04`
  - `TASK-F5-05`
  - `TASK-F5-06`
  - Gate de salida de Fase 6.
  - `TASK-F7-03`
  - `TASK-F7-04`
- **Criterios de aceptación:**
  - Cierre solo con requisitos completos.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F7-06 — Implementar tipos de evidencia declarados por plantilla

- **ID:** `TASK-F7-06`
- **Descripción:** Implementar tipos de evidencia declarados por plantilla.
- **Objetivo:** Entregar antes/después, pieza, lectura, lote, firma sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/maintenance`
  - `/packages/database`
  - `/docs/modules/maintenance.md`
  - `/apps/api/src/modules/maintenance`
  - `/apps/private-web/src/features/maintenance`
  - `/docs/tasks/task-f7-06.md`
- **Dependencias:**
  - Gate de salida de Fase 4.
  - `TASK-F5-04`
  - `TASK-F5-05`
  - `TASK-F5-06`
  - Gate de salida de Fase 6.
  - `TASK-F4-06`
  - `TASK-F7-05`
- **Criterios de aceptación:**
  - Antes/después, pieza, lectura, lote, firma.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F7-07 — Implementar revisión, observaciones, corrección, reapertura y anulación según permisos aprobados

- **ID:** `TASK-F7-07`
- **Descripción:** Implementar revisión, observaciones, corrección, reapertura y anulación según permisos aprobados.
- **Objetivo:** Entregar versiones y motivos conservados sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/maintenance`
  - `/packages/database`
  - `/docs/modules/maintenance.md`
  - `/apps/api/src/modules/maintenance`
  - `/apps/private-web/src/features/maintenance`
  - `/docs/tasks/task-f7-07.md`
- **Dependencias:**
  - Gate de salida de Fase 4.
  - `TASK-F5-04`
  - `TASK-F5-05`
  - `TASK-F5-06`
  - Gate de salida de Fase 6.
  - `TASK-F7-04`
  - `TASK-F7-05`
- **Criterios de aceptación:**
  - Versiones y motivos conservados.
  - Existen pruebas positivas y negativas que demuestran aislamiento entre cuentas, ámbitos y acciones.
  - Las transiciones validan estado previo, permiso, precondiciones, versión esperada y motivo cuando aplica.
  - Toda acción sensible genera auditoría con actor, contexto, correlación, valores relevantes y resultado.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F7-08 — Implementar asignación de responsable y bloqueo lógico de actividad descargada

- **ID:** `TASK-F7-08`
- **Descripción:** Implementar asignación de responsable y bloqueo lógico de actividad descargada.
- **Objetivo:** Entregar un responsable activo por tarea offline sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/maintenance`
  - `/packages/database`
  - `/docs/modules/maintenance.md`
  - `/apps/api/src/modules/work-orders`
  - `/apps/private-web/src/features/work-orders`
  - `/docs/tasks/task-f7-08.md`
- **Dependencias:**
  - Gate de salida de Fase 4.
  - `TASK-F5-04`
  - `TASK-F5-05`
  - `TASK-F5-06`
  - Gate de salida de Fase 6.
  - `TASK-F7-03`
  - `TASK-F7-04`
- **Criterios de aceptación:**
  - Un responsable activo por tarea offline.
  - Toda acción sensible genera auditoría con actor, contexto, correlación, valores relevantes y resultado.
  - Los reintentos no duplican efectos y los conflictos o fallos quedan visibles y recuperables.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - Se validaron pérdida de conexión, reintento, cierre de sesión, pérdida de permiso, conflicto y limpieza de datos locales.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F7-09 — Implementar esquema IndexedDB y cifrado/protección local factible

- **ID:** `TASK-F7-09`
- **Descripción:** Implementar esquema IndexedDB y cifrado/protección local factible.
- **Objetivo:** Entregar datos offline estructurados y versionados sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/maintenance`
  - `/packages/database`
  - `/docs/modules/maintenance.md`
  - `/packages/offline`
  - `/apps/api/src/modules/synchronization`
  - `/apps/private-web/src/features/sync`
  - `/docs/tasks/task-f7-09.md`
- **Dependencias:**
  - Gate de salida de Fase 4.
  - `TASK-F5-04`
  - `TASK-F5-05`
  - `TASK-F5-06`
  - Gate de salida de Fase 6.
  - `TASK-F1-03`
  - `TASK-F0-14`
- **Criterios de aceptación:**
  - Datos offline estructurados y versionados.
  - Los reintentos no duplican efectos y los conflictos o fallos quedan visibles y recuperables.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - La migración o cambio de datos incluye estrategia de compatibilidad, validación y reversión operativa; no elimina historial requerido.
  - Se validaron pérdida de conexión, reintento, cierre de sesión, pérdida de permiso, conflicto y limpieza de datos locales.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F7-10 — Implementar descarga explícita de órdenes autorizadas

- **ID:** `TASK-F7-10`
- **Descripción:** Implementar descarga explícita de órdenes autorizadas.
- **Objetivo:** Entregar paquete offline mínimo sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/maintenance`
  - `/packages/database`
  - `/docs/modules/maintenance.md`
  - `/packages/offline`
  - `/apps/api/src/modules/synchronization`
  - `/apps/private-web/src/features/sync`
  - `/docs/tasks/task-f7-10.md`
- **Dependencias:**
  - Gate de salida de Fase 4.
  - `TASK-F5-04`
  - `TASK-F5-05`
  - `TASK-F5-06`
  - Gate de salida de Fase 6.
  - `TASK-F7-08`
  - `TASK-F7-09`
- **Criterios de aceptación:**
  - Paquete offline mínimo.
  - Toda acción sensible genera auditoría con actor, contexto, correlación, valores relevantes y resultado.
  - Los reintentos no duplican efectos y los conflictos o fallos quedan visibles y recuperables.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - Se validaron pérdida de conexión, reintento, cierre de sesión, pérdida de permiso, conflicto y limpieza de datos locales.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F7-11 — Implementar cola local, estados y reintentos

- **ID:** `TASK-F7-11`
- **Descripción:** Implementar cola local, estados y reintentos.
- **Objetivo:** Entregar pendiente, sincronizando, cargada, error y conflicto sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/maintenance`
  - `/packages/database`
  - `/docs/modules/maintenance.md`
  - `/packages/offline`
  - `/apps/api/src/modules/synchronization`
  - `/apps/private-web/src/features/sync`
  - `/docs/tasks/task-f7-11.md`
- **Dependencias:**
  - Gate de salida de Fase 4.
  - `TASK-F5-04`
  - `TASK-F5-05`
  - `TASK-F5-06`
  - Gate de salida de Fase 6.
  - `TASK-F7-09`
  - `TASK-F7-10`
- **Criterios de aceptación:**
  - Pendiente, sincronizando, cargada, error y conflicto.
  - Los reintentos no duplican efectos y los conflictos o fallos quedan visibles y recuperables.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F7-12 — Implementar API de sincronización con idempotencia y versión esperada

- **ID:** `TASK-F7-12`
- **Descripción:** Implementar API de sincronización con idempotencia y versión esperada.
- **Objetivo:** Entregar reintentos no duplican ejecuciones o archivos sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/maintenance`
  - `/packages/database`
  - `/docs/modules/maintenance.md`
  - `/packages/offline`
  - `/apps/api/src/modules/synchronization`
  - `/apps/private-web/src/features/sync`
  - `/docs/tasks/task-f7-12.md`
- **Dependencias:**
  - Gate de salida de Fase 4.
  - `TASK-F5-04`
  - `TASK-F5-05`
  - `TASK-F5-06`
  - Gate de salida de Fase 6.
  - `TASK-F7-04`
  - `TASK-F7-11`
  - `TASK-F1-07`
- **Criterios de aceptación:**
  - Reintentos no duplican ejecuciones o archivos.
  - Los reintentos no duplican efectos y los conflictos o fallos quedan visibles y recuperables.
  - Los archivos permanecen privados, validados y vinculados mediante metadatos; no existen URLs públicas permanentes.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - OpenAPI, errores, idempotencia, concurrencia y ejemplos de contrato fueron actualizados y validados.
  - Se validaron pérdida de conexión, reintento, cierre de sesión, pérdida de permiso, conflicto y limpieza de datos locales.
  - Se validaron límites, tipo, integridad, privacidad, manejo de malware/fallo y eliminación temporal de derivados cuando corresponda.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F7-13 — Implementar detección y registro de conflictos

- **ID:** `TASK-F7-13`
- **Descripción:** Implementar detección y registro de conflictos.
- **Objetivo:** Entregar ambas versiones preservadas sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/maintenance`
  - `/packages/database`
  - `/docs/modules/maintenance.md`
  - `/packages/offline`
  - `/apps/api/src/modules/synchronization`
  - `/apps/private-web/src/features/sync`
  - `/docs/tasks/task-f7-13.md`
- **Dependencias:**
  - Gate de salida de Fase 4.
  - `TASK-F5-04`
  - `TASK-F5-05`
  - `TASK-F5-06`
  - Gate de salida de Fase 6.
  - `TASK-F7-12`
- **Criterios de aceptación:**
  - Ambas versiones preservadas.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F7-14 — Implementar UI móvil de órdenes y evidencia offline

- **ID:** `TASK-F7-14`
- **Descripción:** Implementar UI móvil de órdenes y evidencia offline.
- **Objetivo:** Entregar flujo completo sin conectividad después de descarga sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/maintenance`
  - `/packages/database`
  - `/docs/modules/maintenance.md`
  - `/apps/api/src/modules/maintenance`
  - `/apps/private-web/src/features/maintenance`
  - `/apps/private-web/src/features/maintenance/mobile`
  - `/docs/tasks/task-f7-14.md`
- **Dependencias:**
  - Gate de salida de Fase 4.
  - `TASK-F5-04`
  - `TASK-F5-05`
  - `TASK-F5-06`
  - Gate de salida de Fase 6.
  - `TASK-F7-05`
  - `TASK-F7-06`
  - `TASK-F7-10`
  - `TASK-F6-09`
- **Criterios de aceptación:**
  - Flujo completo sin conectividad después de descarga.
  - Toda acción sensible genera auditoría con actor, contexto, correlación, valores relevantes y resultado.
  - Los reintentos no duplican efectos y los conflictos o fallos quedan visibles y recuperables.
  - La interfaz cubre carga, vacío, error, permiso denegado y modo lectura; funciona en los breakpoints definidos.
  - Los controles son navegables por teclado y cumplen el objetivo WCAG 2.2 AA aplicable.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - La pantalla o componente tiene estados completos, prueba de accesibilidad y evidencia responsive/visual en los dispositivos objetivo.
  - Se validaron pérdida de conexión, reintento, cierre de sesión, pérdida de permiso, conflicto y limpieza de datos locales.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F7-15 — Implementar centro de sincronización y resolución autorizada

- **ID:** `TASK-F7-15`
- **Descripción:** Implementar centro de sincronización y resolución autorizada.
- **Objetivo:** Entregar comparación y decisión auditada sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/maintenance`
  - `/packages/database`
  - `/docs/modules/maintenance.md`
  - `/packages/offline`
  - `/apps/api/src/modules/synchronization`
  - `/apps/private-web/src/features/sync`
  - `/docs/tasks/task-f7-15.md`
- **Dependencias:**
  - Gate de salida de Fase 4.
  - `TASK-F5-04`
  - `TASK-F5-05`
  - `TASK-F5-06`
  - Gate de salida de Fase 6.
  - `TASK-F7-11`
  - `TASK-F7-13`
  - `TASK-F6-10`
- **Criterios de aceptación:**
  - Comparación y decisión auditada.
  - Los reintentos no duplican efectos y los conflictos o fallos quedan visibles y recuperables.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - Se validaron pérdida de conexión, reintento, cierre de sesión, pérdida de permiso, conflicto y limpieza de datos locales.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F7-16 — Implementar borrado local al cerrar sesión, perder permiso o desactivar usuario

- **ID:** `TASK-F7-16`
- **Descripción:** Implementar borrado local al cerrar sesión, perder permiso o desactivar usuario.
- **Objetivo:** Entregar datos sensibles removidos sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/maintenance`
  - `/packages/database`
  - `/docs/modules/maintenance.md`
  - `/packages/offline`
  - `/apps/api/src/modules/synchronization`
  - `/apps/private-web/src/features/sync`
  - `/docs/tasks/task-f7-16.md`
- **Dependencias:**
  - Gate de salida de Fase 4.
  - `TASK-F5-04`
  - `TASK-F5-05`
  - `TASK-F5-06`
  - Gate de salida de Fase 6.
  - `TASK-F3-09`
  - `TASK-F7-09`
- **Criterios de aceptación:**
  - Datos sensibles removidos.
  - Toda acción sensible genera auditoría con actor, contexto, correlación, valores relevantes y resultado.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - La migración o cambio de datos incluye estrategia de compatibilidad, validación y reversión operativa; no elimina historial requerido.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F7-17 — Crear pruebas de pérdida de conexión, cierre inesperado, fotos pendientes y concurrencia

- **ID:** `TASK-F7-17`
- **Descripción:** Crear pruebas de pérdida de conexión, cierre inesperado, fotos pendientes y concurrencia.
- **Objetivo:** Entregar suite de campo automatizada y manual sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/maintenance`
  - `/packages/database`
  - `/docs/modules/maintenance.md`
  - `/tests/e2e/maintenance-offline`
  - `/packages/offline/src/__tests__`
  - `/docs/tasks/task-f7-17.md`
- **Dependencias:**
  - Gate de salida de Fase 4.
  - `TASK-F5-04`
  - `TASK-F5-05`
  - `TASK-F5-06`
  - Gate de salida de Fase 6.
  - `TASK-F7-10`
  - `TASK-F7-11`
  - `TASK-F7-12`
  - `TASK-F7-13`
- **Criterios de aceptación:**
  - Suite de campo automatizada y manual.
  - El reporte registra escenarios, datos utilizados, resultados, defectos, severidad y criterio de aprobación.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

---

# Fase 8 — Control sanitario, laboratorio y restricciones

**Objetivo de fase:** Implementar bitácoras sanitarias dinámicas, análisis estructurados, no conformidades, acciones correctivas y restricciones técnicas/sanitarias.

**Cantidad de tareas:** 17

## TASK-F8-01 — Implementar plantillas dinámicas sanitarias con campos, unidades, límites, evidencia y frecuencia

- **ID:** `TASK-F8-01`
- **Descripción:** Implementar plantillas dinámicas sanitarias con campos, unidades, límites, evidencia y frecuencia.
- **Objetivo:** Entregar formularios versionados no codificados rígidamente sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/sanitary`
  - `/packages/database`
  - `/docs/modules/sanitary.md`
  - `/apps/api/src/modules/sanitary-control`
  - `/apps/private-web/src/features/sanitary/logbooks`
  - `/docs/tasks/task-f8-01.md`
- **Dependencias:**
  - Gate de salida de Fase 7.
  - `TASK-F0-11`
  - `TASK-F0-12`
- **Criterios de aceptación:**
  - Formularios versionados no codificados rígidamente.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F8-02 — Implementar programación y ejecución de bitácoras

- **ID:** `TASK-F8-02`
- **Descripción:** Implementar programación y ejecución de bitácoras.
- **Objetivo:** Entregar controles por modelo, componente y sucursal sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/sanitary`
  - `/packages/database`
  - `/docs/modules/sanitary.md`
  - `/apps/api/src/modules/sanitary-control`
  - `/apps/private-web/src/features/sanitary/logbooks`
  - `/docs/tasks/task-f8-02.md`
- **Dependencias:**
  - Gate de salida de Fase 7.
  - `TASK-F0-11`
  - `TASK-F0-12`
  - `TASK-F8-01`
  - `TASK-F4-13`
- **Criterios de aceptación:**
  - Controles por modelo, componente y sucursal.
  - Existen pruebas positivas y negativas que demuestran aislamiento entre cuentas, ámbitos y acciones.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - La migración o cambio de datos incluye estrategia de compatibilidad, validación y reversión operativa; no elimina historial requerido.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F8-03 — Implementar validación de respuestas, unidades y límites

- **ID:** `TASK-F8-03`
- **Descripción:** Implementar validación de respuestas, unidades y límites.
- **Objetivo:** Entregar resultado conforme, no conforme, pendiente o no evaluable sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/sanitary`
  - `/packages/database`
  - `/docs/modules/sanitary.md`
  - `/apps/api/src/modules/sanitary-control`
  - `/apps/private-web/src/features/sanitary/logbooks`
  - `/docs/tasks/task-f8-03.md`
- **Dependencias:**
  - Gate de salida de Fase 7.
  - `TASK-F0-11`
  - `TASK-F0-12`
  - `TASK-F8-01`
- **Criterios de aceptación:**
  - Resultado conforme, no conforme, pendiente o no evaluable.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F8-04 — Implementar corrección y anulación versionada

- **ID:** `TASK-F8-04`
- **Descripción:** Implementar corrección y anulación versionada.
- **Objetivo:** Entregar comparación entre original y vigente sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/sanitary`
  - `/packages/database`
  - `/docs/modules/sanitary.md`
  - `/docs/tasks/task-f8-04.md`
- **Dependencias:**
  - Gate de salida de Fase 7.
  - `TASK-F0-11`
  - `TASK-F0-12`
  - `TASK-F8-02`
  - `TASK-F5-04`
- **Criterios de aceptación:**
  - Comparación entre original y vigente.
  - Las transiciones validan estado previo, permiso, precondiciones, versión esperada y motivo cuando aplica.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F8-05 — Implementar laboratorios, tipos de análisis, parámetros y puntos de muestreo

- **ID:** `TASK-F8-05`
- **Descripción:** Implementar laboratorios, tipos de análisis, parámetros y puntos de muestreo.
- **Objetivo:** Entregar catálogos administrados por ICE24 sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/sanitary`
  - `/packages/database`
  - `/docs/modules/sanitary.md`
  - `/apps/api/src/modules/laboratory`
  - `/apps/private-web/src/features/sanitary/laboratory`
  - `/docs/tasks/task-f8-05.md`
- **Dependencias:**
  - Gate de salida de Fase 7.
  - `TASK-F0-11`
  - `TASK-F0-12`
- **Criterios de aceptación:**
  - Catálogos administrados por ICE24.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F8-06 — Implementar análisis con fechas, documento original y captura estructurada

- **ID:** `TASK-F8-06`
- **Descripción:** Implementar análisis con fechas, documento original y captura estructurada.
- **Objetivo:** Entregar pDF y datos unidos sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/sanitary`
  - `/packages/database`
  - `/docs/modules/sanitary.md`
  - `/apps/api/src/modules/laboratory`
  - `/apps/private-web/src/features/sanitary/laboratory`
  - `/docs/tasks/task-f8-06.md`
- **Dependencias:**
  - Gate de salida de Fase 7.
  - `TASK-F0-11`
  - `TASK-F0-12`
  - `TASK-F8-05`
  - `TASK-F5-08`
- **Criterios de aceptación:**
  - PDF y datos unidos.
  - Los archivos permanecen privados, validados y vinculados mediante metadatos; no existen URLs públicas permanentes.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - La migración o cambio de datos incluye estrategia de compatibilidad, validación y reversión operativa; no elimina historial requerido.
  - Se validaron límites, tipo, integridad, privacidad, manejo de malware/fallo y eliminación temporal de derivados cuando corresponda.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F8-07 — Implementar resultados textuales, rangos y límites de cuantificación según reglas aprobadas

- **ID:** `TASK-F8-07`
- **Descripción:** Implementar resultados textuales, rangos y límites de cuantificación según reglas aprobadas.
- **Objetivo:** Entregar representación sin pérdida semántica sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/sanitary`
  - `/packages/database`
  - `/docs/modules/sanitary.md`
  - `/apps/api/src/modules/sanitary-control`
  - `/apps/private-web/src/features/sanitary/logbooks`
  - `/apps/api/src/modules/laboratory`
  - `/apps/private-web/src/features/sanitary/laboratory`
  - `/docs/tasks/task-f8-07.md`
- **Dependencias:**
  - Gate de salida de Fase 7.
  - `TASK-F0-11`
  - `TASK-F0-12`
  - `TASK-F8-05`
- **Criterios de aceptación:**
  - Representación sin pérdida semántica.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F8-08 — Implementar detección de no conformidad

- **ID:** `TASK-F8-08`
- **Descripción:** Implementar detección de no conformidad.
- **Objetivo:** Entregar evento crítico y relación con parámetro sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/sanitary`
  - `/packages/database`
  - `/docs/modules/sanitary.md`
  - `/apps/api/src/modules/non-conformities`
  - `/apps/private-web/src/features/sanitary/non-conformities`
  - `/docs/tasks/task-f8-08.md`
- **Dependencias:**
  - Gate de salida de Fase 7.
  - `TASK-F0-11`
  - `TASK-F0-12`
  - `TASK-F8-06`
  - `TASK-F8-07`
- **Criterios de aceptación:**
  - Evento crítico y relación con parámetro.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F8-09 — Implementar creación automática de alerta, ticket y acción correctiva

- **ID:** `TASK-F8-09`
- **Descripción:** Implementar creación automática de alerta, ticket y acción correctiva.
- **Objetivo:** Entregar cadena de atención trazable sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/sanitary`
  - `/packages/database`
  - `/docs/modules/sanitary.md`
  - `/apps/api/src/modules/non-conformities`
  - `/apps/private-web/src/features/sanitary/non-conformities`
  - `/docs/tasks/task-f8-09.md`
- **Dependencias:**
  - Gate de salida de Fase 7.
  - `TASK-F0-11`
  - `TASK-F0-12`
  - `TASK-F8-08`
  - `TASK-F7-02`
  - `TASK-F5-11`
- **Criterios de aceptación:**
  - Cadena de atención trazable.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F8-10 — Implementar restricciones técnicas y sanitarias

- **ID:** `TASK-F8-10`
- **Descripción:** Implementar restricciones técnicas y sanitarias.
- **Objetivo:** Entregar bloqueo de pedidos sin bloquear documentación/mantenimiento permitido sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/sanitary`
  - `/packages/database`
  - `/docs/modules/sanitary.md`
  - `/apps/api/src/modules/restrictions`
  - `/apps/private-web/src/features/sanitary/restrictions`
  - `/docs/tasks/task-f8-10.md`
- **Dependencias:**
  - Gate de salida de Fase 7.
  - `TASK-F0-11`
  - `TASK-F0-12`
  - `TASK-F8-08`
  - `TASK-F3-07`
- **Criterios de aceptación:**
  - Bloqueo de pedidos sin bloquear documentación/mantenimiento permitido.
  - Los reintentos no duplican efectos y los conflictos o fallos quedan visibles y recuperables.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F8-11 — Implementar formulario de reactivación y aceptación de responsabilidad

- **ID:** `TASK-F8-11`
- **Descripción:** Implementar formulario de reactivación y aceptación de responsabilidad.
- **Objetivo:** Entregar evidencia, responsable, fechas y próximo análisis sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/sanitary`
  - `/packages/database`
  - `/docs/modules/sanitary.md`
  - `/apps/api/src/modules/laboratory`
  - `/apps/private-web/src/features/sanitary/laboratory`
  - `/apps/api/src/modules/restrictions`
  - `/apps/private-web/src/features/sanitary/restrictions`
  - `/docs/tasks/task-f8-11.md`
- **Dependencias:**
  - Gate de salida de Fase 7.
  - `TASK-F0-11`
  - `TASK-F0-12`
  - `TASK-F8-09`
  - `TASK-F8-10`
- **Criterios de aceptación:**
  - Evidencia, responsable, fechas y próximo análisis.
  - Las transiciones validan estado previo, permiso, precondiciones, versión esperada y motivo cuando aplica.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F8-12 — Implementar revisión o nueva restricción por ICE24

- **ID:** `TASK-F8-12`
- **Descripción:** Implementar revisión o nueva restricción por ICE24.
- **Objetivo:** Entregar autoridad de plataforma conservada sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/sanitary`
  - `/packages/database`
  - `/docs/modules/sanitary.md`
  - `/docs/tasks/task-f8-12.md`
- **Dependencias:**
  - Gate de salida de Fase 7.
  - `TASK-F0-11`
  - `TASK-F0-12`
  - `TASK-F8-11`
- **Criterios de aceptación:**
  - Autoridad de plataforma conservada.
  - Toda acción sensible genera auditoría con actor, contexto, correlación, valores relevantes y resultado.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F8-13 — Implementar indicador sanitario versionado y explicación de factores

- **ID:** `TASK-F8-13`
- **Descripción:** Implementar indicador sanitario versionado y explicación de factores.
- **Objetivo:** Entregar eventos críticos dominan el estado sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/sanitary`
  - `/packages/database`
  - `/docs/modules/sanitary.md`
  - `/apps/api/src/modules/analytics/sanitary`
  - `/apps/private-web/src/features/sanitary/indicator`
  - `/docs/tasks/task-f8-13.md`
- **Dependencias:**
  - Gate de salida de Fase 7.
  - `TASK-F0-11`
  - `TASK-F0-12`
  - `TASK-F8-02`
  - `TASK-F8-06`
  - `TASK-F8-08`
- **Criterios de aceptación:**
  - Eventos críticos dominan el estado.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F8-14 — Implementar alertas, escalamiento y confirmación “Enterado”

- **ID:** `TASK-F8-14`
- **Descripción:** Implementar alertas, escalamiento y confirmación “Enterado”.
- **Objetivo:** Entregar persistencia hasta atención sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/sanitary`
  - `/packages/database`
  - `/docs/modules/sanitary.md`
  - `/apps/api/src/modules/notifications`
  - `/apps/private-web/src/features/notifications`
  - `/docs/tasks/task-f8-14.md`
- **Dependencias:**
  - Gate de salida de Fase 7.
  - `TASK-F0-11`
  - `TASK-F0-12`
  - `TASK-F8-09`
  - `TASK-F5-11`
  - `TASK-F5-13`
- **Criterios de aceptación:**
  - Persistencia hasta atención.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - La migración o cambio de datos incluye estrategia de compatibilidad, validación y reversión operativa; no elimina historial requerido.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F8-15 — Implementar UI de bitácoras, análisis, no conformidad y reactivación

- **ID:** `TASK-F8-15`
- **Descripción:** Implementar UI de bitácoras, análisis, no conformidad y reactivación.
- **Objetivo:** Entregar flujos responsive y accesibles sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/sanitary`
  - `/packages/database`
  - `/docs/modules/sanitary.md`
  - `/apps/api/src/modules/sanitary-control`
  - `/apps/private-web/src/features/sanitary/logbooks`
  - `/apps/api/src/modules/laboratory`
  - `/apps/private-web/src/features/sanitary/laboratory`
  - `/apps/api/src/modules/non-conformities`
  - `/apps/private-web/src/features/sanitary/non-conformities`
- **Dependencias:**
  - Gate de salida de Fase 7.
  - `TASK-F0-11`
  - `TASK-F0-12`
  - `TASK-F8-02`
  - `TASK-F8-06`
  - `TASK-F8-09`
  - `TASK-F8-11`
  - `TASK-F6-09`
- **Criterios de aceptación:**
  - Flujos responsive y accesibles.
  - Las transiciones validan estado previo, permiso, precondiciones, versión esperada y motivo cuando aplica.
  - La interfaz cubre carga, vacío, error, permiso denegado y modo lectura; funciona en los breakpoints definidos.
  - Los controles son navegables por teclado y cumplen el objetivo WCAG 2.2 AA aplicable.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - La pantalla o componente tiene estados completos, prueba de accesibilidad y evidencia responsive/visual en los dispositivos objetivo.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F8-16 — Implementar offline para bitácoras autorizadas

- **ID:** `TASK-F8-16`
- **Descripción:** Implementar offline para bitácoras autorizadas.
- **Objetivo:** Entregar captura local y sincronización con conflictos sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/sanitary`
  - `/packages/database`
  - `/docs/modules/sanitary.md`
  - `/apps/api/src/modules/sanitary-control`
  - `/apps/private-web/src/features/sanitary/logbooks`
  - `/packages/offline/src/sanitary`
  - `/apps/private-web/src/features/sanitary/offline`
  - `/docs/tasks/task-f8-16.md`
- **Dependencias:**
  - Gate de salida de Fase 7.
  - `TASK-F0-11`
  - `TASK-F0-12`
  - `TASK-F8-02`
  - `TASK-F7-09`
  - `TASK-F7-12`
- **Criterios de aceptación:**
  - Captura local y sincronización con conflictos.
  - Los reintentos no duplican efectos y los conflictos o fallos quedan visibles y recuperables.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - Se validaron pérdida de conexión, reintento, cierre de sesión, pérdida de permiso, conflicto y limpieza de datos locales.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F8-17 — Crear pruebas regulatorias, de publicación negativa y de aislamiento

- **ID:** `TASK-F8-17`
- **Descripción:** Crear pruebas regulatorias, de publicación negativa y de aislamiento.
- **Objetivo:** Entregar no conformes nunca publicados automáticamente sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/sanitary`
  - `/packages/database`
  - `/docs/modules/sanitary.md`
  - `/tests/e2e/sanitary`
  - `/docs/quality/sanitary-validation.md`
  - `/docs/tasks/task-f8-17.md`
- **Dependencias:**
  - Gate de salida de Fase 7.
  - `TASK-F0-11`
  - `TASK-F0-12`
  - `TASK-F8-08`
  - `TASK-F8-10`
  - `TASK-F8-12`
- **Criterios de aceptación:**
  - No conformes nunca publicados automáticamente.
  - Existen pruebas positivas y negativas que demuestran aislamiento entre cuentas, ámbitos y acciones.
  - Las transiciones validan estado previo, permiso, precondiciones, versión esperada y motivo cuando aplica.
  - El reporte registra escenarios, datos utilizados, resultados, defectos, severidad y criterio de aprobación.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

---

# Fase 9 — Inventario y ciclo de vida de componentes

**Objetivo de fase:** Controlar existencias, costos autorizados, lotes, consumos y componentes instalados/retirados vinculados con servicios y máquinas.

**Cantidad de tareas:** 12

## TASK-F9-01 — Implementar catálogo de productos, categorías, unidades, compatibilidades y proveedores

- **ID:** `TASK-F9-01`
- **Descripción:** Implementar catálogo de productos, categorías, unidades, compatibilidades y proveedores.
- **Objetivo:** Entregar catálogo inicial importable y versionado sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/inventory`
  - `/packages/database`
  - `/docs/modules/inventory.md`
  - `/apps/api/src/modules/inventory/catalog`
  - `/apps/private-web/src/features/inventory/catalog`
  - `/docs/tasks/task-f9-01.md`
- **Dependencias:**
  - Gate de salida de Fase 4.
  - `TASK-F7-03`
  - `TASK-F7-05`
- **Criterios de aceptación:**
  - Catálogo inicial importable y versionado.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F9-02 — Implementar ubicaciones de inventario general y por sucursal

- **ID:** `TASK-F9-02`
- **Descripción:** Implementar ubicaciones de inventario general y por sucursal.
- **Objetivo:** Entregar existencias separadas y autorizadas sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/inventory`
  - `/packages/database`
  - `/docs/modules/inventory.md`
  - `/apps/api/src/modules/inventory/locations`
  - `/apps/private-web/src/features/inventory/locations`
  - `/docs/tasks/task-f9-02.md`
- **Dependencias:**
  - Gate de salida de Fase 4.
  - `TASK-F7-03`
  - `TASK-F7-05`
  - `TASK-F9-01`
  - `TASK-F4-02`
- **Criterios de aceptación:**
  - Existencias separadas y autorizadas.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F9-03 — Implementar entradas, salidas, transferencias y ajustes

- **ID:** `TASK-F9-03`
- **Descripción:** Implementar entradas, salidas, transferencias y ajustes.
- **Objetivo:** Entregar ledger de movimientos sin edición destructiva sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/inventory`
  - `/packages/database`
  - `/docs/modules/inventory.md`
  - `/apps/api/src/modules/inventory/movements`
  - `/apps/private-web/src/features/inventory/movements`
  - `/docs/tasks/task-f9-03.md`
- **Dependencias:**
  - Gate de salida de Fase 4.
  - `TASK-F7-03`
  - `TASK-F7-05`
  - `TASK-F9-01`
  - `TASK-F9-02`
- **Criterios de aceptación:**
  - Ledger de movimientos sin edición destructiva.
  - Toda acción sensible genera auditoría con actor, contexto, correlación, valores relevantes y resultado.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F9-04 — Implementar lotes, caducidad, mínimo, máximo y costo

- **ID:** `TASK-F9-04`
- **Descripción:** Implementar lotes, caducidad, mínimo, máximo y costo.
- **Objetivo:** Entregar consultas y alertas básicas sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/inventory`
  - `/packages/database`
  - `/docs/modules/inventory.md`
  - `/apps/api/src/modules/inventory/movements`
  - `/apps/private-web/src/features/inventory/movements`
  - `/docs/tasks/task-f9-04.md`
- **Dependencias:**
  - Gate de salida de Fase 4.
  - `TASK-F7-03`
  - `TASK-F7-05`
  - `TASK-F9-01`
  - `TASK-F9-02`
- **Criterios de aceptación:**
  - Consultas y alertas básicas.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F9-05 — Integrar consumo desde orden de trabajo

- **ID:** `TASK-F9-05`
- **Descripción:** Integrar consumo desde orden de trabajo.
- **Objetivo:** Entregar descuento y trazabilidad hacia máquina/actividad sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/inventory`
  - `/packages/database`
  - `/docs/modules/inventory.md`
  - `/apps/api/src/modules/inventory/integrations/maintenance`
  - `/docs/tasks/task-f9-05.md`
- **Dependencias:**
  - Gate de salida de Fase 4.
  - `TASK-F7-03`
  - `TASK-F7-05`
  - `TASK-F9-03`
- **Criterios de aceptación:**
  - Descuento y trazabilidad hacia máquina/actividad.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F9-06 — Implementar instalación de componente

- **ID:** `TASK-F9-06`
- **Descripción:** Implementar instalación de componente.
- **Objetivo:** Entregar pieza sale de stock y comienza historial activo sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/inventory`
  - `/packages/database`
  - `/docs/modules/inventory.md`
  - `/apps/api/src/modules/components`
  - `/apps/private-web/src/features/components`
  - `/docs/tasks/task-f9-06.md`
- **Dependencias:**
  - Gate de salida de Fase 4.
  - `TASK-F7-03`
  - `TASK-F7-05`
  - `TASK-F9-03`
  - `TASK-F4-10`
- **Criterios de aceptación:**
  - Pieza sale de stock y comienza historial activo.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F9-07 — Implementar retiro, condición, evidencia y disposición

- **ID:** `TASK-F9-07`
- **Descripción:** Implementar retiro, condición, evidencia y disposición.
- **Objetivo:** Entregar historial de componente retirado sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/inventory`
  - `/packages/database`
  - `/docs/modules/inventory.md`
  - `/apps/api/src/modules/components`
  - `/apps/private-web/src/features/components`
  - `/docs/tasks/task-f9-07.md`
- **Dependencias:**
  - Gate de salida de Fase 4.
  - `TASK-F7-03`
  - `TASK-F7-05`
  - `TASK-F9-06`
- **Criterios de aceptación:**
  - Historial de componente retirado.
  - Las transiciones validan estado previo, permiso, precondiciones, versión esperada y motivo cuando aplica.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F9-08 — Generar próxima actividad relacionada al instalar componente

- **ID:** `TASK-F9-08`
- **Descripción:** Generar próxima actividad relacionada al instalar componente.
- **Objetivo:** Entregar calendario actualizado según plantilla sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/inventory`
  - `/packages/database`
  - `/docs/modules/inventory.md`
  - `/apps/api/src/modules/components`
  - `/apps/private-web/src/features/components`
  - `/docs/tasks/task-f9-08.md`
- **Dependencias:**
  - Gate de salida de Fase 4.
  - `TASK-F7-03`
  - `TASK-F7-05`
  - `TASK-F9-06`
  - `TASK-F4-06`
- **Criterios de aceptación:**
  - Calendario actualizado según plantilla.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F9-09 — Implementar solicitud de refacciones y folio

- **ID:** `TASK-F9-09`
- **Descripción:** Implementar solicitud de refacciones y folio.
- **Objetivo:** Entregar carrito y mensaje WhatsApp prellenado, sin pago interno sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/inventory`
  - `/packages/database`
  - `/docs/modules/inventory.md`
  - `/apps/api/src/modules/parts-requests`
  - `/apps/private-web/src/features/parts-requests`
  - `/docs/tasks/task-f9-09.md`
- **Dependencias:**
  - Gate de salida de Fase 4.
  - `TASK-F7-03`
  - `TASK-F7-05`
  - `TASK-F9-01`
  - `TASK-F4-10`
- **Criterios de aceptación:**
  - Carrito y mensaje WhatsApp prellenado, sin pago interno.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F9-10 — Implementar permisos de costos, proveedores y ajustes

- **ID:** `TASK-F9-10`
- **Descripción:** Implementar permisos de costos, proveedores y ajustes.
- **Objetivo:** Entregar técnico ve solo información autorizada sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/inventory`
  - `/packages/database`
  - `/docs/modules/inventory.md`
  - `/apps/api/src/modules/inventory/catalog`
  - `/apps/private-web/src/features/inventory/catalog`
  - `/apps/api/src/modules/inventory/movements`
  - `/apps/private-web/src/features/inventory/movements`
  - `/docs/tasks/task-f9-10.md`
- **Dependencias:**
  - Gate de salida de Fase 4.
  - `TASK-F7-03`
  - `TASK-F7-05`
  - `TASK-F3-07`
  - `TASK-F9-03`
  - `TASK-F9-04`
- **Criterios de aceptación:**
  - Técnico ve solo información autorizada.
  - Existen pruebas positivas y negativas que demuestran aislamiento entre cuentas, ámbitos y acciones.
  - Toda acción sensible genera auditoría con actor, contexto, correlación, valores relevantes y resultado.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F9-11 — Implementar UI de almacenes, movimientos, faltantes y componentes

- **ID:** `TASK-F9-11`
- **Descripción:** Implementar UI de almacenes, movimientos, faltantes y componentes.
- **Objetivo:** Entregar desktop y móvil sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/inventory`
  - `/packages/database`
  - `/docs/modules/inventory.md`
  - `/apps/api/src/modules/components`
  - `/apps/private-web/src/features/components`
  - `/apps/private-web/src/features/inventory`
  - `/docs/tasks/task-f9-11.md`
- **Dependencias:**
  - Gate de salida de Fase 4.
  - `TASK-F7-03`
  - `TASK-F7-05`
  - `TASK-F9-02`
  - `TASK-F9-03`
  - `TASK-F9-04`
  - `TASK-F9-06`
  - `TASK-F6-09`
- **Criterios de aceptación:**
  - Desktop y móvil.
  - La interfaz cubre carga, vacío, error, permiso denegado y modo lectura; funciona en los breakpoints definidos.
  - Los controles son navegables por teclado y cumplen el objetivo WCAG 2.2 AA aplicable.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - La pantalla o componente tiene estados completos, prueba de accesibilidad y evidencia responsive/visual en los dispositivos objetivo.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F9-12 — Crear pruebas de consistencia, concurrencia y saldos negativos

- **ID:** `TASK-F9-12`
- **Descripción:** Crear pruebas de consistencia, concurrencia y saldos negativos.
- **Objetivo:** Entregar inventario no queda inválido por carreras sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/inventory`
  - `/packages/database`
  - `/docs/modules/inventory.md`
  - `/tests/e2e/inventory`
  - `/docs/tasks/task-f9-12.md`
- **Dependencias:**
  - Gate de salida de Fase 4.
  - `TASK-F7-03`
  - `TASK-F7-05`
  - `TASK-F9-03`
  - `TASK-F9-05`
  - `TASK-F9-06`
  - `TASK-F9-07`
- **Criterios de aceptación:**
  - Inventario no queda inválido por carreras.
  - El reporte registra escenarios, datos utilizados, resultados, defectos, severidad y criterio de aprobación.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

---

# Fase 10 — Documentos, reportes, PDF, portal público y QR

**Objetivo de fase:** Transformar registros y archivos en documentos versionados, reportes consistentes y publicación pública protegida.

**Cantidad de tareas:** 18

## TASK-F10-01 — Implementar registros documentales, metadatos, versiones y estados duales

- **ID:** `TASK-F10-01`
- **Descripción:** Implementar registros documentales, metadatos, versiones y estados duales.
- **Objetivo:** Entregar expediente documental privado sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/documents`
  - `/packages/contracts/src/public`
  - `/packages/database`
  - `/docs/modules/documents-reports.md`
  - `/apps/api/src/modules/documents`
  - `/apps/private-web/src/features/documents`
  - `/docs/tasks/task-f10-01.md`
- **Dependencias:**
  - Gate de salida de Fase 5.
  - Gate de salida de Fase 8.
  - Gate de salida de Fase 9.
  - Gate de salida de Fase 6.
- **Criterios de aceptación:**
  - Expediente documental privado.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - La migración o cambio de datos incluye estrategia de compatibilidad, validación y reversión operativa; no elimina historial requerido.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F10-02 — Implementar corrección, sustitución, anulación y retiro sin borrar versiones

- **ID:** `TASK-F10-02`
- **Descripción:** Implementar corrección, sustitución, anulación y retiro sin borrar versiones.
- **Objetivo:** Entregar historia completa sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/documents`
  - `/packages/contracts/src/public`
  - `/packages/database`
  - `/docs/modules/documents-reports.md`
  - `/apps/api/src/modules/documents`
  - `/apps/private-web/src/features/documents`
  - `/apps/api/src/modules/publication`
  - `/apps/public-portal`
  - `/apps/private-web/src/features/publication`
- **Dependencias:**
  - Gate de salida de Fase 5.
  - Gate de salida de Fase 8.
  - Gate de salida de Fase 9.
  - Gate de salida de Fase 6.
  - `TASK-F10-01`
- **Criterios de aceptación:**
  - Historia completa.
  - Las transiciones validan estado previo, permiso, precondiciones, versión esperada y motivo cuando aplica.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F10-03 — Implementar generación de versión pública anonimizada

- **ID:** `TASK-F10-03`
- **Descripción:** Implementar generación de versión pública anonimizada.
- **Objetivo:** Entregar datos sensibles eliminados según política sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/documents`
  - `/packages/contracts/src/public`
  - `/packages/database`
  - `/docs/modules/documents-reports.md`
  - `/apps/api/src/modules/publication`
  - `/apps/public-portal`
  - `/apps/private-web/src/features/publication`
  - `/docs/tasks/task-f10-03.md`
- **Dependencias:**
  - Gate de salida de Fase 5.
  - Gate de salida de Fase 8.
  - Gate de salida de Fase 9.
  - Gate de salida de Fase 6.
  - `TASK-F10-01`
  - `TASK-F10-02`
  - `TASK-F0-12`
- **Criterios de aceptación:**
  - Datos sensibles eliminados según política.
  - Toda acción sensible genera auditoría con actor, contexto, correlación, valores relevantes y resultado.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - La migración o cambio de datos incluye estrategia de compatibilidad, validación y reversión operativa; no elimina historial requerido.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F10-04 — Implementar permisos de descarga original, con o sin marca de agua

- **ID:** `TASK-F10-04`
- **Descripción:** Implementar permisos de descarga original, con o sin marca de agua.
- **Objetivo:** Entregar acceso por tipo de documento sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/documents`
  - `/packages/contracts/src/public`
  - `/packages/database`
  - `/docs/modules/documents-reports.md`
  - `/apps/api/src/modules/documents/downloads`
  - `/apps/pdf-worker/src/watermark`
  - `/docs/tasks/task-f10-04.md`
- **Dependencias:**
  - Gate de salida de Fase 5.
  - Gate de salida de Fase 8.
  - Gate de salida de Fase 9.
  - Gate de salida de Fase 6.
  - `TASK-F10-01`
  - `TASK-F5-10`
  - `TASK-F3-07`
- **Criterios de aceptación:**
  - Acceso por tipo de documento.
  - Existen pruebas positivas y negativas que demuestran aislamiento entre cuentas, ámbitos y acciones.
  - Toda acción sensible genera auditoría con actor, contexto, correlación, valores relevantes y resultado.
  - Los archivos permanecen privados, validados y vinculados mediante metadatos; no existen URLs públicas permanentes.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - Se validaron límites, tipo, integridad, privacidad, manejo de malware/fallo y eliminación temporal de derivados cuando corresponda.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F10-05 — Implementar plantillas de reporte predeterminadas

- **ID:** `TASK-F10-05`
- **Descripción:** Implementar plantillas de reporte predeterminadas.
- **Objetivo:** Entregar máquina, mantenimiento, sanidad, laboratorio, inventario y cuenta sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/documents`
  - `/packages/contracts/src/public`
  - `/packages/database`
  - `/docs/modules/documents-reports.md`
  - `/apps/api/src/modules/reports`
  - `/apps/private-web/src/features/reports`
  - `/docs/tasks/task-f10-05.md`
- **Dependencias:**
  - Gate de salida de Fase 5.
  - Gate de salida de Fase 8.
  - Gate de salida de Fase 9.
  - Gate de salida de Fase 6.
  - `TASK-F10-01`
  - Datos de Fases 7–9
- **Criterios de aceptación:**
  - Máquina, mantenimiento, sanidad, laboratorio, inventario y cuenta.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F10-06 — Implementar configuración de reportes personalizados dentro del alcance aprobado

- **ID:** `TASK-F10-06`
- **Descripción:** Implementar configuración de reportes personalizados dentro del alcance aprobado.
- **Objetivo:** Entregar periodo, secciones, anexos y privacidad sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/documents`
  - `/packages/contracts/src/public`
  - `/packages/database`
  - `/docs/modules/documents-reports.md`
  - `/apps/api/src/modules/reports`
  - `/apps/private-web/src/features/reports`
  - `/docs/tasks/task-f10-06.md`
- **Dependencias:**
  - Gate de salida de Fase 5.
  - Gate de salida de Fase 8.
  - Gate de salida de Fase 9.
  - Gate de salida de Fase 6.
  - `TASK-F10-05`
- **Criterios de aceptación:**
  - Periodo, secciones, anexos y privacidad.
  - Existen pruebas positivas y negativas que demuestran aislamiento entre cuentas, ámbitos y acciones.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F10-07 — Implementar fuente HTML única para vista previa y PDF

- **ID:** `TASK-F10-07`
- **Descripción:** Implementar fuente HTML única para vista previa y PDF.
- **Objetivo:** Entregar contenido equivalente sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/documents`
  - `/packages/contracts/src/public`
  - `/packages/database`
  - `/docs/modules/documents-reports.md`
  - `/apps/api/src/modules/reports`
  - `/apps/private-web/src/features/reports`
  - `/docs/tasks/task-f10-07.md`
- **Dependencias:**
  - Gate de salida de Fase 5.
  - Gate de salida de Fase 8.
  - Gate de salida de Fase 9.
  - Gate de salida de Fase 6.
  - `TASK-F10-05`
  - `TASK-F10-06`
- **Criterios de aceptación:**
  - Contenido equivalente.
  - Los archivos permanecen privados, validados y vinculados mediante metadatos; no existen URLs públicas permanentes.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - Se validaron límites, tipo, integridad, privacidad, manejo de malware/fallo y eliminación temporal de derivados cuando corresponda.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F10-08 — Implementar PDF worker aislado, límites, reintentos y optimización

- **ID:** `TASK-F10-08`
- **Descripción:** Implementar PDF worker aislado, límites, reintentos y optimización.
- **Objetivo:** Entregar generación asíncrona observable sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/documents`
  - `/packages/contracts/src/public`
  - `/packages/database`
  - `/docs/modules/documents-reports.md`
  - `/apps/pdf-worker`
  - `/docs/runbooks/pdf.md`
  - `/docs/tasks/task-f10-08.md`
- **Dependencias:**
  - Gate de salida de Fase 5.
  - Gate de salida de Fase 8.
  - Gate de salida de Fase 9.
  - Gate de salida de Fase 6.
  - `TASK-F10-07`
  - `TASK-F2-05`
- **Criterios de aceptación:**
  - Generación asíncrona observable.
  - Los reintentos no duplican efectos y los conflictos o fallos quedan visibles y recuperables.
  - Los archivos permanecen privados, validados y vinculados mediante metadatos; no existen URLs públicas permanentes.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - Se validaron límites, tipo, integridad, privacidad, manejo de malware/fallo y eliminación temporal de derivados cuando corresponda.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F10-09 — Implementar reportes programados y envío a usuarios registrados

- **ID:** `TASK-F10-09`
- **Descripción:** Implementar reportes programados y envío a usuarios registrados.
- **Objetivo:** Entregar frecuencia y destinatarios auditados sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/documents`
  - `/packages/contracts/src/public`
  - `/packages/database`
  - `/docs/modules/documents-reports.md`
  - `/apps/worker/src/processors/reports`
  - `/apps/api/src/modules/reports/schedules`
  - `/docs/tasks/task-f10-09.md`
- **Dependencias:**
  - Gate de salida de Fase 5.
  - Gate de salida de Fase 8.
  - Gate de salida de Fase 9.
  - Gate de salida de Fase 6.
  - `TASK-F10-08`
  - `TASK-F5-12`
  - `TASK-F5-13`
- **Criterios de aceptación:**
  - Frecuencia y destinatarios auditados.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F10-10 — Implementar exportación completa por el propietario

- **ID:** `TASK-F10-10`
- **Descripción:** Implementar exportación completa por el propietario.
- **Objetivo:** Entregar paquete disponible siete días y descargas registradas sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/documents`
  - `/packages/contracts/src/public`
  - `/packages/database`
  - `/docs/modules/documents-reports.md`
  - `/apps/api/src/modules/exports`
  - `/apps/worker/src/processors/exports`
  - `/apps/private-web/src/features/exports`
  - `/docs/tasks/task-f10-10.md`
- **Dependencias:**
  - Gate de salida de Fase 5.
  - Gate de salida de Fase 8.
  - Gate de salida de Fase 9.
  - Gate de salida de Fase 6.
  - `TASK-F10-01`
  - `TASK-F10-08`
  - `TASK-F5-07`
- **Criterios de aceptación:**
  - Paquete disponible siete días y descargas registradas.
  - Toda acción sensible genera auditoría con actor, contexto, correlación, valores relevantes y resultado.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F10-11 — Implementar proyección pública por máquina

- **ID:** `TASK-F10-11`
- **Descripción:** Implementar proyección pública por máquina.
- **Objetivo:** Entregar solo datos deliberadamente publicados sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/documents`
  - `/packages/contracts/src/public`
  - `/packages/database`
  - `/docs/modules/documents-reports.md`
  - `/docs/tasks/task-f10-11.md`
- **Dependencias:**
  - Gate de salida de Fase 5.
  - Gate de salida de Fase 8.
  - Gate de salida de Fase 9.
  - Gate de salida de Fase 6.
  - `TASK-F10-01`
  - `TASK-F10-03`
  - `TASK-F4-10`
- **Criterios de aceptación:**
  - Solo datos deliberadamente publicados.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - La migración o cambio de datos incluye estrategia de compatibilidad, validación y reversión operativa; no elimina historial requerido.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F10-12 — Implementar publicación, retiro y sustitución con auditoría

- **ID:** `TASK-F10-12`
- **Descripción:** Implementar publicación, retiro y sustitución con auditoría.
- **Objetivo:** Entregar estado privado separado de publicación sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/documents`
  - `/packages/contracts/src/public`
  - `/packages/database`
  - `/docs/modules/documents-reports.md`
  - `/apps/api/src/modules/documents`
  - `/apps/private-web/src/features/documents`
  - `/apps/api/src/modules/publication`
  - `/apps/public-portal`
  - `/apps/private-web/src/features/publication`
- **Dependencias:**
  - Gate de salida de Fase 5.
  - Gate de salida de Fase 8.
  - Gate de salida de Fase 9.
  - Gate de salida de Fase 6.
  - `TASK-F10-11`
  - `TASK-F5-04`
- **Criterios de aceptación:**
  - Estado privado separado de publicación.
  - Las transiciones validan estado previo, permiso, precondiciones, versión esperada y motivo cuando aplica.
  - Toda acción sensible genera auditoría con actor, contexto, correlación, valores relevantes y resultado.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F10-13 — Implementar portal público separado y responsive

- **ID:** `TASK-F10-13`
- **Descripción:** Implementar portal público separado y responsive.
- **Objetivo:** Entregar técnico y sanitario en una rama pública sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/documents`
  - `/packages/contracts/src/public`
  - `/packages/database`
  - `/docs/modules/documents-reports.md`
  - `/apps/public-portal`
  - `/apps/api/src/modules/public-portal`
  - `/apps/api/src/modules/qr`
  - `/docs/tasks/task-f10-13.md`
- **Dependencias:**
  - Gate de salida de Fase 5.
  - Gate de salida de Fase 8.
  - Gate de salida de Fase 9.
  - Gate de salida de Fase 6.
  - `TASK-F10-11`
  - `TASK-F2-11`
- **Criterios de aceptación:**
  - Técnico y sanitario en una rama pública.
  - La interfaz cubre carga, vacío, error, permiso denegado y modo lectura; funciona en los breakpoints definidos.
  - Los controles son navegables por teclado y cumplen el objetivo WCAG 2.2 AA aplicable.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - La pantalla o componente tiene estados completos, prueba de accesibilidad y evidencia responsive/visual en los dispositivos objetivo.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F10-14 — Implementar códigos QR permanentes y etiquetas lógicas

- **ID:** `TASK-F10-14`
- **Descripción:** Implementar códigos QR permanentes y etiquetas lógicas.
- **Objetivo:** Entregar qR válido tras traslado o transferencia sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/documents`
  - `/packages/contracts/src/public`
  - `/packages/database`
  - `/docs/modules/documents-reports.md`
  - `/apps/public-portal`
  - `/apps/api/src/modules/public-portal`
  - `/apps/api/src/modules/qr`
  - `/docs/tasks/task-f10-14.md`
- **Dependencias:**
  - Gate de salida de Fase 5.
  - Gate de salida de Fase 8.
  - Gate de salida de Fase 9.
  - Gate de salida de Fase 6.
  - `TASK-F4-09`
  - `TASK-F10-13`
- **Criterios de aceptación:**
  - QR válido tras traslado o transferencia.
  - Toda acción sensible genera auditoría con actor, contexto, correlación, valores relevantes y resultado.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F10-15 — Implementar folio, hash/verificación y marca de agua

- **ID:** `TASK-F10-15`
- **Descripción:** Implementar folio, hash/verificación y marca de agua.
- **Objetivo:** Entregar autenticidad comprobable sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/documents`
  - `/packages/contracts/src/public`
  - `/packages/database`
  - `/docs/modules/documents-reports.md`
  - `/apps/api/src/modules/documents/downloads`
  - `/apps/pdf-worker/src/watermark`
  - `/packages/domain/src/documents`
  - `/apps/api/src/modules/document-verification`
  - `/docs/tasks/task-f10-15.md`
- **Dependencias:**
  - Gate de salida de Fase 5.
  - Gate de salida de Fase 8.
  - Gate de salida de Fase 9.
  - Gate de salida de Fase 6.
  - `TASK-F10-03`
  - `TASK-F10-07`
- **Criterios de aceptación:**
  - Autenticidad comprobable.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F10-16 — Implementar analítica pública mínima: escaneo, página y descarga

- **ID:** `TASK-F10-16`
- **Descripción:** Implementar analítica pública mínima: escaneo, página y descarga.
- **Objetivo:** Entregar eventos agregables y legalmente permitidos sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/documents`
  - `/packages/contracts/src/public`
  - `/packages/database`
  - `/docs/modules/documents-reports.md`
  - `/apps/public-portal`
  - `/apps/api/src/modules/public-portal`
  - `/apps/api/src/modules/qr`
  - `/docs/tasks/task-f10-16.md`
- **Dependencias:**
  - Gate de salida de Fase 5.
  - Gate de salida de Fase 8.
  - Gate de salida de Fase 9.
  - Gate de salida de Fase 6.
  - `TASK-F10-13`
  - `TASK-F5-04`
- **Criterios de aceptación:**
  - Eventos agregables y legalmente permitidos.
  - Toda acción sensible genera auditoría con actor, contexto, correlación, valores relevantes y resultado.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F10-17 — Implementar UI de documentos, constructor, preview, publicaciones y portal

- **ID:** `TASK-F10-17`
- **Descripción:** Implementar UI de documentos, constructor, preview, publicaciones y portal.
- **Objetivo:** Entregar flujos de UI/UX completos sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/documents`
  - `/packages/contracts/src/public`
  - `/packages/database`
  - `/docs/modules/documents-reports.md`
  - `/docs/tasks/task-f10-17.md`
- **Dependencias:**
  - Gate de salida de Fase 5.
  - Gate de salida de Fase 8.
  - Gate de salida de Fase 9.
  - Gate de salida de Fase 6.
  - `TASK-F10-01`
  - `TASK-F10-06`
  - `TASK-F10-07`
  - `TASK-F10-12`
  - `TASK-F6-09`
- **Criterios de aceptación:**
  - Flujos de UI/UX completos.
  - La interfaz cubre carga, vacío, error, permiso denegado y modo lectura; funciona en los breakpoints definidos.
  - Los controles son navegables por teclado y cumplen el objetivo WCAG 2.2 AA aplicable.
  - Los archivos permanecen privados, validados y vinculados mediante metadatos; no existen URLs públicas permanentes.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - La pantalla o componente tiene estados completos, prueba de accesibilidad y evidencia responsive/visual en los dispositivos objetivo.
  - Se validaron límites, tipo, integridad, privacidad, manejo de malware/fallo y eliminación temporal de derivados cuando corresponda.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F10-18 — Ejecutar pruebas de privacidad, PDF, enlaces temporales y contenido retirado

- **ID:** `TASK-F10-18`
- **Descripción:** Ejecutar pruebas de privacidad, PDF, enlaces temporales y contenido retirado.
- **Objetivo:** Entregar evidencia de no filtración sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/documents`
  - `/packages/contracts/src/public`
  - `/packages/database`
  - `/docs/modules/documents-reports.md`
  - `/tests/e2e/publication`
  - `/tests/e2e/reports`
  - `/docs/tasks/task-f10-18.md`
- **Dependencias:**
  - Gate de salida de Fase 5.
  - Gate de salida de Fase 8.
  - Gate de salida de Fase 9.
  - Gate de salida de Fase 6.
  - `TASK-F10-03`
  - `TASK-F10-04`
  - `TASK-F10-08`
  - `TASK-F10-12`
  - `TASK-F10-13`
- **Criterios de aceptación:**
  - Evidencia de no filtración.
  - Existen pruebas positivas y negativas que demuestran aislamiento entre cuentas, ámbitos y acciones.
  - Los archivos permanecen privados, validados y vinculados mediante metadatos; no existen URLs públicas permanentes.
  - El reporte registra escenarios, datos utilizados, resultados, defectos, severidad y criterio de aprobación.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - Se validaron límites, tipo, integridad, privacidad, manejo de malware/fallo y eliminación temporal de derivados cuando corresponda.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

---

# Fase 11 — Ventas Excel, tarjetas y movimientos administrativos

**Objetivo de fase:** Importar ventas de la aplicación de máquina y documentar tarjetas físicas sin presentar datos administrativos como saldo real.

**Cantidad de tareas:** 13

## TASK-F11-01 — Definir adaptador versionado por formato Excel real

- **ID:** `TASK-F11-01`
- **Descripción:** Definir adaptador versionado por formato Excel real.
- **Objetivo:** Dejar resuelto el alcance de “Definir adaptador versionado por formato Excel real” con una salida verificable: esquema, columnas y reglas por versión.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/commercial`
  - `/packages/database`
  - `/docs/modules/sales-cards.md`
  - `/apps/api/src/modules/sales-imports`
  - `/apps/worker/src/processors/sales-imports`
  - `/apps/private-web/src/features/sales-imports`
  - `/packages/contracts/src/formats/excel`
  - `/docs/tasks/task-f11-01.md`
- **Dependencias:**
  - Gate de salida de Fase 5.
  - Gate de salida de Fase 10.
  - `TASK-F0-10`
- **Criterios de aceptación:**
  - Esquema, columnas y reglas por versión.
  - Los archivos permanecen privados, validados y vinculados mediante metadatos; no existen URLs públicas permanentes.
  - La decisión o insumo incluye responsable, fecha, alcance, alternativas descartadas y consecuencias para documentos afectados.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - El artefacto de decisión o catálogo está versionado en `/docs`, enlazado desde el índice correspondiente y no contiene decisiones materiales implícitas.
  - Los documentos derivados afectados fueron actualizados o se creó una lista explícita de cambios pendientes.
  - El responsable humano indicado en la matriz RACI aprobó la salida cuando la decisión es de negocio, seguridad, sanidad, privacidad o costo.
  - Se validaron límites, tipo, integridad, privacidad, manejo de malware/fallo y eliminación temporal de derivados cuando corresponda.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F11-02 — Implementar carga y validación de archivo

- **ID:** `TASK-F11-02`
- **Descripción:** Implementar carga y validación de archivo.
- **Objetivo:** Entregar formato, columnas, periodo y máquina comprobados sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/commercial`
  - `/packages/database`
  - `/docs/modules/sales-cards.md`
  - `/docs/tasks/task-f11-02.md`
- **Dependencias:**
  - Gate de salida de Fase 5.
  - Gate de salida de Fase 10.
  - `TASK-F0-10`
  - `TASK-F11-01`
  - `TASK-F5-08`
- **Criterios de aceptación:**
  - Formato, columnas, periodo y máquina comprobados.
  - Los archivos permanecen privados, validados y vinculados mediante metadatos; no existen URLs públicas permanentes.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - Se validaron límites, tipo, integridad, privacidad, manejo de malware/fallo y eliminación temporal de derivados cuando corresponda.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F11-03 — Implementar parser en worker y almacenamiento del original

- **ID:** `TASK-F11-03`
- **Descripción:** Implementar parser en worker y almacenamiento del original.
- **Objetivo:** Entregar resultado reproducible sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/commercial`
  - `/packages/database`
  - `/docs/modules/sales-cards.md`
  - `/apps/api/src/modules/sales-imports`
  - `/apps/worker/src/processors/sales-imports`
  - `/apps/private-web/src/features/sales-imports`
  - `/packages/contracts/src/formats/excel`
  - `/docs/tasks/task-f11-03.md`
- **Dependencias:**
  - Gate de salida de Fase 5.
  - Gate de salida de Fase 10.
  - `TASK-F0-10`
  - `TASK-F11-01`
  - `TASK-F11-02`
  - `TASK-F5-06`
- **Criterios de aceptación:**
  - Resultado reproducible.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F11-04 — Implementar vista previa con nuevos, duplicados y errores

- **ID:** `TASK-F11-04`
- **Descripción:** Implementar vista previa con nuevos, duplicados y errores.
- **Objetivo:** Entregar confirmación antes de persistir ventas sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/commercial`
  - `/packages/database`
  - `/docs/modules/sales-cards.md`
  - `/apps/api/src/modules/sales`
  - `/apps/private-web/src/features/sales`
  - `/docs/tasks/task-f11-04.md`
- **Dependencias:**
  - Gate de salida de Fase 5.
  - Gate de salida de Fase 10.
  - `TASK-F0-10`
  - `TASK-F11-03`
- **Criterios de aceptación:**
  - Confirmación antes de persistir ventas.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - La migración o cambio de datos incluye estrategia de compatibilidad, validación y reversión operativa; no elimina historial requerido.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F11-05 — Implementar deduplicación por transacción o llave compuesta aprobada

- **ID:** `TASK-F11-05`
- **Descripción:** Implementar deduplicación por transacción o llave compuesta aprobada.
- **Objetivo:** Entregar reimportación no duplica ingresos sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/commercial`
  - `/packages/database`
  - `/docs/modules/sales-cards.md`
  - `/apps/api/src/modules/sales-imports`
  - `/apps/worker/src/processors/sales-imports`
  - `/apps/private-web/src/features/sales-imports`
  - `/packages/contracts/src/formats/excel`
  - `/apps/api/src/modules/sales`
  - `/apps/private-web/src/features/sales`
- **Dependencias:**
  - Gate de salida de Fase 5.
  - Gate de salida de Fase 10.
  - `TASK-F0-10`
  - `TASK-F11-01`
  - `TASK-F11-03`
- **Criterios de aceptación:**
  - Reimportación no duplica ingresos.
  - Los reintentos no duplican efectos y los conflictos o fallos quedan visibles y recuperables.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F11-06 — Implementar confirmación y anulación de importación

- **ID:** `TASK-F11-06`
- **Descripción:** Implementar confirmación y anulación de importación.
- **Objetivo:** Entregar datos retirados de paneles, historial conservado sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/commercial`
  - `/packages/database`
  - `/docs/modules/sales-cards.md`
  - `/apps/api/src/modules/sales-imports`
  - `/apps/worker/src/processors/sales-imports`
  - `/apps/private-web/src/features/sales-imports`
  - `/packages/contracts/src/formats/excel`
  - `/docs/tasks/task-f11-06.md`
- **Dependencias:**
  - Gate de salida de Fase 5.
  - Gate de salida de Fase 10.
  - `TASK-F0-10`
  - `TASK-F11-04`
  - `TASK-F11-05`
- **Criterios de aceptación:**
  - Datos retirados de paneles, historial conservado.
  - Las transiciones validan estado previo, permiso, precondiciones, versión esperada y motivo cuando aplica.
  - Los reintentos no duplican efectos y los conflictos o fallos quedan visibles y recuperables.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - La migración o cambio de datos incluye estrategia de compatibilidad, validación y reversión operativa; no elimina historial requerido.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F11-07 — Implementar agregaciones iniciales por día, hora, producto, máquina y método

- **ID:** `TASK-F11-07`
- **Descripción:** Implementar agregaciones iniciales por día, hora, producto, máquina y método.
- **Objetivo:** Entregar consultas y reportes básicos sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/commercial`
  - `/packages/database`
  - `/docs/modules/sales-cards.md`
  - `/apps/api/src/modules/sales`
  - `/apps/private-web/src/features/sales`
  - `/docs/tasks/task-f11-07.md`
- **Dependencias:**
  - Gate de salida de Fase 5.
  - Gate de salida de Fase 10.
  - `TASK-F0-10`
  - `TASK-F11-06`
- **Criterios de aceptación:**
  - Consultas y reportes básicos.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F11-08 — Implementar tarjetas, folio, máquina exclusiva y titular histórico

- **ID:** `TASK-F11-08`
- **Descripción:** Implementar tarjetas, folio, máquina exclusiva y titular histórico.
- **Objetivo:** Entregar una tarjeta no opera en dos máquinas sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/commercial`
  - `/packages/database`
  - `/docs/modules/sales-cards.md`
  - `/apps/api/src/modules/cards`
  - `/apps/api/src/modules/administrative-ledger`
  - `/apps/private-web/src/features/cards`
  - `/docs/tasks/task-f11-08.md`
- **Dependencias:**
  - Gate de salida de Fase 5.
  - Gate de salida de Fase 10.
  - `TASK-F0-10`
  - `TASK-F4-10`
- **Criterios de aceptación:**
  - Una tarjeta no opera en dos máquinas.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F11-09 — Implementar recarga, retiro, bonificación, transferencia y reasignación

- **ID:** `TASK-F11-09`
- **Descripción:** Implementar recarga, retiro, bonificación, transferencia y reasignación.
- **Objetivo:** Entregar ledger administrativo auditado sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/commercial`
  - `/packages/database`
  - `/docs/modules/sales-cards.md`
  - `/apps/api/src/modules/cards`
  - `/apps/api/src/modules/administrative-ledger`
  - `/apps/private-web/src/features/cards`
  - `/docs/tasks/task-f11-09.md`
- **Dependencias:**
  - Gate de salida de Fase 5.
  - Gate de salida de Fase 10.
  - `TASK-F0-10`
  - `TASK-F11-08`
  - `TASK-F5-04`
- **Criterios de aceptación:**
  - Ledger administrativo auditado.
  - Las transiciones validan estado previo, permiso, precondiciones, versión esperada y motivo cuando aplica.
  - Toda acción sensible genera auditoría con actor, contexto, correlación, valores relevantes y resultado.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F11-10 — Implementar equivalencias y advertencia de estimación

- **ID:** `TASK-F11-10`
- **Descripción:** Implementar equivalencias y advertencia de estimación.
- **Objetivo:** Entregar nunca se etiqueta como saldo real sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/commercial`
  - `/packages/database`
  - `/docs/modules/sales-cards.md`
  - `/apps/api/src/modules/cards`
  - `/apps/api/src/modules/administrative-ledger`
  - `/apps/private-web/src/features/cards`
  - `/docs/tasks/task-f11-10.md`
- **Dependencias:**
  - Gate de salida de Fase 5.
  - Gate de salida de Fase 10.
  - `TASK-F0-10`
  - `TASK-F11-09`
- **Criterios de aceptación:**
  - Nunca se etiqueta como saldo real.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F11-11 — Implementar permisos financieros y privacidad

- **ID:** `TASK-F11-11`
- **Descripción:** Implementar permisos financieros y privacidad.
- **Objetivo:** Entregar datos visibles solo para perfiles autorizados sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/commercial`
  - `/packages/database`
  - `/docs/modules/sales-cards.md`
  - `/packages/authorization/src/policies/financial`
  - `/docs/tasks/task-f11-11.md`
- **Dependencias:**
  - Gate de salida de Fase 5.
  - Gate de salida de Fase 10.
  - `TASK-F0-10`
  - `TASK-F3-07`
  - `TASK-F11-07`
  - `TASK-F11-09`
- **Criterios de aceptación:**
  - Datos visibles solo para perfiles autorizados.
  - Existen pruebas positivas y negativas que demuestran aislamiento entre cuentas, ámbitos y acciones.
  - Toda acción sensible genera auditoría con actor, contexto, correlación, valores relevantes y resultado.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - La migración o cambio de datos incluye estrategia de compatibilidad, validación y reversión operativa; no elimina historial requerido.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F11-12 — Implementar UI de importación, errores, ventas, tarjetas y movimientos

- **ID:** `TASK-F11-12`
- **Descripción:** Implementar UI de importación, errores, ventas, tarjetas y movimientos.
- **Objetivo:** Entregar flujos completos y responsive sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/commercial`
  - `/packages/database`
  - `/docs/modules/sales-cards.md`
  - `/apps/api/src/modules/sales-imports`
  - `/apps/worker/src/processors/sales-imports`
  - `/apps/private-web/src/features/sales-imports`
  - `/packages/contracts/src/formats/excel`
  - `/apps/api/src/modules/sales`
  - `/apps/private-web/src/features/sales`
- **Dependencias:**
  - Gate de salida de Fase 5.
  - Gate de salida de Fase 10.
  - `TASK-F0-10`
  - `TASK-F11-04`
  - `TASK-F11-07`
  - `TASK-F11-08`
  - `TASK-F11-09`
  - `TASK-F6-09`
- **Criterios de aceptación:**
  - Flujos completos y responsive.
  - Los reintentos no duplican efectos y los conflictos o fallos quedan visibles y recuperables.
  - La interfaz cubre carga, vacío, error, permiso denegado y modo lectura; funciona en los breakpoints definidos.
  - Los controles son navegables por teclado y cumplen el objetivo WCAG 2.2 AA aplicable.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - La pantalla o componente tiene estados completos, prueba de accesibilidad y evidencia responsive/visual en los dispositivos objetivo.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F11-13 — Crear pruebas con muestras reales, duplicados, zonas horarias y anulaciones

- **ID:** `TASK-F11-13`
- **Descripción:** Crear pruebas con muestras reales, duplicados, zonas horarias y anulaciones.
- **Objetivo:** Entregar adaptadores validados sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/commercial`
  - `/packages/database`
  - `/docs/modules/sales-cards.md`
  - `/tests/fixtures/excel`
  - `/tests/e2e/sales-imports`
  - `/docs/tasks/task-f11-13.md`
- **Dependencias:**
  - Gate de salida de Fase 5.
  - Gate de salida de Fase 10.
  - `TASK-F0-10`
  - `TASK-F11-03`
  - `TASK-F11-05`
  - `TASK-F11-06`
  - `TASK-F11-09`
- **Criterios de aceptación:**
  - Adaptadores validados.
  - El reporte registra escenarios, datos utilizados, resultados, defectos, severidad y criterio de aprobación.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

---

# Fase 12 — Negocios, productos, pedidos, reparto y GPS

**Objetivo de fase:** Conectar negocios consumidores con máquinas y repartidores autorizados mediante pedidos trazables, sin procesar el pago del pedido.

**Cantidad de tareas:** 20

## TASK-F12-01 — Implementar negocio consumidor, sucursales, usuarios y datos fiscales

- **ID:** `TASK-F12-01`
- **Descripción:** Implementar negocio consumidor, sucursales, usuarios y datos fiscales.
- **Objetivo:** Entregar identidad única y privacidad entre propietarios sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/orders`
  - `/packages/database`
  - `/docs/modules/orders-delivery.md`
  - `/apps/api/src/modules/businesses`
  - `/apps/private-web/src/features/businesses`
  - `/docs/tasks/task-f12-01.md`
- **Dependencias:**
  - Gate de salida de Fase 11.
  - Gate de salida de Fase 7.
  - Gate de salida de Fase 9.
  - `TASK-F0-13`
- **Criterios de aceptación:**
  - Identidad única y privacidad entre propietarios.
  - Existen pruebas positivas y negativas que demuestran aislamiento entre cuentas, ámbitos y acciones.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - La migración o cambio de datos incluye estrategia de compatibilidad, validación y reversión operativa; no elimina historial requerido.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F12-02 — Implementar asociación negocio–máquina con aprobación

- **ID:** `TASK-F12-02`
- **Descripción:** Implementar asociación negocio–máquina con aprobación.
- **Objetivo:** Entregar solo máquinas autorizadas visibles sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/orders`
  - `/packages/database`
  - `/docs/modules/orders-delivery.md`
  - `/apps/api/src/modules/businesses`
  - `/apps/private-web/src/features/businesses`
  - `/apps/api/src/modules/business-machine-links`
  - `/docs/tasks/task-f12-02.md`
- **Dependencias:**
  - Gate de salida de Fase 11.
  - Gate de salida de Fase 7.
  - Gate de salida de Fase 9.
  - `TASK-F0-13`
  - `TASK-F12-01`
  - `TASK-F4-10`
- **Criterios de aceptación:**
  - Solo máquinas autorizadas visibles.
  - Las transiciones validan estado previo, permiso, precondiciones, versión esperada y motivo cuando aplica.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F12-03 — Implementar catálogo de bolsas de hielo, presentaciones y disponibilidad

- **ID:** `TASK-F12-03`
- **Descripción:** Implementar catálogo de bolsas de hielo, presentaciones y disponibilidad.
- **Objetivo:** Entregar agua excluida de entrega sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/orders`
  - `/packages/database`
  - `/docs/modules/orders-delivery.md`
  - `/apps/api/src/modules/products`
  - `/apps/private-web/src/features/products`
  - `/apps/api/src/modules/orders`
  - `/apps/private-web/src/features/orders`
  - `/docs/tasks/task-f12-03.md`
- **Dependencias:**
  - Gate de salida de Fase 11.
  - Gate de salida de Fase 7.
  - Gate de salida de Fase 9.
  - `TASK-F0-13`
  - `TASK-F4-10`
- **Criterios de aceptación:**
  - Agua excluida de entrega.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F12-04 — Implementar precios por máquina y precio especial por cliente

- **ID:** `TASK-F12-04`
- **Descripción:** Implementar precios por máquina y precio especial por cliente.
- **Objetivo:** Entregar reglas de visibilidad y vigencia sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/orders`
  - `/packages/database`
  - `/docs/modules/orders-delivery.md`
  - `/apps/api/src/modules/products`
  - `/apps/private-web/src/features/products`
  - `/docs/tasks/task-f12-04.md`
- **Dependencias:**
  - Gate de salida de Fase 11.
  - Gate de salida de Fase 7.
  - Gate de salida de Fase 9.
  - `TASK-F0-13`
  - `TASK-F12-02`
  - `TASK-F12-03`
- **Criterios de aceptación:**
  - Reglas de visibilidad y vigencia.
  - Toda acción sensible genera auditoría con actor, contexto, correlación, valores relevantes y resultado.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F12-05 — Implementar zonas, tarifas fijas, por distancia, aproximadas o gratuitas

- **ID:** `TASK-F12-05`
- **Descripción:** Implementar zonas, tarifas fijas, por distancia, aproximadas o gratuitas.
- **Objetivo:** Entregar cálculo versionado sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/orders`
  - `/packages/database`
  - `/docs/modules/orders-delivery.md`
  - `/apps/api/src/modules/delivery-zones`
  - `/apps/private-web/src/features/delivery-zones`
  - `/docs/tasks/task-f12-05.md`
- **Dependencias:**
  - Gate de salida de Fase 11.
  - Gate de salida de Fase 7.
  - Gate de salida de Fase 9.
  - `TASK-F0-13`
  - `TASK-F12-02`
- **Criterios de aceptación:**
  - Cálculo versionado.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F12-06 — Implementar relación repartidor–máquina y tarjeta exclusiva

- **ID:** `TASK-F12-06`
- **Descripción:** Implementar relación repartidor–máquina y tarjeta exclusiva.
- **Objetivo:** Entregar elegibilidad completa sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/orders`
  - `/packages/database`
  - `/docs/modules/orders-delivery.md`
  - `/apps/api/src/modules/couriers`
  - `/apps/private-web/src/features/delivery/courier`
  - `/docs/tasks/task-f12-06.md`
- **Dependencias:**
  - Gate de salida de Fase 11.
  - Gate de salida de Fase 7.
  - Gate de salida de Fase 9.
  - `TASK-F0-13`
  - `TASK-F4-03`
  - `TASK-F11-08`
- **Criterios de aceptación:**
  - Elegibilidad completa.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F12-07 — Implementar estado y disponibilidad del repartidor

- **ID:** `TASK-F12-07`
- **Descripción:** Implementar estado y disponibilidad del repartidor.
- **Objetivo:** Entregar disponible, ocupado, temporal, fuera y vacaciones sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/orders`
  - `/packages/database`
  - `/docs/modules/orders-delivery.md`
  - `/apps/api/src/modules/products`
  - `/apps/private-web/src/features/products`
  - `/apps/api/src/modules/couriers`
  - `/apps/private-web/src/features/delivery/courier`
  - `/docs/tasks/task-f12-07.md`
- **Dependencias:**
  - Gate de salida de Fase 11.
  - Gate de salida de Fase 7.
  - Gate de salida de Fase 9.
  - `TASK-F0-13`
  - `TASK-F12-06`
- **Criterios de aceptación:**
  - Disponible, ocupado, temporal, fuera y vacaciones.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F12-08 — Implementar geolocalización consentida y zonas permitidas

- **ID:** `TASK-F12-08`
- **Descripción:** Implementar geolocalización consentida y zonas permitidas.
- **Objetivo:** Entregar gPS del navegador como fuente principal sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/orders`
  - `/packages/database`
  - `/docs/modules/orders-delivery.md`
  - `/apps/api/src/modules/delivery-zones`
  - `/apps/private-web/src/features/delivery-zones`
  - `/apps/api/src/modules/couriers`
  - `/apps/private-web/src/features/delivery/courier`
  - `/docs/tasks/task-f12-08.md`
- **Dependencias:**
  - Gate de salida de Fase 11.
  - Gate de salida de Fase 7.
  - Gate de salida de Fase 9.
  - `TASK-F0-13`
  - `TASK-F12-06`
  - `TASK-F0-14`
- **Criterios de aceptación:**
  - GPS del navegador como fuente principal.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F12-09 — Implementar recomendación de máquinas asociadas

- **ID:** `TASK-F12-09`
- **Descripción:** Implementar recomendación de máquinas asociadas.
- **Objetivo:** Entregar cercanía, disponibilidad, producto, precio y repartidor sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/orders`
  - `/packages/database`
  - `/docs/modules/orders-delivery.md`
  - `/apps/api/src/modules/products`
  - `/apps/private-web/src/features/products`
  - `/apps/api/src/modules/couriers`
  - `/apps/private-web/src/features/delivery/courier`
  - `/apps/api/src/modules/orders/recommendation`
  - `/docs/tasks/task-f12-09.md`
- **Dependencias:**
  - Gate de salida de Fase 11.
  - Gate de salida de Fase 7.
  - Gate de salida de Fase 9.
  - `TASK-F0-13`
  - `TASK-F12-02`
  - `TASK-F12-03`
  - `TASK-F12-04`
  - `TASK-F12-05`
  - `TASK-F12-07`
- **Criterios de aceptación:**
  - Cercanía, disponibilidad, producto, precio y repartidor.
  - Toda acción sensible genera auditoría con actor, contexto, correlación, valores relevantes y resultado.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F12-10 — Implementar creación y validación de pedido

- **ID:** `TASK-F12-10`
- **Descripción:** Implementar creación y validación de pedido.
- **Objetivo:** Entregar solo con máquina/producto/repartidor elegible sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/orders`
  - `/packages/database`
  - `/docs/modules/orders-delivery.md`
  - `/apps/api/src/modules/couriers`
  - `/apps/private-web/src/features/delivery/courier`
  - `/apps/api/src/modules/orders`
  - `/apps/private-web/src/features/orders`
  - `/docs/tasks/task-f12-10.md`
- **Dependencias:**
  - Gate de salida de Fase 11.
  - Gate de salida de Fase 7.
  - Gate de salida de Fase 9.
  - `TASK-F0-13`
  - `TASK-F12-02`
  - `TASK-F12-03`
  - `TASK-F12-04`
  - `TASK-F12-07`
  - `TASK-F12-09`
- **Criterios de aceptación:**
  - Solo con máquina/producto/repartidor elegible.
  - Los reintentos no duplican efectos y los conflictos o fallos quedan visibles y recuperables.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F12-11 — Implementar publicación del pedido a repartidores elegibles

- **ID:** `TASK-F12-11`
- **Descripción:** Implementar publicación del pedido a repartidores elegibles.
- **Objetivo:** Entregar bandeja filtrada sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/orders`
  - `/packages/database`
  - `/docs/modules/orders-delivery.md`
  - `/apps/api/src/modules/couriers`
  - `/apps/private-web/src/features/delivery/courier`
  - `/apps/api/src/modules/orders`
  - `/apps/private-web/src/features/orders`
  - `/docs/tasks/task-f12-11.md`
- **Dependencias:**
  - Gate de salida de Fase 11.
  - Gate de salida de Fase 7.
  - Gate de salida de Fase 9.
  - `TASK-F0-13`
  - `TASK-F12-10`
  - `TASK-F5-11`
- **Criterios de aceptación:**
  - Bandeja filtrada.
  - Las transiciones validan estado previo, permiso, precondiciones, versión esperada y motivo cuando aplica.
  - Los reintentos no duplican efectos y los conflictos o fallos quedan visibles y recuperables.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F12-12 — Implementar toma atómica con idempotencia

- **ID:** `TASK-F12-12`
- **Descripción:** Implementar toma atómica con idempotencia.
- **Objetivo:** Entregar un solo responsable sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/orders`
  - `/packages/database`
  - `/docs/modules/orders-delivery.md`
  - `/apps/api/src/modules/orders`
  - `/apps/private-web/src/features/orders`
  - `/docs/tasks/task-f12-12.md`
- **Dependencias:**
  - Gate de salida de Fase 11.
  - Gate de salida de Fase 7.
  - Gate de salida de Fase 9.
  - `TASK-F0-13`
  - `TASK-F12-11`
  - `TASK-F5-05`
- **Criterios de aceptación:**
  - Un solo responsable.
  - Las transiciones validan estado previo, permiso, precondiciones, versión esperada y motivo cuando aplica.
  - Los reintentos no duplican efectos y los conflictos o fallos quedan visibles y recuperables.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F12-13 — Implementar estados de recolección, recogido, ruta, entrega y cierre

- **ID:** `TASK-F12-13`
- **Descripción:** Implementar estados de recolección, recogido, ruta, entrega y cierre.
- **Objetivo:** Entregar transiciones y evidencias obligatorias sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/orders`
  - `/packages/database`
  - `/docs/modules/orders-delivery.md`
  - `/apps/api/src/modules/orders`
  - `/apps/private-web/src/features/orders`
  - `/docs/tasks/task-f12-13.md`
- **Dependencias:**
  - Gate de salida de Fase 11.
  - Gate de salida de Fase 7.
  - Gate de salida de Fase 9.
  - `TASK-F0-13`
  - `TASK-F12-12`
- **Criterios de aceptación:**
  - Transiciones y evidencias obligatorias.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F12-14 — Implementar código de entrega, ubicación, nombre y evidencia

- **ID:** `TASK-F12-14`
- **Descripción:** Implementar código de entrega, ubicación, nombre y evidencia.
- **Objetivo:** Entregar cierre verificable sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/orders`
  - `/packages/database`
  - `/docs/modules/orders-delivery.md`
  - `/apps/api/src/modules/orders`
  - `/apps/private-web/src/features/orders`
  - `/docs/tasks/task-f12-14.md`
- **Dependencias:**
  - Gate de salida de Fase 11.
  - Gate de salida de Fase 7.
  - Gate de salida de Fase 9.
  - `TASK-F0-13`
  - `TASK-F12-13`
  - `TASK-F5-08`
- **Criterios de aceptación:**
  - Cierre verificable.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F12-15 — Implementar cancelación, liberación, parcial, no entregado e incidencia

- **ID:** `TASK-F12-15`
- **Descripción:** Implementar cancelación, liberación, parcial, no entregado e incidencia.
- **Objetivo:** Entregar flujos alternativos autorizados sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/orders`
  - `/packages/database`
  - `/docs/modules/orders-delivery.md`
  - `/apps/api/src/modules/orders`
  - `/apps/private-web/src/features/orders`
  - `/docs/tasks/task-f12-15.md`
- **Dependencias:**
  - Gate de salida de Fase 11.
  - Gate de salida de Fase 7.
  - Gate de salida de Fase 9.
  - `TASK-F0-13`
  - `TASK-F12-13`
- **Criterios de aceptación:**
  - Flujos alternativos autorizados.
  - Las transiciones validan estado previo, permiso, precondiciones, versión esperada y motivo cuando aplica.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F12-16 — Implementar ejecución offline después de tomar el pedido

- **ID:** `TASK-F12-16`
- **Descripción:** Implementar ejecución offline después de tomar el pedido.
- **Objetivo:** Entregar no se permite toma offline sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/orders`
  - `/packages/database`
  - `/docs/modules/orders-delivery.md`
  - `/apps/api/src/modules/orders`
  - `/apps/private-web/src/features/orders`
  - `/packages/offline/src/delivery`
  - `/apps/private-web/src/features/delivery/offline`
  - `/docs/tasks/task-f12-16.md`
- **Dependencias:**
  - Gate de salida de Fase 11.
  - Gate de salida de Fase 7.
  - Gate de salida de Fase 9.
  - `TASK-F0-13`
  - `TASK-F12-12`
  - `TASK-F7-09`
  - `TASK-F7-12`
- **Criterios de aceptación:**
  - No se permite toma offline.
  - Los reintentos no duplican efectos y los conflictos o fallos quedan visibles y recuperables.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - Se validaron pérdida de conexión, reintento, cierre de sesión, pérdida de permiso, conflicto y limpieza de datos locales.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F12-17 — Implementar venta externa opcional y privacidad

- **ID:** `TASK-F12-17`
- **Descripción:** Implementar venta externa opcional y privacidad.
- **Objetivo:** Entregar ganancia estimada sin utilidad contable falsa sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/orders`
  - `/packages/database`
  - `/docs/modules/orders-delivery.md`
  - `/apps/api/src/modules/external-sales`
  - `/apps/private-web/src/features/delivery/external-sales`
  - `/docs/tasks/task-f12-17.md`
- **Dependencias:**
  - Gate de salida de Fase 11.
  - Gate de salida de Fase 7.
  - Gate de salida de Fase 9.
  - `TASK-F0-13`
  - `TASK-F12-06`
  - `TASK-F12-13`
  - `TASK-F11-10`
- **Criterios de aceptación:**
  - Ganancia estimada sin utilidad contable falsa.
  - Existen pruebas positivas y negativas que demuestran aislamiento entre cuentas, ámbitos y acciones.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F12-18 — Implementar UI de negocio/restaurante y PWA de repartidor

- **ID:** `TASK-F12-18`
- **Descripción:** Implementar UI de negocio/restaurante y PWA de repartidor.
- **Objetivo:** Entregar nuevo pedido, seguimiento, toma y entrega sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/orders`
  - `/packages/database`
  - `/docs/modules/orders-delivery.md`
  - `/apps/api/src/modules/businesses`
  - `/apps/private-web/src/features/businesses`
  - `/apps/api/src/modules/couriers`
  - `/apps/private-web/src/features/delivery/courier`
  - `/apps/api/src/modules/orders`
  - `/apps/private-web/src/features/orders`
- **Dependencias:**
  - Gate de salida de Fase 11.
  - Gate de salida de Fase 7.
  - Gate de salida de Fase 9.
  - `TASK-F0-13`
  - `TASK-F12-01`
  - `TASK-F12-10`
  - `TASK-F12-13`
  - `TASK-F12-16`
  - `TASK-F6-09`
- **Criterios de aceptación:**
  - Nuevo pedido, seguimiento, toma y entrega.
  - Los reintentos no duplican efectos y los conflictos o fallos quedan visibles y recuperables.
  - La interfaz cubre carga, vacío, error, permiso denegado y modo lectura; funciona en los breakpoints definidos.
  - Los controles son navegables por teclado y cumplen el objetivo WCAG 2.2 AA aplicable.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - La pantalla o componente tiene estados completos, prueba de accesibilidad y evidencia responsive/visual en los dispositivos objetivo.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F12-19 — Integrar notificaciones de pedido y cambios críticos

- **ID:** `TASK-F12-19`
- **Descripción:** Integrar notificaciones de pedido y cambios críticos.
- **Objetivo:** Entregar destinatarios correctos sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/orders`
  - `/packages/database`
  - `/docs/modules/orders-delivery.md`
  - `/apps/api/src/modules/orders`
  - `/apps/private-web/src/features/orders`
  - `/apps/api/src/modules/notifications`
  - `/apps/worker/src/processors/order-notifications`
  - `/docs/tasks/task-f12-19.md`
- **Dependencias:**
  - Gate de salida de Fase 11.
  - Gate de salida de Fase 7.
  - Gate de salida de Fase 9.
  - `TASK-F0-13`
  - `TASK-F12-11`
  - `TASK-F12-13`
  - `TASK-F5-11`
  - `TASK-F5-12`
- **Criterios de aceptación:**
  - Destinatarios correctos.
  - Los reintentos no duplican efectos y los conflictos o fallos quedan visibles y recuperables.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F12-20 — Crear pruebas de carreras, restricciones inmediatas, GPS, offline y cancelación

- **ID:** `TASK-F12-20`
- **Descripción:** Crear pruebas de carreras, restricciones inmediatas, GPS, offline y cancelación.
- **Objetivo:** Entregar suite E2E de ciclo completo sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/orders`
  - `/packages/database`
  - `/docs/modules/orders-delivery.md`
  - `/apps/api/src/modules/couriers`
  - `/apps/private-web/src/features/delivery/courier`
  - `/apps/api/src/modules/orders`
  - `/apps/private-web/src/features/orders`
  - `/packages/offline/src/delivery`
  - `/apps/private-web/src/features/delivery/offline`
- **Dependencias:**
  - Gate de salida de Fase 11.
  - Gate de salida de Fase 7.
  - Gate de salida de Fase 9.
  - `TASK-F0-13`
  - `TASK-F12-12`
  - `TASK-F12-13`
  - `TASK-F12-15`
  - `TASK-F12-16`
- **Criterios de aceptación:**
  - Suite E2E de ciclo completo.
  - Las transiciones validan estado previo, permiso, precondiciones, versión esperada y motivo cuando aplica.
  - Los reintentos no duplican efectos y los conflictos o fallos quedan visibles y recuperables.
  - El reporte registra escenarios, datos utilizados, resultados, defectos, severidad y criterio de aprobación.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - Se validaron pérdida de conexión, reintento, cierre de sesión, pérdida de permiso, conflicto y limpieza de datos locales.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

---

# Fase 13 — Analítica e indicadores

**Objetivo de fase:** Consolidar datos técnicos, sanitarios, comerciales y operativos en indicadores explicables, versionados y aislados por permiso.

**Cantidad de tareas:** 13

## TASK-F13-01 — Definir catálogo y propietario funcional de cada indicador

- **ID:** `TASK-F13-01`
- **Descripción:** Definir catálogo y propietario funcional de cada indicador.
- **Objetivo:** Dejar resuelto el alcance de “Definir catálogo y propietario funcional de cada indicador” con una salida verificable: fórmula, entradas, frecuencia y audiencia.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/analytics`
  - `/packages/database`
  - `/docs/analytics`
  - `/apps/api/src/modules/analytics/definitions`
  - `/docs/analytics/catalog.md`
  - `/docs/tasks/task-f13-01.md`
- **Dependencias:**
  - Datos fuente de las Fases 7 a 12 disponibles.
  - Fórmulas y ponderaciones aprobadas.
- **Criterios de aceptación:**
  - Fórmula, entradas, frecuencia y audiencia.
  - La decisión o insumo incluye responsable, fecha, alcance, alternativas descartadas y consecuencias para documentos afectados.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - El artefacto de decisión o catálogo está versionado en `/docs`, enlazado desde el índice correspondiente y no contiene decisiones materiales implícitas.
  - Los documentos derivados afectados fueron actualizados o se creó una lista explícita de cambios pendientes.
  - El responsable humano indicado en la matriz RACI aprobó la salida cuando la decisión es de negocio, seguridad, sanidad, privacidad o costo.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F13-02 — Implementar fórmulas versionadas y resultados históricos

- **ID:** `TASK-F13-02`
- **Descripción:** Implementar fórmulas versionadas y resultados históricos.
- **Objetivo:** Entregar reproducibilidad por versión sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/analytics`
  - `/packages/database`
  - `/docs/analytics`
  - `/apps/api/src/modules/analytics/definitions`
  - `/docs/analytics/catalog.md`
  - `/docs/tasks/task-f13-02.md`
- **Dependencias:**
  - Datos fuente de las Fases 7 a 12 disponibles.
  - Fórmulas y ponderaciones aprobadas.
  - `TASK-F13-01`
- **Criterios de aceptación:**
  - Reproducibilidad por versión.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F13-03 — Implementar estado técnico agregado

- **ID:** `TASK-F13-03`
- **Descripción:** Implementar estado técnico agregado.
- **Objetivo:** Entregar mantenimientos, tickets, componentes y downtime sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/analytics`
  - `/packages/database`
  - `/docs/analytics`
  - `/apps/api/src/modules/analytics/technical`
  - `/docs/tasks/task-f13-03.md`
- **Dependencias:**
  - Datos fuente de las Fases 7 a 12 disponibles.
  - Fórmulas y ponderaciones aprobadas.
  - `TASK-F7-01`
  - `TASK-F7-02`
  - `TASK-F9-06`
- **Criterios de aceptación:**
  - Mantenimientos, tickets, componentes y downtime.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F13-04 — Implementar estado sanitario agregado

- **ID:** `TASK-F13-04`
- **Descripción:** Implementar estado sanitario agregado.
- **Objetivo:** Entregar bitácoras, análisis, acciones y restricciones sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/analytics`
  - `/packages/database`
  - `/docs/analytics`
  - `/apps/api/src/modules/analytics/sanitary`
  - `/docs/tasks/task-f13-04.md`
- **Dependencias:**
  - Datos fuente de las Fases 7 a 12 disponibles.
  - Fórmulas y ponderaciones aprobadas.
  - `TASK-F8-02`
  - `TASK-F8-06`
  - `TASK-F8-09`
  - `TASK-F8-10`
- **Criterios de aceptación:**
  - Bitácoras, análisis, acciones y restricciones.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F13-05 — Implementar resumen global con prioridad de riesgo

- **ID:** `TASK-F13-05`
- **Descripción:** Implementar resumen global con prioridad de riesgo.
- **Objetivo:** Entregar eventos críticos no ocultados por promedios sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/analytics`
  - `/packages/database`
  - `/docs/analytics`
  - `/apps/api/src/modules/analytics/global`
  - `/docs/tasks/task-f13-05.md`
- **Dependencias:**
  - Datos fuente de las Fases 7 a 12 disponibles.
  - Fórmulas y ponderaciones aprobadas.
  - `TASK-F13-03`
  - `TASK-F13-04`
- **Criterios de aceptación:**
  - Eventos críticos no ocultados por promedios.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F13-06 — Implementar agregaciones de ventas e ingresos

- **ID:** `TASK-F13-06`
- **Descripción:** Implementar agregaciones de ventas e ingresos.
- **Objetivo:** Entregar periodos, sucursales, máquinas, productos y pagos sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/analytics`
  - `/packages/database`
  - `/docs/analytics`
  - `/apps/api/src/modules/analytics/sales`
  - `/docs/tasks/task-f13-06.md`
- **Dependencias:**
  - Datos fuente de las Fases 7 a 12 disponibles.
  - Fórmulas y ponderaciones aprobadas.
  - `TASK-F11-07`
- **Criterios de aceptación:**
  - Periodos, sucursales, máquinas, productos y pagos.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F13-07 — Implementar métricas de inventario

- **ID:** `TASK-F13-07`
- **Descripción:** Implementar métricas de inventario.
- **Objetivo:** Entregar consumo, costo, faltantes y caducidad sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/analytics`
  - `/packages/database`
  - `/docs/analytics`
  - `/apps/api/src/modules/analytics/inventory`
  - `/docs/tasks/task-f13-07.md`
- **Dependencias:**
  - Datos fuente de las Fases 7 a 12 disponibles.
  - Fórmulas y ponderaciones aprobadas.
  - `TASK-F9-03`
  - `TASK-F9-04`
- **Criterios de aceptación:**
  - Consumo, costo, faltantes y caducidad.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F13-08 — Implementar métricas de pedidos y reparto

- **ID:** `TASK-F13-08`
- **Descripción:** Implementar métricas de pedidos y reparto.
- **Objetivo:** Entregar volumen, tiempos, cancelaciones y estimaciones sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/analytics`
  - `/packages/database`
  - `/docs/analytics`
  - `/apps/api/src/modules/analytics/delivery`
  - `/docs/tasks/task-f13-08.md`
- **Dependencias:**
  - Datos fuente de las Fases 7 a 12 disponibles.
  - Fórmulas y ponderaciones aprobadas.
  - `TASK-F12-13`
  - `TASK-F12-15`
- **Criterios de aceptación:**
  - Volumen, tiempos, cancelaciones y estimaciones.
  - Los reintentos no duplican efectos y los conflictos o fallos quedan visibles y recuperables.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F13-09 — Crear proyecciones o vistas materializadas donde se justifique

- **ID:** `TASK-F13-09`
- **Descripción:** Crear proyecciones o vistas materializadas donde se justifique.
- **Objetivo:** Entregar paneles sin cargar tablas transaccionales sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/analytics`
  - `/packages/database`
  - `/docs/analytics`
  - `/packages/database/src/projections`
  - `/apps/worker/src/processors/analytics`
  - `/docs/tasks/task-f13-09.md`
- **Dependencias:**
  - Datos fuente de las Fases 7 a 12 disponibles.
  - Fórmulas y ponderaciones aprobadas.
  - `TASK-F13-03`
  - `TASK-F13-04`
  - `TASK-F13-06`
  - `TASK-F13-07`
  - `TASK-F13-08`
- **Criterios de aceptación:**
  - Paneles sin cargar tablas transaccionales.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - La migración o cambio de datos incluye estrategia de compatibilidad, validación y reversión operativa; no elimina historial requerido.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F13-10 — Implementar dashboards y explicaciones de factores

- **ID:** `TASK-F13-10`
- **Descripción:** Implementar dashboards y explicaciones de factores.
- **Objetivo:** Entregar cada resultado es interpretable sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/analytics`
  - `/packages/database`
  - `/docs/analytics`
  - `/apps/private-web/src/features/analytics`
  - `/docs/tasks/task-f13-10.md`
- **Dependencias:**
  - Datos fuente de las Fases 7 a 12 disponibles.
  - Fórmulas y ponderaciones aprobadas.
  - `TASK-F13-05`
  - `TASK-F13-09`
  - `TASK-F6-09`
- **Criterios de aceptación:**
  - Cada resultado es interpretable.
  - La configuración es reproducible por entorno y cuenta con evidencia de despliegue o restauración según corresponda.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F13-11 — Implementar mapas de calor cuando exista historial suficiente

- **ID:** `TASK-F13-11`
- **Descripción:** Implementar mapas de calor cuando exista historial suficiente.
- **Objetivo:** Entregar datos georreferenciados agregados sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/analytics`
  - `/packages/database`
  - `/docs/analytics`
  - `/apps/private-web/src/features/analytics/maps`
  - `/apps/api/src/modules/analytics/geospatial`
  - `/docs/tasks/task-f13-11.md`
- **Dependencias:**
  - Datos fuente de las Fases 7 a 12 disponibles.
  - Fórmulas y ponderaciones aprobadas.
  - `TASK-F13-08`
  - Historial georreferenciado suficiente y política de privacidad aprobada.
- **Criterios de aceptación:**
  - Datos georreferenciados agregados.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - La migración o cambio de datos incluye estrategia de compatibilidad, validación y reversión operativa; no elimina historial requerido.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F13-12 — Mantener predicción deshabilitada hasta cumplir criterios de datos

- **ID:** `TASK-F13-12`
- **Descripción:** Mantener predicción deshabilitada hasta cumplir criterios de datos.
- **Objetivo:** Entregar feature flag y mensaje de insuficiencia sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/analytics`
  - `/packages/database`
  - `/docs/analytics`
  - `/packages/config/src/feature-flags`
  - `/docs/analytics/prediction-readiness.md`
  - `/docs/tasks/task-f13-12.md`
- **Dependencias:**
  - Datos fuente de las Fases 7 a 12 disponibles.
  - Fórmulas y ponderaciones aprobadas.
  - `TASK-F13-01`
  - Criterios mínimos de datos aprobados.
- **Criterios de aceptación:**
  - Feature flag y mensaje de insuficiencia.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - La migración o cambio de datos incluye estrategia de compatibilidad, validación y reversión operativa; no elimina historial requerido.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F13-13 — Implementar pruebas de fórmula, aislamiento, zonas horarias y reconciliación

- **ID:** `TASK-F13-13`
- **Descripción:** Implementar pruebas de fórmula, aislamiento, zonas horarias y reconciliación.
- **Objetivo:** Entregar resultados verificables sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/packages/contracts/src/private/analytics`
  - `/packages/database`
  - `/docs/analytics`
  - `/apps/api/src/modules/analytics/definitions`
  - `/docs/analytics/catalog.md`
  - `/tests/integration/analytics`
  - `/tests/e2e/analytics`
  - `/docs/tasks/task-f13-13.md`
- **Dependencias:**
  - Datos fuente de las Fases 7 a 12 disponibles.
  - Fórmulas y ponderaciones aprobadas.
  - `TASK-F13-02`
  - `TASK-F13-03`
  - `TASK-F13-04`
  - `TASK-F13-06`
  - `TASK-F13-07`
  - `TASK-F13-08`
- **Criterios de aceptación:**
  - Resultados verificables.
  - Existen pruebas positivas y negativas que demuestran aislamiento entre cuentas, ámbitos y acciones.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

---

# Fase 14 — Endurecimiento, migración, accesibilidad y preparación productiva

**Objetivo de fase:** Validar el sistema integral bajo condiciones reales de seguridad, carga, recuperación, accesibilidad y operación antes de un piloto o lanzamiento.

**Cantidad de tareas:** 17

## TASK-F14-01 — Ejecutar revisión de arquitectura y dependencias entre módulos

- **ID:** `TASK-F14-01`
- **Descripción:** Ejecutar revisión de arquitectura y dependencias entre módulos.
- **Objetivo:** Entregar desviaciones y deuda priorizada sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/docs/security`
  - `/docs/runbooks`
  - `/docs/release`
  - `/tests`
  - `/docs/architecture-review.md`
  - `/docs/tasks/task-f14-01.md`
- **Dependencias:**
  - Candidato de liberación funcional de Fases 1 a 13.
- **Criterios de aceptación:**
  - Desviaciones y deuda priorizada.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F14-02 — Completar threat model por superficie privada, pública, archivos, offline e integraciones

- **ID:** `TASK-F14-02`
- **Descripción:** Completar threat model por superficie privada, pública, archivos, offline e integraciones.
- **Objetivo:** Entregar riesgos y controles verificados sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/docs/security`
  - `/docs/runbooks`
  - `/docs/release`
  - `/tests`
  - `/docs/security/threat-models`
  - `/tests/security`
  - `/apps/worker/src/processors/retention`
  - `/docs/legal/retention.md`
  - `/docs/tasks/task-f14-02.md`
- **Dependencias:**
  - Candidato de liberación funcional de Fases 1 a 13.
  - `TASK-F14-01`
- **Criterios de aceptación:**
  - Riesgos y controles verificados.
  - Existen pruebas positivas y negativas que demuestran aislamiento entre cuentas, ámbitos y acciones.
  - Los reintentos no duplican efectos y los conflictos o fallos quedan visibles y recuperables.
  - Los archivos permanecen privados, validados y vinculados mediante metadatos; no existen URLs públicas permanentes.
  - El reporte registra escenarios, datos utilizados, resultados, defectos, severidad y criterio de aprobación.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - Se validaron pérdida de conexión, reintento, cierre de sesión, pérdida de permiso, conflicto y limpieza de datos locales.
  - Se validaron límites, tipo, integridad, privacidad, manejo de malware/fallo y eliminación temporal de derivados cuando corresponda.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F14-03 — Ejecutar pruebas de autorización y aislamiento a escala

- **ID:** `TASK-F14-03`
- **Descripción:** Ejecutar pruebas de autorización y aislamiento a escala.
- **Objetivo:** Entregar sin rutas de escalada conocidas sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/docs/security`
  - `/docs/runbooks`
  - `/docs/release`
  - `/tests`
  - `/tests/security/authorization`
  - `/packages/testing/src/isolation`
  - `/docs/tasks/task-f14-03.md`
- **Dependencias:**
  - Candidato de liberación funcional de Fases 1 a 13.
  - `TASK-F14-02`
- **Criterios de aceptación:**
  - Sin rutas de escalada conocidas.
  - Existen pruebas positivas y negativas que demuestran aislamiento entre cuentas, ámbitos y acciones.
  - El reporte registra escenarios, datos utilizados, resultados, defectos, severidad y criterio de aprobación.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F14-04 — Ejecutar pruebas de seguridad de aplicación y dependencias

- **ID:** `TASK-F14-04`
- **Descripción:** Ejecutar pruebas de seguridad de aplicación y dependencias.
- **Objetivo:** Entregar hallazgos críticos/c altos resueltos sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/docs/security`
  - `/docs/runbooks`
  - `/docs/release`
  - `/tests`
  - `/docs/architecture-review.md`
  - `/docs/security/threat-models`
  - `/tests/security`
  - `/docs/tasks/task-f14-04.md`
- **Dependencias:**
  - Candidato de liberación funcional de Fases 1 a 13.
  - `TASK-F14-02`
- **Criterios de aceptación:**
  - Hallazgos críticos/c altos resueltos.
  - El reporte registra escenarios, datos utilizados, resultados, defectos, severidad y criterio de aprobación.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F14-05 — Ejecutar pruebas de carga según presupuestos del TRD

- **ID:** `TASK-F14-05`
- **Descripción:** Ejecutar pruebas de carga según presupuestos del TRD.
- **Objetivo:** Entregar resultados, cuellos y capacidad documentada sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/docs/security`
  - `/docs/runbooks`
  - `/docs/release`
  - `/tests`
  - `/tests/load`
  - `/docs/performance`
  - `/docs/tasks/task-f14-05.md`
- **Dependencias:**
  - Candidato de liberación funcional de Fases 1 a 13.
  - `TASK-F0-05`
  - `TASK-F14-01`
- **Criterios de aceptación:**
  - Resultados, cuellos y capacidad documentada.
  - El reporte registra escenarios, datos utilizados, resultados, defectos, severidad y criterio de aprobación.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F14-06 — Optimizar consultas, índices, colas, imágenes y PDF

- **ID:** `TASK-F14-06`
- **Descripción:** Optimizar consultas, índices, colas, imágenes y PDF.
- **Objetivo:** Entregar presupuestos aceptados o excepción aprobada sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/docs/security`
  - `/docs/runbooks`
  - `/docs/release`
  - `/tests`
  - `/tests/load`
  - `/docs/performance`
  - `/docs/tasks/task-f14-06.md`
- **Dependencias:**
  - Candidato de liberación funcional de Fases 1 a 13.
  - `TASK-F14-05`
- **Criterios de aceptación:**
  - Presupuestos aceptados o excepción aprobada.
  - Los reintentos no duplican efectos y los conflictos o fallos quedan visibles y recuperables.
  - Los archivos permanecen privados, validados y vinculados mediante metadatos; no existen URLs públicas permanentes.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - Se validaron límites, tipo, integridad, privacidad, manejo de malware/fallo y eliminación temporal de derivados cuando corresponda.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F14-07 — Ejecutar pruebas completas de accesibilidad WCAG 2.2 AA objetivo

- **ID:** `TASK-F14-07`
- **Descripción:** Ejecutar pruebas completas de accesibilidad WCAG 2.2 AA objetivo.
- **Objetivo:** Entregar hallazgos prioritarios resueltos sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/docs/security`
  - `/docs/runbooks`
  - `/docs/release`
  - `/tests`
  - `/tests/e2e/accessibility`
  - `/docs/quality/accessibility.md`
  - `/docs/tasks/task-f14-07.md`
- **Dependencias:**
  - Candidato de liberación funcional de Fases 1 a 13.
  - `TASK-F6-12`
- **Criterios de aceptación:**
  - Hallazgos prioritarios resueltos.
  - El reporte registra escenarios, datos utilizados, resultados, defectos, severidad y criterio de aprobación.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F14-08 — Ejecutar matriz de navegadores, dispositivos y conectividad

- **ID:** `TASK-F14-08`
- **Descripción:** Ejecutar matriz de navegadores, dispositivos y conectividad.
- **Objetivo:** Entregar evidencia de compatibilidad sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/docs/security`
  - `/docs/runbooks`
  - `/docs/release`
  - `/tests`
  - `/tests/compatibility`
  - `/docs/quality/support-matrix.md`
  - `/docs/tasks/task-f14-08.md`
- **Dependencias:**
  - Candidato de liberación funcional de Fases 1 a 13.
  - `TASK-F0-14`
- **Criterios de aceptación:**
  - Evidencia de compatibilidad.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F14-09 — Probar recuperación de backups y DR bajo RPO/RTO

- **ID:** `TASK-F14-09`
- **Descripción:** Probar recuperación de backups y DR bajo RPO/RTO.
- **Objetivo:** Entregar simulacro documentado sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/docs/security`
  - `/docs/runbooks`
  - `/docs/release`
  - `/tests`
  - `/infra/terraform/modules/backup`
  - `/docs/runbooks/backup-restore.md`
  - `/docs/tasks/task-f14-09.md`
- **Dependencias:**
  - Candidato de liberación funcional de Fases 1 a 13.
  - `TASK-F2-12`
  - `TASK-F0-05`
- **Criterios de aceptación:**
  - Simulacro documentado.
  - La configuración es reproducible por entorno y cuenta con evidencia de despliegue o restauración según corresponda.
  - El reporte registra escenarios, datos utilizados, resultados, defectos, severidad y criterio de aprobación.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El cambio se probó en un entorno no productivo y cuenta con pasos de promoción, rollback y monitoreo documentados.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F14-10 — Definir y probar migración de datos existentes

- **ID:** `TASK-F14-10`
- **Descripción:** Definir y probar migración de datos existentes.
- **Objetivo:** Dejar resuelto el alcance de “Definir y probar migración de datos existentes” con una salida verificable: importadores, validación y reconciliación.
- **Archivos que se modificarán:**
  - `/docs/security`
  - `/docs/runbooks`
  - `/docs/release`
  - `/tests`
  - `/apps/worker/src/processors/migrations`
  - `/docs/migration`
  - `/docs/tasks/task-f14-10.md`
- **Dependencias:**
  - Candidato de liberación funcional de Fases 1 a 13.
  - Fuentes de datos existentes identificadas y mapeadas.
- **Criterios de aceptación:**
  - Importadores, validación y reconciliación.
  - La decisión o insumo incluye responsable, fecha, alcance, alternativas descartadas y consecuencias para documentos afectados.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - El artefacto de decisión o catálogo está versionado en `/docs`, enlazado desde el índice correspondiente y no contiene decisiones materiales implícitas.
  - Los documentos derivados afectados fueron actualizados o se creó una lista explícita de cambios pendientes.
  - El responsable humano indicado en la matriz RACI aprobó la salida cuando la decisión es de negocio, seguridad, sanidad, privacidad o costo.
  - La migración o cambio de datos incluye estrategia de compatibilidad, validación y reversión operativa; no elimina historial requerido.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F14-11 — Definir retención, archivo y eliminación legítima

- **ID:** `TASK-F14-11`
- **Descripción:** Definir retención, archivo y eliminación legítima.
- **Objetivo:** Dejar resuelto el alcance de “Definir retención, archivo y eliminación legítima” con una salida verificable: jobs y políticas aplicadas.
- **Archivos que se modificarán:**
  - `/docs/security`
  - `/docs/runbooks`
  - `/docs/release`
  - `/tests`
  - `/apps/worker/src/processors/retention`
  - `/docs/legal/retention.md`
  - `/docs/tasks/task-f14-11.md`
- **Dependencias:**
  - Candidato de liberación funcional de Fases 1 a 13.
  - `TASK-F0-05`
  - Validación legal de retención.
- **Criterios de aceptación:**
  - Jobs y políticas aplicadas.
  - Los archivos permanecen privados, validados y vinculados mediante metadatos; no existen URLs públicas permanentes.
  - La decisión o insumo incluye responsable, fecha, alcance, alternativas descartadas y consecuencias para documentos afectados.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - El artefacto de decisión o catálogo está versionado en `/docs`, enlazado desde el índice correspondiente y no contiene decisiones materiales implícitas.
  - Los documentos derivados afectados fueron actualizados o se creó una lista explícita de cambios pendientes.
  - El responsable humano indicado en la matriz RACI aprobó la salida cuando la decisión es de negocio, seguridad, sanidad, privacidad o costo.
  - Se validaron límites, tipo, integridad, privacidad, manejo de malware/fallo y eliminación temporal de derivados cuando corresponda.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F14-12 — Completar runbooks de incidentes, pagos, cola, PDF, correo, Supabase Auth y restauración

- **ID:** `TASK-F14-12`
- **Descripción:** Completar runbooks de incidentes, pagos, cola, PDF, correo, Supabase Auth y restauración.
- **Objetivo:** Entregar manual operativo sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/docs/security`
  - `/docs/runbooks`
  - `/docs/release`
  - `/tests`
  - `/infra/terraform/modules/backup`
  - `/docs/runbooks/backup-restore.md`
  - `/docs/tasks/task-f14-12.md`
- **Dependencias:**
  - Candidato de liberación funcional de Fases 1 a 13.
  - `TASK-F0-15`
  - `TASK-F14-01`
- **Criterios de aceptación:**
  - Manual operativo.
  - Los reintentos no duplican efectos y los conflictos o fallos quedan visibles y recuperables.
  - Los archivos permanecen privados, validados y vinculados mediante metadatos; no existen URLs públicas permanentes.
  - La configuración es reproducible por entorno y cuenta con evidencia de despliegue o restauración según corresponda.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - Se validaron límites, tipo, integridad, privacidad, manejo de malware/fallo y eliminación temporal de derivados cuando corresponda.
  - El cambio se probó en un entorno no productivo y cuenta con pasos de promoción, rollback y monitoreo documentados.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F14-13 — Configurar alertas técnicas y de negocio

- **ID:** `TASK-F14-13`
- **Descripción:** Configurar alertas técnicas y de negocio.
- **Objetivo:** Entregar on-call recibe eventos accionables sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/docs/security`
  - `/docs/runbooks`
  - `/docs/release`
  - `/tests`
  - `/infra/terraform/modules/observability`
  - `/docs/runbooks/alerting.md`
  - `/docs/tasks/task-f14-13.md`
- **Dependencias:**
  - Candidato de liberación funcional de Fases 1 a 13.
  - `TASK-F2-09`
  - `TASK-F2-08`
  - `TASK-F0-15`
- **Criterios de aceptación:**
  - On-call recibe eventos accionables.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F14-14 — Preparar datos semilla y cuenta demo de 14 días

- **ID:** `TASK-F14-14`
- **Descripción:** Preparar datos semilla y cuenta demo de 14 días.
- **Objetivo:** Entregar demo reproducible con datos ficticios sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/docs/security`
  - `/docs/runbooks`
  - `/docs/release`
  - `/tests`
  - `/packages/database/src/seeds/demo`
  - `/docs/demo`
  - `/docs/tasks/task-f14-14.md`
- **Dependencias:**
  - Candidato de liberación funcional de Fases 1 a 13.
  - `TASK-F5-01`
  - `TASK-F4-13`
  - Datos ficticios aprobados.
- **Criterios de aceptación:**
  - Demo reproducible con datos ficticios.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - La migración o cambio de datos incluye estrategia de compatibilidad, validación y reversión operativa; no elimina historial requerido.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F14-15 — Ejecutar regresión E2E de los 20 flujos de AppFlow

- **ID:** `TASK-F14-15`
- **Descripción:** Ejecutar regresión E2E de los 20 flujos de AppFlow.
- **Objetivo:** Entregar evidencia de aceptación sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/docs/security`
  - `/docs/runbooks`
  - `/docs/release`
  - `/tests`
  - `/tests/e2e`
  - `/docs/quality/regression-report.md`
  - `/docs/tasks/task-f14-15.md`
- **Dependencias:**
  - Candidato de liberación funcional de Fases 1 a 13.
  - `TASK-F14-03`
  - `TASK-F14-04`
  - `TASK-F14-07`
  - `TASK-F14-08`
- **Criterios de aceptación:**
  - Evidencia de aceptación.
  - El reporte registra escenarios, datos utilizados, resultados, defectos, severidad y criterio de aprobación.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F14-16 — Ejecutar UAT con responsables de negocio, técnico, sanitario y operación

- **ID:** `TASK-F14-16`
- **Descripción:** Ejecutar UAT con responsables de negocio, técnico, sanitario y operación.
- **Objetivo:** Entregar acta de aprobación o lista de bloqueos sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/docs/security`
  - `/docs/runbooks`
  - `/docs/release`
  - `/tests`
  - `/docs/uat`
  - `/docs/tasks/task-f14-16.md`
- **Dependencias:**
  - Candidato de liberación funcional de Fases 1 a 13.
  - `TASK-F14-15`
- **Criterios de aceptación:**
  - Acta de aprobación o lista de bloqueos.
  - Las transiciones validan estado previo, permiso, precondiciones, versión esperada y motivo cuando aplica.
  - El reporte registra escenarios, datos utilizados, resultados, defectos, severidad y criterio de aprobación.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F14-17 — Congelar contratos de la primera liberación

- **ID:** `TASK-F14-17`
- **Descripción:** Congelar contratos de la primera liberación.
- **Objetivo:** Dejar resuelto el alcance de “Congelar contratos de la primera liberación” con una salida verificable: versiones etiquetadas y changelog.
- **Archivos que se modificarán:**
  - `/docs/security`
  - `/docs/runbooks`
  - `/docs/release`
  - `/tests`
  - `/packages/contracts`
  - `/docs/release/contract-baseline.md`
  - `/docs/tasks/task-f14-17.md`
- **Dependencias:**
  - Candidato de liberación funcional de Fases 1 a 13.
  - `TASK-F14-16`
  - Aprobación de producto, arquitectura y QA.
- **Criterios de aceptación:**
  - Versiones etiquetadas y changelog.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - OpenAPI, errores, idempotencia, concurrencia y ejemplos de contrato fueron actualizados y validados.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

---

# Fase 15 — Piloto, despliegue gradual y operación

**Objetivo de fase:** Liberar el producto a usuarios controlados, medir comportamiento real y estabilizarlo antes de ampliar el acceso.

**Cantidad de tareas:** 11

## TASK-F15-01 — Seleccionar cuentas, máquinas, roles y sucursales piloto

- **ID:** `TASK-F15-01`
- **Descripción:** Seleccionar cuentas, máquinas, roles y sucursales piloto.
- **Objetivo:** Dejar resuelto el alcance de “Seleccionar cuentas, máquinas, roles y sucursales piloto” con una salida verificable: cohorte y responsables definidos.
- **Archivos que se modificarán:**
  - `/docs/pilot`
  - `/docs/runbooks`
  - `/docs/metrics`
  - `/packages/config`
  - `/docs/pilot/scope.md`
  - `/docs/tasks/task-f15-01.md`
- **Dependencias:**
  - Gate de salida de Fase 14.
  - Aprobación ejecutiva del piloto.
- **Criterios de aceptación:**
  - Cohorte y responsables definidos.
  - Existen pruebas positivas y negativas que demuestran aislamiento entre cuentas, ámbitos y acciones.
  - La decisión o insumo incluye responsable, fecha, alcance, alternativas descartadas y consecuencias para documentos afectados.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - El artefacto de decisión o catálogo está versionado en `/docs`, enlazado desde el índice correspondiente y no contiene decisiones materiales implícitas.
  - Los documentos derivados afectados fueron actualizados o se creó una lista explícita de cambios pendientes.
  - El responsable humano indicado en la matriz RACI aprobó la salida cuando la decisión es de negocio, seguridad, sanidad, privacidad o costo.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F15-02 — Preparar datos, accesos, capacitación y soporte

- **ID:** `TASK-F15-02`
- **Descripción:** Preparar datos, accesos, capacitación y soporte.
- **Objetivo:** Entregar usuarios habilitados sin credenciales compartidas sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/docs/pilot`
  - `/docs/runbooks`
  - `/docs/metrics`
  - `/packages/config`
  - `/infra/terraform`
  - `/docs/pilot/onboarding.md`
  - `/docs/runbooks/pilot-support.md`
  - `/docs/tasks/task-f15-02.md`
- **Dependencias:**
  - Gate de salida de Fase 14.
  - Aprobación ejecutiva del piloto.
  - `TASK-F15-01`
  - `TASK-F14-14`
- **Criterios de aceptación:**
  - Usuarios habilitados sin credenciales compartidas.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - La migración o cambio de datos incluye estrategia de compatibilidad, validación y reversión operativa; no elimina historial requerido.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F15-03 — Ejecutar despliegue gradual con feature flags

- **ID:** `TASK-F15-03`
- **Descripción:** Ejecutar despliegue gradual con feature flags.
- **Objetivo:** Entregar activación por módulo y cuenta sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/docs/pilot`
  - `/docs/runbooks`
  - `/docs/metrics`
  - `/packages/config`
  - `/packages/config/src/feature-flags`
  - `/infra/terraform`
  - `/docs/pilot/rollout.md`
  - `/docs/tasks/task-f15-03.md`
- **Dependencias:**
  - Gate de salida de Fase 14.
  - Aprobación ejecutiva del piloto.
  - `TASK-F15-01`
  - `TASK-F15-02`
  - `TASK-F14-17`
- **Criterios de aceptación:**
  - Activación por módulo y cuenta.
  - La configuración es reproducible por entorno y cuenta con evidencia de despliegue o restauración según corresponda.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El cambio se probó en un entorno no productivo y cuenta con pasos de promoción, rollback y monitoreo documentados.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F15-04 — Monitorear SLO, errores, colas, sincronización, archivos y experiencia

- **ID:** `TASK-F15-04`
- **Descripción:** Monitorear SLO, errores, colas, sincronización, archivos y experiencia.
- **Objetivo:** Dejar resuelto el alcance de “Monitorear SLO, errores, colas, sincronización, archivos y experiencia” con una salida verificable: dashboard diario de piloto.
- **Archivos que se modificarán:**
  - `/docs/pilot`
  - `/docs/runbooks`
  - `/docs/metrics`
  - `/packages/config`
  - `/docs/pilot/scope.md`
  - `/docs/metrics/pilot-dashboard.md`
  - `/packages/observability`
  - `/docs/tasks/task-f15-04.md`
- **Dependencias:**
  - Gate de salida de Fase 14.
  - Aprobación ejecutiva del piloto.
  - `TASK-F15-03`
  - `TASK-F14-13`
- **Criterios de aceptación:**
  - Dashboard diario de piloto.
  - Los reintentos no duplican efectos y los conflictos o fallos quedan visibles y recuperables.
  - Los archivos permanecen privados, validados y vinculados mediante metadatos; no existen URLs públicas permanentes.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - Se validaron pérdida de conexión, reintento, cierre de sesión, pérdida de permiso, conflicto y limpieza de datos locales.
  - Se validaron límites, tipo, integridad, privacidad, manejo de malware/fallo y eliminación temporal de derivados cuando corresponda.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F15-05 — Medir métricas de UX y producto definidas

- **ID:** `TASK-F15-05`
- **Descripción:** Medir métricas de UX y producto definidas.
- **Objetivo:** Dejar resuelto el alcance de “Medir métricas de UX y producto definidas” con una salida verificable: línea base real.
- **Archivos que se modificarán:**
  - `/docs/pilot`
  - `/docs/runbooks`
  - `/docs/metrics`
  - `/packages/config`
  - `/packages/observability`
  - `/infra/terraform/modules/observability`
  - `/docs/runbooks/observability.md`
  - `/docs/metrics/product.md`
  - `/docs/tasks/task-f15-05.md`
- **Dependencias:**
  - Gate de salida de Fase 14.
  - Aprobación ejecutiva del piloto.
  - `TASK-F15-03`
- **Criterios de aceptación:**
  - Línea base real.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - La migración o cambio de datos incluye estrategia de compatibilidad, validación y reversión operativa; no elimina historial requerido.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F15-06 — Operar canal de incidencias y clasificación de severidad

- **ID:** `TASK-F15-06`
- **Descripción:** Operar canal de incidencias y clasificación de severidad.
- **Objetivo:** Dejar resuelto el alcance de “Operar canal de incidencias y clasificación de severidad” con una salida verificable: tiempos de respuesta y resolución registrados.
- **Archivos que se modificarán:**
  - `/docs/pilot`
  - `/docs/runbooks`
  - `/docs/metrics`
  - `/packages/config`
  - `/docs/pilot/incidents.md`
  - `/docs/tasks/task-f15-06.md`
- **Dependencias:**
  - Gate de salida de Fase 14.
  - Aprobación ejecutiva del piloto.
  - `TASK-F15-02`
  - `TASK-F0-15`
- **Criterios de aceptación:**
  - Tiempos de respuesta y resolución registrados.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F15-07 — Corregir defectos con regresión y control de cambios

- **ID:** `TASK-F15-07`
- **Descripción:** Corregir defectos con regresión y control de cambios.
- **Objetivo:** Dejar resuelto el alcance de “Corregir defectos con regresión y control de cambios” con una salida verificable: releases pequeños y auditables.
- **Archivos que se modificarán:**
  - `/docs/pilot`
  - `/docs/runbooks`
  - `/docs/metrics`
  - `/packages/config`
  - `/apps`
  - `/packages`
  - `/tests/e2e`
  - `/docs/tasks/task-f15-07.md`
- **Dependencias:**
  - Gate de salida de Fase 14.
  - Aprobación ejecutiva del piloto.
  - `TASK-F15-04`
  - `TASK-F15-06`
- **Criterios de aceptación:**
  - Releases pequeños y auditables.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F15-08 — Reconciliar datos técnicos, sanitarios, inventario y comerciales

- **ID:** `TASK-F15-08`
- **Descripción:** Reconciliar datos técnicos, sanitarios, inventario y comerciales.
- **Objetivo:** Dejar resuelto el alcance de “Reconciliar datos técnicos, sanitarios, inventario y comerciales” con una salida verificable: reporte de exactitud.
- **Archivos que se modificarán:**
  - `/docs/pilot`
  - `/docs/runbooks`
  - `/docs/metrics`
  - `/packages/config`
  - `/docs/pilot/onboarding.md`
  - `/docs/runbooks/pilot-support.md`
  - `/docs/pilot/reconciliation.md`
  - `/docs/tasks/task-f15-08.md`
- **Dependencias:**
  - Gate de salida de Fase 14.
  - Aprobación ejecutiva del piloto.
  - `TASK-F15-03`
- **Criterios de aceptación:**
  - Reporte de exactitud.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - La migración o cambio de datos incluye estrategia de compatibilidad, validación y reversión operativa; no elimina historial requerido.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F15-09 — Realizar revisión de privacidad y contenido público después de uso real

- **ID:** `TASK-F15-09`
- **Descripción:** Realizar revisión de privacidad y contenido público después de uso real.
- **Objetivo:** Dejar resuelto el alcance de “Realizar revisión de privacidad y contenido público después de uso real” con una salida verificable: publicaciones verificadas.
- **Archivos que se modificarán:**
  - `/docs/pilot`
  - `/docs/runbooks`
  - `/docs/metrics`
  - `/packages/config`
  - `/docs/pilot/privacy-review.md`
  - `/docs/tasks/task-f15-09.md`
- **Dependencias:**
  - Gate de salida de Fase 14.
  - Aprobación ejecutiva del piloto.
  - `TASK-F15-03`
- **Criterios de aceptación:**
  - Publicaciones verificadas.
  - Existen pruebas positivas y negativas que demuestran aislamiento entre cuentas, ámbitos y acciones.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F15-10 — Ejecutar retrospectiva y decidir expansión, pausa o rollback

- **ID:** `TASK-F15-10`
- **Descripción:** Ejecutar retrospectiva y decidir expansión, pausa o rollback.
- **Objetivo:** Entregar go/No-Go documentado sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/docs/pilot`
  - `/docs/runbooks`
  - `/docs/metrics`
  - `/packages/config`
  - `/docs/pilot/retrospective.md`
  - `/docs/tasks/task-f15-10.md`
- **Dependencias:**
  - Gate de salida de Fase 14.
  - Aprobación ejecutiva del piloto.
  - `TASK-F15-04`
  - `TASK-F15-05`
  - `TASK-F15-06`
  - `TASK-F15-08`
  - `TASK-F15-09`
- **Criterios de aceptación:**
  - Go/No-Go documentado.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

## TASK-F15-11 — Crear roadmap posterior con deuda y mejoras

- **ID:** `TASK-F15-11`
- **Descripción:** Crear roadmap posterior con deuda y mejoras.
- **Objetivo:** Entregar backlog priorizado por evidencia sin ampliar el alcance definido en el PRD y respetando los contratos técnicos aprobados.
- **Archivos que se modificarán:**
  - `/docs/pilot`
  - `/docs/runbooks`
  - `/docs/metrics`
  - `/packages/config`
  - `/docs/product/roadmap.md`
  - `/docs/backlog`
  - `/docs/tasks/task-f15-11.md`
- **Dependencias:**
  - Gate de salida de Fase 14.
  - Aprobación ejecutiva del piloto.
  - `TASK-F15-10`
- **Criterios de aceptación:**
  - Backlog priorizado por evidencia.
  - La salida mantiene trazabilidad con PRD, TRD y el documento especializado afectado; cualquier contradicción queda registrada como bloqueo o ADR.
- **Definition of Done:**
  - Los cambios de contrato, datos, dominio, interfaz e infraestructura aplicables están alineados y versionados en el mismo paquete de trabajo.
  - Las pruebas unitarias, integración, contrato, aislamiento, autorización, E2E o infraestructura requeridas para la tarea pasan en CI.
  - Se actualizaron documentación del módulo, trazabilidad, observabilidad y runbook cuando la operación introduce un nuevo fallo posible.
  - El reporte final de la tarea enumera archivos cambiados, requisitos cubiertos, pruebas ejecutadas, riesgos, deuda y validación manual pendiente.

---

# Anexo A — Quality gates globales

Todas las tareas de implementación deben aplicar los gates que correspondan: formato, lint, tipos, pruebas unitarias, integración con PostgreSQL, contratos OpenAPI, E2E, aislamiento multiempresa, autorización positiva y negativa, auditoría, idempotencia, seguridad de dependencias, escaneo de secretos, accesibilidad, observabilidad y documentación.

# Anexo B — Condiciones que obligan a detener una tarea

- Falta un valor o decisión material señalado en Fase 0.
- El PRD y un contrato técnico describen comportamientos incompatibles.
- La tarea requiere modificar archivos fuera del alcance indicado.
- Se necesita reducir permisos, historial, auditoría o privacidad para completar el flujo.
- No existe una muestra real necesaria, como formato Excel, plantilla sanitaria o política de publicación.
- La migración no tiene estrategia segura de compatibilidad y reversión.
- Una integración externa no tiene proveedor, credenciales de entorno o contrato aprobado.

# Anexo C — Formato de reporte de cierre

1. ID y resultado de la tarea.
2. Requisitos y decisiones cubiertos.
3. Archivos creados, modificados y eliminados.
4. Contratos, tablas, endpoints, eventos, permisos y estados afectados.
5. Pruebas ejecutadas y resultados.
6. Validaciones manuales pendientes.
7. Riesgos, deuda técnica y follow-ups propuestos.
8. Evidencia de que no se amplió el alcance ni se debilitó seguridad, auditoría o aislamiento.
