# ADR-018 — SLO, continuidad y retención provisional

- Estado: propuesta; requiere aprobación de Operación, Seguridad, Sanidad y Jurídico.
- Fecha: 17/08/2026.

## SLO/SLI del piloto

| Servicio/indicador | Objetivo mensual |
|---|---:|
| Disponibilidad PWA+BFF y API privada | 99.5% |
| Disponibilidad portal público | 99.9% cuando se habilite |
| Éxito de jobs sin intervención tras reintentos | >= 99.0% |
| Lectura API común | p95 <= 500 ms sin red cliente |
| Escritura API común | p95 <= 800 ms sin efectos asíncronos |
| LCP página principal | p75 <= 2.5 s en dispositivo/red de referencia |
| Alerta crítica encolada | <= 60 s |

Mantenimiento anunciado con 72 horas, ventanas acordadas y fallos de proveedores fuera del control no se eliminan del informe: se muestran separados, no ocultos.

## Continuidad

- Datos transaccionales: RPO 15 minutos, RTO 4 horas.
- Identidad: RPO 24 horas para configuración más base transaccional protegida por PITR; RTO 4 horas.
- Objetos críticos: versionado; RPO 24 horas, RTO 8 horas para recuperación masiva.
- Portal público: RTO 2 horas si existe caché válida; nunca mostrar información privada como fallback.
- Backups automáticos, PITR, Terraform y prueba de restauración trimestral antes de GA.

## Retención propuesta

| Categoría | Política inicial |
|---|---|
| Logs técnicos de aplicación | 30 días en búsqueda, hasta 90 días en archivo restringido |
| Eventos de seguridad | 1 año, acceso restringido |
| Auditoría de negocio | 7 años, append-only; pendiente dictamen legal |
| Originales técnicos/sanitarios | mientras exista obligación e historial del activo; no se borran por transferencia |
| Evidencias fotográficas | vida del expediente + periodo legal por definir |
| Exportaciones/URLs temporales | archivo generado 7 días; URL <= 15 minutos |
| Archivo rechazado/cuarentena | 7 días, inaccesible al usuario, luego eliminación segura |
| Cuenta cancelada | 90 días en solo lectura/retenida; después aplicar anonimización/borrado legalmente autorizado |
| Backups | 35 días operativos; snapshots de release según política aprobada |

Toda categoría admite legal hold. La retención sanitaria, fiscal, contractual y de datos personales **no queda aprobada** hasta dictamen; los valores anteriores permiten estimar arquitectura, no eliminar datos.

Alternativas descartadas: disponibilidad 99.99% en piloto (costo sin evidencia); retención indefinida (riesgo de privacidad/costo); backups sin pruebas (no demuestran recuperabilidad).

Fuentes: PRD 9.3, 9.4, 15.7 y 15.11; TRD 64 y 75–77.
