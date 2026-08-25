import { z } from "zod";

export const cursorSchema = z.string().min(1).max(512);

export const cursorPageRequestSchema = z.object({
  cursor: cursorSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const createCursorPageSchema = <Item extends z.ZodType>(itemSchema: Item) =>
  z.object({
    items: z.array(itemSchema),
    page: z.object({
      nextCursor: cursorSchema.nullable(),
      hasMore: z.boolean(),
    }),
  });

export type CursorPageRequest = z.infer<typeof cursorPageRequestSchema>;
