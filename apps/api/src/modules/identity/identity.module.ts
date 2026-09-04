import { Module } from "@nestjs/common";

import { AuthorizationGuard } from "../../common/authorization/authorization.guard.js";
import { AuthenticationGuard, TOKEN_VERIFIER } from "../../common/security/authentication.guard.js";
import { OidcTokenVerifier } from "../../common/security/oidc-token-verifier.js";
import { AdminIdentityController } from "./admin-identity.controller.js";
import { IdentityController } from "./identity.controller.js";
import { IdentityStore } from "./identity.store.js";
import { InternalSecurityController } from "./internal-security.controller.js";
import { SupabaseAdminClient } from "./supabase-admin.client.js";

@Module({
  controllers: [IdentityController, AdminIdentityController, InternalSecurityController],
  providers: [
    IdentityStore,
    SupabaseAdminClient,
    AuthenticationGuard,
    AuthorizationGuard,
    {
      provide: TOKEN_VERIFIER,
      useFactory: () => {
        const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
        return new OidcTokenVerifier(
          process.env.OIDC_ISSUER ??
            (supabaseUrl === undefined ? undefined : `${supabaseUrl}/auth/v1`),
          process.env.OIDC_AUDIENCE ?? "authenticated",
        );
      },
    },
  ],
})
export class IdentityModule {}
