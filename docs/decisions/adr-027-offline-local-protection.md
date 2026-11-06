# ADR-027 — Protección local y shell offline

Fecha: 04/11/2026. Estado: **Propuesta implementada; shell desactivado**. Relacionado con DEC-018, F7-D03 y ADR-026. Requiere revisión de Tech Lead/Seguridad y Dirección antes de activación productiva.

## Implementación

IndexedDB v2 conserva intacta la cola v1. Sus filas sin usuario quedan en cuarentena lógica: no se atribuyen al usuario que abra el navegador ni se muestran en otra sesión. La reconciliación de esos pendientes requiere verificar su autor/origen; no se migran por inferencia. Los almacenes nuevos son orders, drafts, evidence, operations, metadata y keys. Todos los registros nuevos contienen usuario y cuenta; las claves incluyen ambos. La API del paquete exige propietario explícito y nunca ofrece lectura global de contenido.

El contenido se cifra con AES-256-GCM, IV aleatorio por escritura y datos adicionales autenticados que vinculan almacén, identidad, orden, versión y fechas. La llave CryptoKey no exportable vive en IndexedDB, separada por cuenta/usuario, con generación para detectar un borrado/reemplazo concurrente. Se elimina con los registros al cerrar sesión. No se guardan tokens de acceso, renovación, cookies ni CSRF. Los consumidores solo deben guardar paquetes mínimos autorizados, nunca objetos de sesión.

La escritura de contenido y metadatos es una transacción; las cuotas se verifican dentro de ella, incluyendo escrituras concurrentes. Propuesta vigente: máximo 50 MB por orden y 250 MB por dispositivo, 72 horas desde descarga. No se amplía la vigencia al guardar borradores. Cuota o bloqueo del navegador producen errores explícitos; no se informa éxito ni se borra el borrador previo. Lecturas corruptas o vencidas se rechazan sin sobrescribir la evidencia. `requestPersistentStorage` solicita persistencia al navegador sin asumir que será concedida.

## Recarga sin conexión

`NEXT_PUBLIC_ICE24_OFFLINE_SHELL=1` habilita el shell mínimo; por defecto está desactivado. El worker solo precarga dos recursos públicos genéricos: `/offline-shell.html` y `/offline-shell.js`. No guarda HTML autenticado, respuestas RSC, API ni sesiones. Si una navegación a una orden falla por red, abre el shell, verifica el contexto de esa pestaña y la vigencia, descifra únicamente la orden solicitada y muestra su checklist/procedimiento en consulta. El contexto no secreto de pestaña procede del shell autenticado y vence como máximo con la sesión. Sin él exige reconexión. P7 implementa la descarga autorizada; P9 amplía esta consulta a edición offline.

Para revertir, retirar la bandera y desplegar: el registro instala el worker sin caché y elimina las cachés ICE24 anteriores. Deshabilitar la interfaz no elimina los pendientes; su borrado es explícito al terminar sesión. La migración v2 no se revierte destruyendo almacenes.

## Límites y riesgo residual

No protege frente a XSS ejecutado en el mismo origen, un navegador/OS comprometido, acceso físico a una sesión desbloqueada ni modificación de reloj o del código local. Una llave no exportable aún puede utilizarse para descifrar desde ese origen. Los metadatos de identidad y vencimiento no están cifrados. No se puede verificar revocación remota sin red; al reconectar el servidor vuelve a autorizar cada comando, estado, versión y contexto. El navegador puede desalojar datos incluso con persistencia solicitada. No se promete recuperación de evidencia desalojada. P11 completa la política de revocación y borrado; no se declara resuelta aquí.

## Evidencia

Pruebas fake-indexeddb: migración con pendientes v1, aislamiento, reapertura de base, blobs cifrados, llave no exportable, caducidad, corrupción, rollback por cuota, almacenamiento bloqueado y borrado transaccional. Ver [F7-09](../tasks/task-f7-09.md). La habilitación de Preview conserva los requisitos de ADR-026; esta bandera no los sustituye.
