import type { OutboxMessage } from "@ice24/contracts";
import type { PoolClient } from "pg";
import type { DomainEventConsumer } from "./domain-events.js";

/** Stable consumer name: part of the idempotency key in infra.processed_messages. */
export const SCHEDULE_RECALC_CONSUMER = "schedule-recalc";

/** Events of one machine: components (F4-19), machine frequencies (F4-20) and transfers. */
export const MACHINE_SCHEDULE_EVENTS = [
  "MachineComponentAdded",
  "MachineComponentActivated",
  "MachineComponentDeactivated",
  "MachineComponentsTransferClosed",
  "MachineFrequenciesChanged",
  "MachineTransferred",
] as const;
/** Account frequencies (F4-20) apply to every machine of the account. */
export const ACCOUNT_SCHEDULE_EVENTS = ["AccountFrequenciesChanged"] as const;

/**
 * TASK-F4-21: enqueues one recalculation job per affected machine. The job key
 * `recalc:<eventId>:<machineId>` is deterministic, so a redelivered event (or a second consumer
 * run) never enqueues a duplicate; the job itself rebuilds the calendar from current state.
 * Account events resolve the account's machines at consumption time, so a machine activated or
 * transferred in meanwhile is included or excluded correctly.
 */
export const scheduleRecalcConsumer: DomainEventConsumer = {
  name: SCHEDULE_RECALC_CONSUMER,
  eventTypes: [...MACHINE_SCHEDULE_EVENTS, ...ACCOUNT_SCHEDULE_EVENTS],
  async handle(event: OutboxMessage, tx: PoolClient): Promise<void> {
    const accountScope = (ACCOUNT_SCHEDULE_EVENTS as readonly string[]).includes(event.type);
    await tx.query(
      `insert into equipment.schedule_jobs(machine_id,template_id,effective_at,kind,generation_key,correlation_id)
      select m.id,m.template_id,$3::timestamptz,'recalc','recalc:'||$1::text||':'||m.id,$4
      from equipment.machines m
      where m.operational_status<>'retired'
        and case when $5 then m.account_id=$2 else m.id=$2 end
      order by m.id
      on conflict (generation_key) do nothing`,
      [event.eventId, event.aggregateId, event.occurredAt, event.correlationId, accountScope],
    );
  },
};
