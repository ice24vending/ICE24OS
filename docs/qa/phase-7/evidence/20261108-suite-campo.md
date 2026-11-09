# Suite de campo P10–P12 — 08/11/2026

Rama `codex/f7-p10-p11-p12`, base `fbfbcf8` de main. Commit y push autorizados por el usuario el 08/11/2026 tras aprobar UI-SYNC-01. No se aplicaron migraciones remotas.

## Alcance y datos

Datos ficticios por sesión demo y PostgreSQL 17 efímero. Chromium móvil 375×812, IndexedDB real cifrado, service worker y desconexión real del contexto de navegador. La prueba «criterio de salida F7» usa comandos transaccionales reales y consulta conteos en PostgreSQL/auditoría; adapta transporte HTTP/identidad inicial y almacenamiento de objetos. El escáner real y la subida directa se comprueban por separado en la suite de archivos.

## Resultados registrados

- `pnpm check`: aprobado, 1.033 pruebas en 132 archivos; formato, lint sin warnings, tipos, límites, contratos y contraste. Repetición final aprobada en `tmp/p10-check-evidence-final.log`.
- `ICE24_STORAGE_ORIGIN=http://127.0.0.1:54329 pnpm build`: 14/14 tareas aprobadas; repetición final en `tmp/p10-build-evidence-final.log`.
- `ICE24_BROWSER_TESTS=1 pnpm test:integration`: 204/204 en 21 archivos, incluyendo 37 pruebas de órdenes y el «criterio de salida F7». Log `tmp/p10-integration-final-version.log`. La compilación previa debe usar el origen de almacenamiento de CI para que CSP permita la subida de archivos de prueba.
- Baselines Linux: 156/156 estados del centro/comparador y accesos desde órdenes regenerados en la pasada final (`tmp/p10-visual-final.log`). Se inspeccionaron las 197 capturas modificadas: 40 del centro, 20 de historias/matriz, 136 de accesos desde órdenes (lista, filtros, asignación y detalle) y 1 del editor offline. Aprobación UX de UI-SYNC-01 registrada el 08/11/2026.
- `pnpm test:ui -- --workers=8`: 2.283/2.283 aprobadas en Linux, sin fallos ni reintentos, en 17,2 min (`tmp/p10-ui-final.log`). La matriz de Órdenes requirió 4 baselines adicionales (`tmp/p10-matrix-update.log`, 4/4); la pasada completa posterior verificó todas las capturas.
- `pnpm ux:snapshots`: 1.292 capturas, cero observaciones en el manifiesto, salida 0 (`tmp/p10-gallery.log`). [Galería local](../../phase-6/ux-review/index.html). El contenedor no incluye `.git`; el manifiesto indica «sin git», y la rama/base están identificadas al inicio de este reporte.
- `pnpm ux:walkthroughs`: 11 recorridos verificados, salida 0 (`tmp/p10-walkthroughs.log`), incluidos captura offline, conflicto/resolución y regreso al expediente. [Videos locales](../walkthroughs/index.html). [Reporte UI completo](../../../../playwright-report/index.html).
- El auxiliar del recorrido offline usa URLs absolutas construidas con el servidor recibido: funciona tanto en Playwright con `baseURL` como en los contextos independientes de la galería. Formato y `typecheck:review` aprobados tras esta corrección del generador.
- La galería crea un contexto de navegador por captura para aislar IndexedDB, service worker, reloj y adaptadores de red. Servidor y navegador usan el mismo reloj demo que la suite UI. Se corrigió la contaminación del recorrido offline sobre capturas posteriores de notificaciones, sin suprimir errores de hidratación. Tipos y ESLint de los auxiliares aprobados. Los recorridos heredados verifican el encabezado del centro funcional y su ejemplo de conflicto, en lugar de la antigua maqueta.
- La vigencia de una descarga usa explícitamente la zona de Ciudad de México, indicada en pantalla, para evitar diferencias entre SSR y navegador. Regresión Linux: 3/3 recorridos de conectividad con dispositivo en `Pacific/Auckland`, sin errores de hidratación al volver al detalle (`tmp/p10-timezone-e2e.log`). Ejecutada después de la pasada UI completa; no afecta las baselines de estados sin descarga activa.
- Recorridos afectados por la sustitución de la maqueta y las capturas de evidencia: 29/29 aprobados en Linux (`tmp/p10-caret-navigation.log`). Las capturas conservan el cursor para no inyectar estilos durante la hidratación; no se cambiaron tolerancias visuales ni reglas de accesibilidad.
- Dispositivo físico, batería, sótano y lector de pantalla: pendientes; no ejecutados por el agente.

## Hallazgos durante implementación

