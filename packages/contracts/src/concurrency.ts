import { z } from "zod";

export const expectedVersionSchema = z.coerce.number().int().nonnegative();
export const entityTagSchema = z.string().regex(/^W\/"[0-9]+"$/u);

export const entityTagForVersion = (version: number): string => {
  const validatedVersion = expectedVersionSchema.parse(version);
  return `W/"${validatedVersion}"`;
};
