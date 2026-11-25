import assert from "node:assert/strict"
import { test } from "node:test"
import { SourceError, type EventsListRequest } from "@we-the-rebel-alliance/plugin-contract/events"
import { createProvider, SOURCE } from "../src/provider/client.ts"
import { NOW } from "./support/handlers.ts"

const provider = createProvider({ plugin: "example", package: "@we-the-rebel-alliance/example-plugin" })

const request = (overrides: Partial<EventsListRequest> = {}): EventsListRequest => ({ limit: 100, ...overrides })

/** The `SourceError` code a call refuses with, or undefined when it answers. */
function refusalCode(action: () => unknown): string | undefined {
  try {
    action()
    return undefined
  } catch (error) {
    return error instanceof SourceError ? error.code : undefined
  }
}

test("the work page is one account's messages, oldest first, marked untrusted", () => {
  const page = provider.page({ account: "work", request: request({ since: Date.parse("2026-11-01T00:00:00.000Z") }), now: NOW })
  assert.equal(page.source, SOURCE)
  assert.equal(page.account, "work")
  assert.equal(page.plugin, "@we-the-rebel-alliance/example-plugin")
  assert.equal(page.owner.id, "mailto:work@example.test")
  assert.equal(page.trust, "untrusted")
  assert.equal(page.events.length, 3)
  const times = page.events.map((event) => Date.parse(event.occurred_at))
  assert.deepEqual(times, [...times].sort((left, right) => left - right))
  assert.equal(page.more, false)
})

test("instruction-shaped text from someone else is refused, not delivered", () => {
  const page = provider.page({ account: "work", request: request({ since: Date.parse("2026-11-01T00:00:00.000Z") }), now: NOW })
  assert.deepEqual(page.refused, [{ external_id: "m-work-4", reason: "instruction" }])
  assert.ok(page.events.every((event) => event.external_id !== "m-work-4"))
})

test("the scope keeps only the confirmed channels", () => {
  const page = provider.page({
    account: "work",
    request: request({ since: Date.parse("2026-11-01T00:00:00.000Z"), scope: { channels: ["C1"] } }),
    now: NOW,
  })
  assert.deepEqual(page.events.map((event) => event.external_id), ["m-work-1", "m-work-2"])
  assert.deepEqual(page.scope, { channels: ["C1"] })
})

test("the personal account reads its own messages and no other account's", () => {
  const page = provider.page({ account: "personal", request: request({ since: Date.parse("2026-11-01T00:00:00.000Z") }), now: NOW })
  assert.deepEqual(page.events.map((event) => event.external_id), ["m-personal-1"])
  assert.ok(page.events.every((event) => event.account === "personal"))
})

test("a cursor lists what follows, and the last page says there is no more", () => {
  const first = provider.page({ account: "work", request: request({ since: Date.parse("2026-11-01T00:00:00.000Z"), limit: 2 }), now: NOW })
  assert.deepEqual(first.events.map((event) => event.external_id), ["m-work-1", "m-work-2"])
  assert.equal(first.more, true)
  const second = provider.page({ account: "work", request: request({ cursor: first.cursor }), now: NOW })
  assert.deepEqual(second.events.map((event) => event.external_id), ["m-work-3"])
  assert.equal(second.more, false)
})

test("a cursor another account holds is refused, not restarted", () => {
  const first = provider.page({ account: "work", request: request({ since: Date.parse("2026-11-01T00:00:00.000Z") }), now: NOW })
  assert.equal(refusalCode(() => provider.page({ account: "personal", request: request({ cursor: first.cursor }), now: NOW })), "CURSOR_INVALID")
})

test("a malformed cursor is refused", () => {
  assert.equal(refusalCode(() => provider.page({ account: "work", request: request({ cursor: "not-a-cursor" }), now: NOW })), "CURSOR_INVALID")
})

test("a scope another account's cursor was bound to is refused", () => {
  const first = provider.page({ account: "work", request: request({ since: Date.parse("2026-11-01T00:00:00.000Z"), scope: { channels: ["C1"] } }), now: NOW })
  assert.equal(refusalCode(() => provider.page({ account: "work", request: request({ cursor: first.cursor, scope: { channels: ["C2"] } }), now: NOW })), "CURSOR_INVALID")
})

test("an empty window still answers a cursor", () => {
  const page = provider.page({ account: "work", request: request({ since: Date.parse("2026-11-20T00:00:00.000Z") }), now: NOW })
  assert.deepEqual(page.events, [])
  assert.equal(page.more, false)
  assert.ok(page.cursor.length > 0)
})

test("an unknown account is refused", () => {
  assert.equal(refusalCode(() => provider.page({ account: "team", request: request(), now: NOW })), "ACCOUNT_UNKNOWN")
  assert.equal(refusalCode(() => provider.owner("team")), "ACCOUNT_UNKNOWN")
  assert.equal(refusalCode(() => provider.channels("team")), "ACCOUNT_UNKNOWN")
})

test("the same call answers the same page, hashes included", () => {
  const call = () => provider.page({ account: "work", request: request({ since: Date.parse("2026-11-01T00:00:00.000Z") }), now: NOW })
  assert.deepEqual(call(), call())
})

test("probe reads the owner and the scopes, and no content", () => {
  const answer = provider.probe("personal")
  assert.deepEqual(answer, {
    source: SOURCE,
    account: "personal",
    owner: { id: "mailto:personal@example.test", label: "Personal" },
    scopes: ["messages.read"],
    trust: "untrusted",
  })
})

test("the channels a person may confirm belong to the account", () => {
  assert.deepEqual(provider.channels("work").options.map((channel) => channel.id), ["C1", "C2"])
  assert.deepEqual(provider.channels("personal").options.map((channel) => channel.id), ["C1"])
})
