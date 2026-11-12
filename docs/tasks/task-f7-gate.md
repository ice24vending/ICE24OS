# P13 — Preparación del gate F7

> Estado vigente 11/11/2026: ocho recorridos Windows/Android pendientes; UX especificada aprobada; campo antes de activar offline; decisiones de negocio pendientes. Responsable técnico/QA único: Calixto; aprobadores: Axel y Eduardo por mensaje. Las listas fechadas anteriores son antecedentes. Ver [gate vigente](../qa/phase-7/gate-f7.md).

## Revisión vigente del producto — 11/11/2026

PR #68 integrado por squash en main `cba6e15`. Se ejecutó `git fetch origin` y `git rebase --onto origin/main 591fe07 codex/f7-p13-gate`: **cero conflictos**, `fedea54` pasó a `1dd683a`. El Word mantiene SHA-256 `eb4a64440bc9ddbcb266d759e62ad4963791bb27d87fe509b5746e9d6f51f2a5`. Stash `0bd09235b4746deb9c74a7001df1312789aa0261` conservado. El helper temporal `.tmp/phase6-word/build.py` se movió a `tmp/p13-stash-tools/phase6-word/build.py` (carpeta ignorada existente); se retiraron únicamente los directorios vacíos `.tmp`. No era evidencia ni se modificó el Word.

La revisión externa acertó en el defecto del Resumen operativo: el primer cambio P13 solo cubría la vista de referencia F6 y Storybook. Se corrigió `/summary` y se auditó el resto del producto con el componente compartido `LiveRegion`. [Inventario por pantalla y criterio](../qa/phase-7/live-region-audit.md), [reporte vigente](../qa/phase-7/evidence/20261111-p13-live-regions.json). Las cifras de apartados anteriores son antecedentes y no acreditan este candidato.

Publicación de P13 autorizada por el usuario: commit y push de `codex/f7-p13-gate`, PR a main, **sin fusionar**. Ninguna aprobación humana se deduce de la automatización. No hubo cambios de permisos, roles, migraciones, tolerancias ni protección de ramas.

### Qué se corrigió

- Región persistente en Resumen real/alertas, formularios de órdenes/tickets, ejecución/revisión/cierre, descargas y sincronización; referencia F6 y Storybook usan el mismo componente.
- Fotos/archivos, contexto, asistente, tabla y feedback compartido: el contenedor existe antes de la acción. Los errores bloqueantes conservan su foco previo; los anuncios normales no lo mueven.
- Estado offline: una sola región para la confirmación de guardado; el chip visual no repite el mismo anuncio.
- Demo: escenario explícito de alerta crítica para reconocerla desde `/summary`, sin persistencia productiva, validando ámbito, permiso existente, versión y clave.
- Pruebas unitarias de persistencia, identidad de nodo, atomicidad y foco; preflight extendido al producto, errores de sincronización y recorrido offline; guion de doce lectores con anuncios esperados por plataforma.

### Historial de validación de esta corrección

Primera comprobación: check 1.079/1.079, build 14/14 e integración 208/208. Primer preflight: 19/23 aprobadas; tres escenarios buscaban una alerta que no existía en el estado normal y uno pulsó Enter antes de habilitar el selector. Se agregó el escenario demo y se esperó la hidratación sin cambiar permisos ni tiempos de prueba. Segundo preflight: 22/23; misma precondición faltante en el segundo recorrido de contexto, corregida.

Check intermedio: 1.079 aprobadas / una fallida de 1.080; la prueba de selección de tabla usaba un selector ambiguo tras mantener montada también la región de carga. Se nombraron ambas regiones y se consultó la de selección por su nombre. Check posterior: 1.080/1.080. Cada resultado final y cualquier diferencia visual se consigna en el reporte vigente; no se suman pasadas parciales como una integral verde.

### Validación del candidato y diferencias visuales

