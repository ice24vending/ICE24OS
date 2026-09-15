# F3-20260908-AUTO-02 — Sesiones

LOCAL HTTP/PostgreSQL aislado. Ejecutor Codex; aprobación humana PENDIENTE.
Fecha UTC: 2026-09-09T03:51:51.097Z a 2026-09-09T03:51:54.769Z. SHA base 11148e9dbadbc160ee4fe1d5d33ec714308905a7 con cambios sin commit.
JWKS/AAL sintéticos no acreditan Supabase/TOTP reales.

## SES-01 — Revocar sesión N1 desde N2

- Estado integral: **EN_CURSO**.
- Análisis: Dos session_id sintéticos, revocar uno conserva el otro. Falta comando y evento desde token N2 específico.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario SES-01 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: Revocación individual; cliente independiente conserva acceso: APROBADO
- Evidencia: [HTTP/PostgreSQL](http-postgres.json), [inicial](http-postgres-before.json).
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## SES-02 — Conservar sesión no revocada y rechazar ID ajeno

- Estado integral: **EN_CURSO**.
- Análisis: Revocación ajena 404, lectura ajena conservada. Falta escritura positiva y ausencia de evento.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario SES-02 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: Revocación de sesión ajena rechazada: APROBADO
- Evidencia: [HTTP/PostgreSQL](http-postgres.json), [inicial](http-postgres-before.json).
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## SES-03 — Cerrar todas las sesiones desde Perfil

- Estado integral: **NO_EJECUTADO**.
- Análisis: Pendiente Perfil en dos clientes reales y logout Supabase confirmado.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario SES-03 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: No ejecutado integralmente; ver límites del análisis.
- Evidencia: Revisión documental/evidencia previa; no sustituye ejecución.
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## SES-04 — Revocación local por API frente a identidad global

- Estado integral: **EN_CURSO**.
- Análisis: 204 revoca contextos. Primer ensayo esperaba erróneamente 201; corregido al contrato. Falta /me posterior y refresh real.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario SES-04 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: Revocación de todos los contextos por API: APROBADO
- Evidencia: [HTTP/PostgreSQL](http-postgres.json), [inicial](http-postgres-before.json).
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## SES-05 — Cerrar sólo contexto A

- Estado integral: **EN_CURSO**.
- Análisis: Cerrar A conserva lectura B y permite nueva A. Falta comando B y correlación.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario SES-05 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: Cerrar A conserva B y permite nueva activación de A: APROBADO
- Evidencia: [HTTP/PostgreSQL](http-postgres.json), [inicial](http-postgres-before.json).
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## SES-06 — Retirar acceso de A conservando B

- Estado integral: **EN_CURSO**.
- Análisis: Suspender A invalida A y conserva B. Falta nueva activación y escritura B real.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario SES-06 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: Suspender A conserva B en otra sesión: APROBADO
- Evidencia: [HTTP/PostgreSQL](http-postgres.json), [inicial](http-postgres-before.json).
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## SES-07 — Revocación global y reutilización de tokens

- Estado integral: **NO_EJECUTADO**.
- Análisis: Pendiente logout real y reutilización JWT/refresh. Guard offline no consulta revocación del proveedor: riesgo abierto.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario SES-07 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: No ejecutado integralmente; ver límites del análisis.
- Evidencia: Revisión documental/evidencia previa; no sustituye ejecución.
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## SES-08 — Fallo de dependencia durante cierre global

- Estado integral: **EN_CURSO**.
- Análisis: BFF falla 503 sin borrar cookie cuando API/proveedor falla (mocks). Falta fallo real, cliente N2 y reintento.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario SES-08 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: No ejecutado integralmente; ver límites del análisis.
- Evidencia: Revisión documental/evidencia previa; no sustituye ejecución.
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## SES-09 — Inactividad administración/campo

- Estado integral: **EN_CURSO**.
- Análisis: Fixture idle_expires_at vencido rechazado. Falta actividad, campo y política nominal.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario SES-09 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: Límite inactivo SQL (reloj del fixture): APROBADO
- Evidencia: [HTTP/PostgreSQL](http-postgres.json), [inicial](http-postgres-before.json).
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## SES-10 — Duración absoluta independiente de actividad

- Estado integral: **EN_CURSO**.
- Análisis: Fixture expires_at vencido rechazado. Falta máximo absoluto durante conmutación/refresh y reloj real.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario SES-10 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: Límite absoluto SQL (reloj del fixture): APROBADO
- Evidencia: [HTTP/PostgreSQL](http-postgres.json), [inicial](http-postgres-before.json).
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## SES-11 — Eventos de revocación y correlación

- Estado integral: **EN_CURSO**.
- Análisis: CONTEXT_REVOKED comprobado y atómico. Falta correlación de tres eventos y proveedor real.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario SES-11 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: Cierre contextual genera CONTEXT_REVOKED: APROBADO
- Evidencia: [HTTP/PostgreSQL](http-postgres.json), [inicial](http-postgres-before.json).
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## SES-12 — TTL del access token y renovación segura

- Estado integral: **BLOQUEADO**.
- Análisis: TTL/renovación pendientes ADR-017. Guardar refresh token no acredita renovación.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario SES-12 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: No ejecutado integralmente; ver límites del análisis.
- Evidencia: Revisión documental/evidencia previa; no sustituye ejecución.
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.
