import assert from "node:assert/strict"
import { test } from "node:test"
import { SourceError } from "@we-the-rebel-alliance/plugin-contract/events"
import { findSource } from "@we-the-rebel-alliance/plugin-contract/manifest"
import { acceptAnswer } from "@we-the-rebel-alliance/plugin-contract/read"
import { manifest, sourceId } from "../../src/manifest.ts"
import { run, runtimeFor } from "../support/handlers.ts"

const runtime = runtimeFor()

function codeOf(action: () => Promise<unknown>): Promise<string | undefined> {
  return action().then(
    () => undefined,
    (error: unknown) => (error instanceof SourceError ? error.code : undefined),
  )
}

function answerOf(value: unknown): Record<string, unknown> {
  assert.ok(typeof value === "object" && value !== null)
  return value as Record<string, unknown>
}

test("status names the plugin, its host, both accounts and no unguarded agent", async () => {
  const answer = answerOf(await run(runtime, "status", {}))
  assert.equal(answer.name, "example")
  assert.equal(answer.version, "0.0.0")
  assert.equal(answer.state, "ready")
  assert.equal(answer.nextStep, null)
  assert.deepEqual(answer.host, { version: "2.4.1", range: ">=2.4.1 <2.5.0", tested: ["2.4.1"] })
  const accounts = answer.accounts as Record<string, unknown>[]
  assert.deepEqual(accounts.map((account) => account.alias), ["work", "personal"])
  assert.ok(accounts.every((account) => account.state === "ready" && typeof account.owner === "object"))
  assert.deepEqual(answer.unguardedAgents, [])
})

test("status names an agent that no longer holds the generated rules", async () => {
  const answer = answerOf(await run(runtime, "status", {}, "work", { ok: true, agents: ["build"] }))
  assert.deepEqual(answer.unguardedAgents, ["build"])
})

test("status reports a failed agent list as a problem and no agent", async () => {
  const answer = answerOf(await run(runtime, "status", {}, "work", { ok: false, error: "the agent list could not be read" }))
  assert.equal(answer.state, "error")
  assert.equal(answer.nextStep, "the agent list could not be read")
  assert.deepEqual(answer.unguardedAgents, [])
})

test("status redacts a next step and reports an error state", async () => {
  const answer = answerOf(await run(runtimeFor(undefined, { problems: ["the provider refused the refresh token at https://example.test/callback?token=secret-value"] }), "status", {}))
  assert.equal(answer.state, "error")
  assert.equal(answer.nextStep, "the provider refused the refresh token at https://example.test/callback?token=…")
})

test("probe answers the account's owner and no content", async () => {
  const answer = answerOf(await run(runtime, "probe", {}, "personal"))
  assert.equal(answer.account, "personal")
  assert.deepEqual(answer.owner, { id: "mailto:personal@example.test", label: "Personal" })
  assert.equal(answer.trust, "untrusted")
  assert.equal(answer.events, undefined)
})

test("probe refuses an unknown source and extra input", async () => {
  assert.equal(await codeOf(() => run(runtime, "probe", { source: "other" })), "SOURCE_UNKNOWN")
  assert.equal(await codeOf(() => run(runtime, "probe", { limit: 1 })), "INPUT_INVALID")
})

test("events_list answers a page the consumer's own check accepts", async () => {
  const answer = await run(runtime, "events_list", { source: "messages", since: "2026-11-01T00:00:00.000Z" })
  const source = findSource(manifest, sourceId)
  assert.ok(source !== undefined)
  const accepted = acceptAnswer(source, "work", answer)
  if (!accepted.ok) throw new Error(accepted.failure.message)
  assert.equal(accepted.kind, "events")
  assert.equal(accepted.page.events.length, 3)
})

test("events_list refuses an unknown source, an unknown scope key and an invalid limit", async () => {
  assert.equal(await codeOf(() => run(runtime, "events_list", { source: "other" })), "SOURCE_UNKNOWN")
  assert.equal(await codeOf(() => run(runtime, "events_list", { scope: { users: ["U1"] } })), "INPUT_INVALID")
  assert.equal(await codeOf(() => run(runtime, "events_list", { limit: 0 })), "INPUT_INVALID")
})

test("list_channels answers the account's channels and refuses an unknown source", async () => {
  assert.deepEqual(await run(runtime, "list_channels", {}, "work"), { options: [{ id: "C1", label: "general" }, { id: "C2", label: "random" }] })
  assert.equal(await codeOf(() => run(runtime, "list_channels", { source: "other" })), "SOURCE_UNKNOWN")
})
