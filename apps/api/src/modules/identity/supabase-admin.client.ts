import { Injectable, ServiceUnavailableException } from "@nestjs/common";

@Injectable()
export class SupabaseAdminClient {
  public async inviteUser(email: string): Promise<void> {
    const baseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (baseUrl === undefined || serviceRoleKey === undefined) {
      throw new ServiceUnavailableException("Supabase admin integration is not configured");
    }
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/auth/v1/invite`, {
      method: "POST",
      headers: {
        accept: "application/json",
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        "content-type": "application/json",
      },
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
}
