import { Injectable, ServiceUnavailableException } from "@nestjs/common";

@Injectable()
export class SupabaseAdminClient {
  private configuration(): { baseUrl: string; serviceRoleKey: string } {
    const baseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (baseUrl === undefined || serviceRoleKey === undefined) {
      throw new ServiceUnavailableException("Supabase admin integration is not configured");
    }
    return { baseUrl: baseUrl.replace(/\/$/, ""), serviceRoleKey };
  }

  private headers(serviceRoleKey: string): Record<string, string> {
    return {
      accept: "application/json",
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
    };
  }

  public async inviteUser(email: string): Promise<void> {
    const { baseUrl, serviceRoleKey } = this.configuration();
    const response = await fetch(`${baseUrl}/auth/v1/invite`, {
      method: "POST",
      headers: this.headers(serviceRoleKey),
      body: JSON.stringify({
        email,
        options: {
          redirectTo: process.env.PRIVATE_WEB_URL ?? "http://127.0.0.1:3000/access/first",
        },
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok)
      throw new ServiceUnavailableException("Identity invitation could not be sent");
  }

  public async issueControlledRecovery(input: {
    readonly identitySubject: string;
    readonly email: string;
  }): Promise<void> {
    const { baseUrl, serviceRoleKey } = this.configuration();
    const headers = this.headers(serviceRoleKey);
    const factorsResponse = await fetch(
      `${baseUrl}/auth/v1/admin/users/${encodeURIComponent(input.identitySubject)}/factors`,
      { headers, signal: AbortSignal.timeout(8_000) },
    );
    if (!factorsResponse.ok) {
      throw new ServiceUnavailableException("Identity factors could not be inspected");
    }
    const factors = (await factorsResponse.json()) as unknown;
    if (!Array.isArray(factors)) {
      throw new ServiceUnavailableException("Identity provider returned invalid factors");
    }
    const recoveryResponse = await fetch(`${baseUrl}/auth/v1/recover`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        email: input.email,
        redirect_to: `${(process.env.PRIVATE_WEB_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "")}/access/first`,
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!recoveryResponse.ok) {
      throw new ServiceUnavailableException("Identity recovery could not be issued");
    }
    for (const factor of factors) {
      const id = (factor as { id?: unknown }).id;
      if (typeof id !== "string") {
        throw new ServiceUnavailableException("Identity provider returned an invalid factor");
      }
      const deletion = await fetch(
        `${baseUrl}/auth/v1/admin/users/${encodeURIComponent(input.identitySubject)}/factors/${encodeURIComponent(id)}`,
        { method: "DELETE", headers, signal: AbortSignal.timeout(8_000) },
      );
      if (!deletion.ok) {
        throw new ServiceUnavailableException("Identity factor reset could not be completed");
      }
    }
  }
}
