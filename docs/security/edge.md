# Seguridad — Edge y CDN

Vercel sirve las superficies web por CDN. El módulo edge puede habilitar reglas OWASP, challenge de bots y 120 solicitudes/minuto por IP+JA4. Se mantiene apagado hasta confirmar disponibilidad y costo del plan.

Las aplicaciones agregan nosniff, deny framing, referrer policy, permissions policy y aislamiento de recursos. El firewall reduce abuso, pero no reemplaza autenticación, autorización por objeto ni rate limits por identidad. CSP con nonce se configura en Fase 6 junto con el shell productivo para no romper scripts de Next.
