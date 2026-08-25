import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const workspaceRoots = ["apps", "packages"];
const manifests = new Map();

for (const root of workspaceRoots) {
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(root, entry.name, "package.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    manifests.set(manifest.name, { manifest, manifestPath });
  }
}

const graph = new Map();
for (const [name, { manifest }] of manifests) {
  const dependencies = {
    ...manifest.dependencies,
    ...manifest.devDependencies,
    ...manifest.peerDependencies,
  };
  graph.set(
    name,
    Object.keys(dependencies).filter((dependency) => manifests.has(dependency)),
  );
}

const errors = [];
for (const [name, dependencies] of graph) {
  if (name.startsWith("@ice24/") && name !== "@ice24/testing") {
    for (const dependency of dependencies) {
      const target = manifests.get(dependency);
      if (target?.manifestPath.startsWith("apps")) {
        errors.push(`${name} must not depend on application ${dependency}`);
      }
    }
  }
}

for (const forbidden of ["@ice24/database", "@ice24/ui", "@ice24/offline"]) {
  if ((graph.get("@ice24/contracts") ?? []).includes(forbidden)) {
    errors.push(`@ice24/contracts must not depend on ${forbidden}`);
  }
}

const visited = new Set();
const active = new Set();
const visit = (name, trail) => {
  if (active.has(name)) {
    errors.push(`workspace dependency cycle: ${[...trail, name].join(" -> ")}`);
    return;
  }
  if (visited.has(name)) return;
  active.add(name);
  for (const dependency of graph.get(name) ?? []) visit(dependency, [...trail, name]);
  active.delete(name);
  visited.add(name);
};

for (const name of graph.keys()) visit(name, []);

if (errors.length > 0) {
  for (const error of errors) console.error(error);
  process.exitCode = 1;
} else {
  console.info(`Validated ${manifests.size} workspaces with no forbidden cycles.`);
}
