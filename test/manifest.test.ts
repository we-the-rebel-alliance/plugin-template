import assert from "node:assert/strict"
import { test } from "node:test"
import { accountName, accountsOf } from "@we-the-rebel-alliance/plugin-contract/accounts"
import { checkManifest, manifestHash } from "@we-the-rebel-alliance/plugin-contract/manifest"
import { methodEntries } from "@we-the-rebel-alliance/plugin-contract/register"
import { handlersFor } from "../src/handlers/index.ts"
import { manifest, packageName, version } from "../src/manifest.ts"
import { runtimeFor } from "./support/handlers.ts"

test("the package and the manifest share one name", () => {
  assert.equal(manifest.plugin.name, "example")
  assert.equal(packageName, `@we-the-rebel-alliance/${manifest.plugin.name}-plugin`)
  assert.equal(version, "0.0.0")
  assert.equal(checkManifest(manifest).ok, true)
  assert.match(manifestHash(manifest), /^sha256:[0-9a-f]{64}$/)
})

test("two aliases resolve to the names OpenCode signs in to", () => {
  const plan = accountsOf(manifest, { accounts: { work: {}, personal: {} } })
  assert.equal(plan.ok, true)
  if (!plan.ok) return
  assert.deepEqual(plan.value.accounts.map((account) => account.alias), ["work", "personal"])
  assert.equal(accountName(manifest.plugin.name, "work"), "example-work")
  assert.equal(accountName(manifest.plugin.name, "personal"), "example-personal")
})

test("the manifest and the handler table declare the same methods", () => {
  const runtime = runtimeFor()
  const entries = methodEntries(manifest, handlersFor(runtime))
  assert.deepEqual(entries.map((entry) => entry.name).sort(), Object.keys(manifest.methods).sort())
  const events = entries.find((entry) => entry.name === "events_list")
  assert.ok(events !== undefined)
  assert.equal(events.item.class, "read")
  assert.deepEqual(events.item.operations, ["example.messages.list", "example.users.get"])
})
