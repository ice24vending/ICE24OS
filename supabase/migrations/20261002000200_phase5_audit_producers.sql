-- Central projection runs inside the producer's transaction, including SQL-only
-- identity functions. No asynchronous window, duplicate delivery or raw payload copy.
create function audit.event_summary(payload jsonb) returns jsonb
language sql immutable set search_path='' as $$
  select case when payload is null or payload='null'::jsonb then null else
    coalesce((select jsonb_object_agg(key,value) from jsonb_each(payload)
      where key=any(array['status','row_version','version','access_mode','isDemo',
        'demoExpiresAt','currentPeriodStart','currentPeriodEnd','cancelAtPeriodEnd',
        'planCode','membershipId','operation','caseId','approvalCount','sessionCount',
        'roleCodes','permissionOverrides','branchIds','machineIds','accountWide'])
        and jsonb_typeof(value) in ('string','number','boolean','null','array')), '{}'::jsonb) end
$$;

create function audit.capture_domain_event() returns trigger
language plpgsql security definer set search_path='' as $$
declare
  actor uuid; context_id uuid; target_account uuid; target_entity uuid;
  entity text; event_origin text := 'API'; actor_kind text := 'USER';
  previous_summary jsonb; next_summary jsonb; outcome text := 'SUCCESS';
  captured_branch uuid; captured_machine uuid; zone text;
begin
  if tg_table_schema='subscriptions' then
    actor := new.actor_id; context_id := new.context_id; target_account := new.account_id;
    target_entity := new.subscription_id; entity := 'Subscription';
    actor_kind := new.actor_type;
    if actor_kind='STRIPE' then event_origin := 'WEBHOOK'; end if;
    previous_summary := audit.event_summary(new.previous_state);
    next_summary := audit.event_summary(new.new_state);
  elsif tg_table_schema='equipment' then
    actor := new.actor_id; context_id := new.context_id; target_account := new.account_id;
    target_entity := new.resource_id; entity := 'EquipmentResource';
    if new.event_type like 'MEMBER%' then entity := 'Membership'; end if;
    select m.id,m.branch_id into captured_machine,captured_branch from equipment.machines m
      where m.id=target_entity and m.account_id=target_account;
    if captured_machine is null then
      select b.id into captured_branch from equipment.branches b
        where b.id=target_entity and b.account_id=target_account;
    end if;
    previous_summary := audit.event_summary(new.before_data);
    next_summary := audit.event_summary(new.after_data);
  else
    actor := new.actor_user_id; context_id := new.context_session_id;
    target_account := new.account_id; target_entity := coalesce(new.subject_user_id,new.id);
    entity := 'Identity'; outcome := new.result;
    next_summary := audit.event_summary(new.metadata);
    if new.event_type='MEMBERSHIP_CHANGED' then
      next_summary := coalesce(next_summary,'{}'::jsonb) || coalesce((
        select jsonb_build_object('status',m.status,'roleCodes',coalesce((
          select jsonb_agg(r.code order by r.code) from authz.membership_roles mr
          join authz.roles r on r.id=mr.role_id where mr.membership_id=m.id and mr.valid_to is null
        ),'[]'::jsonb)) from identity.account_memberships m
        where m.id::text=new.metadata->>'membershipId'
      ),'{}'::jsonb);
    end if;
    if actor is null then actor_kind := 'SYSTEM'; context_id := null; end if;
    -- Legacy revocation events can reference the subject's session, not the actor's.
    if context_id is not null and not exists(select 1 from identity.context_sessions c
      where c.id=context_id and c.user_id=actor) then
      next_summary := coalesce(next_summary,'{}'::jsonb) || jsonb_build_object('subjectContextId',context_id);
      context_id := null;
    end if;
  end if;
  select u.time_zone into zone from identity.users u where u.id=actor;
  insert into audit.events(id,event_version,occurred_at_utc,time_zone,actor_user_id,actor_type,
    context_session_id,account_id,branch_id,machine_id,entity_type,entity_id,operation,
    previous_values,new_values,reason,origin,result,correlation_id)
  values(new.id,1,new.occurred_at,coalesce(zone,'UTC'),actor,actor_kind,context_id,
    target_account,captured_branch,captured_machine,entity,target_entity,new.event_type,
    previous_summary,next_summary,new.reason,event_origin,outcome,new.correlation_id);
  return new;
end $$;
create trigger subscription_central_audit after insert on subscriptions.events
for each row execute function audit.capture_domain_event();
create trigger equipment_central_audit after insert on equipment.events
for each row execute function audit.capture_domain_event();
create trigger identity_central_audit after insert on audit.security_events
for each row execute function audit.capture_domain_event();
revoke all on function audit.event_summary(jsonb),audit.capture_domain_event() from public,anon,authenticated;