Check final: **1.082/1.082, 144 archivos** (formato, lint sin warnings, tipos, límites, contratos de infraestructura/identidad, 88 pares de contraste y catálogo). Build con la configuración de CI: **14/14**. Integración con `ICE24_BROWSER_TESTS=1` y build con `ICE24_STORAGE_ORIGIN=http://127.0.0.1:54329`: **208/208, 21 archivos, sin omitidas**, 308,63 s.

Se registran también corridas que no acreditan el candidato: integración sin bandera de navegador **191 aprobadas/17 omitidas**; siguiente corrida **205 aprobadas/3 fallidas**, dos subidas bloqueadas por CSP porque faltaba el origen local de almacenamiento en el build y una espera de hidratación de campo agotada. Se recompiló igual que CI y se repitió sin UI simultánea, sin modificar CSP ni tiempos. Dos checks de formato detectaron una tabla Markdown y saltos CRLF del texto demo; corregidos con Prettier.

Primera UI integral Linux: **2.539 aprobadas/17 fallidas de 2.556**, sin reintentos (48 min). Una prueba de asignación se corrigió usando interceptación del contexto de navegador (focal 8/8), sin bloquear workers. Las otras 16 fueron capturas: el nombre largo del escenario demo producía desbordamiento, corregido y validado en las cuatro resoluciones sin cambiar esas baselines. Pasada visual focal: **8 aprobadas/20 comparaciones pendientes** de 28 antes de aceptar las imágenes; 12 diferencias de espaciado y ocho imágenes nuevas inspeccionadas individualmente.

Baselines actualizadas en 375/768/1280/1440: `ui-wo-01--tecnico--*` y `offline-work-editor--descargada--*` eliminan 16 px que dejaban mensajes vacíos; `selector-contexto--acceso-perdido--*` refleja 3 px de ajuste al persistir la región del aviso. Nuevas: `resumen--anuncio-enterado--*` y `matriz-base-liveregion--normal--*`. No se pierden contenidos ni acciones, no se ajustaron tolerancias. Los veinte nombres y sus hashes están en el JSON vigente; **requieren aprobación UX humana**.

UI final, galería y recorridos: resultados se completan al terminar la ejecución; no usar esta preparación como aprobación integral.

El inventario exacto de los archivos del PR está en `changedFiles` del [JSON de evidencia](../qa/phase-7/evidence/20261111-p13-live-regions.json); incluye la preparación P13 rebasada y estas correcciones. Los artefactos regenerables quedan fuera de Git.

### Checklist UX de seis preguntas (sin aprobación)

1. ¿En `/summary`, el lector anuncia el reconocimiento una sola vez? **Pendiente – QA / Usuario solicitante**.
2. ¿Descarga, guardado local y sincronización distinguen progreso, éxito y error sin mensajes duplicados? **Pendiente – QA / Técnico**.
3. ¿Al fallar un ticket, asignación o cierre se conserva el contenido y se entiende qué corregir? **Pendiente – QA / Usuario solicitante**.
4. ¿Los mensajes vacíos no dejan huecos y los cambios no mueven el foco inesperadamente? **Pendiente – QA / UX**.
5. ¿Los doce recorridos con lector y los diez escenarios físicos tienen evidencia real y aprobador? **Pendiente – Calixto Isaac Galeana Medrano / QA y roles del protocolo**.
6. ¿Se resolvieron decisiones y firmaron Axel Quevedo Zamudio y Eduardo Ramos y QA el cierre? **Pendiente – responsables en gate-f7; gate no aprobado**.

## Antecedente previo al squash — 11/11/2026

