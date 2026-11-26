import assert from "node:assert/strict"
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { build } from "esbuild"
import { bundleOptions } from "../../scripts/bundle-options.mjs"

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))))
const HEADING = /^((?:@[^\s/]+\/)?\S+) (\d\S*) \(([^)]+)\)$/
const LICENSE_FILE = /^(?:licen[cs]e.*|copying.*)$/i

interface Bundled {
  readonly name: string
  readonly version: string
  readonly license: string
  readonly text: string
}

/** The package a path under node_modules belongs to, and the directory its own files live in. */
function packageAt(input: string): { readonly name: string; readonly dir: string } | undefined {
  const at = input.lastIndexOf("node_modules/")
  if (at === -1) return undefined
  const rest = input.slice(at + "node_modules/".length)
  const parts = rest.split("/")
  const name = parts[0]?.startsWith("@") === true ? `${parts[0]}/${parts[1]}` : parts[0]
  if (name === undefined || name === "") return undefined
  return { name, dir: join(root, input.slice(0, at + "node_modules/".length), name) }
}

/** The package's licence file, from any spelling npm packages use: LICENSE.md, LICENCE*, license.md, COPYING*. */
function licenceFile(dir: string): string {
  const file = readdirSync(dir, { withFileTypes: true }).find((entry) => entry.isFile() && LICENSE_FILE.test(entry.name))
  assert.ok(file !== undefined, `${dir} has no licence file`)
  return join(dir, file.name)
}

/** One package's heading data and verbatim licence text, from the directory that actually holds it. */
function packageInfo(name: string, dir: string): Bundled {
  const own = JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as { readonly version?: unknown; readonly license?: unknown }
  assert.equal(typeof own.version, "string", `${name} has no version`)
  assert.equal(typeof own.license, "string", `${name} has no SPDX licence`)
  return { name, version: own.version as string, license: own.license as string, text: readFileSync(licenceFile(dir), "utf8").trim() }
}

/** Resolve a package from the package that bundled it: its own node_modules first, then the root. */
function resolvePackage(name: string, from: string): string {
  const require = createRequire(join(from, "package.json"))
  return dirname(require.resolve(`${name}/package.json`))
}

/** The `## <name> <version> (<SPDX>)` sections of a NOTICE-like file. */
function sections(text: string): { heading: string; body: string }[] {
  return text
    .split(/^## /m)
    .slice(1)
    .map((section) => {
      const newline = section.indexOf("\n")
      return { heading: (newline === -1 ? section : section.slice(0, newline)).trim(), body: newline === -1 ? "" : section.slice(newline + 1).trim() }
    })
}

/** Whether one of the bundle's inputs contains a marker, ignoring the notice file itself. */
function inputContains(inputs: readonly string[], marker: string): boolean {
  return inputs.some((input) => {
    if (input.endsWith("THIRD-PARTY-NOTICES.md")) return false
    const file = join(root, input)
    return existsSync(file) && readFileSync(file, "utf8").includes(marker)
  })
}

/** The packages the template's bundle inlines: the metafile's inputs, plus a bundled package's own prebundled notices. */
async function bundledPackages(): Promise<Bundled[]> {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { readonly name: string; readonly version: string }
  const result = await build(bundleOptions({ root, pkg, write: false, metafile: true }))
  assert.ok(result.metafile !== undefined)
  const inputs = Object.keys(result.metafile.inputs)
  const packages = new Map<string, string>()
  for (const input of inputs) {
    const found = packageAt(input)
    if (found !== undefined) packages.set(found.name, found.dir)
  }
  for (const [name, dir] of [...packages]) {
    const notice = join(dir, "dist", "THIRD-PARTY-NOTICES.md")
    if (!existsSync(notice)) continue
    for (const section of sections(readFileSync(notice, "utf8"))) {
      const match = HEADING.exec(section.heading)
      if (match !== null) {
        const [foundName, version] = [match[1]!, match[2]!]
        const resolved = resolvePackage(foundName, dir)
        assert.equal(packageInfo(foundName, resolved).version, version, `${name}'s notice names ${foundName} ${version}, and the bundled copy is another version`)
        packages.set(foundName, resolved)
        continue
      }
      if (section.heading === "Public Suffix List (MPL-2.0)") {
        if (inputContains(inputs, "Public Suffix")) throw new Error("the Public Suffix List is inlined, and its NOTICE heading has no version")
        continue
      }
      throw new Error(`the NOTICE heading has no version: ## ${section.heading}`)
    }
  }
  return [...packages]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, dir]) => packageInfo(name, dir))
}

/** Every NOTICE heading is one bundled package, with its version and verbatim text, and nothing else is listed. */
function assertNotice(notice: string, packages: readonly Bundled[]): void {
  const expected = new Set(packages.map((pkg) => `## ${pkg.name} ${pkg.version} (${pkg.license})`))
  for (const pkg of packages) {
    assert.ok(notice.includes(`## ${pkg.name} ${pkg.version} (${pkg.license})`), `${pkg.name} has no NOTICE heading`)
    assert.ok(notice.includes(pkg.text), `${pkg.name}'s licence is not verbatim in NOTICE`)
  }
  const headings = sections(notice).map((section) => `## ${section.heading}`)
  for (const heading of headings) {
    const match = HEADING.exec(heading.slice(3))
    assert.ok(match !== null, `the NOTICE heading has no version: ${heading}`)
    assert.ok(expected.has(heading), `NOTICE lists ${heading}, and that package is not inlined`)
  }
  assert.equal(new Set(headings).size, headings.length, "NOTICE repeats a package")
  assert.deepEqual(new Set(headings), expected, "NOTICE headings do not match the bundled packages")
}

test("NOTICE carries every bundled package's verbatim licence", async () => {
  const packages = await bundledPackages()
  assert.ok(packages.length > 0)
  assertNotice(readFileSync(join(root, "NOTICE"), "utf8"), packages)
})

test("a package whose licence is license.md is read and accepted", () => {
  const dir = mkdtempSync(join(tmpdir(), "notice-license-"))
  try {
    writeFileSync(join(dir, "package.json"), `${JSON.stringify({ name: "ms", version: "2.1.3", license: "MIT" }, null, 2)}\n`)
    writeFileSync(join(dir, "license.md"), "MIT License\n\nCopyright (c) 2020 Vercel, Inc.\n")
    const pkg = packageInfo("ms", dir)
    const notice = `# Bundled packages\n\n## ms 2.1.3 (MIT)\n\n${pkg.text}\n`
    assert.equal(pkg.text, "MIT License\n\nCopyright (c) 2020 Vercel, Inc.")
    assert.doesNotThrow(() => assertNotice(notice, [pkg]))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test("package.json ships NOTICE", () => {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { readonly files?: readonly unknown[] }
  assert.ok(Array.isArray(pkg.files) && pkg.files.includes("NOTICE"), "package.json files must include NOTICE")
})
