# TASK-F7-05 — Ejecución y cierre

Implementación local P4, 04/11/2026; sin commit ni push. Rama conjunta `codex/f7-p4-p5-p6` sobre P3 local por petición de completar P4/P5/P6 en esta sesión. No se declara P3 integrado en main.

UI-WO-02: `/maintenance/work-orders/:id/execute`, checklist y campos de la definición congelada, diagnóstico, actividades, refacciones, pruebas, recomendación, resultado y seguimiento. Guarda borradores versionados y conserva el formulario ante fallo o conflicto; protege navegación mediante `useUnsavedChanges`. UI-WO-03: `/close`, resumen persistido y faltantes enlazados al control correspondiente. No cierra con fotos pendientes ni inventa conformidad ante lecturas fuera de rango.

API: GET/POST `/v1/work-orders/:id/execution`; cierre por `/transitions`. Requiere técnico asignado vigente, ámbito actual, cuenta escribible, versión esperada e idempotencia. El servidor vuelve a validar requisitos y archivos privados. Migración `20261104000100_phase7_execution_reviews.sql`: ejecuciones y vínculos append-only. Auditoría, versión y ejecución en la misma transacción.

Validación: [registro conjunto](../qa/phase-7/execution-offline-validation.md). Recorrido `execution-evidence-close`, con servicios de navegador simulados y persistencia real validada por PostgreSQL. No sustituye una aprobación humana.

Claridad de requisitos en móvil aprobada por el usuario el 04/11/2026 («Sí, se entiende claramente»). No sustituye las demás revisiones. Pregunta validada: **¿Un técnico entiende en el celular qué le falta para cerrar y puede llegar a cada campo desde el resumen?** Revisar 375, 768, 1280 y 1440 px, teclado y lector de pantalla.
