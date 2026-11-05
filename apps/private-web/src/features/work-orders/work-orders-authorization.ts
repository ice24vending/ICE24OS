import { authorize } from "@ice24/authorization";
import {
  accessContextSchema,
  contextCapabilitiesSchema,
  userProfileSchema,
} from "@ice24/contracts";
import { callPrivateApi } from "../../server/session/supabase-auth";
import type { BrowserSession } from "../../server/session/session";
import { failure } from "../../server/bff/responses";

/** Trusted API facts only. Object scope is checked again by the transactional API command. */
export async function authorizeWorkOrderBff(
  session: BrowserSession,
  action: "read" | "assign" | "execute" | "review",
) {
  try {
    const responses = await Promise.all(
      ["session-contexts/current", "session-contexts/current/capabilities", "me"].map((path) =>
        callPrivateApi(path, session, { signal: AbortSignal.timeout(5000) }),
      ),
    );
    if (responses.some((r) => !r.ok))
      return failure(
        "No fue posible verificar el contexto. Recarga e intenta de nuevo.",
        403,
        "FORBIDDEN",
      );
    const [context, capabilities, user] = await Promise.all([
      responses[0]!.json().then((v) => accessContextSchema.parse(v)),
      responses[1]!.json().then((v) => contextCapabilitiesSchema.parse(v)),
      responses[2]!.json().then((v) => userProfileSchema.parse(v)),
    ]);
    const permission = `maintenance.orders-${action}`;
    const decision = authorize(
      {
        userId: user.id,
        membershipId: context.membershipId,
        membershipAccountId: context.accountId,
        membershipStatus: context.membershipStatus,
        contextActive: context.id === session.contextId && user.status === "ACTIVE",
        accountAccessMode: context.accessMode,
        assuranceLevel: capabilities.mfaVerified ? "aal2" : "aal1",
        permissions: capabilities.permissions.includes(permission)
          ? [{ code: permission, effect: "ALLOW", classification: "CONFIDENTIAL" }]
          : [],
        accountWide: capabilities.accountWide,
        branchIds: new Set(context.branchIds),
        machineIds: new Set(context.machineIds),
      },
      {
        accountId: context.accountId,
        permission,
        classification: "CONFIDENTIAL",
        operation: action === "read" ? "READ" : "WRITE",
      },
    );
    if (decision.allowed) return null;
    return decision.reason === "account_read_only"
      ? failure(
          "La cuenta está en modo lectura. Puedes consultar órdenes, pero no modificarlos.",
          403,
          "ACCOUNT_READ_ONLY",
        )
      : failure(
          "No tienes permiso o el módulo de mantenimiento está deshabilitado.",
          403,
          "FORBIDDEN",
        );
  } catch {
    return failure(
      "No fue posible verificar tus permisos. Intenta de nuevo.",
      503,
      "DEPENDENCY_UNAVAILABLE",
    );
  }
}
