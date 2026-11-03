# Fase 7 — Estado de implementación

Inicio: 02/11/2026. P0 y P1 implementados localmente, con validación automatizada aprobada y revisión UX pendiente. Trabajo local autorizado por el usuario; sin commit, push ni integración. Se conservan los cambios locales anteriores. Gate F6 aprobado con EXC-F6-01; esa excepción sigue vigente.

| Prompt | Tareas                                  | Dependencias | Estado                              |
| ------ | --------------------------------------- | ------------ | ----------------------------------- |
| P0     | Arranque, decisiones y sala de revisión | Gate F6      | Implementado; revisión UX pendiente |
| P1     | F7-01 Programación y KPI                | P0           | Implementado; revisión UX pendiente |
| P2     | F7-02 Tickets                           | P0           | Pendiente                           |
| P3     | F7-03/04 Órdenes y estados              | P1, P2       | Pendiente                           |
| P4     | F7-05/06 Ejecución y evidencia          | P3           | Pendiente                           |
| P5     | F7-07 Revisión                          | P4           | Pendiente                           |
| P6     | F7-09 Base offline                      | P0           | Pendiente                           |
| P7     | F7-08/10 Responsable y descarga         | P3, P6       | Pendiente                           |
| P8     | F7-11/12 Cola y sincronización          | P7           | Pendiente                           |
| P9     | F7-14 UI móvil                          | P4, P8       | Pendiente                           |
| P10    | F7-13/15 Conflictos                     | P8           | Pendiente                           |
| P11    | F7-16 Borrado local                     | P6, P8       | Pendiente                           |
| P12    | F7-17 Suite de campo                    | P9, P10, P11 | Pendiente                           |
| P13    | Gate y pendientes F6                    | Todos        | Pendiente                           |

No ejecutar simultáneamente prompts con migraciones. P6 puede avanzar con P1–P5; P9, P10 y P11 pueden avanzar después de sus dependencias.

## Propuestas provisionales para Dirección

No constituyen aprobaciones. Responsables de decisión: Axel Quevedo Zamudio y Eduardo Ramos, con Responsable Técnico, Seguridad y Tech Lead.

| ID               | Propuesta                                                                                                                                                                                                                                                                               | Alternativas                                                            | Responsable técnico           |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------- |
| F7-D01 / DEC-009 | Evidencia declarada por versión de plantilla: antes/después, pieza, lectura con unidad/rango, lote y firma. Imagen máximo 10 MB; compresión a 1600 px y objetivo 2 MB sin eliminar el original antes de verificar el derivado. Firma: nombre y confirmación accesibles, dibujo opcional | Dibujo obligatorio con alternativa accesible; otros límites versionados | Responsable Técnico           |
| F7-D02 / DEC-022 | Dueño o administrador de la sucursal resuelve: conservar local, servidor o combinar campos, siempre con motivo y versión nueva; ambas fuentes se conservan                                                                                                                              | Solo Dueño; sin combinación                                             | Producto/Seguridad            |
| F7-D03 / DEC-018 | Descarga y bloqueo 72 h; 50 MB por orden y 250 MB por dispositivo. Al vencer, bloquear ejecución y exigir reconexión; administrador puede liberar con motivo. Dispositivo que no vuelve: expiración del bloqueo servidor; borrado local al siguiente acceso                             | 24 h o 7 días; otras cuotas                                             | Tech Lead/Seguridad           |
| F7-D04 / DEC-004 | Dueño revisa, corrige, reabre y anula; administrador solo en su sucursal; técnico ejecuta lo asignado y solicita corrección; auditor solo lee; ICE24 sin acceso implícito adicional                                                                                                     | Reapertura/anulación reservada al Dueño                                 | Producto/Seguridad            |
| F7-D05 / DEC-009 | Próxima desde alert_at; sin anticipación explícita, 7 días. Crítico = actividad vencida cuya plantilla indica criticidad crítica; no escalar por días inventados                                                                                                                        | Toda vencida crítica; umbral configurable                               | Responsable Técnico           |
| F7-D06 / DEC-018 | Frecuencia calendario en zona IANA de sucursal; ancla inicial instalación si existe, después inicio de plantilla/configuración cuando es posterior. Horas inexistentes avanzan al primer instante válido; ambigüedad elige primer instante                                              | Duraciones UTC exactas heredadas de F4                                  | Responsable Técnico/Tech Lead |

P1 debe marcar F7-D05/D06 como provisionales. La relación entre actividades de plantilla y componentes oficiales no existe en F4: se conservan las actividades de plantilla; se filtran las de componentes propios por configuración activa (RA-01-D3). No se inventa esa relación.

## Pendientes heredados

- EXC-F6-01: 12 recorridos con lector, QA/Tech Lead; retirar antes de UI productiva y como máximo en P13.
- `ui-quality` requerido en main: administrador del repositorio; instrucciones en QA.
- Demo en Preview: ADR-026 propuesto, desactivado hasta firma y protección verificada.
- Fuera del gate: DEC-020 tipografía/logo, DEC-018 dispositivos definitivos y O-02 tamaño de chunks Storybook.

Ver [guía de revisión](../qa/phase-7/README.md), [módulo](../modules/maintenance.md) y [prompts](phase-7-prompts.md).

Validación local con Docker completada: 154 pruebas de integración y 1687 pruebas Linux en cada pasada (generación y comparación). Las 976 baselines requieren aprobación UX. Ver [evidencia](../qa/phase-7/linux-validation.md). No se hizo commit ni push.
