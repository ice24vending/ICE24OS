import {
  userProfileSchema,
  updateMyProfileRequestSchema,
  type MyActivity,
  type UserProfile,
  type SessionSummary,
  type ErrorCode,
} from "@ice24/contracts";
import type { DemoRequest } from "./api";
import { demoContextId, demoIds } from "./fixtures";

type ProfileDemo = { profile: UserProfile; sessions: SessionSummary[]; activity: MyActivity[] };
const runtime = globalThis as typeof globalThis & { ice24DemoProfiles?: Map<string, ProfileDemo> };
const states = (runtime.ice24DemoProfiles ??= new Map<string, ProfileDemo>());
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
const error = (r: DemoRequest, status: number, code: ErrorCode) =>
  json(
    {
      error: {
        code,
        message: code,
        correlationId: demoIds.correlation(911),
        timestamp: new Date(r.now).toISOString(),
      },
    },
    status,
  );

function state(r: DemoRequest): ProfileDemo {
  const key = `${r.state.csrf}:${r.state.persona}:${r.account.id}:${r.state.scenario ?? "normal"}`;
  const existing = states.get(key);
  if (existing) return existing;
  const date = (hours: number) => new Date(r.now - hours * 3600000).toISOString();
  const empty = r.state.scenario === "empty";
  const value: ProfileDemo = {
    profile: {
      id: r.subject.userId,
      identitySubject: `demo|${r.persona.username}`,
      username: r.persona.username,
      email: `${r.persona.username}@demo.invalid`,
      displayName: r.persona.displayName,
      phone: empty ? null : "+52 81 5550 2418",
      jobTitle: empty
        ? null
        : {
            owner: "Directora de operaciones",
            technician: "Técnica de servicio",
            admin: "Encargado de sucursal",
            readonly: "Auditor de calidad",
            ice24: "Soporte operativo",
            platform: "Administración de plataforma",
          }[r.state.persona],
      locale: "es-MX",
      timeZone: "America/Mexico_City",
      status: "ACTIVE",
      version: 1,
    },
    sessions: [
      {
        id: demoContextId(r.state.persona, r.state.account),
        accountId: r.account.id,
        accountName: r.account.name,
        issuedAt: date(3),
        lastSeenAt: date(0),
        expiresAt: date(-9),
        revokedAt: null,
        current: true,
        deviceSummary: "Chrome · Windows 11",
      },
      ...(empty
        ? []
        : [
            {
              id: demoIds.context(811),
              accountId: r.account.id,
              accountName: r.account.name,
              issuedAt: date(7),
              lastSeenAt: date(0.4),
              expiresAt: date(-5),
              revokedAt: null,
              current: false,
              deviceSummary: "Safari · iPhone 15",
            },
            {
              id: demoIds.context(812),
              accountId: r.account.id,
              accountName: r.account.name,
              issuedAt: date(28),
              lastSeenAt: date(19),
              expiresAt: date(16),
              revokedAt: date(19),
              current: false,
              deviceSummary: "Firefox · MacBook Air",
            },
          ]),
    ],
    activity: empty
      ? []
      : [
          "identity.profile-update",
          "CONTEXT_ACTIVATED",
          "SESSION_REVOKED",
          "FILE_DOWNLOADED",
          "NAVIGATION_DENIED",
          "CONTEXT_FOCUS_CHANGED",
          "MFA_ENROLLED",
          "CONTEXT_ACTIVATED",
          "FILE_DOWNLOADED",
          "identity.profile-update",
        ].map((operation, i) => ({
          id: demoIds.correlation(820 + i),
          occurredAt: date([0.1, 1, 2, 3, 5, 8, 12, 24, 30, 48][i]!),
          operation,
          result: operation === "NAVIGATION_DENIED" ? "DENIED" : "SUCCESS",
        })),
  };
  if (states.size >= 250) states.delete(states.keys().next().value!);
  states.set(key, value);
  return value;
}

export const demoProfile = (r: DemoRequest) => state(r).profile;

export function demoProfileResponse(r: DemoRequest, route: string, init: RequestInit): Response {
  const method = (init.method ?? "GET").toUpperCase();
  const permission =
    method === "GET"
      ? "identity.profile-read"
      : route === "me"
        ? "identity.profile-update"
        : "identity.session-revoke";
  // Identity self-service is allowed in READ_ONLY accounts, exactly like the identity API.
  if (!r.can(permission)) return error(r, 403, "FORBIDDEN");
  const value = state(r);
  if (method === "GET") {
    if (route === "me") return json(value.profile);
    if (route === "me/sessions") return json(value.sessions);
    if (route === "me/activity") return json(value.activity.slice(0, 10));
    if (route === "me/mfa")
      return json({
        enrolled: r.state.persona !== "technician",
        verified: r.state.persona !== "technician",
      });
  }
  const record = (operation: string) => {
    value.activity.unshift({
      id: crypto.randomUUID(),
      occurredAt: new Date(r.now).toISOString(),
      operation,
      result: "SUCCESS",
    });
    value.activity = value.activity.slice(0, 10);
  };
  if (method === "PATCH" && route === "me") {
    let body: unknown;
    try {
      body = JSON.parse(String(init.body));
    } catch {
      return error(r, 400, "VALIDATION_FAILED");
    }
    const parsed = updateMyProfileRequestSchema.safeParse(body);
    if (!parsed.success) return error(r, 400, "VALIDATION_FAILED");
    if (
      r.state.scenario === "conflict" ||
      new Headers(init.headers).get("if-match")?.replace(/^W\//, "").replaceAll('"', "") !==
        String(value.profile.version)
    )
      return error(r, 412, "PRECONDITION_FAILED");
    value.profile = userProfileSchema.parse({
      ...value.profile,
      ...parsed.data,
      version: value.profile.version + 1,
    });
    record("identity.profile-update");
    return json(value.profile);
  }
  if (method === "POST" && route === "me/sessions/revoke-all") {
    let body: { excludeCurrent?: boolean };
    try {
      body = JSON.parse(String(init.body));
    } catch {
      return error(r, 400, "VALIDATION_FAILED");
    }
    if (body.excludeCurrent !== undefined && typeof body.excludeCurrent !== "boolean")
      return error(r, 400, "VALIDATION_FAILED");
    value.sessions = value.sessions.map((s) =>
      s.revokedAt || (body.excludeCurrent && s.current)
        ? s
        : { ...s, revokedAt: new Date(r.now).toISOString() },
    );
    record(body.excludeCurrent ? "USER_REVOKED_OTHER_SESSIONS" : "SESSIONS_REVOKED_GLOBAL");
    return new Response(null, { status: 204 });
  }
  if (method === "DELETE" && route.startsWith("me/sessions/")) {
    const session = value.sessions.find((s) => s.id === route.split("/")[2] && !s.revokedAt);
    if (!session) return error(r, 404, "NOT_FOUND");
    value.sessions = value.sessions.map((s) =>
      s.id === session.id ? { ...s, revokedAt: new Date(r.now).toISOString() } : s,
    );
    record("SESSION_REVOKED");
    return new Response(null, { status: 204 });
  }
  return error(r, 404, "NOT_FOUND");
}