Preparación local en `codex/f7-p13-gate`, desde el pulido `591fe07` ([PR #68](https://github.com/ice24vending/ICE24OS/pull/68), abierto, sin fusionar). Main sigue en `ab00e1f`, con #66 y #67 integrados. El stash `0bd09235b4746deb9c74a7001df1312789aa0261` se aplicó sin conflictos y permanece como respaldo; los siete archivos no rastreados restaurados coinciden byte por byte con sus blobs, incluido phase-6.docx. No se aplicaron migraciones ni cambios de permisos, roles, tolerancias o protección remota.

**Gate F7 pendiente; no aprobado.** [Checklist y responsables](../qa/phase-7/gate-f7.md), [guion de lector](../qa/phase-7/screen-reader-script.md), [protocolo físico](../qa/phase-7/field-test-protocol.md), [decisiones para firma](../qa/phase-7/decisions-for-signature.md). El pulido #68 ya está integrado; publicación P13 autorizada por el usuario. No fusionar. Los apartados siguientes conservan antecedentes fechados; no reemplazan este estado vigente.

Antecedente del 08/11/2026. Rama `codex/f7-gate`, candidato `717b7b8` del PR #66 (abierto); main `fbfbcf8`. Preparación local, sin commit ni push. No se integró el PR ni se cambió protección de GitHub.

## Resultado

[Declaración de cierre](../qa/phase-7/evidence/20261108-declaracion-cierre.md): **rechazado**. El usuario confirmó que no ejecutó lectores ni campo físico. EXC-F6-01 sigue vigente, sin extender su fecha límite. `ui-quality` ya es requerido por el ruleset 26916128, verificado el 09/11/2026; G7-03 resuelto. Las consultas anteriores sin protección se conservan como antecedentes. La aprobación UX UI-SYNC-01 permanece válida, sin convertirla en firma del gate.

## Archivos modificados

- `docs/qa/phase-7/evidence/20261108-declaracion-cierre.md`: dictamen, batería antecedente, riesgos, bloqueos, decisiones y aprobaciones por mensaje pendientes.
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

Antes de aceptar F7: completar los 12 recorridos heredados y adicionales F7 con lector; los 10 escenarios físicos; configurar/verificar checks requeridos; integrar dependencias por revisión; repetir batería final y criterio F7; resolver decisiones o mantenerlas con responsable según alcance autorizado; obtener aprobaciones por mensaje de Axel Quevedo Zamudio y Eduardo Ramos/QA y completar las pantallas pendientes. O-02, DEC-020 y dispositivos definitivos DEC-018 se mantienen fuera del gate. No trasladar EXC-F6-01 como excepción aceptada a F8.

## Checklist de revisión del cierre

1. ¿Cada recorrido humano tiene resultado, equipo, versión, responsable y evidencia?
2. ¿Se corrigieron los defectos y existe base para retirar EXC-F6-01?
3. ¿`ui-quality` bloquea realmente el merge en main?
4. ¿La batería final corresponde al commit integrado que se quiere aprobar?
5. ¿Las políticas pendientes tienen responsable y no se confunden con aprobación UX?
6. ¿Axel Quevedo Zamudio y Eduardo Ramos y Tech Lead/QA firmaron expresamente el dictamen?

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

| Pendiente                                  | Responsable                                                                                           | Condición de cierre                                                                               |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 12 recorridos SR-01…SR-12, EXC-F6-01       | Calixto Isaac Galeana Medrano, Tech Lead/QA                                                           | Evidencia real por recorrido; sin extender plazo: antes de UI productiva y como máximo gate F7    |
| 10 escenarios físicos                      | QA / Técnico / Seguridad                                                                              | Dispositivo, resultado, fecha, responsable y evidencia por escenario                              |
| Revisiones UX faltantes P0–P5              | Axel Quevedo Zamudio y Eduardo Ramos: Axel Quevedo Zamudio / Eduardo Ramos, con QA                    | Registrar revisión pendiente sin borrar UI-MNT-01/02, P7–P9, UI-SYNC-01 ni aprobaciones parciales |
| Decisión F7-D07                            | Calixto Isaac Galeana Medrano (Tech Lead / QA / desarrollador) / Axel Quevedo Zamudio y Eduardo Ramos | Resolver procedimiento/piezas explícitamente                                                      |
| Firma Axel Quevedo Zamudio y Eduardo Ramos | Axel Quevedo Zamudio / Eduardo Ramos                                                                  | Firma expresa del dictamen final                                                                  |
| Firma Tech Lead / QA                       | Calixto Isaac Galeana Medrano                                                                         | Evidencia humana y batería final antes de firmar                                                  |

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

El gate F7 **no queda aprobado**: continúan lectores EXC-F6-01 sin ampliar plazo, escenarios físicos, UX faltante P0–P5, F7-D07, batería final del candidato y aprobaciones por mensaje de Axel Quevedo Zamudio y Eduardo Ramos/QA, con los responsables ya registrados. B sigue en validación separada y C pendiente.

[Evidencia JSON](../qa/phase-7/evidence/20261109-main-ruleset.json).

## Validación técnica final P13 — 11/11/2026

[Resultados y hashes](../qa/phase-7/evidence/20261111-p13-preflight.json): `pnpm check` 1.076/1.076 (141 archivos), build 14/14, Linux preflight + teclado 19/19, axe Dashboard 30/30, visual Dashboard 36/36, Storybook compilado. Sin reintentos ni cambios de baselines en la ejecución final. El preflight cubre los 12 recorridos en 375/768/1280 y seis personas. No sustituye NVDA/VoiceOver ni campo físico.

Se corrigió un defecto real: el Dashboard F6 montaba la región de estado después de la respuesta; ahora existe antes de la acción, con `aria-live` y `aria-atomic`, y queda visualmente oculta mientras está vacía. Historia `AnuncioDeActualizacion` y prueba de persistencia añadidas. No cambió la información demo; se reutiliza su acción de actualización.

Hubo fallos previos: primera selección amplia 44 aprobadas/7 fallidas (tres ambigüedades del localizador de alertas, tres fallos del anuncio, una navegación de menú en tablet). Tras corregirlos pasaron 19 y 30; la primera comparación visual tuvo 8 aprobadas/28 fallidas por espacio de la región vacía. Se inspeccionó y corrigió el layout con `ids-visually-hidden`; las 36 comparaciones finales pasan contra las imágenes originales. Los 75 análisis axe registraron cero infracciones y 26 análisis con contraste indeterminado, que siguen pendientes de QA/UX; cero infracciones automáticas no equivale a conformidad humana.

Archivos de implementación: `apps/private-web/src/features/templates/dashboard-screen.tsx`, `packages/ui/src/patterns/layouts/dashboard-layout.stories.tsx`, `tests/e2e/accessibility/screen-reader-preflight.spec.ts`. Documentación nueva: guion de lector, protocolo físico, decisiones para firma, checklist gate y evidencia. Se restauraron los 12 archivos rastreados y siete no rastreados del stash sin conflictos; se incluyen los documentos F6 y Word solicitados, preservando su contenido. `.tmp/phase6-word/build.py` permanece local, fuera del commit; next-env no tiene cambios finales. Stash conservado.

El pulido tiene evidencia independiente: 208/208 integración, 2.537/2.537 UI Linux, 1.436 capturas y 12 recorridos. No se atribuye esa batería completa al cambio posterior P13. No se modificaron permisos, roles, migraciones, tolerancias ni configuración remota.

**Pendiente – responsables:** UX del pulido y filas históricas abiertas: Calixto Isaac Galeana Medrano (Tech Lead / QA / desarrollador); Axel Quevedo Zamudio y Eduardo Ramos; 12 lectores EXC-F6-01/D-02: Calixto Isaac Galeana Medrano (QA/Tech Lead), vence en este gate sin extensión; diez pruebas físicas: QA y Técnico/Administrador/Seguridad; decisiones y firmas: responsables individualizados en [gate-f7](../qa/phase-7/gate-f7.md). Gate F7 no aprobado. Commit P13 exclusivamente local, sin push ni PR.

## Resultado integral de regiones vivas — 11/11/2026

Validación vigente: check **1.082/1.082** (144 archivos), build **14/14**, integración con navegador **208/208** (21 archivos, ninguna omitida), UI Linux **2.569/2.569** sin reintentos (15 offline, 90 mantenimiento, 1.020 accesibilidad, 1.444 visuales), galería **1.444 capturas** sin problemas y **12 recorridos automáticos**. Preflight del producto más teclado incluidos; 86 análisis axe adjuntos sin infracciones y 28 análisis con contraste indeterminado, pendientes de medición renderizada. No acredita lector ni campo físico.

La pasada integral anterior tuvo **2.568 aprobadas y una fallida**: rasterización de texto en Panel Demo móvil. Se inspeccionó sin cambiar esa baseline; diez repeticiones focales pasaron y después se repitió la suite integral completa, con cuatro workers y cero reintentos. Los fallos anteriores de implementación, entorno y comparaciones están conservados en la evidencia JSON. Veinte baselines inspeccionadas (12 ajustes de espaciado, ocho nuevas), sin cambiar tolerancias. Stash y hash de Word conservados; publicación P13 autorizada, fusión no autorizada.

> Organización vigente, 11/11/2026: Calixto Isaac Galeana Medrano (Tech Lead / QA / desarrollador) reúne desarrollo, verificación técnica y QA; no hay áreas separadas de Producto o Seguridad. Las decisiones de negocio corresponden a Axel Quevedo Zamudio y Eduardo Ramos. No se exige firma impresa: aprobación por mensaje, con captura guardada en docs/qa/phase-7/evidence/. Las menciones históricas de responsabilidades se interpretan con esta asignación; no acreditan aprobaciones nuevas.

## Ajuste al equipo real y contraste de acceso — 11/11/2026

[PR #69](https://github.com/ice24vending/ICE24OS/pull/69), sin fusionar. [Evidencia de esta actualización](../qa/phase-7/evidence/20261111-p13-team-gate-validation.json): check **1.082/1.082** (144 archivos), build **14/14**, Linux afectado **25/25 preflight/teclado + 1/1 axe de la historia + 8/8 visuales**, cero reintentos. La integral previa **2.569/2.569**, integración **208/208**, galería **1.444** y recorridos **12** corresponden al commit P13 previo a este cambio de contraste; no se presenta la focal nueva como integral. CI del PR debe validar el nuevo head antes de integrar.

Contraste: 26 análisis indeterminados históricos; 28 actuales / 52 instancias medidas; diez fallaban a **1,056:1** sobre la diagonal clara. Tras superficie opaca de marca, **53/53** mediciones cumplen (incluye una instancia adicional en la repetición), mínimo **6,2364:1**. Inspección de todos los pares y siete baselines: tres acceso modificadas, cuatro historia nuevas; móvil real idéntico. Primera visual: 1 aprobada/7 fallidas antes de aceptar imágenes inspeccionadas; final 8/8. [Tabla y método](../qa/phase-7/rendered-contrast.md). El primer cálculo descartaba diferencias RGB menores a 30: se descubrió el falso positivo al inspeccionar y se recalculó a >=1; evidencia preservada. No se desactivaron reglas ni cambiaron tolerancias.

UX pulido #68/tickets/revisión/KPI registrada según confirmación del usuario; jefes WhatsApp 15/10/2026, ratificación chat 11/11/2026, captura pendiente. Ocho recorridos reales Windows/Android pendientes – Calixto; Apple riesgo aceptado hasta disponer de equipo; sin extender EXC-F6-01. Campo antes de activar offline (apagado por defecto, confirmar deployment efectivo). Decisiones técnicas delimitadas aceptadas por Tech Lead; negocio pendiente Axel/Eduardo. Aprobación por mensaje y captura, sin firma impresa. **Gate no aprobado**; UX nueva P13/acceso, lector, decisiones y cierre siguen pendientes con responsables en [gate](../qa/phase-7/gate-f7.md).
