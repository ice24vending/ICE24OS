# TASK-F4-22 — UI de componentes y frecuencias en el expediente y backfill de máquinas existentes

Estado: implementada el 10/10/2026 en la rama `feat/f4-22-components-ui`, creada desde `main` (`034b45b`, F4-21 integrada por #33). Cierra el complemento RA-01 de la Fase 4. Pendiente de revisión humana (UX con dirección, autorización, migración). No se desplegó ni se aplicaron migraciones remotas.

## Alcance y trazabilidad

- TASKS F4-22 (dependencias F4-16, F4-19, F4-20, F4-21); `Requerimientos_Adicionales_v1.1.md` RA-01 y decisiones D1 (solo advertencia y "Restablecer valores de fábrica"), D2 ampliada por #29 (propietario en toda la cuenta; Operador `OP` solo en máquinas de sus sucursales y sin configuración de cuenta; demás roles consultan), D3 (componente propio con su actividad) y D4 (sin efecto sanitario ni público; la UI no toca esos estados).
- UI_UX §14.6 (pestaña Componentes del expediente), "Confirmación de acción sensible", §16 (breakpoints), §17–19 (estados); AppFlow; PROJECT_RULES §4, §9, §10.
- **Fase 6 aún no inicia**: no existen `docs/backlog/phase-6-status.md`, componentes nuevos en `packages/ui`, modo demo ni `pnpm ux:snapshots`. Por eso se siguió el estilo de las pantallas de F4-16 (`equipment.css`) y los estados compartidos de F5-15 (`ServiceState`), y no se agregó `tests/visual/ux-review.routes.ts`. Cuando P0 de Fase 6 exista, conviene registrar estas pantallas ahí.
- TASKS menciona `apps/private-web/src/features/machines` y `features/catalogs`; el expediente vive en `features/equipment` desde F4-16, así que el trabajo se hizo ahí para no duplicar pantallas.

## Requisitos de la solicitud

| #   | Requisito                                                                                                        | Entrega                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Pestaña "Componentes": origen, agregar del catálogo, componente propio con actividad, estado, historial          | `MachineComponentsPanel`: tarjetas con origen (fábrica, opcional ICE24, propio), estado y actividad propia; agregar del catálogo (oficial o propio no configurado); "Crear componente propio" (código, nombre, actividad, frecuencia, pasos del checklist, evidencia) que crea la entrada de catálogo y la agrega a la máquina con la misma clave idempotente; activar/desactivar con motivo y versión; historial completo |
| 2   | "Frecuencias y alertas": fábrica, cliente y fuente; advertencia D1; restablecer por componente, máquina y cuenta | `MachineFrequenciesPanel`: valor de fábrica ICE24, valor del cliente, fuente y aviso anticipado; diálogo modal de garantía con casilla obligatoria antes de enviar (y también si la API responde 422); restablecer por actividad, por componente propio y por máquina. En la cuenta: restablecer la cuenta y las máquinas de un modelo                                                                                     |
| 3   | Cuenta: aplicar frecuencias a todas mis máquinas de un modelo                                                    | Pestaña "Componentes y frecuencias" (`AccountConfiguration`) + API nueva por modelo (ver [Diseño](#diseño))                                                                                                                                                                                                                                                                                                                |
| 4   | D2 en UI y BFF                                                                                                   | `configuration` en `GET /v1/equipment-workspace` calculado con `authorize()`; la UI muestra controles al propietario, al Operador solo en máquinas de sus sucursales (sin configuración de cuenta) y modo consulta al resto. El BFF reenvía y conserva el 403 `FORBIDDEN` de la API, que vuelve a autorizar cada escritura                                                                                                 |
| 5   | Estados, responsive, teclado, WCAG 2.2 AA                                                                        | Carga, vacío, error con reintento, sin permiso, conflicto 412 con "Actualizar datos", modo lectura de cuenta y modo consulta por rol; tarjetas en rejilla fluida (320–1440 px sin desplazamiento horizontal); pestañas WAI-ARIA con flechas/Inicio/Fin; diálogo con foco atrapado, Escape y retorno de foco; axe sin violaciones                                                                                           |
| 6   | Backfill idempotente sin cambiar fechas; reversión documentada                                                   | `supabase/migrations/20261013000100_phase4_components_backfill.sql`; prueba de fechas intactas e idempotencia                                                                                                                                                                                                                                                                                                              |
| 7   | Pruebas UI (Testing Library + axe), E2E dueño/Operador/técnico                                                   | `configuration.test.tsx` (19), `route.test.ts` (+2), `tests/integration/components-ui.test.ts` (4, uno con Playwright). `ux:snapshots` no existe todavía                                                                                                                                                                                                                                                                   |
| 8   | Reporte                                                                                                          | Este documento                                                                                                                                                                                                                                                                                                                                                                                                             |

## Criterios de aceptación (TASKS F4-22)

| Criterio                                                                              | Estado                                                                    |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Pestaña Componentes: lista, agregar propio, activar/desactivar, historial             | Cumplido                                                                  |
| Frecuencias y alertas con fábrica y cliente, advertencia de garantía y restablecer    | Cumplido                                                                  |
| Controles según D2; el Operador sin configuración de cuenta; resto en modo lectura    | Cumplido y probado en navegador (propietario, Operador, técnico) y en API |
| Configuración masiva por cuenta (todas mis máquinas de un modelo)                     | Cumplido                                                                  |
| Backfill: componentes por defecto, sin sobrescrituras, sin cambiar fechas programadas | Cumplido y probado                                                        |
| Estados de carga, vacío, error, permiso denegado y modo lectura                       | Cumplido (más conflicto de versión)                                       |
| Trazabilidad y contradicciones registradas                                            | Cumplido: ver [Decisiones y observaciones](#decisiones-y-observaciones)   |

## Diseño

- **Aplicar a un modelo.** La resolución de F4-20 es máquina → cuenta → plantilla y una sobrescritura de cuenta aplica a todas las máquinas con el mismo código de actividad, de cualquier modelo. Para que "todas mis máquinas de un modelo" sea exacto sin cambiar el esquema ni el worker, se agregaron tres rutas al controlador de F4-20:
  - `GET /v1/technical-models/{id}/frequencies`: actividades por tiempo de la plantilla de las máquinas del modelo con sus valores de fábrica, el valor de cuenta y el valor y fuente en cada máquina. Solo usuarios con ámbito de cuenta (el Operador recibe 403).
  - `POST /v1/technical-models/{id}/frequency-overrides`: escribe una sobrescritura de máquina en cada máquina no retirada del modelo, en una transacción, con advertencia de garantía (422 si falta) y un evento `MACHINE_FREQUENCIES_CHANGED` por máquina, así F4-21 recalcula cada calendario. Es convergente (sin `If-Match`, como el restablecer de F4-20) porque el propietario eligió todo el modelo; las máquinas cuya plantilla no tiene la actividad se informan en `skippedMachineIds`.
  - `POST /v1/technical-models/{id}/frequency-overrides/reset`: cierra las sobrescrituras de máquina de las máquinas del modelo (una actividad o todas).
  - Escritura solo del propietario: la operación `account-frequencies:model:*` reutiliza la comprobación de `EquipmentDatabase.run` (`equipment.account-frequencies-manage` + ámbito de cuenta) antes de la reproducción idempotente. Contratos nuevos en `packages/contracts/src/equipment.ts`. El cuerpo del `set` de F4-20 se extrajo a `writeOverride` sin cambiar su comportamiento.
- **Controles por rol.** `configurationAccess(subject)` evalúa con `authorize()` (operación `READ`, para que el modo lectura de la cuenta no los oculte: ese caso lo explica su propio aviso) los permisos `machine-components-manage` y `machine-frequencies-manage` por sucursal, `account-frequencies-manage` y `catalog-manage`. No hay lógica de roles paralela.
- **BFF.** `/api/equipment` acepta las rutas RA-01 (`account-catalog-entries`, `account-frequency-overrides`, cuatro segmentos para las transiciones de componentes) y `PUT`. Ante un error reenvía el código de API.md (nunca el texto del servicio) con mensaje propio para 403, 412 y la advertencia de garantía; la pantalla elige su estado con él. Sigue exigiendo sesión, contexto, CSRF y origen.
- **Pantallas.** `machine-configuration.tsx`, `account-configuration.tsx`, `configuration-ui.tsx` (diálogo, formulario con motivo y responsabilidad, pestañas, campos de frecuencia), `configuration-model.ts` (formatos, etiquetas, regla de advertencia equivalente a `sameFrequency` del dominio, modos por rol) y `configuration-client.ts` (llamadas al BFF con `FailureError`). Los formularios conservan la clave idempotente mientras el cuerpo no cambia; tras la advertencia se envía con otra clave porque el cuerpo cambia. Tras cada cambio la sección se recarga sin cerrar el expediente.

## Migración de backfill, compatibilidad y reversión

- **Qué hace.** A cada máquina no retirada **sin ninguna fila** en `machine_component_configs` (activadas antes de F4-19) le inserta los componentes oficiales de su versión de plantilla vigente como `TEMPLATE_DEFAULT` activos, con el actor del periodo de propiedad vigente, desde el inicio más reciente entre el periodo de plantilla y el de propiedad, y el motivo marcador `F4-22 backfill: componentes por defecto de la plantilla`. Valida al final que ninguna máquina elegible quedó sin configuración (aborta si ocurre) e informa máquinas sin periodo de propiedad.
- **Por qué no cambian fechas.** No escribe `equipment.events` (no hay outbox ni job de recálculo), `scheduled_activities`, `schedule_jobs` ni `maintenance_frequency_overrides`. Además, los componentes oficiales no generan actividades (F4-21), así que un recálculo posterior produce las mismas fechas.
- **Idempotencia.** Las máquinas con alguna fila se omiten; una segunda ejecución no inserta nada.
- **Duración.** Un `insert … select` sobre máquinas (cientos en Fase 4): segundos. Orden: con la API de esta rama o anterior; no depende del código.
- **Reversión.** Preferir corrección hacia adelante. El trigger de historia impide borrar, por eso el encabezado de la migración documenta cómo retirar solo las filas del backfill que nadie modificó: deshabilitar `component_config_history` en una transacción, borrar las filas con el motivo marcador, `row_version = 1`, abiertas y sin otras versiones del mismo componente, y volver a habilitar el trigger. Las versiones modificadas después son historia técnica y se conservan. La reversión no afecta calendarios por lo explicado arriba.
- **Compatibilidad de la API.** Cambios aditivos en `/v1`: tres rutas, el campo `configuration` en `equipment-workspace` y contratos nuevos. Una UI anterior ignora el campo nuevo.

## Archivos

- Base de datos: `supabase/migrations/20261013000100_phase4_components_backfill.sql` (nuevo).
- Contratos: `packages/contracts/src/equipment.ts` (`applyModelFrequencySchema`, `resetModelFrequenciesSchema`, `applyModelFrequencyResultSchema`, `modelFrequenciesSchema`, `equipmentConfigurationAccessSchema`).
- API: `frequency-overrides.store.ts` (`writeOverride`, `modelFrequencies`, `applyModel`, `resetModel`), `frequency-overrides.controller.ts` (tres rutas), `accounts.store.ts` (`configurationAccess`).
- BFF: `apps/private-web/src/app/api/equipment/route.ts` y su prueba.
- UI: `apps/private-web/src/features/equipment/` — `workspace.tsx` (pestañas del expediente, pestaña de cuenta, calendario con fuente), `machine-configuration.tsx`, `account-configuration.tsx`, `configuration-ui.tsx`, `configuration-model.ts`, `configuration-client.ts`, `equipment.css`, `configuration.test.tsx` (nuevos salvo los dos primeros y el CSS).
- Pruebas de integración: `tests/integration/components-ui.test.ts` (nuevo).
- Dependencias de desarrollo (raíz): `@testing-library/react` 16.3.0, `@testing-library/dom` 10.4.0, `@testing-library/user-event` 14.6.1, `jsdom` 26.1.0, `@types/jsdom` 21.1.7, `axe-core` 4.10.3. `pnpm-lock.yaml` también reindexa claves de dependencias de pares opcionales (`supports-color`) sin cambiar versiones.
- Documentación: `docs/modules/equipment.md`, `docs/tasks/README.md` y este reporte.

## Pruebas y validación

Comandos ejecutados el 10/10/2026 en Windows 11 con Node 24.19 y Docker Desktop 29.7.2:

- `pnpm check` (Prettier, ESLint sin advertencias, typecheck de 21 tareas, fronteras, infraestructura, identidad y Vitest con 463 pruebas en 75 archivos): en verde.
- `pnpm build`: 14 tareas en verde.
- `ICE24_STORAGE_ORIGIN=http://127.0.0.1:54329 pnpm build` (la doble de storage de las pruebas de archivos requiere ese origen en la CSP, igual que en F4-18 a F4-21): 14 tareas en verde. Sin la variable, `pnpm build` también pasa, pero dos pruebas de navegador de F5-08/F5-15 fallan por la CSP.
- `ICE24_BROWSER_TESTS=1 pnpm test:integration`: en verde, 145 pruebas en 19 archivos (incluidas las 4 nuevas). Las capturas de evidencia de Fase 5 que reescribe la ejecución se restauraron.
- `pnpm ux:snapshots`: no existe todavía (Fase 6 P0 sin iniciar).
- No se ejecutó `supabase test db` (pgTAP): la migración se probó contra PostgreSQL 17 real en la prueba de integración; no se agregó prueba pgTAP.

`configuration.test.tsx` (jsdom, Testing Library, axe-core; el contraste de color se excluye porque jsdom no calcula estilos — la paleta usa los colores de F4-16 y textos ≥ 4.5:1):

1. Formatos, equivalencias (1 semana = 7 días; meses solo con meses) y regla de advertencia D1.
2. Modos por rol y por estado de la cuenta (propietario, Operador en su sucursal y en otra, técnico, cuenta en lectura, Operador sin configuración de cuenta).
3. Frecuencias: carga → fábrica/cliente/fuente con axe; diálogo de garantía (botón deshabilitado hasta marcar la casilla, foco dentro, axe) y envío con `warrantyWarningAcknowledged`; Escape cancela sin enviar; 422 de la API abre el diálogo y reintenta con otra clave; 412 muestra "La información cambió" y recarga; restablecer por componente y por máquina; modo consulta sin botones; cuenta en lectura; vacío, error con reintento y sin permiso.
4. Componentes: origen, estado, actividad propia, historial, opciones del catálogo sin repetir; crear componente propio con checklist y evidencia y agregarlo; el Operador agrega y desactiva pero no crea propios; vacío en modo consulta.
5. Cuenta: aplicar a todas las máquinas de un modelo con advertencia; modo consulta sin controles.
6. Pestañas con flechas, Inicio y Fin.

`tests/integration/components-ui.test.ts` (PostgreSQL 17, API Nest real, worker de F4-21, Next.js compilado y Chromium):

1. **Backfill**: una máquina "anterior a F4-19" recibe su componente de plantilla con actor y motivo esperados; las demás configuraciones, sobrescrituras, eventos, outbox, jobs y **todas las filas de `scheduled_activities`** quedan idénticas; segunda ejecución y worker sin cambios; la API la muestra como cualquier máquina precargada.
2. **D2 en `configuration`** para propietario, Operador, técnico y auditor.
3. **Por modelo**: lectura (propietario y técnico sí, Operador 403), 422 sin advertencia, Operador/técnico/auditor 403, aplicación a 3 máquinas con evento por máquina e idempotencia, recálculo con fuente `MACHINE` y restablecer con fuente `TEMPLATE`; 403 HTTP.
4. **Navegador** — dueño: crea componente propio → cambia Limpieza a 10 días → advertencia (captura) → acepta → el calendario muestra "cada 10 días (Esta máquina)" y la actividad propia "cada 3 meses" → restablece la máquina → "cada 7 días (Fábrica ICE24)"; pestañas con teclado; configuración de cuenta en 1280, 768, 375 y 320 px sin desplazamiento horizontal; cuenta en lectura sin controles. Operador: no ve "Componentes y frecuencias" ni la máquina de otra sucursal, cambia a 1 semana sin advertencia, agrega del catálogo pero no crea propios; el BFF devuelve 403 `FORBIDDEN` para otra sucursal, para restablecer la cuenta y para aplicar al modelo. Técnico: modo consulta en componentes, frecuencias y cuenta; 403 al escribir. Capturas en `tmp/f4-22-*.png` (no versionadas).

## Decisiones y observaciones

- **Aplicar a un modelo = sobrescrituras de máquina.** Alternativa descartada: agregar el modelo como alcance de `maintenance_frequency_overrides`, que cambiaría el esquema, la resolución de dominio y el worker de F4-20/F4-21. Consecuencia: el valor aplicado reemplaza los valores propios que tenían esas máquinas (lo advierte el formulario) y una máquina activada después no lo hereda; para eso sigue existiendo la sobrescritura de cuenta. Requiere confirmación de dirección.
- **Valores de cuenta.** La pantalla de cuenta lista y restablece los valores definidos para toda la cuenta, pero no ofrece crearlos: la solicitud pide la configuración por modelo y la API de F4-20 sigue disponible.
- **Restablecer "por componente".** Las actividades de plantilla no están ligadas a componentes oficiales (observación de F4-21), así que el restablecer por componente aplica a componentes propios; las actividades de plantilla se restablecen por actividad o por máquina. Restablecer una actividad de plantilla filtra por código y podría cerrar también la de un componente propio con el mismo código (caso raro, documentado).
- **Configuración de cuenta para otros roles.** Se muestra en modo consulta a roles con ámbito de cuenta sin permiso de frecuencias (técnico, auditor, responsable sanitario); se oculta al Operador (D2) y a roles limitados a sucursal. El Operador sigue viendo, dentro de cada máquina, si rige un valor de cuenta.
- **Validación antes que autorización.** Una escritura con cuerpo inválido responde 400 antes de evaluar permisos (comportamiento previo del módulo).
- **Advertencia en componentes propios.** Como en F4-20, cambiar el valor por defecto de un componente propio no pide advertencia (`warrantyApplies: false`); la UI lo rotula "Valor por defecto (propio)".
- **Retiradas.** El backfill omite máquinas retiradas: no se pueden cambiar y no tienen calendario futuro.

## Riesgos y deuda

- Fase 6 reemplazará estilos y componentes por los de `packages/ui`; estas pantallas usan clases `config-*` locales.
- `context/API.md` no lista aún las rutas de F4-18 a F4-22 (deuda ya registrada en F4-20); `Database.md` tampoco las tablas RA-01.
- Aplicar a un modelo con muchas máquinas bloquea todas en una transacción y crea un job por máquina (aceptable en Fase 4).
- La decisión de aplicar por modelo y las decisiones pendientes de F4-19/F4-20 requieren confirmación de dirección.

## Validación manual pendiente

1. Revisión UX con dirección (ver el checklist de revisión entregado con la rama).
2. Revisión humana de la migración y de la autorización de las rutas por modelo.
3. En un ambiente con identidad real y worker: recorrer los flujos de propietario, Operador y técnico y comprobar la auditoría de la advertencia aceptada.
