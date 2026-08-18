# ADR-020 — Código ICE24 OS y folios

- Estado: propuesta para validación funcional.
- Fecha: 17/08/2026.

## Código de máquina

Formato visible: `ICE24-XXXXXXXXXX-C`, donde los diez caracteres son aleatorios en Crockford Base32, sin `I`, `L`, `O` ni `U`, y `C` es un carácter de verificación mod-37. Ejemplo no válido para producción: `ICE24-7K3M9Q2V8D-X`.

- Se genera una sola vez al aprobar el alta y es globalmente único e inmutable.
- No codifica propietario, sucursal, modelo, fecha ni serie.
- Comparación insensible a mayúsculas y guiones; visualización siempre canónica.
- Reintentar colisión dentro de una restricción única; nunca reasignar un código retirado.
- No es credencial: rutas públicas usan un slug aleatorio de al menos 128 bits, rotatable e independiente.

## IDs y folios

- IDs internos: UUIDv7; no se exponen como autorización ni se editan.
- Folio privado: `<DOM>-<AAAA>-<SECUENCIA de 6>`, secuencia atómica por cuenta, dominio y año. Ejemplo: `MNT-2026-000123`.
- Dominios iniciales: `MNT`, `TKT`, `LAB`, `NCR`, `INV`, `RPT`, `IMP`, `ORD`, `INC`.
- Folios públicos: `PUB-<AAAA>-<10 Base32>-<check>`, no secuenciales.
- El folio puede corregirse sólo creando referencia/alias auditado; nunca cambia la llave interna.
- Toda búsqueda por folio aplica primero el contexto de cuenta; el error no revela existencia en otra cuenta.

Alternativas descartadas: serie física como ID (puede ser errónea/repetida); códigos secuenciales globales (enumerables); incluir propietario (rompe transferencias); usar folio como primary key.

Fuentes: PRD RF-EQP-016–018 y preguntas 16–18; TRD 24.2; Project Rules 4.3.
