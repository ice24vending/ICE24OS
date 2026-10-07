-- F5-15: expected version (optimistic concurrency) for INT-004 manual job retry.
-- API.md: sensitive updates carry If-Match (ETag or expected version); a mismatch is
-- 412 PRECONDITION_FAILED. infra.retry_dead_letter_job keeps its contract and remains the only
-- writer. This wrapper locks the same row first, replays an already recorded idempotency key (a
-- retried request carries the version it saw before its first attempt) and only then compares
-- the version, so a replay never turns into a false conflict.
-- Additive migration: one function and its grants; no table or data changes.

create function infra.retry_dead_letter_job_expected(
  p_job_id uuid, p_expected_version integer, p_actor_user_id uuid, p_context_session_id uuid,
  p_reason text, p_idempotency_key text, p_correlation_id uuid
) returns setof infra.async_jobs
language plpgsql security definer set search_path = '' as $$
declare
  current_version integer;
begin
  if p_expected_version is null or p_expected_version < 1 then
    raise exception using errcode = '22023', message = 'A positive expected version is required';
  end if;
  select j.row_version into current_version from infra.async_jobs j where j.id = p_job_id for update;
  if current_version is null then
    raise exception using errcode = 'IC404', message = 'Job not found';
  end if;
  if not exists (select 1 from infra.async_job_transitions t
                 where t.job_id = p_job_id and t.idempotency_key = p_idempotency_key)
     and current_version <> p_expected_version then
    raise exception using errcode = 'ICVER',
      message = format('Job version is %s, expected %s', current_version, p_expected_version);
  end if;
  return query select * from infra.retry_dead_letter_job(p_job_id, p_actor_user_id,
    p_context_session_id, p_reason, p_idempotency_key, p_correlation_id);
end $$;

revoke all on function infra.retry_dead_letter_job_expected(uuid, integer, uuid, uuid, text, text, uuid)
  from public, anon, authenticated, service_role;
grant execute on function infra.retry_dead_letter_job_expected(uuid, integer, uuid, uuid, text, text, uuid)
  to service_role;
