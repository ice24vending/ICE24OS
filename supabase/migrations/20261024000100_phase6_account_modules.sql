-- TASK-F6-07 (D-01 of the Phase 6 gate; RF-ADM-010, SUP-14, TRD §42): functional modules
-- enabled per account without a different commercial plan. A module in disabled_modules drops
-- every permission of that module from the account's contexts (getAuthorizationSubject), so the
-- navigation hides it and every endpoint denies it. Nothing listed means everything enabled.
-- Only modules a client can operate without may be disabled: identity, accounts, subscriptions,
-- audit, notifications (security and billing alerts), jobs and integration-logs stay enabled.
-- A later module adds its code to the check when it becomes optional.
--
-- Expected duration: one column with a constant default and one permission; seconds.
--
-- Reversal (operational, documented in docs/tasks/task-f6-07.md): prefer a forward fix. If needed:
--   alter table identity.accounts drop column disabled_modules;
--   delete from authz.role_permissions where permission_id in
--     (select id from authz.permissions where code = 'accounts.modules-manage');
--   delete from authz.permissions where code = 'accounts.modules-manage';

alter table identity.accounts
  add column disabled_modules varchar(60)[] not null default '{}'
  check (disabled_modules <@ array['equipment', 'files']::varchar(60)[]);

insert into authz.permissions (code, module_code, action_code, data_classification, description) values
  ('accounts.modules-manage', 'accounts', 'MANAGE', 'RESTRICTED',
   'Enable or disable the functional modules of any account');
insert into authz.role_permissions (role_id, permission_id, effect)
select r.id, p.id, 'ALLOW' from authz.roles r
join authz.permissions p on p.code = 'accounts.modules-manage' and r.code = 'IA';
