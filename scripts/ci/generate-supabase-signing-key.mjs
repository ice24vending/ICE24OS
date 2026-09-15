import { generateKeyPairSync, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const output = resolve(process.argv[2] ?? "supabase/signing_keys.json");
const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const signingKey = privateKey.export({ format: "jwk" });

Object.assign(signingKey, {
  alg: "RS256",
  kid: randomUUID(),
  key_ops: ["sign"],
  use: "sig",
});

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify([signingKey], null, 2)}\n`, {
  encoding: "utf8",
  mode: 0o600,
});
console.info(`Generated ephemeral Supabase signing key at ${output}`);
