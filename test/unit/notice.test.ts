import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { build } from "esbuild"

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))))
const LICENSE_FILES = ["LICENSE", "LICENSE.md", "LICENSE.txt", "license"]

interface Bundled {
  readonly name: string
  readonly version: string
  readonly license: string
  readonly text: string
}

/** The package a path under node_modules belongs to, or undefined for the plugin's own source. */
function packageOf(input: string): string | undefined {
  const at = input.lastIndexOf("node_modules/")
  if (at === -1) return undefined
  const parts = input.slice(at + "node_modules/".length).split("/")
  if (parts[0]?.startsWith("@") === true) return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : undefined
  return parts[0]
}

/** The packages the template's one bundle inlines: the metafile's direct inputs, plus a bundled package's own notices. */
async function bundledPackages(): Promise<Bundled[]> {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { readonly name: string; readonly version: string }
  const result = await build({
    entryPoints: [{ in: join(root, "src", "index.ts"), out: "index" }],
    outdir: join(root, "dist"),
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node24",
    external: ["@opencode/*"],
    legalComments: "none",
    logLevel: "warning",
    write: false,
    metafile: true,
    banner: { js: `import { createRequire } from "node:module";\nconst require = createRequire(import.meta.url);\n// ${pkg.name} ${pkg.version}. Built by scripts/build.mjs; do not edit.` },
  })
  const names = new Set<string>()
  for (const input of Object.keys(result.metafile.inputs)) {
    const name = packageOf(input)
    if (name !== undefined) names.add(name)
  }
  // A package can ship a pre-bundled dist with its own notices; those licences are in this bundle too.
  for (const name of [...names]) {
    const nested = join(root, "node_modules", name, "dist", "THIRD-PARTY-NOTICES.md")
    if (!existsSync(nested)) continue
    for (const match of readFileSync(nested, "utf8").matchAll(/^## ((?:@[^\s/]+\/)?\S+) \S+ \([^)]+\)$/gm)) {
      if (match[1] !== undefined) names.add(match[1])
    }
  }
  return [...names].sort().map((name) => {
    const own = JSON.parse(readFileSync(join(root, "node_modules", name, "package.json"), "utf8")) as {
      readonly version?: unknown
      readonly license?: unknown
    }
    assert.equal(typeof own.version, "string", `${name} has no version`)
    assert.equal(typeof own.license, "string", `${name} has no SPDX licence`)
    const file = LICENSE_FILES.map((candidate) => join(root, "node_modules", name, candidate)).find(existsSync)
    assert.ok(file !== undefined, `${name} has no licence file`)
    return { name, version: own.version as string, license: own.license as string, text: readFileSync(file, "utf8").trim() }
  })
}

test("NOTICE carries every bundled package's verbatim licence", async () => {
  const notice = readFileSync(join(root, "NOTICE"), "utf8")
  const packages = await bundledPackages()
  assert.ok(packages.length > 0)
  for (const pkg of packages) {
    assert.ok(notice.includes(`## ${pkg.name} ${pkg.version} (${pkg.license})`), `${pkg.name} has no NOTICE heading`)
    assert.ok(notice.includes(pkg.text), `${pkg.name}'s licence is not verbatim in NOTICE`)
  }
})

test("package.json ships NOTICE", () => {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { readonly files?: readonly unknown[] }
  assert.ok(Array.isArray(pkg.files) && pkg.files.includes("NOTICE"), "package.json files must include NOTICE")
})
