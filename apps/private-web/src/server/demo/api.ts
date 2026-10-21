import { authorize, type AuthorizationDecision } from "@ice24/authorization";
import { SYSTEM_ACTOR_ID, contextFocusSchema, type ErrorCode } from "@ice24/contracts";

import {
  DEMO_ACCOUNTS,
  DEMO_MODELS,
  at,
  demoContextId,
  demoIds,
  demoMembershipId,
  demoUserId,
  type DemoAccount,
  type DemoAccountKey,
  type DemoMachine,
} from "./fixtures";
import {
  DEMO_PERSONAS,
  PERMISSION_CLASSIFICATION,
  demoSubject,
  type DemoPersonaKey,
  type PermissionCode,
} from "./personas";
import type { DemoState } from "./state";

/**
 * In-process stand-in for the private API while the demo mode is on (F6-00). It answers the
 * paths the private web calls, with the fixtures of the selected persona and account, and
 * decides every access with the real `authorize()` — the same denials (403, ACCOUNT_READ_ONLY)
 * the API would return. Writes are authorized but never stored: the demo is a review tool.
 */
export const DEMO_SLOW_MS = 2_500;
const TIME_ZONE = "America/Mexico_City";

interface Scope {
  readonly account: DemoAccount;
  readonly branchIds: readonly string[];
  readonly machineIds: readonly string[];
}

/** Branch administrators reach one branch; technicians, the machines of that branch. */
function scopeFor(state: DemoState, accountKey: DemoAccountKey): Scope {
  const account = DEMO_ACCOUNTS[accountKey];
  const branch =
    accountKey === state.account ? state.branch : (account.branches[0]?.id ?? state.branch);
  const scope = DEMO_PERSONAS[state.persona].scope;
  return {
    account,
    branchIds: scope === "BRANCH" ? [branch] : [],
    machineIds:
      scope === "MACHINE"
        ? account.machines.filter((machine) => machine.branchId === branch).map((m) => m.id)
        : [],
  };
}

