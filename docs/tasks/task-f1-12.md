# TASK-F1-12 — Fixtures y semillas

- Estado: implementada para el alcance fundacional.
- Archivos principales: `packages/testing/src/fixtures`, `packages/database/src/seeds`.
- Criterios cubiertos: dataset determinista versión 1, dos cuentas aisladas, dos usuarios ficticios, dominios `.invalid` y marca `isSynthetic`.
- Validación: prueba confirma dos tenants y ausencia de correo entregable; build y tipos pasan.
- Seguridad: no contiene datos personales, códigos de máquina, límites sanitarios ni plantillas no aprobadas.
- Pendiente: las semillas de mantenimiento dependen de las plantillas reales de F0-11 y no se inventaron.
