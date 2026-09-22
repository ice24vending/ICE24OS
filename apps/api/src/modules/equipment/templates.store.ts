import {
  catalogInputSchema,
  modelInputSchema,
  templateInputSchema,
  transitionInputSchema,
} from "@ice24/contracts";
import { ConflictException, Inject, Injectable } from "@nestjs/common";
import type { PoolClient } from "pg";
import type { SecurityRequest } from "../../common/security/security-request.js";
import { EquipmentDatabase, audit, expected, one, versionHeader } from "./equipment.database.js";

async function validateDefinition(
  client: PoolClient,
  input: ReturnType<typeof templateInputSchema.parse>,
) {
  for (const [kind, ids] of [
    ["system", input.systems],
    ["component", input.components],
  ] as const) {
    const result = await client.query(
      "select id from equipment.catalog_entries where id=any($1::uuid[]) and kind=$2 and status='active' for share",
      [ids, kind],
    );
    if (result.rowCount !== ids.length)
      throw new ConflictException("Template references unavailable or duplicate catalog entries");
  }
}
@Injectable()
export class TemplatesStore {
  constructor(@Inject(EquipmentDatabase) private readonly db: EquipmentDatabase) {}
  catalog(request: SecurityRequest, body?: unknown) {
    const input = body === undefined ? undefined : catalogInputSchema.parse(body);
    return this.db.run(
      request,
      "catalog",
      input,
      !!input,
      async (client, op) => {
        if (!input)
          return (
            await client.query(
              "select * from equipment.catalog_entries order by kind,code limit 500",
            )
          ).rows;
        const row = await one(
          client,
          "insert into equipment.catalog_entries(kind,code,data) values($1,$2,$3) returning *",
          [input.kind, input.code, JSON.stringify(input)],
        );
        await audit(client, op, row, "CATALOG_CREATED", "Central catalog entry created");
        return row;
      },
      !!input,
    );
  }
  models(request: SecurityRequest, body?: unknown, id?: string) {
    const input = body === undefined ? undefined : modelInputSchema.parse(body);
    return this.db.run(
      request,
      `models:${id ?? "create"}`,
      input,
      !!input,
      async (client, op) => {
        if (!input)
          return id
            ? one(client, "select * from equipment.technical_models where id=$1", [id])
            : (
                await client.query(
                  "select * from equipment.technical_models order by code limit 200",
                )
              ).rows;
        const manufacturer = await one(
          client,
          "select * from equipment.catalog_entries where id=$1 and kind='manufacturer' and status='active' for share",
          [input.manufacturerId],
        );
        let before;
        if (id) {
          before = await one(
            client,
            "select * from equipment.technical_models where id=$1 for update",
            [id],
          );
          expected(before, versionHeader(request));
        }
        const row = id
          ? await one(
              client,
              "update equipment.technical_models set data=$2,row_version=row_version+1 where id=$1 returning *",
              [id, JSON.stringify(input)],
            )
          : await one(
              client,
              "insert into equipment.technical_models(manufacturer_id,code,data) values($1,$2,$3) returning *",
              [manufacturer.id, input.code, JSON.stringify(input)],
            );
        if (
          before &&
          (before.code !== input.code || before.manufacturer_id !== input.manufacturerId)
        )
          throw new ConflictException("Model identity cannot change");
        await audit(client, op, row, "MODEL_SAVED", "Technical model saved", before);
        return row;
      },
      !!input,
    );
  }
  versions(request: SecurityRequest, modelId: string, body?: unknown) {
    const input = body === undefined ? undefined : templateInputSchema.parse(body);
    return this.db.run(
      request,
      `versions:${modelId}`,
      input,
      !!input,
      async (client, op) => {
        if (!input)
          return (
            await client.query(
              "select * from equipment.template_versions where model_id=$1 order by version_number desc limit 200",
              [modelId],
            )
          ).rows;
        await one(
          client,
          "select * from equipment.technical_models where id=$1 and status='active' for update",
          [modelId],
        );
        await validateDefinition(client, input);
        const row = await one(
          client,
          `insert into equipment.template_versions(model_id,version_number,definition)
        select $1,coalesce(max(version_number),0)+1,$2 from equipment.template_versions where model_id=$1 returning *`,
          [modelId, JSON.stringify(input)],
        );
        await audit(client, op, row, "TEMPLATE_DRAFT_CREATED", input.changeSummary);
        return row;
      },
      !!input,
    );
  }
  template(request: SecurityRequest, id: string, body?: unknown, action?: "publish" | "supersede") {
    const input =
      body === undefined
        ? undefined
        : action
          ? transitionInputSchema.parse(body)
          : templateInputSchema.parse(body);
    return this.db.run(
      request,
      `template:${id}:${action ?? "update"}`,
      input,
      !!input,
      async (client, op) => {
        const before = await one(
          client,
          "select * from equipment.template_versions where id=$1 for update",
          [id],
        );
        if (!input) return before;
        expected(before, versionHeader(request));
        if (action === "supersede" ? before.status !== "published" : before.status !== "draft")
          throw new ConflictException("Invalid template transition");
        if (action === "publish")
          await validateDefinition(client, templateInputSchema.parse(before.definition));
        if (!action) await validateDefinition(client, templateInputSchema.parse(input));
        const row = action
          ? await one(
              client,
              "update equipment.template_versions set status=$2,published_at=coalesce(published_at,now()),row_version=row_version+1 where id=$1 returning *",
              [id, action === "publish" ? "published" : "superseded"],
            )
          : await one(
              client,
              "update equipment.template_versions set definition=$2,row_version=row_version+1 where id=$1 returning *",
              [id, JSON.stringify(input)],
            );
        await audit(
          client,
          op,
          row,
          action === "publish" ? "TEMPLATE_PUBLISHED" : "TEMPLATE_UPDATED",
          "reason" in input ? input.reason : input.changeSummary,
          before,
        );
        return row;
      },
      !!input,
    );
  }
  impact(request: SecurityRequest, id: string) {
    return this.db.run(
      request,
      `impact:${id}`,
      null,
      false,
      async (client) => {
        const template = await one(
          client,
          "select * from equipment.template_versions where id=$1",
          [id],
        );
        return {
          templateId: id,
          ...(
            await client.query(
              `select count(distinct m.id)::integer as machines,
        count(s.id) filter(where s.status='pending' and (s.due_at>now() or s.due_at is null))::integer as future_activities
        from equipment.machines m left join equipment.scheduled_activities s on s.machine_id=m.id
        where m.model_id=$1 and m.operational_status<>'retired'`,
              [template.model_id],
            )
          ).rows[0],
        };
      },
      true,
    );
  }
}
