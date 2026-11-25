/**
 * The manifest the plugin runs with, read from the installed package and checked by the contract.
 *
 * `package.json` `capabilities` is the one source of truth. It is read at run time rather than copied into the build,
 * so the manifest the conformance kit hashes and the manifest the plugin registers can never drift apart.
 */
import { readFileSync } from "node:fs"
import { MAX_PAGE_BYTES } from "@we-the-rebel-alliance/plugin-contract/events"
import { checkManifest, findSource, maxBytesOf, type Manifest } from "@we-the-rebel-alliance/plugin-contract/manifest"

interface PackageFile {
  readonly name?: unknown
  readonly version?: unknown
  readonly capabilities?: unknown
}

const file = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as PackageFile

if (typeof file.name !== "string" || typeof file.version !== "string") {
  throw new Error("OPTIONS_INVALID: package.json names no package or version. Next step: add name and version to package.json.")
}

const checked = checkManifest(file.capabilities)
if (!checked.ok) {
  throw new Error(`OPTIONS_INVALID: capabilities does not validate: ${checked.problems.join("; ")}. Next step: fix capabilities in package.json.`)
}

/** The package name, such as `@we-the-rebel-alliance/example-plugin`. */
export const packageName = file.name

/** The package version, as `status` reports it. */
export const version = file.version

/** The validated manifest. */
export const manifest: Manifest = checked.value

/** The events source this plugin reads. */
export const sourceId = "example.messages"

/** The most bytes one page of the source may hold, from the source's manifest entry. */
export const maxBytes = (() => {
  const source = findSource(manifest, sourceId)
  return source === undefined ? MAX_PAGE_BYTES : maxBytesOf(source)
})()
