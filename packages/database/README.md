# @ice24/database

Boundary for Prisma, migrations, reviewed SQL and deterministic seed plans. This package never exports Prisma models as API contracts. Phase 1 only fixes the toolchain and synthetic dataset; business tables start in their authorized phases.

F5-01 subscription persistence uses the additive [Supabase migration](../../supabase/migrations/20260924000100_phase5_subscriptions.sql): relational records, immutable audit, idempotency and isolated demo conversions. The reviewed PostgreSQL adapter lives in the API subscriptions module behind an application port. See the [module](../../docs/modules/subscriptions.md) and [deployment/rollback runbook](../../docs/runbooks/stripe.md). Existing applied migrations remain unchanged.