| Hallazgo                                                                     | Severidad | Corrección / estado                                                                                                             |
| ---------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Cierre de conflicto exigía ser el técnico asignado aun al revisor autorizado | Alta      | Hecho de dominio confiable exclusivo del resolvedor; conserva actor real y validación de evidencia. Integración aprobada        |
| Reloj adelantado rechazaba una descarga recién emitida por el servidor       | Media     | Vigencia relativa al reloj local al descargar; acceso remoto usa vigencia del servidor. Prueba móvil añadida                    |
| Escritura en curso podía recrear contenido después de limpieza parcial       | Alta      | Invalida órdenes antes de borrar, verifica generación y propaga limpieza entre pestañas. Pruebas de base aprobadas              |
| Etiqueta del select incluía texto de opciones para el localizador            | Prueba    | Localizador por rol y nombre accesible; sin relajar requisitos                                                                  |
| Adaptadores HTTP de Playwright respondían durante desconexión emulada        | Prueba    | Se abortan también los adaptadores durante el tramo offline; criterio F7 repetido con 37/37 pruebas de órdenes aprobadas        |
| Prueba heredada esperaba una maqueta al abrir UI-SYNC-01                     | Prueba    | Verifica la redirección y el encabezado del centro funcional, conservando axe y control de desbordamiento en los cuatro tamaños |

## Checklist de revisión UX — aprobado

La confirmación fija la versión que estaba visible al pulsar «Revisar resolución». Una actualización recibida con el diálogo abierto no cambia silenciosamente el `If-Match`; el servidor rechaza una versión obsoleta y exige revisar de nuevo. La regresión está cubierta por `synchronization-center.test.tsx` (incluida en las 1.033 pruebas) y los tres recorridos de conectividad pasaron nuevamente en Linux (`tmp/p10-reviewed-version-e2e.log`). Reintentar y descartar solicitan confirmación independiente.

En `/maintenance/synchronization`, panel Demo → «Comparación de conflicto (ejemplo)», alternar Técnico y Dueño/Administrador. El usuario inicialmente indicó que aún no lo revisaba y posteriormente confirmó el 08/11/2026 que las pantallas están bien y aprobó explícitamente UI-SYNC-01. Véase [registro de aprobación](../ux-signoff.md). Las preguntas siguientes se conservan como guía de revisión; no se inventan respuestas individuales.

1. ¿Se distinguen sin ayuda la versión actual del servidor y la del dispositivo? Sí / No.
2. ¿Queda claro qué se aplicará al confirmar cada estrategia? Sí / No.
3. ¿Puede localizarse la versión original conservada después de resolver? Sí / No.
4. ¿El técnico entiende por qué puede consultar pero no resolver? Sí / No.
5. ¿Se identifica el estado de fotos y cierre, y el efecto de descartar una operación? Sí / No.
6. ¿El mensaje de pérdida de acceso explica qué datos locales se eliminaron? Sí / No.

La prueba de cuota inyecta `QuotaExceededError` durante una escritura IndexedDB, después de preparar una foto grande, para comprobar rollback y preservación del borrador. No acredita almacenamiento físicamente lleno en un teléfono. Ver [guion físico](../field-tests.md).

## Límites de auditoría y seguridad

Recibos de pérdida contienen únicamente IDs opacos de descargas/operaciones y motivo, nunca borradores, fotos, llaves o credenciales. El servidor valida que las descargas pertenezcan a la identidad firmada, incluso desactivada; ese endpoint no devuelve órdenes ni permite ejecución. Sin identidad verificable no se garantiza entrega inmediata. La limpieza sensible no se retrasa por un fallo de auditoría.

F7-D02/D03 continúan como propuestas. UX de UI-SYNC-01 aprobada explícitamente el 08/11/2026; no implica aprobación de políticas de negocio ni pruebas físicas. Gate F7 y EXC-F6-01 no se cierran con esta entrega.

Storybook compila, pero Vite informa que ignora directivas `use client` al empaquetar componentes para navegador y mantiene el aviso de chunks mayores de 500 kB (O-02, deuda existente fuera del gate; responsable UI/Tech Lead). Los avisos se conservan en los logs; no se desactivaron reglas ni comprobaciones. ESLint terminó sin warnings. Commit y push autorizados por el usuario el 08/11/2026; no implica aprobación de despliegue ni cierre del gate.

## Archivos y conservación

[Inventario completo de cambios](20261108-inventario-p10-p12.md): 78 archivos de código, pruebas, configuración y documentación, más 197 baselines. Se conservaron los cambios previos del usuario. Las 22 capturas históricas F5/F6 sobrescritas por integración se archivaron en `tmp/p10-integration-captures` y se restauraron a su contenido inicial. Las referencias locales de `next-env.d.ts` vuelven a `.next/dev/types`.
