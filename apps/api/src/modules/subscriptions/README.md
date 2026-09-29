# Subscriptions

F5-01: dominio de suscripción y demo, aplicación mediante puerto transaccional, adaptador PostgreSQL y consulta/extensión HTTP. Ownership: Tech Lead.

El [módulo documentado](../../../../../docs/modules/subscriptions.md) describe estados, permisos, entidades, puertos, eventos y observabilidad. El [runbook](../../../../../docs/runbooks/stripe.md) describe despliegue, rollback y diagnóstico. Stripe se conecta en F5-02; nunca se aceptan confirmaciones de pago desde el navegador.
