-- Phase 3: identity, invitation-only access, context sessions, RBAC/ABAC and security audit.
-- Credentials, TOTP secrets and refresh tokens remain exclusively in Supabase Auth/BFF.
create schema if not exists identity;
create schema if not exists authz;
create schema if not exists audit;

create table identity.users (
  id uuid primary key default gen_random_uuid(),
  identity_subject varchar(255) not null unique,
  username varchar(100) not null,
  email varchar(320) not null,
  display_name varchar(200) not null,
  locale varchar(20) not null default 'es-MX',
  time_zone varchar(64) not null default 'America/Mexico_City',
  status varchar(30) not null default 'INVITED'
    check (status in ('INVITED', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED')),
  last_identity_sync_at timestamptz,
  row_version bigint not null default 1 check (row_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
create unique index identity_users_username_lower_uidx on identity.users (lower(username));
create unique index identity_users_email_lower_uidx on identity.users (lower(email));
create index identity_users_status_idx on identity.users (status);

create table identity.accounts (
  id uuid primary key default gen_random_uuid(),
  name varchar(200) not null,
  account_type varchar(20) not null check (account_type in ('INDIVIDUAL', 'COMPANY')),
  access_mode varchar(20) not null default 'ACTIVE'
    check (access_mode in ('ACTIVE', 'READ_ONLY', 'SUSPENDED')),
  row_version bigint not null default 1 check (row_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table authz.roles (
  id uuid primary key default gen_random_uuid(),
  code varchar(80) not null unique,
  name varchar(150) not null,
  role_scope varchar(30) not null
    check (role_scope in ('PLATFORM', 'ACCOUNT', 'BRANCH', 'MACHINE', 'BUSINESS')),
  is_system boolean not null default true,
  status varchar(20) not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  created_at timestamptz not null default now()
);

create table authz.permissions (
  id uuid primary key default gen_random_uuid(),
  code varchar(120) not null unique check (code ~ '^[a-z][a-z0-9_-]*\.[a-z][a-z0-9_-]*$'),
  module_code varchar(60) not null,
  action_code varchar(60) not null,
  data_classification varchar(30) not null
    check (data_classification in ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED')),
  description text not null,
  created_at timestamptz not null default now()
);
create index authz_permissions_module_action_idx on authz.permissions (module_code, action_code);

create table authz.role_permissions (
  role_id uuid not null references authz.roles(id),
  permission_id uuid not null references authz.permissions(id),
  effect varchar(10) not null check (effect in ('ALLOW', 'DENY')),
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create table identity.account_memberships (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references identity.accounts(id),
  user_id uuid not null references identity.users(id),
  status varchar(30) not null default 'PENDING'
    check (status in ('PENDING', 'ACTIVE', 'SUSPENDED', 'ENDED')),
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  is_primary_owner boolean not null default false,
  ended_reason text,
  row_version bigint not null default 1 check (row_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_to is null or valid_to > valid_from),
  check ((status = 'ENDED') = (valid_to is not null))
);
create index account_memberships_account_status_idx
  on identity.account_memberships (account_id, status);
create index account_memberships_user_status_idx
  on identity.account_memberships (user_id, status);
create unique index account_memberships_active_user_uidx
  on identity.account_memberships (account_id, user_id)
  where status in ('PENDING', 'ACTIVE', 'SUSPENDED');
create unique index account_memberships_primary_owner_uidx
  on identity.account_memberships (account_id)
  where is_primary_owner and status = 'ACTIVE';

create table authz.membership_roles (
  membership_id uuid not null references identity.account_memberships(id),
  role_id uuid not null references authz.roles(id),
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  primary key (membership_id, role_id, valid_from),
  check (valid_to is null or valid_to > valid_from)
);
create index membership_roles_active_idx on authz.membership_roles (membership_id, valid_to);

create table authz.membership_permission_overrides (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references identity.account_memberships(id),
  permission_id uuid not null references authz.permissions(id),
  effect varchar(10) not null check (effect in ('ALLOW', 'DENY')),
  reason text not null check (length(trim(reason)) >= 10),
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  created_at timestamptz not null default now(),
  check (valid_to is null or valid_to > valid_from)
);
create index membership_permission_overrides_active_idx
  on authz.membership_permission_overrides (membership_id, valid_to);

create table authz.user_scopes (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references identity.account_memberships(id),
  scope_type varchar(20) not null check (scope_type in ('ACCOUNT', 'BRANCH', 'MACHINE', 'BUSINESS')),
  branch_id uuid,
  machine_id uuid,
  business_id uuid,
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  created_at timestamptz not null default now(),
  check (valid_to is null or valid_to > valid_from),
  check (
    (scope_type = 'ACCOUNT' and branch_id is null and machine_id is null and business_id is null)
    or (scope_type = 'BRANCH' and branch_id is not null and machine_id is null and business_id is null)
    or (scope_type = 'MACHINE' and branch_id is null and machine_id is not null and business_id is null)
    or (scope_type = 'BUSINESS' and branch_id is null and machine_id is null and business_id is not null)
  )
);
create index user_scopes_membership_active_idx on authz.user_scopes (membership_id, valid_to);
create index user_scopes_branch_idx on authz.user_scopes (branch_id) where branch_id is not null;
create index user_scopes_machine_idx on authz.user_scopes (machine_id) where machine_id is not null;

create table identity.user_invitations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references identity.accounts(id),
  email varchar(320) not null,
  invited_role_codes jsonb not null check (jsonb_typeof(invited_role_codes) = 'array'),
  token_hash varchar(255) not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  status varchar(20) not null default 'PENDING'
    check (status in ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED')),
  invited_by_user_id uuid not null references identity.users(id),
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);
create index user_invitations_account_status_idx on identity.user_invitations (account_id, status);
create index user_invitations_email_status_idx on identity.user_invitations (lower(email), status);

create table identity.context_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references identity.users(id),
  account_id uuid not null references identity.accounts(id),
  membership_id uuid not null references identity.account_memberships(id),
  identity_session_id varchar(255),
  assurance_level varchar(10) not null default 'aal1' check (assurance_level in ('aal1', 'aal2')),
  issued_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  idle_expires_at timestamptz not null default (now() + interval '30 minutes'),
  expires_at timestamptz not null default (now() + interval '12 hours'),
  revoked_at timestamptz,
  revocation_reason text,
  device_fingerprint_hash varchar(255),
  device_summary varchar(160),
  created_at timestamptz not null default now(),
  check (idle_expires_at <= expires_at),
  check ((revoked_at is null) = (revocation_reason is null))
);
create index context_sessions_user_expiry_idx on identity.context_sessions (user_id, expires_at);
create index context_sessions_account_active_idx on identity.context_sessions (account_id, revoked_at);
create index context_sessions_identity_session_idx on identity.context_sessions (identity_session_id);

create table identity.recovery_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references identity.users(id),
  requested_at timestamptz not null default now(),
  requested_channel varchar(30) not null
    check (requested_channel in ('PHONE', 'EMAIL', 'SUPPORT_CASE', 'IN_PERSON')),
  request_reason text not null check (length(trim(request_reason)) >= 10),
  status varchar(30) not null default 'OPEN'
    check (status in ('OPEN', 'VERIFYING', 'APPROVED', 'REJECTED', 'RESET_ISSUED', 'CLOSED')),
  verification_method varchar(80),
  verification_summary jsonb,
  resolved_at timestamptz,
  resolution_reason text,
  row_version bigint not null default 1 check (row_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index recovery_cases_user_requested_idx on identity.recovery_cases (user_id, requested_at desc);
create index recovery_cases_status_requested_idx on identity.recovery_cases (status, requested_at);

create table identity.recovery_approvals (
  recovery_case_id uuid not null references identity.recovery_cases(id),
  operator_user_id uuid not null references identity.users(id),
  decision varchar(20) not null check (decision in ('APPROVE', 'REJECT')),
  evidence_references jsonb not null check (jsonb_typeof(evidence_references) = 'array'),
  reason text not null check (length(trim(reason)) >= 10),
  decided_at timestamptz not null default now(),
  primary key (recovery_case_id, operator_user_id)
);

create table audit.security_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  actor_user_id uuid references identity.users(id),
  subject_user_id uuid references identity.users(id),
  context_session_id uuid references identity.context_sessions(id),
  account_id uuid references identity.accounts(id),
  event_type varchar(60) not null check (event_type in (
    'LOGIN_SUCCEEDED', 'LOGIN_FAILED', 'MFA_ENROLLED', 'MFA_CHALLENGE_FAILED',
    'RECOVERY_REQUESTED', 'RECOVERY_APPROVED', 'RECOVERY_REJECTED', 'SESSION_REVOKED',
    'SESSIONS_REVOKED_GLOBAL', 'CONTEXT_ACTIVATED', 'CONTEXT_REVOKED',
    'ACCOUNT_CREATED', 'MEMBERSHIP_CHANGED'
  )),
  result varchar(20) not null check (result in ('SUCCESS', 'DENIED', 'FAILED')),
  reason text,
  correlation_id uuid not null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);
create index security_events_account_time_idx on audit.security_events (account_id, occurred_at desc);
create index security_events_actor_time_idx on audit.security_events (actor_user_id, occurred_at desc);
create index security_events_subject_time_idx on audit.security_events (subject_user_id, occurred_at desc);
create index security_events_correlation_idx on audit.security_events (correlation_id);

create table identity.idempotency_records (
  actor_user_id uuid not null references identity.users(id),
  operation varchar(80) not null,
  idempotency_key varchar(200) not null,
  request_hash varchar(64) not null check (request_hash ~ '^[0-9a-f]{64}$'),
  response_payload jsonb not null check (jsonb_typeof(response_payload) = 'object'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  primary key (actor_user_id, operation, idempotency_key),
  check (length(idempotency_key) between 8 and 200 and expires_at > created_at)
);

create or replace function audit.prevent_event_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'security audit events are append-only';
end
$$;
create trigger security_events_append_only
before update or delete on audit.security_events
for each row execute function audit.prevent_event_mutation();

create or replace function identity.activate_context(
  p_user_id uuid,
  p_account_id uuid,
  p_identity_session_id text,
  p_assurance_level text,
  p_device_fingerprint_hash text,
  p_device_summary text,
  p_correlation_id uuid
)
returns identity.context_sessions
language plpgsql security definer set search_path = '' as $$
declare
  selected_membership identity.account_memberships%rowtype;
  created_session identity.context_sessions%rowtype;
begin
  if p_assurance_level not in ('aal1', 'aal2') then raise exception 'invalid assurance level'; end if;
  select * into strict selected_membership
  from identity.account_memberships
  where user_id = p_user_id and account_id = p_account_id and status = 'ACTIVE'
    and valid_from <= now() and (valid_to is null or valid_to > now());

  update identity.context_sessions
  set revoked_at = now(), revocation_reason = 'CONTEXT_SWITCHED'
  where user_id = p_user_id and revoked_at is null
    and (p_identity_session_id is null or identity_session_id = p_identity_session_id);

  insert into identity.context_sessions (
    user_id, account_id, membership_id, identity_session_id, assurance_level,
    device_fingerprint_hash, device_summary
  ) values (
    p_user_id, p_account_id, selected_membership.id, p_identity_session_id,
    p_assurance_level, p_device_fingerprint_hash, p_device_summary
  ) returning * into created_session;

  insert into audit.security_events (
    actor_user_id, subject_user_id, context_session_id, account_id,
    event_type, result, correlation_id, metadata
  ) values (
    p_user_id, p_user_id, created_session.id, p_account_id,
    'CONTEXT_ACTIVATED', 'SUCCESS', p_correlation_id, '{}'::jsonb
  );
  return created_session;
end
$$;

create or replace function identity.approve_recovery_case(
  p_case_id uuid,
  p_operator_user_id uuid,
  p_verification_method text,
  p_evidence_references jsonb,
  p_reason text,
  p_expected_version bigint,
  p_correlation_id uuid
)
returns identity.recovery_cases
language plpgsql security definer set search_path = '' as $$
declare
  recovery identity.recovery_cases%rowtype;
  approvals integer;
begin
  select * into strict recovery from identity.recovery_cases where id = p_case_id for update;
  if recovery.user_id = p_operator_user_id then raise exception 'self approval is forbidden'; end if;
  if recovery.row_version <> p_expected_version then raise exception 'version conflict'; end if;
  if recovery.status not in ('OPEN', 'VERIFYING') then raise exception 'invalid recovery state'; end if;

  insert into identity.recovery_approvals (
    recovery_case_id, operator_user_id, decision, evidence_references, reason
  ) values (p_case_id, p_operator_user_id, 'APPROVE', p_evidence_references, p_reason);

  select count(*) into approvals from identity.recovery_approvals
  where recovery_case_id = p_case_id and decision = 'APPROVE';

  update identity.recovery_cases
  set status = case when approvals >= 2 then 'APPROVED' else 'VERIFYING' end,
      verification_method = p_verification_method,
      verification_summary = jsonb_build_object('evidenceReferenceCount', jsonb_array_length(p_evidence_references)),
      row_version = row_version + 1,
      updated_at = now()
  where id = p_case_id returning * into recovery;

  insert into audit.security_events (
    actor_user_id, subject_user_id, event_type, result, reason, correlation_id,
    metadata
  ) values (
    p_operator_user_id, recovery.user_id, 'RECOVERY_APPROVED', 'SUCCESS', p_reason,
    p_correlation_id, jsonb_build_object('caseId', p_case_id, 'approvalCount', approvals)
  );
  return recovery;
end
$$;

insert into authz.roles (code, name, role_scope, is_system) values
  ('IA', 'ICE24 Admin', 'PLATFORM', true),
  ('IO', 'ICE24 Operaciones', 'PLATFORM', true),
  ('OW', 'Propietario de cuenta', 'ACCOUNT', true),
  ('TC', 'Técnico', 'MACHINE', true),
  ('OP', 'Operador', 'BRANCH', true),
  ('SA', 'Responsable sanitario', 'ACCOUNT', true),
  ('DV', 'Repartidor', 'BUSINESS', true),
  ('RA', 'Restaurante Admin', 'BUSINESS', true),
  ('AU', 'Consulta/Auditor', 'ACCOUNT', true)
on conflict (code) do update set name = excluded.name, role_scope = excluded.role_scope;

insert into authz.permissions (code, module_code, action_code, data_classification, description) values
  ('identity.profile-read', 'identity', 'READ', 'CONFIDENTIAL', 'Read an authorized local identity profile'),
  ('identity.profile-update', 'identity', 'UPDATE', 'CONFIDENTIAL', 'Update the own local profile'),
  ('identity.context-activate', 'identity', 'ACTIVATE', 'CONFIDENTIAL', 'Activate an authorized account context'),
  ('identity.session-revoke', 'identity', 'REVOKE', 'RESTRICTED', 'Revoke a session in the authorized scope'),
  ('identity.membership-manage', 'identity', 'MANAGE', 'RESTRICTED', 'Manage account memberships, roles and scopes'),
  ('identity.recovery-manage', 'identity', 'RECOVER', 'RESTRICTED', 'Operate manual recovery with dual control'),
  ('accounts.create', 'accounts', 'CREATE', 'RESTRICTED', 'Create an account with its primary owner'),
  ('audit.security-read', 'audit', 'READ', 'RESTRICTED', 'Read security audit in the authorized scope')
on conflict (code) do update set description = excluded.description;

insert into authz.role_permissions (role_id, permission_id, effect)
select role.id, permission.id, 'ALLOW'
from authz.roles role cross join authz.permissions permission
where role.code = 'IA'
on conflict (role_id, permission_id) do update set effect = excluded.effect;

insert into authz.role_permissions (role_id, permission_id, effect)
select role.id, permission.id, 'ALLOW'
from authz.roles role join authz.permissions permission on permission.code in (
  'identity.profile-read', 'identity.context-activate', 'identity.session-revoke',
  'identity.membership-manage', 'identity.recovery-manage', 'audit.security-read'
)
where role.code = 'IO'
on conflict (role_id, permission_id) do update set effect = excluded.effect;

insert into authz.role_permissions (role_id, permission_id, effect)
select role.id, permission.id, 'ALLOW'
from authz.roles role join authz.permissions permission on permission.code in (
  'identity.profile-read', 'identity.profile-update', 'identity.context-activate',
  'identity.session-revoke', 'identity.membership-manage'
)
where role.code = 'OW'
on conflict (role_id, permission_id) do update set effect = excluded.effect;

insert into authz.role_permissions (role_id, permission_id, effect)
select role.id, permission.id, 'ALLOW'
from authz.roles role join authz.permissions permission on permission.code in (
  'identity.profile-read', 'identity.profile-update', 'identity.context-activate',
  'identity.session-revoke'
)
where role.code in ('TC', 'OP', 'SA', 'DV', 'RA', 'AU')
on conflict (role_id, permission_id) do update set effect = excluded.effect;

alter table identity.users enable row level security;
alter table identity.accounts enable row level security;
alter table identity.account_memberships enable row level security;
alter table identity.user_invitations enable row level security;
alter table identity.context_sessions enable row level security;
alter table identity.recovery_cases enable row level security;
alter table identity.recovery_approvals enable row level security;
alter table identity.idempotency_records enable row level security;
alter table authz.roles enable row level security;
alter table authz.permissions enable row level security;
alter table authz.role_permissions enable row level security;
alter table authz.membership_roles enable row level security;
alter table authz.membership_permission_overrides enable row level security;
alter table authz.user_scopes enable row level security;
alter table audit.security_events enable row level security;

revoke all on schema identity, authz, audit from public, anon, authenticated;
revoke all on all tables in schema identity, authz, audit from public, anon, authenticated;
revoke all on all functions in schema identity, authz, audit from public, anon, authenticated;
grant usage on schema identity, authz, audit to service_role;
grant select, insert, update on all tables in schema identity, authz to service_role;
grant select, insert on all tables in schema audit to service_role;
grant execute on function identity.activate_context(uuid, uuid, text, text, text, text, uuid) to service_role;
grant execute on function identity.approve_recovery_case(uuid, uuid, text, jsonb, text, bigint, uuid) to service_role;
