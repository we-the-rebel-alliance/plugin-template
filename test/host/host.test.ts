import assert from "node:assert/strict"
import { test } from "node:test"
import { assertHost } from "@we-the-rebel-alliance/plugin-contract/register"
import { manifest } from "../../src/manifest.ts"

const context = (version: string, options: Readonly<Record<string, unknown>> = {}) => ({ app: { version }, options })

test("a tested host starts, and so does a later release in the same minor", () => {
  assert.doesNotThrow(() => assertHost(context("2.4.1"), manifest))
  assert.doesNotThrow(() => assertHost(context("2.4.9"), manifest))
})

test("an untested host gets the contract's clean refusal", () => {
  const refusal = `HOST_UNTESTED: ${manifest.plugin.name} supports ${manifest.plugin.host.opencode}, and OpenCode 2.5.0 is outside it. Next step: install OpenCode 2.4.1, or set allowUntestedHost.`
  assert.throws(
    () => assertHost(context("2.5.0"), manifest),
    (error: unknown) => error instanceof Error && error.message === refusal,
  )
  assert.throws(() => assertHost(context("3.0.0"), manifest), /^Error: HOST_UNTESTED: /)
  assert.throws(() => assertHost(context("not a version"), manifest), /^Error: HOST_UNTESTED: /)
})

test("allowUntestedHost starts the plugin outside the range", () => {
  assert.doesNotThrow(() => assertHost(context("2.5.0", { allowUntestedHost: true }), manifest))
})
