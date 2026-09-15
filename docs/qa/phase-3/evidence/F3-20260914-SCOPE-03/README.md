# Evidencia F3-20260914-SCOPE-03

**Estado de la corrida: COMPLETADA Y APROBADA.** Los bloques funcionales automatizados terminaron sin fallos y el responsable confirmó en la UI que el usuario multi-cuenta puede entrar a A y B sin mezcla de datos.

## Identificación

| Campo                     | Valor                                                                                   |
| ------------------------- | --------------------------------------------------------------------------------------- |
| RUN_ID                    | `F3-20260914-SCOPE-03`                                                                  |
| Entorno                   | Supabase local, API `127.0.0.1:3001`, UI `localhost:3000`                               |
| Base                      | `11148e9dbadbc160ee4fe1d5d33ec714308905a7` con cambios locales registrados en Git       |
| Ejecutor técnico          | Codex, automatización QA local                                                          |
| Aprobador del alcance     | Isaac, responsable individual; confirmación visual recibida el 14/09/2026               |
| Datos                     | Cuentas y usuarios sintéticos `.test`; contraseñas, tokens, TOTP y claves excluidos     |
| Material privado temporal | `tmp/phase3-block3-private.json` y `tmp/phase3-runtime-private.json`, ignorados por Git |

## Ajuste de alcance autorizado

| Elemento                                                                                                      | Tratamiento de entrega                        | Justificación                                                                                  |
| ------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Pentest externo (`SEC-15`)                                                                                    | `NO_APLICA / EXIMIDO PARA ALCANCE DE ENTREGA` | Desarrollo directo e individual; no se exige auditoría externa para cerrar esta entrega local. |
| Evaluación formal WCAG (`UX-01` a `UX-12`)                                                                    | `NO_APLICA / EXIMIDO PARA ALCANCE DE ENTREGA` | Se omite la certificación formal de accesibilidad por instrucción del responsable.             |
| Firmas de Jurídico, Seguridad y Producto (`CLOSE-02`, `CLOSE-03`, `CLOSE-05` y la parte formal de `CLOSE-04`) | `NO_APLICA / EXIMIDO PARA ALCANCE DE ENTREGA` | El responsable individual acepta el alcance sin circuito departamental.                        |

Estas exenciones no afirman que se realizó un pentest, una auditoría WCAG o una revisión jurídica. Sólo eliminan esos elementos del gate de esta entrega.

## Resultado funcional automatizado

| Bloque            | Casos acreditados                                                                               | Resultado observado                                                                                                                                                                                                      | Estado     |
| ----------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| 1. Login negativo | `AUTH-06`, `AUTH-07`                                                                            | Usuario existente con clave incorrecta y usuario inexistente recibieron la misma respuesta pública, sin token; el control válido autenticó.                                                                              | `APROBADO` |
| 2. MFA            | `AUTH-11` a `AUTH-15`                                                                           | Enrolamiento TOTP real; códigos incorrecto y vencido rechazados; código vigente elevó el token a `aal2`; una operación crítica rechazó `aal1` y aceptó el control `aal2`.                                                | `APROBADO` |
| 4. Revocación     | `SES-01` a `SES-11`, salvo que `SES-08` se acredita por prueba unitaria de fallo de dependencia | Revocación individual, contextual y global; cliente no revocado conservó acceso; dos refresh tokens reales quedaron inválidos; límites inactivo/absoluto y eventos se comprobaron.                                       | `APROBADO` |
| 5. Recuperación   | `REC-01` a `REC-17` con evidencia compuesta local                                               | Respuesta ciega, cambio de clave, enlace usado y vencido, revocación previa, doble control, MFA, concurrencia, REC-14, replay y fallos de proveedor fueron comprobados por proveedor local, HTTP/PostgreSQL y unitarias. | `APROBADO` |
| 3. Multi-cuenta   | `TEN-01` a `TEN-15` en API/SQL; confirmación visual final de `TEN-01`/`TEN-06`                  | 38 comprobaciones HTTP/PostgreSQL pasaron. El responsable validó A y B en la UI y confirmó que no hubo mezcla de datos.                                                                                                  | `APROBADO` |

La evidencia compuesta indica el nivel de cada comprobación. Un proveedor local real acredita Auth local; el harness HTTP usa identidad/JWKS sintéticos para controlar variantes de autorización.

## Gates técnicos

| Verificación                             | Resultado                                                                                                                                             |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                             | `APROBADO`: 14 archivos, 47 pruebas unitarias; formato, lint, tipos y validadores estructurales en verde.                                             |
| `pnpm build`                             | `APROBADO`: 14 paquetes.                                                                                                                              |
| `pnpm test:integration`                  | `APROBADO`: 1/1 integración PostgreSQL/PostGIS con Docker.                                                                                            |
| `supabase test db`                       | `APROBADO`: 29/29 pgTAP; 18/18 corresponden a identidad Fase 3.                                                                                       |
| `supabase db lint --local --level error` | Comando terminado; los hallazgos informados pertenecen a funciones instaladas por la extensión PostGIS, no a funciones de los esquemas de aplicación. |
| Harness HTTP/PostgreSQL                  | `APROBADO`: 38/38.                                                                                                                                    |
| Supabase Auth local real                 | `APROBADO`: 5/5 grupos, sin material sensible en el reporte.                                                                                          |

## Archivos sanitizados

- [Reporte HTTP/PostgreSQL](phase3-http-postgres.json)
- [Reporte Supabase Auth](supabase-auth.json)
- [Ficha de validación visual](block3-visual.md)

No se adjuntan cookies, JWT, refresh tokens, códigos/semillas TOTP, claves de Supabase, contraseñas ni enlaces activos de recuperación.

## Decisión final

Con los resultados técnicos, la validación visual del responsable y las exenciones expresas registradas, la **Fase 3 queda COMPLETADA Y APROBADA** para el alcance de entrega individual.
