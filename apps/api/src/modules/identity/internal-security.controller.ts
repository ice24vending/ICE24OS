import { timingSafeEqual } from "node:crypto";

import { securityEventTypeSchema } from "@ice24/contracts";
import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Inject,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";

import { IdentityStore } from "./identity.store.js";

const authorized = (provided: string | undefined): boolean => {
  const expected = process.env.BFF_API_SHARED_SECRET;
  if (provided === undefined || expected === undefined || expected.length < 32) return false;
  const actualBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
  );
};

@ApiExcludeController()
@Controller("internal/security-events")
export class InternalSecurityController {
  public constructor(@Inject(IdentityStore) private readonly identityStore: IdentityStore) {}

  @Post()
  @HttpCode(204)
  public async record(
    @Headers("x-ice24-bff-key") bffKey: string | undefined,
    @Body() body: Readonly<Record<string, unknown>>,
  ): Promise<void> {
    if (!authorized(bffKey)) throw new UnauthorizedException();
    const eventType = securityEventTypeSchema.parse(body.eventType);
    const result = body.result;
    const correlationId = body.correlationId;
    if (
      (result !== "SUCCESS" && result !== "DENIED" && result !== "FAILED") ||
      typeof correlationId !== "string"
    ) {
      throw new Error("Invalid security event");
    }
    await this.identityStore.recordBffSecurityEvent({
      eventType,
      result,
      correlationId,
      ...(typeof body.identitySubject === "string"
        ? { identitySubject: body.identitySubject }
        : {}),
      ...(typeof body.reason === "string" ? { reason: body.reason.slice(0, 2_000) } : {}),
      metadata:
        typeof body.metadata === "object" && body.metadata !== null
          ? (body.metadata as Readonly<Record<string, unknown>>)
          : {},
    });
  }
}
