# Estado de Fase 3 — Identidad, autenticación, multiempresa y autorización

Fecha de corte: 29 de agosto de 2026.

| Tarea | Implementación versionada | Gate operativo                                          |
| ----- | ------------------------- | ------------------------------------------------------- |
| F3-01 | Terminada                 | PoC Supabase remota/SMTP pendiente                      |
| F3-02 | Terminada                 | Enlace remoto por `sub` pendiente de PoC                |
| F3-03 | Terminada                 | Rotación bajo tráfico real pendiente                    |
| F3-04 | Terminada                 | Envío de invitación remota pendiente                    |
| F3-05 | Terminada                 | Validación funcional de matriz pendiente                |
| F3-06 | Terminada                 | Prueba E2E con dos cuentas remotas pendiente            |
| F3-07 | Terminada                 | Matriz completa de fases futuras continúa versionándose |
| F3-08 | Terminada                 | Prueba de penetración externa pendiente                 |
| F3-09 | Terminada                 | Revocación global remota pendiente                      |
| F3-10 | Terminada                 | Evidencia admisible y operadores nominales pendientes   |
| F3-11 | Terminada                 | E2E de deep links remoto pendiente                      |
| F3-12 | Terminada                 | Backend/retención de auditoría pendiente de decisión    |
| F3-13 | Terminada                 | pgTAP local requiere Docker; CI la ejecuta              |
| F3-14 | Terminada                 | Auditoría manual WCAG/visual pendiente                  |

## Resultado local

La fase entrega contratos, migración PostgreSQL/RLS, permisos híbridos, guards OIDC, BFF seguro, sesiones de contexto, invitación privada, recuperación dual, auditoría y pantallas responsivas. `pnpm check`, `pnpm build`, las unitarias y el verificador estructural de Fase 3 son los gates locales. La suite pgTAP queda conectada al workflow existente de Supabase.

## Gate no declarable sin entorno

No hay credenciales, proyecto Supabase remoto, SMTP ni operadores humanos nombrados en esta máquina. Por tanto no se afirma que un correo real haya llegado, que TOTP remoto esté habilitado, que una revocación se propagó en producción ni que la recuperación recibió aprobación humana. Antes de producción también se requiere resolver el estado “en revisión” de ADR-017 y los responsables de F0-07/F0-08.
