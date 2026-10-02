import { ApiResponse } from "@nestjs/swagger";

export const ApiAccountWriteProtection = () =>
  ApiResponse({
    status: 403,
    description:
      "Permission denied, or ACCOUNT_READ_ONLY for account mutations. Reads retain their existing authorization checks.",
    schema: {
      type: "object",
      required: ["error"],
      properties: {
        error: {
          type: "object",
          required: ["code", "message", "correlationId", "timestamp"],
          properties: {
            code: { type: "string", example: "ACCOUNT_READ_ONLY" },
            message: { type: "string" },
            correlationId: { type: "string", format: "uuid" },
            timestamp: { type: "string", format: "date-time" },
          },
        },
      },
    },
  });
