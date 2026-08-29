# Runbook — Almacenamiento de objetos

Los buckets `quarantine`, `originals`, `derivatives` y `exports` son privados. Sólo el servicio puede operar durante Fase 2; las políticas por cuenta se incorporan junto con el dominio de archivos.

## Controles

- No crear buckets públicos ni URLs permanentes.
- Cuarentena acepta PDF/JPEG/PNG hasta 50 MiB y nunca se consume antes del resultado antimalware.
- Originales no se eliminan por transferencia de activo.
- Exportaciones admiten hasta 100 MiB y tienen clase temporal de siete días.
- Una URL firmada dura como máximo 15 minutos; el TTL de caché debe ser menor o igual.
- El borrado automático de originales/derivados queda bloqueado hasta dictamen legal y soporte de legal hold.

Para verificar privacidad, una petición anónima y otra autenticada sin política deben recibir denegación; service role se usa sólo en servidor.
