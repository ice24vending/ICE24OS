import { createPublicKey, verify as verifySignature, type JsonWebKey } from "node:crypto";

import { oidcIdentityClaimsSchema, type OidcIdentityClaims } from "@ice24/contracts";

export interface TokenVerifier {
  verify(token: string): Promise<OidcIdentityClaims>;
}

interface OidcDiscoveryDocument {
  readonly issuer: string;
  readonly jwks_uri: string;
}

interface JsonWebKeySet {
  readonly keys: readonly (JsonWebKey & { readonly kid?: string; readonly alg?: string })[];
}

interface JwtHeader {
  readonly alg: string;
  readonly kid: string;
  readonly typ?: string;
}

const parseJsonSegment = <T>(segment: string): T =>
  JSON.parse(Buffer.from(segment, "base64url").toString("utf8")) as T;

export class OidcTokenVerifier implements TokenVerifier {
  private keySet?: JsonWebKeySet;
  private cachedAt = 0;

  public constructor(
    private readonly expectedIssuer: string | undefined,
    private readonly expectedAudience: string,
  ) {}

  public async verify(token: string): Promise<OidcIdentityClaims> {
    if (this.expectedIssuer === undefined) throw new Error("OIDC issuer is not configured");
    const segments = token.split(".");
    if (segments.length !== 3) throw new Error("Malformed access token");
    const [encodedHeader, encodedPayload, encodedSignature] = segments;
    if (
      encodedHeader === undefined ||
      encodedPayload === undefined ||
      encodedSignature === undefined
    ) {
      throw new Error("Malformed access token");
    }

    const header = parseJsonSegment<JwtHeader>(encodedHeader);
    if (header.alg !== "RS256" || header.kid.length === 0) {
      throw new Error("Unsupported access token algorithm");
    }
    const keySet = await this.getKeySet();
    const jwk = keySet.keys.find((candidate) => candidate.kid === header.kid);
    if (jwk === undefined) {
      this.cachedAt = 0;
      throw new Error("Unknown access token signing key");
    }
    const key = createPublicKey({ format: "jwk", key: jwk });
    const valid = verifySignature(
      "RSA-SHA256",
      Buffer.from(`${encodedHeader}.${encodedPayload}`),
      key,
      Buffer.from(encodedSignature, "base64url"),
    );
    if (!valid) throw new Error("Invalid access token signature");

    const claims = oidcIdentityClaimsSchema.parse(parseJsonSegment<unknown>(encodedPayload));
    const now = Math.floor(Date.now() / 1_000);
    const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (claims.iss !== this.expectedIssuer || !audiences.includes(this.expectedAudience)) {
      throw new Error("Invalid access token issuer or audience");
    }
    if (claims.exp <= now) throw new Error("Expired access token");
    return claims;
  }

  private async getKeySet(): Promise<JsonWebKeySet> {
    if (this.keySet !== undefined && Date.now() - this.cachedAt < 5 * 60_000) return this.keySet;
    if (this.expectedIssuer === undefined) throw new Error("OIDC issuer is not configured");
    const discoveryResponse = await fetch(
      `${this.expectedIssuer.replace(/\/$/, "")}/.well-known/openid-configuration`,
      { headers: { accept: "application/json" }, signal: AbortSignal.timeout(5_000) },
    );
    if (!discoveryResponse.ok) throw new Error("OIDC discovery failed");
    const discovery = (await discoveryResponse.json()) as OidcDiscoveryDocument;
    const jwksUrl = new URL(discovery.jwks_uri);
    const localDevelopmentHost = ["127.0.0.1", "localhost", "host.docker.internal"].includes(
      jwksUrl.hostname,
    );
    const trustedTransport =
      jwksUrl.protocol === "https:" ||
      (process.env.NODE_ENV !== "production" &&
        jwksUrl.protocol === "http:" &&
        localDevelopmentHost);
    if (discovery.issuer !== this.expectedIssuer || !trustedTransport) {
      throw new Error("Untrusted OIDC discovery document");
    }
    const keysResponse = await fetch(discovery.jwks_uri, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(5_000),
    });
    if (!keysResponse.ok) throw new Error("OIDC signing keys unavailable");
    this.keySet = (await keysResponse.json()) as JsonWebKeySet;
    this.cachedAt = Date.now();
    return this.keySet;
  }
}
