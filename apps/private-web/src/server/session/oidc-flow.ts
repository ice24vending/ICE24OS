import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const oidcFlowCookieName =
  process.env.NODE_ENV === "production" ? "__Host-ice24_oidc_flow" : "ice24_oidc_flow";

const getSecret = (): string => {
  const secret = process.env.BFF_SESSION_SECRET;
  if (secret === undefined || secret.length < 32)
    throw new Error("BFF session secret is not configured");
  return secret;
};

const sign = (payload: string): string =>
  createHmac("sha256", getSecret()).update(payload).digest("base64url");

export const createOidcFlow = () => {
  const state = randomBytes(24).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ state, verifier }), "utf8").toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { state, verifier, challenge, cookieValue: `${payload}.${sign(payload)}` };
};

export const readOidcFlow = (
  cookieValue: string | undefined,
  returnedState: string | null,
): { readonly verifier: string } | undefined => {
  try {
    const [payload, providedSignature] = cookieValue?.split(".") ?? [];
    if (payload === undefined || providedSignature === undefined || returnedState === null) {
      return undefined;
    }
    const expectedSignature = sign(payload);
    const actualBuffer = Buffer.from(providedSignature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (
      actualBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(actualBuffer, expectedBuffer)
    ) {
      return undefined;
    }
    const flow = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      state?: unknown;
      verifier?: unknown;
    };
    return flow.state === returnedState && typeof flow.verifier === "string"
      ? { verifier: flow.verifier }
      : undefined;
  } catch {
    return undefined;
  }
};
