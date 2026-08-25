import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

describe("PostgreSQL/PostGIS local dependency", () => {
  let container: StartedPostgreSqlContainer | undefined;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgis/postgis:17-3.5-alpine")
      .withDatabase("ice24_test")
      .withUsername("ice24_test")
      .withPassword("test-only-password")
      .start();
  });

  afterAll(async () => {
    await container?.stop();
  });

  it("starts an ephemeral database with PostGIS available", async () => {
    if (container === undefined) {
      throw new Error("PostGIS container did not start");
    }
    const client = new Client({ connectionString: container.getConnectionUri() });
    await client.connect();
    try {
      const result = await client.query<{ version: string }>("select postgis_version() as version");
      expect(result.rows[0]?.version).toMatch(/^3\./u);
    } finally {
      await client.end();
    }
  });
});
