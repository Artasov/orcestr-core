import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const frontendRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

async function typescriptSources(packageName) {
  const sourceRoot = path.join(
    frontendRoot,
    "packages",
    packageName,
    "src",
  );
  const names = await readdir(sourceRoot, { recursive: true });
  return Promise.all(
    names
      .filter((name) => /\.(?:ts|tsx)$/u.test(name))
      .map(async (name) => ({
        name,
        source: await readFile(path.join(sourceRoot, name), "utf8"),
      })),
  );
}

function packageImports(sources) {
  return sources.flatMap(({ name, source }) =>
    [...source.matchAll(/\bfrom\s+["']([^"']+)["']/gu)].map((match) => ({
      file: name,
      module: match[1],
    })),
  );
}

test("@orcestr/core remains framework, auth, UI, and product independent", async () => {
  const imports = packageImports(await typescriptSources("core"));
  const violations = imports.filter(({ module }) =>
    /^(?:react|next(?:\/|$)|@orcestr\/(?:auth|ui)|@\/)/u.test(module),
  );
  assert.deepEqual(violations, []);
});

test("framework adapters depend inward and never import product or UI code", async () => {
  const reactImports = packageImports(await typescriptSources("core-react"));
  const nextImports = packageImports(await typescriptSources("core-next"));

  assert.deepEqual(
    reactImports.filter(({ module }) =>
      /^(?:next(?:\/|$)|@orcestr\/(?:auth|ui)|@\/)/u.test(module),
    ),
    [],
  );
  assert.deepEqual(
    nextImports.filter(({ module }) =>
      /^(?:react(?:\/|$)|@orcestr\/(?:auth|ui)|@\/)/u.test(module),
    ),
    [],
  );
});

test("framework-independent transport does not acquire auth recovery", async () => {
  const client = await readFile(
    path.join(frontendRoot, "packages", "core", "src", "client.ts"),
    "utf8",
  );
  assert.doesNotMatch(client, /\b(?:refresh|cookie|login|logout)\b/iu);
});
