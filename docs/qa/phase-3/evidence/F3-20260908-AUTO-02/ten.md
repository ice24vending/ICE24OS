# F3-20260908-AUTO-02 — Permisos y aislamiento

LOCAL HTTP/PostgreSQL aislado. Ejecutor Codex; aprobación humana PENDIENTE.
Fecha UTC: 2026-09-09T03:51:51.097Z a 2026-09-09T03:51:54.769Z. SHA base 11148e9dbadbc160ee4fe1d5d33ec714308905a7 con cambios sin commit.
JWKS/AAL sintéticos no acreditan Supabase/TOTP reales.

## TEN-01 — Propietarios exclusivos en UI

- Estado integral: **EN_CURSO**.
- Análisis: Se conservan IA/A y OW-B/B humanos. API OW/OW probada; falta OW-A en navegador y HTML/respuestas.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario TEN-01 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: API lista exclusivamente la cuenta propia (complemento de UI): APROBADO
- Evidencia: [HTTP/PostgreSQL](http-postgres.json), [inicial](http-postgres-before.json).
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## TEN-02 — Activación cruzada A→B y B→A

- Estado integral: **EN_CURSO**.
- Análisis: Positivos 201, cruce A/B 404 sin nuevas sesiones. Corregido P0002/500; faltan auditoría detallada y tokens reales.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario TEN-02 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: Activación propia y cruce A/B sin efectos: APROBADO
- Evidencia: [HTTP/PostgreSQL](http-postgres.json), [inicial](http-postgres-before.json).
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## TEN-03 — Modificar asociación ajena por ID

- Estado integral: **EN_CURSO**.
- Análisis: Objeto ajeno 404 sin cambio de estado. Falta control propio en ambos sentidos y versión/historia.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario TEN-03 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: Modificar membresía ajena A/B: APROBADO
- Evidencia: [HTTP/PostgreSQL](http-postgres.json), [inicial](http-postgres-before.json).
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## TEN-04 — Crear asociación con accountId ajeno

- Estado integral: **EN_CURSO**.
- Análisis: Ambos cruces 404 sin nuevas membresías. Falta control positivo específico de alta secundaria.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario TEN-04 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: Crear asociación en cuenta ajena: APROBADO
- Evidencia: [HTTP/PostgreSQL](http-postgres.json), [inicial](http-postgres-before.json).
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## TEN-05 — Manipular cabeceras y contexto de otro usuario

- Estado integral: **EN_CURSO**.
- Análisis: Contexto ajeno rechazado en lectura/escritura. Falta cabecera resource-account y demás variantes.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario TEN-05 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: Contexto ajeno con identidad válida: APROBADO
- Evidencia: [HTTP/PostgreSQL](http-postgres.json), [inicial](http-postgres-before.json).
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## TEN-06 — Cambio de contexto del usuario multi-cuenta

- Estado integral: **EN_CURSO**.
- Análisis: Conmutación HTTP revoca contexto anterior; fixture OW/OW. Falta TC/AU y Atrás/Adelante.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario TEN-06 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: Conmutación multi-cuenta API y revocación contexto anterior: APROBADO
- Evidencia: [HTTP/PostgreSQL](http-postgres.json), [inicial](http-postgres-before.json).
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## TEN-07 — Consulta: lectura autorizada y escritura de negocio denegada

- Estado integral: **EN_CURSO**.
- Análisis: AU lee y no crea membresías con aal2 sintético. Falta transición negativa y persistencia.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario TEN-07 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: Consulta lee, escritura denegada con MFA de laboratorio: APROBADO
- Evidencia: [HTTP/PostgreSQL](http-postgres.json), [inicial](http-postgres-before.json).
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## TEN-08 — Decisión explícita sobre lectura estricta y perfil propio

- Estado integral: **BLOQUEADO**.
- Análisis: Producto debe decidir excepción de perfil propio: AU recibe profile-update frente a requisito de lectura estricta.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario TEN-08 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: No ejecutado integralmente; ver límites del análisis.
- Evidencia: Revisión documental/evidencia previa; no sustituye ejecución.
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## TEN-09 — Suspensión en caliente de asociación

- Estado integral: **EN_CURSO**.
- Análisis: Suspensión invalida lectura y nueva activación. Falta escritura antes permitida y evento/tiempo.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario TEN-09 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: Suspensión invalida contexto activo: APROBADO
- Evidencia: [HTTP/PostgreSQL](http-postgres.json), [inicial](http-postgres-before.json).
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## TEN-10 — Reactivación, asociación terminada y vigencias

- Estado integral: **NO_EJECUTADO**.
- Análisis: Pendiente reactivación, ENDED y vigencias sin resucitar contexto revocado.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario TEN-10 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: No ejecutado integralmente; ver límites del análisis.
- Evidencia: Revisión documental/evidencia previa; no sustituye ejecución.
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## TEN-11 — Cuenta READ_ONLY

- Estado integral: **EN_CURSO**.
- Análisis: READ_ONLY lee y bloquea escritura 403; restaurado. Faltan UI y MULTI en otra cuenta.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario TEN-11 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: Solo lectura bloquea escritura y conserva lectura: APROBADO
- Evidencia: [HTTP/PostgreSQL](http-postgres.json), [inicial](http-postgres-before.json).
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## TEN-12 — Ámbitos, sensibilidad y denegación explícita

- Estado integral: **EN_CURSO**.
- Análisis: DENY domina ALLOW probado; faltan ámbitos y sensibilidad.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario TEN-12 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: DENY explícito domina ALLOW del propietario: APROBADO
- Evidencia: [HTTP/PostgreSQL](http-postgres.json), [inicial](http-postgres-before.json).
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## TEN-13 — Cobertura de los nueve roles base

- Estado integral: **EN_CURSO**.
- Análisis: OW podía conceder IA (201), corregido 403. Faltan nueve roles por tres acciones.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario TEN-13 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: Propietario no puede conceder roles de plataforma: APROBADO
- Evidencia: [HTTP/PostgreSQL](http-postgres.json), [inicial](http-postgres-before.json).
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## TEN-14 — Concurrencia y versión esperada

- Estado integral: **EN_CURSO**.
- Análisis: Carrera de suspensión 201/409; faltan transiciones incompatibles y versiones inválidas.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario TEN-14 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: Una sola transición gana con misma versión: APROBADO
- Evidencia: [HTTP/PostgreSQL](http-postgres.json), [inicial](http-postgres-before.json).
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.

## TEN-15 — RLS, acceso directo y aislamiento real

- Estado integral: **EN_CURSO**.
- Análisis: Lectura/escritura SET LOCAL ROLE anon/authenticated denegadas; pgTAP verifica RLS. Faltan clientes reales y cobertura de tablas.
- Preparación: base qa_phase3_1788925911097 y fixtures independientes. Casos humanos requieren prerrequisitos originales.
- Pasos/esperado: escenario TEN-15 de [test-suite](../../test-suite.md); criterio original conservado.
- Observado: Acceso directo anon/authenticated denegado: APROBADO; Escritura directa anon/authenticated denegada: APROBADO
- Evidencia: [HTTP/PostgreSQL](http-postgres.json), [inicial](http-postgres-before.json).
- Próximo paso: completar variantes indicadas, adjuntos sanitizados, cliente, tiempos y correlaciones.
- Limpieza: base de laboratorio retenida; fixtures humanos no modificados.
- Aprobador nominal: PENDIENTE. APROBADO técnico tiene sólo el alcance declarado.
