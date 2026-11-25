import { describe, expect, it } from "vitest";
import { updateMyProfileRequestSchema } from "./identity.js";

describe("self-service profile fields", () => {
  it("accepts optional Mexican contact data and clearing optional fields", () => {
    expect(
      updateMyProfileRequestSchema.parse({ phone: "+52 81 5550 2418", jobTitle: "  Técnica  " }),
    ).toEqual({ phone: "+52 81 5550 2418", jobTitle: "Técnica" });
    expect(updateMyProfileRequestSchema.parse({ phone: null, jobTitle: null })).toEqual({
      phone: null,
      jobTitle: null,
    });
  });
  it.each([
    {},
    { email: "another@example.test" },
    { username: "another" },
    { displayName: " " },
    { timeZone: "Mars/City" },
    { phone: "hola" },
    { locale: "invalid" },
    { jobTitle: "x".repeat(121) },
  ])("rejects invalid or immutable data: %j", (value) => {
    expect(updateMyProfileRequestSchema.safeParse(value).success).toBe(false);
  });
});
