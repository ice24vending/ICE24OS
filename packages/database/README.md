# @ice24/database

Boundary for Prisma, migrations, reviewed SQL and deterministic seed plans. This package never exports Prisma models as API contracts. Phase 1 only fixes the toolchain and synthetic dataset; business tables start in their authorized phases.

F5-14 adds integration logs through an [additive migration](../../supabase/migrations/20261006000100_phase5_integration_logs.sql): append-only `infra.integration_logs` with integration, operation, direction, status, latency, response code, attempt, effect key, correlation and account. One row per effect and attempt; redacted details are checked by a constraint that rejects URLs, signed paths, secrets and tokens. Retention is configurable (`infra.purge_integration_logs`) and disabled until a period is approved; see the [module](../../docs/modules/integration-logs.md).

F5-13 adds the scheduler through an [additive migration](../../supabase/migrations/20261005000100_phase5_scheduler.sql): idempotent windows per task with lease, pause controls and their append-only history, the `scheduled_tasks` queue, validated subscription expirations (`SYSTEM` actor, audit origin `WORKER`) and append-only Stripe reconciliation findings. Windows, history and findings cannot be deleted; see the [scheduler runbook](../../docs/runbooks/scheduler.md).

F5-12 adds transactional email through an [additive migration](../../supabase/migrations/20261003000900_phase5_email.sql): send registry with idempotency key, origin event correlation, attempts and last error, append-only history, provider tracking events and the `email_deliveries` queue. History cannot be deleted; rollback is operational (see the [email runbook](../../docs/runbooks/email.md)).

F5-05 adds the [transactional outbox](../../docs/modules/outbox.md): `appendOutboxEvent`, `publishOutbox` and `readOutboxStatus` in `src/outbox` accept any `pg`-compatible client, so producers write events with their own transaction. Migrations [store](../../supabase/migrations/20261003000100_phase5_outbox.sql) and [publisher](../../supabase/migrations/20261003000200_phase5_outbox_publisher.sql) are additive.

F5-04 adds the central append-only audit store through [an additive migration](../../supabase/migrations/20261002000100_phase5_audit.sql). PostgreSQL rejects UPDATE, DELETE and TRUNCATE. The transactional writer and parameterized read adapter are in the API audit module behind its application port. See [scope, contracts and validation](../../docs/tasks/task-f5-04.md).

F5-01 subscription persistence uses the additive [Supabase migration](../../supabase/migrations/20260924000100_phase5_subscriptions.sql): relational records, immutable audit, idempotency and isolated demo conversions. The reviewed PostgreSQL adapter lives in the API subscriptions module behind an application port. See the [module](../../docs/modules/subscriptions.md) and [deployment/rollback runbook](../../docs/runbooks/stripe.md). Existing applied migrations remain unchanged.
