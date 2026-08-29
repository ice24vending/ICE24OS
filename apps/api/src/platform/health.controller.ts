import { healthResponseSchema, type HealthResponse } from "@ice24/contracts";
import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

@ApiTags("platform")
@Controller("health")
export class HealthController {
  @Get()
  @ApiOperation({ summary: "Report readiness without exposing secrets" })
  @ApiOkResponse({
    schema: {
      example: {
        service: "api",
        status: "ok",
        timestamp: "2026-08-19T12:00:00.000Z",
        checks: [{ name: "runtime", status: "ok" }],
      },
      properties: {
        checks: { type: "array", items: { type: "object" } },
        service: { type: "string" },
        status: { type: "string", enum: ["ok", "degraded"] },
        timestamp: { type: "string", format: "date-time" },
      },
      required: ["checks", "service", "status", "timestamp"],
      type: "object",
    },
  })
  public getHealth(): HealthResponse {
    return this.getReadiness();
  }

  @Get("live")
  @ApiOperation({ summary: "Report whether the API process is alive" })
  public getLiveness(): HealthResponse {
    return healthResponseSchema.parse({
      checks: [{ name: "process", status: "ok" }],
      service: "api",
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  }

  @Get("ready")
  @ApiOperation({ summary: "Report whether the API can receive traffic" })
  public getReadiness(): HealthResponse {
    return healthResponseSchema.parse({
      checks: [
        { name: "runtime", status: "ok" },
        { name: "configuration", status: "ok" },
      ],
      service: "api",
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  }
}
