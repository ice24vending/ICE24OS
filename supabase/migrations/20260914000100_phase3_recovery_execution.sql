alter table audit.security_events
  drop constraint security_events_event_type_check;

alter table audit.security_events
  add constraint security_events_event_type_check check (event_type in (
    'LOGIN_SUCCEEDED', 'LOGIN_FAILED', 'MFA_ENROLLED', 'MFA_CHALLENGE_FAILED',
    'RECOVERY_REQUESTED', 'RECOVERY_APPROVED', 'RECOVERY_REJECTED',
    'RECOVERY_RESET_ISSUED', 'SESSION_REVOKED', 'SESSIONS_REVOKED_GLOBAL',
    'CONTEXT_ACTIVATED', 'CONTEXT_REVOKED', 'ACCOUNT_CREATED', 'MEMBERSHIP_CHANGED'
  ));
