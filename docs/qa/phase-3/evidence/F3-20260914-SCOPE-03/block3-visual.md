# Ficha visual — Bloque 3 multi-cuenta

| Campo                    | Valor                                                                                          |
| ------------------------ | ---------------------------------------------------------------------------------------------- |
| RUN_ID                   | `F3-20260914-SCOPE-03`                                                                         |
| ID_CASO                  | `TEN-01 / TEN-06`                                                                              |
| Variante                 | Usuario multi-cuenta A/B, intento 1                                                            |
| Entorno                  | Local, `http://localhost:3000/access/context`                                                  |
| Ejecutor                 | Isaac, responsable individual                                                                  |
| Preparación              | `qa-multi@example.test`; membresía `TC` en `QA Visual Cuenta A` y `AU` en `QA Visual Cuenta B` |
| Evidencia técnica previa | [38/38 HTTP/PostgreSQL](phase3-http-postgres.json) y [preparación Auth](supabase-auth.json)    |
| Estado                   | `APROBADO`                                                                                     |

## Pasos ejecutados por el responsable

1. En la pestaña preparada, confirmar que sólo aparecen `QA Visual Cuenta A` y `QA Visual Cuenta B`.
2. Abrir `QA Visual Cuenta A`; confirmar que la pantalla identifica esa cuenta y no muestra nombres, contexto ni datos de B.
3. Volver a `/access/context`, abrir `QA Visual Cuenta B` y confirmar el criterio inverso.
4. Confirmar en la tarea que A y B se mostraron sin mezcla, sin adjuntar cookies, tokens ni contenido de DevTools.

## Resultado esperado

Ambas cuentas son seleccionables por el mismo usuario, el rol se recalcula por cuenta y ninguna vista revela datos de la otra cuenta.

## Resultado observado

El responsable confirmó: “Cuenta A y Cuenta B validadas sin mezcla de datos”. La pantalla preparada mostró A con rol `TC` y B con rol `AU`; al entrar a cada contexto no se observó información de la otra cuenta.

## Aprobación

Isaac, responsable individual — `APROBADO`, 14/09/2026. Esta aprobación corresponde al alcance local ajustado de la corrida `F3-20260914-SCOPE-03`.
