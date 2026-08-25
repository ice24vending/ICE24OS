import { healthResponseSchema, type HealthResponse } from "@ice24/contracts";
import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

@ApiTags("platform")
@Controller("health")
export class HealthController {
  @Get()
  @ApiOperation({ summary: "Report process health without exposing dependencies or secrets" })
  @ApiOkResponse({
    schema: {
      example: { service: "api", status: "ok", timestamp: "2026-08-19T12:00:00.000Z" },
      properties: {
        service: { type: "string" },
        status: { type: "string", enum: ["ok"] },
        timestamp: { type: "string", format: "date-time" },
      },
      required: ["service", "status", "timestamp"],
      type: "object",
    },
  })
  public getHealth(): HealthResponse {
    return healthResponseSchema.parse({
      service: "api",
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  }
}