class DemoRequest {
  readonly persona;
  readonly scope;
  readonly subject;
  constructor(
    readonly state: DemoState,
    readonly now: number,
  ) {
    this.persona = DEMO_PERSONAS[state.persona];
    this.scope = scopeFor(state, state.account);
    this.subject = demoSubject({
      persona: this.persona,
      userId: demoUserId(state.persona),
      membershipId: demoMembershipId(state.persona, state.account),
      accountId: this.scope.account.id,
      mode: state.mode,
      branchIds: this.scope.branchIds,
      machineIds: this.scope.machineIds,
    });
  }
  get account() {
    return this.scope.account;
  }
  authorize(
    permission: PermissionCode,
    operation: "READ" | "WRITE",
    target: { branchId?: string; machineId?: string } = {},
  ): AuthorizationDecision {
    return authorize(this.subject, {
      accountId: this.account.id,
      permission,
      classification: PERMISSION_CLASSIFICATION[permission],
      operation,
      ...target,
    });
  }
  can(permission: PermissionCode, target: { branchId?: string; machineId?: string } = {}) {
    return this.authorize(permission, "READ", target).allowed;
  }
  /** Machines the persona reaches: all for account roles, by branch or by assignment otherwise. */
  get machines(): readonly DemoMachine[] {
    return this.account.machines.filter(
      (machine) =>
        this.subject.accountWide ||
        this.scope.branchIds.includes(machine.branchId) ||
        this.scope.machineIds.includes(machine.id),
    );
  }
  get branches() {
    return this.account.branches.filter(
      (branch) =>
        this.subject.accountWide ||
        this.scope.branchIds.includes(branch.id) ||
        this.machines.some((machine) => machine.branchId === branch.id),
    );
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

const failure = (status: number, code: ErrorCode, message: string, now: number) =>
  json(
    {
      error: {
        code,
        message,
        correlationId: demoIds.correlation(999),
        timestamp: new Date(now).toISOString(),
      },
    },
    status,
  );

/** The API's answer to a denial: read-only has its own code so screens explain the cause. */
const denied = (decision: AuthorizationDecision, now: number) =>
  decision.allowed
    ? null
    : decision.reason === "account_read_only"
      ? failure(403, "ACCOUNT_READ_ONLY", "The account is read-only", now)
      : failure(403, "FORBIDDEN", "Forbidden", now);

const localTime = (iso: string) =>
  new Intl.DateTimeFormat("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: TIME_ZONE,
  }).format(new Date(iso));

// ---------------------------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------------------------

export function accessContext(state: DemoState, accountKey: DemoAccountKey, now: number) {
  const scope = scopeFor(state, accountKey);
  return {
    id: demoContextId(state.persona, accountKey),
    accountId: scope.account.id,
    accountName: scope.account.name,
    membershipId: demoMembershipId(state.persona, accountKey),
    membershipStatus: "ACTIVE" as const,
    accessMode: accountKey === state.account ? state.mode : ("ACTIVE" as const),
    roleCodes: [DEMO_PERSONAS[state.persona].role],
    branchIds: [...scope.branchIds],
    machineIds: [...scope.machineIds],
    issuedAt: at(now, 0, -1),
    expiresAt: at(now, 0, 11),
  };
}

/** Same rule as the API's `contextCapabilities`: codes the context may read with. */
export const capabilities = (request: DemoRequest) => ({
  permissions: request.subject.permissions
    .map((grant) => grant.code as PermissionCode)
    .filter((code) => request.can(code)),
  mfaVerified: request.subject.assuranceLevel === "aal2",
});

export function subscriptionView(request: DemoRequest) {
  const { account, state, now } = request;
  const owner = demoUserId("owner");
  const common = {
    id: demoIds.subscription(account.key === "polar" ? 1 : 2),
    accountId: account.id,
    provider: "stripe" as const,
    planCode: "ICE24_MENSUAL",
    price: { amountMinor: 39_900, currency: "MXN" as const },
    cancelAtPeriodEnd: false,
    version: 3,
    createdAt: at(now, -90),
    updatedAt: at(now, -12),
    audit: {
      createdAt: at(now, -90),
      createdBy: owner,
      updatedAt: at(now, -12),
      updatedBy: null,
      version: 3,
    },
    accessMode: state.mode,
  };
  return account.isDemo
    ? {
        ...common,
        providerCustomerId: null,
        providerSubscriptionId: null,
        status: state.mode === "READ_ONLY" ? ("read_only" as const) : ("demo" as const),
        currentPeriodStart: null,
        currentPeriodEnd: null,
        isDemo: true,
        demoExpiresAt: state.mode === "READ_ONLY" ? at(now, -1) : at(now, 20),
      }
    : {
        ...common,
        providerCustomerId: `cus_demo_${account.key}`,
        providerSubscriptionId: `sub_demo_${account.key}`,
        status: state.mode === "READ_ONLY" ? ("payment_failed" as const) : ("active" as const),
        currentPeriodStart: at(now, -12),
        currentPeriodEnd: at(now, 18),
        isDemo: false,
        demoExpiresAt: null,
      };
}

type NotificationStatus = "unread" | "read" | "acknowledged" | "in_progress" | "resolved";

function notification(
  request: DemoRequest,
  n: number,
  input: {
    type: string;
    priority: "info" | "warning" | "high" | "critical";
    title: string;
    message: string;
    status: NotificationStatus;
    days: number;
    resource?: { type: string; id: string };
    action?: { href: string; label: string };
    conditionOpen?: boolean;
  },
) {
  const occurredAt = at(request.now, input.days);
  const reached = (status: NotificationStatus) =>
    ["read", "acknowledged", "in_progress", "resolved"].indexOf(input.status) >=
    ["read", "acknowledged", "in_progress", "resolved"].indexOf(status)
      ? at(request.now, input.days, 1)
      : null;
  return {
    id: demoIds.notification(n),
    type: input.type,
    priority: input.priority,
    title: input.title,
    message: input.message,
    recipientUserId: request.subject.userId,
    ...(input.resource ? { relatedResource: input.resource } : {}),
    status: input.status,
    pinned:
      input.priority === "critical" && input.status !== "resolved" && !reached("acknowledged"),
    sentChannels: ["in_app" as const],
    escalationLevel: 0,
    ...(input.action ? { action: input.action } : {}),
    occurredAt,
    readAt: input.status === "unread" ? null : reached("read"),
    acknowledgedAt: reached("acknowledged"),
    inProgressAt: reached("in_progress"),
    resolvedAt: input.status === "resolved" ? at(request.now, input.days, 1) : null,
    attentionResource: null,
    resolutionResource: null,
    conditionOpen: input.conditionOpen ?? false,
    emailDelivery: null,
    audit: {
      createdAt: occurredAt,
      createdBy: SYSTEM_ACTOR_ID,
      updatedAt: occurredAt,
      updatedBy: SYSTEM_ACTOR_ID,
      version: 1,
    },
  };
}

export function notifications(request: DemoRequest) {
  const { account, state } = request;
  const items = [];
  if (state.mode === "READ_ONLY" && !account.isDemo && request.can("notifications.billing-alerts"))
    items.push(
      notification(request, 1, {
        type: "subscription.payment_failed",
        priority: "critical",
        title: "Stripe rechazó el pago de la suscripción",
        message: "La cuenta quedó en modo lectura hasta que se regularice el pago.",
        status: "unread",
        days: 0,
        action: { href: "/subscription", label: "Ver suscripción" },
        conditionOpen: true,
      }),
    );
  const down = request.machines.find((machine) => machine.status === "out_of_service");
  if (down)
    items.push(
      notification(request, 2, {
        type: "machine.out_of_service",
        priority: "high",
        title: `${down.name} está fuera de servicio`,
        message: "El técnico reportó una falla en el compresor. Revisa la orden abierta.",
        status: "unread",
        days: 0,
        resource: { type: "machine", id: down.id },
        action: { href: "/workspace", label: "Ver máquina" },
        conditionOpen: true,
      }),
    );
  const first = request.machines[0];
  if (first)
    items.push(
      notification(request, 3, {
        type: "maintenance.due_soon",
        priority: "warning",
        title: `Mantenimiento próximo: ${first.name}`,
        message: "La limpieza del condensador vence en 3 días.",
        status: "read",
        days: -1,
        resource: { type: "machine", id: first.id },
      }),
    );
  items.push(
    notification(request, 4, {
      type: "file.scan_clean",
      priority: "info",
      title: "Evidencia revisada",
      message: "La foto de la sanitización pasó la revisión antimalware.",
      status: "resolved",
      days: -2,
    }),
  );
  return items;
}

export function notificationSummary(items: ReturnType<typeof notifications>) {
  const count = (status: NotificationStatus) => items.filter((n) => n.status === status).length;
  return {
    badge: count("unread"),
    unread: count("unread"),
    pinned: items.filter((n) => n.pinned).length,
    acknowledged: count("acknowledged"),
    inProgress: count("in_progress"),
    resolved: count("resolved"),
  };
}

const JOB_SPECS = [
  {
    type: "SCHEDULE_RECALC",
    status: "SUCCEEDED",
    eventType: "MachineFrequenciesChanged",
    attempts: 1,
    errorCode: null,
    errorDetail: null,
  },
  {
    type: "FILE_SCAN",
    status: "RUNNING",
    eventType: "FileUploaded",
    attempts: 1,
    errorCode: null,
    errorDetail: null,
  },
  {
    type: "EMAIL_DELIVERY",
    status: "DEAD_LETTER",
    eventType: "NotificationCreated",
    attempts: 5,
    errorCode: "PROVIDER_UNAVAILABLE",
    errorDetail: "El proveedor de correo no respondió después de 5 intentos.",
  },
  {
    type: "SUBSCRIPTION_RECONCILE",
    status: "RETRY_WAIT",
    eventType: null,
    attempts: 2,
    errorCode: "DEPENDENCY_TIMEOUT",
    errorDetail: "Stripe tardó más de lo permitido; se reintentará.",
  },
] as const;

export function jobs(request: DemoRequest) {
  const { account, now } = request;
  return JOB_SPECS.map((spec, index) => {
    const n = (account.key === "polar" ? 0 : 10) + index + 1;
    const finished = spec.status === "SUCCEEDED" || spec.status === "DEAD_LETTER";
    return {
      id: demoIds.job(n),
      type: spec.type,
      status: spec.status,
      queue: "domain_events",
      accountId: account.id,
      sourceType: spec.type === "FILE_SCAN" ? "FileObject" : "Machine",
      sourceId: account.machines[index % account.machines.length]!.id,
      eventType: spec.eventType,
      attemptCount: spec.attempts,
      maxAttempts: 5,
      manualRetryCount: 0,
      nextAttemptAt: spec.status === "RETRY_WAIT" ? at(now, 0, 1) : null,
      startedAt: at(now, 0, -2 - index),
      finishedAt: finished ? at(now, 0, -1 - index) : null,
      errorCode: spec.errorCode,
      errorDetail: spec.errorDetail,
      correlationId: demoIds.correlation(n),
      rowVersion: spec.attempts,
      createdAt: at(now, 0, -3 - index),
      updatedAt: at(now, 0, -1 - index),
    };
  });
}

export function jobDetail(job: ReturnType<typeof jobs>[number]) {
  const transitions = [
    { from: null, to: "QUEUED" },
    { from: "QUEUED", to: "RUNNING" },
    ...(job.status === "RUNNING" ? [] : [{ from: "RUNNING", to: job.status }]),
  ] as const;
  return {
    ...job,
    transitions: transitions.map((transition, index) => ({
      id: demoIds.job(1000 + Number.parseInt(job.id.slice(-12), 16) * 10 + index),
      fromStatus: transition.from,
      toStatus: transition.to,
      attempt: Math.min(index, job.attemptCount),
      errorCode: transition.to === job.status ? job.errorCode : null,
      actorType: "SYSTEM" as const,
      actorUserId: null,
      reason: null,
      correlationId: job.correlationId,
      occurredAt: job.createdAt,
    })),
  };
}

export function auditEvents(request: DemoRequest) {
  const { account, now } = request;
  const machine = account.machines[0]!;
  const event = (
    n: number,
    hours: number,
    input: {
      actor: DemoPersonaKey | "SYSTEM" | "STRIPE";
      entityType: string;
      operation: string;
      previousValues?: Record<string, string | boolean | number | null>;
      newValues?: Record<string, string | boolean | number | null>;
      reason?: string;
      origin: "WEB" | "WORKER" | "WEBHOOK";
      result?: "SUCCESS" | "DENIED" | "FAILED";
      machineId?: string;
      branchId?: string;
    },
  ) => {
    const occurredAt = at(now, 0, hours);
    const user = input.actor !== "SYSTEM" && input.actor !== "STRIPE";
    return {
      id: demoIds.audit((account.key === "polar" ? 0 : 10) + n),
      eventVersion: 1 as const,
      occurredAt,
      occurredAtLocal: localTime(occurredAt),
      timeZone: TIME_ZONE,
      actorUserId: user ? demoUserId(input.actor as DemoPersonaKey) : null,
      actorType: user ? ("USER" as const) : (input.actor as "SYSTEM" | "STRIPE"),
      contextSessionId: user ? demoContextId(input.actor as DemoPersonaKey, account.key) : null,
      accountId: account.id,
      branchId: input.branchId ?? null,
      machineId: input.machineId ?? null,
      entityType: input.entityType,
      entityId: input.machineId ?? demoIds.subscription(account.key === "polar" ? 1 : 2),
      operation: input.operation,
      previousValues: input.previousValues ?? null,
      newValues: input.newValues ?? null,
      reason: input.reason ?? null,
      origin: input.origin,
      ipAddress: user ? "203.0.113.24" : null,
      deviceSummary: user ? { browser: "Chrome", platform: "Windows" } : null,
      result: input.result ?? ("SUCCESS" as const),
      correlationId: demoIds.correlation((account.key === "polar" ? 0 : 10) + n),
      createdAt: occurredAt,
    };
  };
  return [
    event(1, -1, {
      actor: "owner",
      entityType: "MaintenanceFrequencyOverride",
      operation: "FREQUENCY_OVERRIDE_CREATED",
      previousValues: { frequency: "30 días", source: "TEMPLATE" },
      newValues: { frequency: "15 días", source: "MACHINE", warrantyWarningAcknowledged: true },
      reason: "Zona con mucho polvo; se limpia el condensador con mayor frecuencia.",
      origin: "WEB",
      machineId: machine.id,
      branchId: machine.branchId,
    }),
    event(2, -1, {
      actor: "SYSTEM",
      entityType: "ScheduledActivity",
      operation: "SCHEDULE_RECALCULATED",
      newValues: { cancelled: 2, created: 2 },
      origin: "WORKER",
      machineId: machine.id,
      branchId: machine.branchId,
    }),
    event(3, -3, {
      actor: "technician",
      entityType: "FileObject",
      operation: "FILE_UPLOAD_CONFIRMED",
      newValues: { kind: "Evidencia de sanitización", verdict: "CLEAN" },
      origin: "WEB",
      machineId: machine.id,
      branchId: machine.branchId,
    }),
    event(4, -5, {
      actor: "readonly",
      entityType: "Machine",
      operation: "MACHINE_UPDATE",
      reason: "Intento de edición sin permiso.",
      origin: "WEB",
      result: "DENIED",
      machineId: machine.id,
      branchId: machine.branchId,
    }),
    event(5, -26, {
      actor: "STRIPE",
      entityType: "Subscription",
      operation: "SUBSCRIPTION_RENEWED",
      previousValues: { status: "active" },
      newValues: { status: "active" },
      origin: "WEBHOOK",
    }),
  ];
}

export function profile(request: DemoRequest) {
  const persona = request.persona;
  return {
    id: request.subject.userId,
    identitySubject: `demo|${persona.username}`,
    username: persona.username,
    email: `${persona.username}@demo.invalid`,
    displayName: persona.displayName,
    locale: "es-MX",
    timeZone: TIME_ZONE,
    status: "ACTIVE" as const,
    version: 1,
  };
}

const row = (id: string, fields: Record<string, unknown>) => ({ id, row_version: 1, ...fields });

/** Same flags as `AccountsStore.workspace` and `configurationAccess` of the API. */
export function equipmentWorkspace(request: DemoRequest) {
  const { account, state, subject } = request;
  const machine = (branchId?: string) =>
    request.can("equipment.machine-components-manage", branchId ? { branchId } : {}) &&
    request.can("equipment.machine-frequencies-manage", branchId ? { branchId } : {});
  const accountFrequencies =
    subject.accountWide && request.can("equipment.account-frequencies-manage");
  return {
    demo: account.isDemo
      ? { isDemo: true, demoExpiresAt: subscriptionView(request).demoExpiresAt }
      : { isDemo: false, demoExpiresAt: null },
    accountId: account.id,
    contextId: demoContextId(state.persona, account.key),
    canAdmin: request.can("equipment.admin"),
    canManage: state.mode === "ACTIVE" && request.can("equipment.manage"),
    hasMfa: subject.assuranceLevel === "aal2",
    accessMode: state.mode,
    accountWide: subject.accountWide,
    configuration: {
      accountCatalog: subject.accountWide && request.can("equipment.catalog-manage"),
      accountFrequencies: accountFrequencies
        ? "edit"
        : subject.accountWide && !request.can("equipment.machine-frequencies-manage")
          ? "read"
          : "hidden",
      machineBranches:
        subject.accountWide && machine()
          ? "ALL"
          : [...subject.branchIds].filter((branchId) => machine(branchId)).sort(),
    },
  };
}

const branchRows = (request: DemoRequest) =>
  request.branches.map((branch) =>
    row(branch.id, {
      status: "active",
      name: branch.name,
      account_id: request.account.id,
      data: { name: branch.name, address: branch.address, timezone: TIME_ZONE },
    }),
  );

const machineRows = (request: DemoRequest) =>
  request.machines.map((machine) =>
    row(machine.id, {
      status: machine.status,
      name: machine.name,
      machine_code: machine.code,
      model_id: machine.modelId,
      template_id: demoIds.template(DEMO_MODELS.findIndex((m) => m.id === machine.modelId) + 1),
      branch_id: machine.branchId,
      account_id: request.account.id,
      data: { name: machine.name },
    }),
  );

/** Same shape and reach as `IdentityStore.contextFocusOptions` of the API (F6-08). */
const focusOptions = (request: DemoRequest) => ({
  branches: request.branches.map(({ id, name }) => ({ id, name })),
  machines: request.machines.map(({ id, name, code, branchId }) => ({ id, name, code, branchId })),
});

/** The API validates the focus against the persona's reach and audits it; the demo only checks. */
function setFocus(request: DemoRequest, body: unknown): Response {
  let parsed: unknown;
  try {
    parsed = JSON.parse(typeof body === "string" ? body : "");
  } catch {
    parsed = undefined;
  }
  const focus = contextFocusSchema.safeParse(parsed);
  if (!focus.success) return failure(400, "VALIDATION_FAILED", "Invalid focus", request.now);
  const { branchId, machineId } = focus.data;
  if (branchId === null && machineId === null) return json(focus.data);
  const refused = denied(request.authorize("equipment.read", "READ"), request.now);
  if (refused) return refused;
  const options = focusOptions(request);
  const machine = options.machines.find((item) => item.id === machineId);
  const reachable =
    (branchId === null || options.branches.some((item) => item.id === branchId)) &&
    (machineId === null ||
      (machine !== undefined && (branchId === null || machine.branchId === branchId)));
  return reachable ? json(focus.data) : failure(404, "NOT_FOUND", "Not found", request.now);
}

const CATALOG = ["Compresor", "Condensador", "Depósito de hielo", "Filtro de agua", "Lámpara UV"];

// ---------------------------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------------------------

type Handler = (request: DemoRequest, match: RegExpMatchArray, query: URLSearchParams) => Response;

const read =
  (permission: PermissionCode, body: (request: DemoRequest, match: RegExpMatchArray) => unknown) =>
  (request: DemoRequest, match: RegExpMatchArray) =>
    denied(request.authorize(permission, "READ"), request.now) ?? json(body(request, match));

const page = <T>(items: readonly T[]) => ({
  items,
  page: { nextCursor: null, hasMore: false },
});

const GET_ROUTES: readonly [RegExp, Handler][] = [
  [/^session-contexts\/current$/, (r) => json(accessContext(r.state, r.state.account, r.now))],
  [/^session-contexts\/current\/capabilities$/, (r) => json(capabilities(r))],
  [/^session-contexts\/current\/focus-options$/, read("equipment.read", focusOptions)],
  [
    /^me\/contexts$/,
    (r) => json(Object.keys(DEMO_ACCOUNTS).map((k) => accessContext(r.state, k as never, r.now))),
  ],
  [/^me$/, read("identity.profile-read", profile)],
  [
    /^me\/sessions$/,
    read("identity.profile-read", (r) => [
      {
        id: demoIds.session(1),
        accountId: r.account.id,
        accountName: r.account.name,
        issuedAt: at(r.now, 0, -1),
        expiresAt: at(r.now, 0, 11),
        revokedAt: null,
        current: true,
        deviceSummary: "Navegador de revisión (modo demo)",
      },
    ]),
  ],
  [/^subscription$/, read("subscriptions.read", subscriptionView)],
  [
    /^audit-events$/,
    (r, _match, query) => {
      const correlation = query.get("correlationId");
      const result = query.get("result");
      return (
        denied(r.authorize("audit.read", "READ"), r.now) ??
        json(
          page(
            auditEvents(r).filter(
              (event) =>
                (!correlation || event.correlationId === correlation) &&
                (!result || event.result === result),
            ),
          ),
        )
      );
    },
  ],
  [/^admin\/audit-events$/, read("audit.global-read", (r) => page(auditEvents(r)))],
  [/^admin\/jobs$/, read("jobs.admin-read", (r) => page(jobs(r)))],
  [
    /^admin\/jobs\/([0-9a-f-]{36})$/,
    (r, match) => {
      const decision = denied(r.authorize("jobs.admin-read", "READ"), r.now);
      if (decision) return decision;
      const job = jobs(r).find((candidate) => candidate.id === match[1]);
      return job ? json(jobDetail(job)) : failure(404, "NOT_FOUND", "Not found", r.now);
    },
  ],
  [
    /^admin\/job-queues$/,
    read("jobs.admin-read", () => ({
      queues: [],
      jobs: { QUEUED: 0, RUNNING: 1, SUCCEEDED: 1, RETRY_WAIT: 1, FAILED: 0, DEAD_LETTER: 1 },
      outbox: { pending: 0, failing: 0, oldestPendingSeconds: null },
    })),
  ],
  [/^admin\/integration-logs$/, read("integration-logs.read", () => page([]))],
  [
    /^notifications\/summary$/,
    read("notifications.read", (r) => notificationSummary(notifications(r))),
  ],
  [
    /^notifications$/,
    (r, _match, query) =>
      denied(r.authorize("notifications.read", "READ"), r.now) ??
      json(page(notifications(r).filter((n) => query.get("pinned") !== "true" || n.pinned))),
  ],
  [/^equipment-workspace$/, read("equipment.read", equipmentWorkspace)],
  [/^branches$/, read("equipment.read", branchRows)],
  [/^machines$/, read("equipment.read", machineRows)],
  [
    /^technical-models$/,
    read("equipment.read", () =>
      DEMO_MODELS.map((model) =>
        row(model.id, { status: "active", code: model.code, name: model.name }),
      ),
    ),
  ],
  [
    /^catalogs$/,
    read("equipment.read", () =>
      CATALOG.map((name, index) =>
        row(demoIds.catalog(index + 1), {
          status: "active",
          code: name.toUpperCase().replace(/[^A-Z]+/g, "_"),
          name,
        }),
      ),
    ),
  ],
  [/^(equipment-requests|machine-transfers)$/, read("equipment.read", () => [])],
  [
    /^account-users$/,
    read("identity.membership-manage", (r) =>
      Object.values(DEMO_PERSONAS).map((persona) =>
        row(demoMembershipId(persona.key, r.account.key), {
          status: "active",
          display_name: persona.displayName,
          data: { email: `${persona.username}@demo.invalid`, roles: [persona.role] },
        }),
      ),
    ),
  ],
  [
    /^accounts\/([0-9a-f-]{36})$/,
    (r, match) =>
      match[1] !== r.account.id
        ? failure(404, "NOT_FOUND", "Not found", r.now)
        : (denied(r.authorize("equipment.read", "READ"), r.now) ??
          json(
            row(r.account.id, {
              status: "active",
              name: r.account.name,
              account_id: r.account.id,
              data: { contactEmail: "contacto@demo.invalid" },
            }),
          )),
  ],
];

/** Permission the API checks for each write; unknown writes are denied like the API would. */
const WRITE_PERMISSIONS: readonly [RegExp, PermissionCode][] = [
  [/^notifications\//, "notifications.attend"],
  [/^admin\/jobs\/[^/]+\/retry$/, "jobs.retry"],
  [/^files(\/|$)/, "files.upload"],
  [/^me\/sessions\/revoke-all$/, "identity.session-revoke"],
  [/^subscription\//, "subscriptions.read"],
  [/^account-catalog-entries/, "equipment.catalog-manage"],
  [/^account-frequency-overrides/, "equipment.account-frequencies-manage"],
  [/^machines\/[^/]+\/components/, "equipment.machine-components-manage"],
  [/^machines\/[^/]+\/frequenc/, "equipment.machine-frequencies-manage"],
  [/^(admin\/|technical-models)/, "equipment.admin"],
  [/^(branches|machines|accounts|account-users|equipment-|machine-transfers)/, "equipment.manage"],
];

function write(request: DemoRequest, path: string, body: unknown): Response {
  if (path === "session-contexts")
    return json({ id: demoContextId(request.state.persona, request.state.account) }, 201);
  // Denials of the shell (F6-07) are accepted but, like every demo write, not stored.
  if (path === "session-contexts/current/navigation-denials")
    return new Response(null, { status: 204 });
  if (path === "session-contexts/current/focus") return setFocus(request, body);
  const permission = WRITE_PERMISSIONS.find(([pattern]) => pattern.test(path))?.[1];
  if (!permission) return failure(403, "FORBIDDEN", "Forbidden", request.now);
  const machineId = /^machines\/([0-9a-f-]{36})/.exec(path)?.[1];
  const machine = request.account.machines.find((candidate) => candidate.id === machineId);
  return (
    denied(
      request.authorize(permission, "WRITE", machine ? { branchId: machine.branchId } : {}),
      request.now,
    ) ??
    // Allowed, but the demo never stores anything: the screen shows its "unavailable" state.
    failure(503, "DEPENDENCY_UNAVAILABLE", "The demo mode does not store changes", request.now)
  );
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Reads of the account shell (context, capabilities, profile and `limit=1` probes). "Slow"
 * simulates a slow data service: these stay fast so each screen shows its own loading state;
 * the shell layout waits for them before streaming any page (see the F6-00 report).
 */
const isShellRead = (route: string, query: URLSearchParams) =>
  route.startsWith("session-contexts/current") || route === "me" || query.get("limit") === "1";

export async function demoApiResponse(
  path: string,
  init: RequestInit,
  state: DemoState,
  now = Date.now(),
): Promise<Response> {
  if (state.network === "offline") throw new TypeError("fetch failed (demo: sin conexión)");
  const url = new URL(path.replace(/^\//, ""), "http://demo.invalid/");
  const route = url.pathname.slice(1);
  if (state.network === "slow" && !isShellRead(route, url.searchParams)) await sleep(DEMO_SLOW_MS);
  if (state.network === "error")
    return failure(503, "DEPENDENCY_UNAVAILABLE", "Simulated failure", now);
  const request = new DemoRequest(state, now);
  const method = (init.method ?? "GET").toUpperCase();
  if (method !== "GET") return write(request, route, init.body);
  for (const [pattern, handler] of GET_ROUTES) {
    const match = pattern.exec(route);
    if (match) return handler(request, match, url.searchParams);
  }
  return failure(404, "NOT_FOUND", "Not found", now);
}

export { DemoRequest };
