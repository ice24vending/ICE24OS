-- F5-15: expected version (optimistic concurrency) for NOT-003..NOT-006 notification
-- transitions. Same rule as infra.retry_dead_letter_job_expected: lock the recipient row, replay
-- a recorded idempotency key, then compare the version (412 PRECONDITION_FAILED on mismatch).
-- notifications.transition keeps its contract and remains the only writer.
-- Additive migration: one function and its grants; no table or data changes.

create function notifications.transition_expected(
  p_recipient_id uuid, p_account_id uuid, p_actor_user_id uuid, p_context_session_id uuid,
  p_action text, p_resource jsonb, p_idempotency_key text, p_correlation_id uuid,
  p_expected_version integer
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  current_version integer;
begin
  if p_expected_version is null or p_expected_version < 1 then
    raise exception using errcode = '22023', message = 'A positive expected version is required';
  end if;
  -- Same scope as notifications.transition: another recipient's row is simply not found.
  select r.row_version into current_version from notifications.notification_recipients r
    where r.id = p_recipient_id and r.account_id = p_account_id and r.user_id = p_actor_user_id
    for update;
  if current_version is null then
    raise exception using errcode = 'IC404', message = 'Notification not found';
  end if;
  if not exists (select 1 from notifications.recipient_transitions t
                 where t.recipient_id = p_recipient_id and t.idempotency_key = p_idempotency_key)
     and current_version <> p_expected_version then
    raise exception using errcode = 'ICVER',
      message = format('Notification version is %s, expected %s', current_version, p_expected_version);
  end if;
  return notifications.transition(p_recipient_id, p_account_id, p_actor_user_id,
    p_context_session_id, p_action, p_resource, p_idempotency_key, p_correlation_id);
end $$;

revoke all on function
  notifications.transition_expected(uuid, uuid, uuid, uuid, text, jsonb, text, uuid, integer)
  from public, anon, authenticated, service_role;
grant execute on function
  notifications.transition_expected(uuid, uuid, uuid, uuid, text, jsonb, text, uuid, integer)
  to service_role;
