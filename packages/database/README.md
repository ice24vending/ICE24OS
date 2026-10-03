# @ice24/database

Boundary for Prisma, migrations, reviewed SQL and deterministic seed plans. This package never exports Prisma models as API contracts. Phase 1 only fixes the toolchain and synthetic dataset; business tables start in their authorized phases.

F5-05 adds the [transactional outbox](../../docs/modules/outbox.md): `appendOutboxEvent`, `publishOutbox` and `readOutboxStatus` in `src/outbox` accept any `pg`-compatible client, so producers write events with their own transaction. Migrations [store](../../supabase/migrations/20261003000100_phase5_outbox.sql) and [publisher](../../supabase/migrations/20261003000200_phase5_outbox_publisher.sql) are additive.

F5-04 adds the central append-only audit store through [an additive migration](../../supabase/migrations/20261002000100_phase5_audit.sql). PostgreSQL rejects UPDATE, DELETE and TRUNCATE. The transactional writer and parameterized read adapter are in the API audit module behind its application port. See [scope, contracts and validation](../../docs/tasks/task-f5-04.md).

F5-01 subscription persistence uses the additive [Supabase migration](../../supabase/migrations/20260924000100_phase5_subscriptions.sql): relational records, immutable audit, idempotency and isolated demo conversions. The reviewed PostgreSQL adapter lives in the API subscriptions module behind an application port. See the [module](../../docs/modules/subscriptions.md) and [deployment/rollback runbook](../../docs/runbooks/stripe.md). Existing applied migrations remain unchanged.
