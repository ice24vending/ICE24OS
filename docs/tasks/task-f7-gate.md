# P13 — Preparación del gate F7

## Estado vigente — 11/11/2026

Preparación local en `codex/f7-p13-gate`, desde el pulido `591fe07` ([PR #68](https://github.com/ice24vending/ICE24OS/pull/68), abierto, sin fusionar). Main sigue en `ab00e1f`, con #66 y #67 integrados. El stash `0bd09235b4746deb9c74a7001df1312789aa0261` se aplicó sin conflictos y permanece como respaldo; los siete archivos no rastreados restaurados coinciden byte por byte con sus blobs, incluido phase-6.docx. No se aplicaron migraciones ni cambios de permisos, roles, tolerancias o protección remota.

**Gate F7 pendiente; no aprobado.** [Checklist y responsables](../qa/phase-7/gate-f7.md), [guion de lector](../qa/phase-7/screen-reader-script.md), [protocolo físico](../qa/phase-7/field-test-protocol.md), [decisiones para firma](../qa/phase-7/decisions-for-signature.md). P13 tendrá commit local, sin push ni PR hasta integrar el pulido y contar con autorización. Los apartados siguientes conservan antecedentes fechados; no reemplazan este estado vigente.

Antecedente del 08/11/2026. Rama `codex/f7-gate`, candidato `717b7b8` del PR #66 (abierto); main `fbfbcf8`. Preparación local, sin commit ni push. No se integró el PR ni se cambió protección de GitHub.

## Resultado

[Declaración de cierre](../qa/phase-7/evidence/20261108-declaracion-cierre.md): **rechazado**. El usuario confirmó que no ejecutó lectores ni campo físico. EXC-F6-01 sigue vigente, sin extender su fecha límite. `ui-quality` ya es requerido por el ruleset 26916128, verificado el 09/11/2026; G7-03 resuelto. Las consultas anteriores sin protección se conservan como antecedentes. La aprobación UX UI-SYNC-01 permanece válida, sin convertirla en firma del gate.

## Archivos modificados

- `docs/qa/phase-7/evidence/20261108-declaracion-cierre.md`: dictamen, batería antecedente, riesgos, bloqueos, decisiones y firmas pendientes.
- `docs/qa/phase-7/evidence/20261108-gate-github.json`: evidencia mínima de consultas a GitHub y PR #66.
- `docs/qa/phase-7/traceability.md`: matriz F7-01…17 y referencias verificables.
- `docs/qa/phase-7/README.md`, `ux-signoff.md`, `field-tests.md`, `screen-reader-walkthroughs.md`: entrada de revisión, aprobación UX preservada y evidencia humana pendiente.
- `docs/qa/phase-6/ux-signoff.md`, `docs/qa/phase-6/evidence/20261030-excepcion-d02.md`: revisión del retiro sin inventar resultados ni alterar firmas históricas.
- `docs/backlog/phase-7-status.md`, `context/TASKS.md`: estado de integración, dependencia #66 y pendientes F8 sin aprobar el gate.
- `docs/tasks/task-f7-gate.md`: este reporte.

Se conservan fuera de esta tarea los cambios previos de next-env, README, estado F6, `.tmp/` y documentos de ingeniería F6. No cambian código de aplicación, contratos, migraciones, baselines ni tolerancias.

## Validación y alcance

Verificación remota de solo lectura ejecutada: rama, protección clásica, reglas efectivas, rulesets y PR #66. `pnpm format:check`: aprobado. `git diff --check`: aprobado. Comprobación documental: 10 documentos, 79 enlaces locales existentes, las 17 tareas presentes exactamente una vez en el índice P13 y 34 referencias de código/pruebas existentes. No se cambian tolerancias ni comprobaciones.

La batería final P13 queda pendiente y el usuario confirmó ausencia de los prerrequisitos humanos. La dependencia #66 se resolvió según la actualización siguiente. Se conservan como antecedentes 1.033 unitarias, build 14/14, integración 204/204, UI Linux 2.283/2.283, 3 regresiones de zona horaria, 1.292 capturas y 11 videos de P10–P12. No se atribuyen esas ejecuciones a P13. No se acredita prueba física ni lector por pasar axe.

## Riesgos y siguientes pasos

Antes de aceptar F7: completar los 12 recorridos heredados y adicionales F7 con lector; los 10 escenarios físicos; configurar/verificar checks requeridos; integrar dependencias por revisión; repetir batería final y criterio F7; resolver decisiones o mantenerlas con responsable según alcance autorizado; obtener firmas de Dirección/QA y completar las pantallas pendientes. O-02, DEC-020 y dispositivos definitivos DEC-018 se mantienen fuera del gate. No trasladar EXC-F6-01 como excepción aceptada a F8.

## Checklist de revisión del cierre

1. ¿Cada recorrido humano tiene resultado, equipo, versión, responsable y evidencia?
2. ¿Se corrigieron los defectos y existe base para retirar EXC-F6-01?
3. ¿`ui-quality` bloquea realmente el merge en main?
4. ¿La batería final corresponde al commit integrado que se quiere aprobar?
5. ¿Las políticas pendientes tienen responsable y no se confunden con aprobación UX?
6. ¿Dirección y Tech Lead/QA firmaron expresamente el dictamen?

Todas estas comprobaciones siguen abiertas donde la declaración así lo indica. La revisión de P13 es documental; no se solicita nuevamente la aprobación de UI-SYNC-01.

## Seguimiento autorizado — 09/11/2026

Verificación posterior: `pnpm check` aprobado, 1.042 pruebas en 133 archivos; `git diff --check` aprobado. Evidencia remota mínima en `tmp/f7-main-protection-before.json`; no se aplicó el ruleset. Estas verificaciones no sustituyen la batería final P13 ni sus pruebas humanas.

1. F7-18 corregido: reserva activa exige `expires_at>now()`. Una reserva vencida pendiente del worker pasa a `expired`, con auditoría, antes de insertar su reemplazo; todo en la transacción y bloqueo de orden existentes. Integración focal: 40 aprobadas, una prueba de navegador omitida por bandera (`tmp/f7-18-expired-integration.log`). Comprueba también rollback si falla auditoría y replay sin duplicados. No se hizo una nueva pasada UI; los resultados de [F7-18](task-f7-18.md) conservan su procedencia.
2. Aprobación final F7-18 ausente de `ux-signoff.md`: no commit ni PR. Cuando el usuario la registre, usar solo la lista cerrada y hunks de A en `codex/f7-route-download`, excluyendo P13/F6 y phase-6.docx. No fusionar.
3. [PR #66](https://github.com/ice24vending/ICE24OS/pull/66) ya integrado por `CalixtoIsaac` a las 05:29:03 UTC del 09/11, commit `233f9158673d46f7213d0894171bd381e552edc6`. No falta nada para integrarlo; no se efectuó merge en esta revisión. Main apunta a ese commit; 12 check-runs exitosos y Vercel exitoso.
4. Propuesta de ruleset debajo, sin aplicar. GitHub devuelve `protected=false`, rulesets `[]` y reglas efectivas `[]`. Espera autorización expresa, conforme al paso 4 del usuario.
5. B permanece separado, 35/35 SHA-256 del manifiesto verificados. Restauración en rama nueva desde main e implementación B, después C con `sanitary.release`, pendientes de continuar tras esta pausa. Un PR por bloque; sin migraciones remotas ni publicación no autorizada.
6. Estado y declaración actualizados, manteniendo los pendientes humanos con responsable. **Gate F7 no aprobado**.

### Propuesta de configuración (no aplicada)

Ruleset adicional `main-require-ui-quality`, activo solo para `refs/heads/main`, sin actores con bypass; exige el check exacto `ui-quality` emitido por GitHub Actions (app 15368, verificada en los check-runs), y rama actualizada con main. No cambia tolerancias, workflows, revisiones exigidas ni otras políticas. No obliga por sí mismo a usar PR: su alcance es exigir el check solicitado. El workflow existente se ejecuta en todos los PR y su agregador falla si pruebas o artefactos fallan/se cancelan/se omiten.

Payload preparado en `tmp/f7-main-ui-quality-ruleset.json`:

```json
{
  "name": "main-require-ui-quality",
  "target": "branch",
  "enforcement": "active",
  "bypass_actors": [],
  "conditions": {
    "ref_name": {
      "include": ["refs/heads/main"],
      "exclude": []
    }
  },
  "rules": [
    {
      "type": "required_status_checks",
      "parameters": {
        "required_status_checks": [
          {
            "context": "ui-quality",
            "integration_id": 15368
          }
        ],
        "strict_required_status_checks_policy": true,
        "do_not_enforce_on_create": false
      }
    }
  ]
}
```

API prevista **solo tras autorización**: `POST /repos/ice24vending/ICE24OS/rulesets` con este payload. Antes de aplicar, consultar otra vez reglas y protección para no duplicar ni sustituir cambios ajenos. Después, verificar ruleset activo y `GET /repos/ice24vending/ICE24OS/rules/branches/main`, contexto/app/política estricta. No se ha ejecutado el POST ni se ha probado el bloqueo intentando fusionar. Referencia de formato: [API oficial de rulesets](https://docs.github.com/en/rest/repos/rules#create-a-repository-ruleset).

### Pendientes humanos (sin cambio de plazo)

| Pendiente                            | Responsable                                             | Condición de cierre                                                                               |
| ------------------------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 12 recorridos SR-01…SR-12, EXC-F6-01 | Calixto Isaac Galeana Medrano, Tech Lead/QA             | Evidencia real por recorrido; sin extender plazo: antes de UI productiva y como máximo gate F7    |
| 10 escenarios físicos                | QA / Técnico / Seguridad                                | Dispositivo, resultado, fecha, responsable y evidencia por escenario                              |
| Revisiones UX faltantes P0–P5        | Dirección: Axel Quevedo Zamudio / Eduardo Ramos, con QA | Registrar revisión pendiente sin borrar UI-MNT-01/02, P7–P9, UI-SYNC-01 ni aprobaciones parciales |
| Decisión F7-D07                      | Responsable Técnico / Dirección                         | Resolver procedimiento/piezas explícitamente                                                      |
| Firma Dirección                      | Axel Quevedo Zamudio / Eduardo Ramos                    | Firma expresa del dictamen final                                                                  |
| Firma Tech Lead / QA                 | Calixto Isaac Galeana Medrano                           | Evidencia humana y batería final antes de firmar                                                  |

Los documentos P13 y esta propuesta quedan fuera del commit A. No se cambia `ux-signoff.md` ni se registra aprobación por inferencia.

### Antecedente de autorización y acceso — 09/11/2026 (resuelto posteriormente)

El usuario autorizó expresamente aplicar el ruleset preparado. Se intentó el POST con el payload exacto; GitHub respondió 404. La sesión CLI es CalixtoIsaac y los permisos efectivos son push=true, admin=false, maintain=false. En aquel momento, la consulta posterior devolvió rulesets=[] y quedó pendiente el acceso administrativo. Este bloqueo quedó resuelto después por el dueño mediante el ruleset 26916128; no se requiere otra autenticación ni repetir la autorización. Evidencia local: tmp/f7-main-ui-quality-applied.json. No es un rechazo de aprobación automática, sino de acceso de GitHub.

B se restauró por separado en codex/f7-field-usability, worktree C:/Users/isaac/.codex/worktrees/f7-field-usability/ICE24OS, desde el main remoto verificado 233f915. Se verificaron los 35 hashes originales y se excluyeron los hunks de A. Validación B en curso; no se declara terminado ni se publica. C permanece pendiente y usará sanitary.release explícito. El gate F7 sigue rechazado; firmas, lectores, campo y revisiones humanas no cambian.

## Protección main resuelta — 09/11/2026

**G7-03 resuelto.** El dueño del repositorio, cuenta personal `ice24vending`, aplicó el ruleset [26916128: main-require-ui-quality](https://github.com/ice24vending/ICE24OS/rules/26916128). El usuario confirmó que este repositorio personal no permite otorgar Admin a colaboradores. Se verificó de nuevo mediante GET, sin cambiar ajustes remotos:

- `enforcement=active`, ámbito exclusivo `refs/heads/main`, sin exclusiones.
- Check obligatorio `ui-quality`, GitHub Actions app `15368`.
- `strict_required_status_checks_policy=true`; `do_not_enforce_on_create=false`.
- `GET rules/branches/main` devuelve esa regla efectiva con `ruleset_id=26916128`.
- `current_user_can_bypass=never` para `CalixtoIsaac`.

La autorización pendiente de acceso y la observación «main sin protección» quedan superadas por esta evidencia. El intento anterior 404 permanece como antecedente; no se repitió el POST. No se intentó fusionar para comprobar el bloqueo. No se hace commit, push ni migración remota.

El gate F7 **no queda aprobado**: continúan lectores EXC-F6-01 sin ampliar plazo, escenarios físicos, UX faltante P0–P5, F7-D07, batería final del candidato y firmas de Dirección/QA, con los responsables ya registrados. B sigue en validación separada y C pendiente.

[Evidencia JSON](../qa/phase-7/evidence/20261109-main-ruleset.json).

## Validación técnica final P13 — 11/11/2026

[Resultados y hashes](../qa/phase-7/evidence/20261111-p13-preflight.json): `pnpm check` 1.076/1.076 (141 archivos), build 14/14, Linux preflight + teclado 19/19, axe Dashboard 30/30, visual Dashboard 36/36, Storybook compilado. Sin reintentos ni cambios de baselines en la ejecución final. El preflight cubre los 12 recorridos en 375/768/1280 y seis personas. No sustituye NVDA/VoiceOver ni campo físico.

Se corrigió un defecto real: el Dashboard F6 montaba la región de estado después de la respuesta; ahora existe antes de la acción, con `aria-live` y `aria-atomic`, y queda visualmente oculta mientras está vacía. Historia `AnuncioDeActualizacion` y prueba de persistencia añadidas. No cambió la información demo; se reutiliza su acción de actualización.

Hubo fallos previos: primera selección amplia 44 aprobadas/7 fallidas (tres ambigüedades del localizador de alertas, tres fallos del anuncio, una navegación de menú en tablet). Tras corregirlos pasaron 19 y 30; la primera comparación visual tuvo 8 aprobadas/28 fallidas por espacio de la región vacía. Se inspeccionó y corrigió el layout con `ids-visually-hidden`; las 36 comparaciones finales pasan contra las imágenes originales. Los 75 análisis axe registraron cero infracciones y 26 análisis con contraste indeterminado, que siguen pendientes de QA/UX; cero infracciones automáticas no equivale a conformidad humana.

Archivos de implementación: `apps/private-web/src/features/templates/dashboard-screen.tsx`, `packages/ui/src/patterns/layouts/dashboard-layout.stories.tsx`, `tests/e2e/accessibility/screen-reader-preflight.spec.ts`. Documentación nueva: guion de lector, protocolo físico, decisiones para firma, checklist gate y evidencia. Se restauraron los 12 archivos rastreados y siete no rastreados del stash sin conflictos; se incluyen los documentos F6 y Word solicitados, preservando su contenido. `.tmp/phase6-word/build.py` permanece local, fuera del commit; next-env no tiene cambios finales. Stash conservado.

El pulido tiene evidencia independiente: 208/208 integración, 2.537/2.537 UI Linux, 1.436 capturas y 12 recorridos. No se atribuye esa batería completa al cambio posterior P13. No se modificaron permisos, roles, migraciones, tolerancias ni configuración remota.

**Pendiente – responsables:** UX del pulido y filas históricas abiertas: Usuario solicitante / Dirección; 12 lectores EXC-F6-01/D-02: Calixto Isaac Galeana Medrano (QA/Tech Lead), vence en este gate sin extensión; diez pruebas físicas: QA y Técnico/Administrador/Seguridad; decisiones y firmas: responsables individualizados en [gate-f7](../qa/phase-7/gate-f7.md). Gate F7 no aprobado. Commit P13 exclusivamente local, sin push ni PR.
