import assert from "node:assert/strict"
import { test } from "node:test"
import { encodeBoundCursor } from "@we-the-rebel-alliance/plugin-contract/cursor"
import { MAX_PAGE_BYTES, SourceError, type EventsListRequest } from "@we-the-rebel-alliance/plugin-contract/events"
import { createProvider, SOURCE } from "../../src/provider/client.ts"
import { NOW } from "../support/handlers.ts"

const provider = createProvider({ plugin: "example", package: "@we-the-rebel-alliance/example-plugin" })

const request = (overrides: Partial<EventsListRequest> = {}): EventsListRequest => ({ limit: 100, ...overrides })

/** One page read, stamped with the fixed clock and the source's default byte budget. */
function page(account: string, input: EventsListRequest, maxBytes = MAX_PAGE_BYTES) {
  return provider.page({ account, request: input, now: NOW, maxBytes })
}

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
  const answer = page("work", request({ since: Date.parse("2026-11-01T00:00:00.000Z") }))
  assert.equal(answer.source, SOURCE)
  assert.equal(answer.account, "work")
  assert.equal(answer.plugin, "@we-the-rebel-alliance/example-plugin")
  assert.equal(answer.owner.id, "mailto:work@example.test")
  assert.equal(answer.trust, "untrusted")
  assert.equal(answer.events.length, 5)
  const times = answer.events.map((event) => Date.parse(event.occurred_at))
  assert.deepEqual(times, [...times].sort((left, right) => left - right))
  assert.equal(answer.more, false)
})

test("instruction-shaped text from someone else is refused, not delivered", () => {
  const answer = page("work", request({ since: Date.parse("2026-11-01T00:00:00.000Z") }))
  assert.deepEqual(answer.refused, [{ external_id: "m-work-4", reason: "instruction" }])
  assert.ok(answer.events.every((event) => event.external_id !== "m-work-4"))
})

test("the scope keeps only the confirmed channels", () => {
  const answer = page("work", request({ since: Date.parse("2026-11-01T00:00:00.000Z"), scope: { channels: ["C1"] } }))
  assert.deepEqual(answer.events.map((event) => event.external_id), ["m-work-1", "m-work-2", "m-work-tie-a", "m-work-tie-b"])
  assert.deepEqual(answer.scope, { channels: ["C1"] })
})

test("the personal account reads its own messages and no other account's", () => {
  const answer = page("personal", request({ since: Date.parse("2026-11-01T00:00:00.000Z") }))
  assert.deepEqual(answer.events.map((event) => event.external_id), ["m-personal-1"])
  assert.ok(answer.events.every((event) => event.account === "personal"))
})

test("a cursor lists what follows, and the last page says there is no more", () => {
  const first = page("work", request({ since: Date.parse("2026-11-01T00:00:00.000Z"), limit: 2 }))
  assert.deepEqual(first.events.map((event) => event.external_id), ["m-work-1", "m-work-2"])
  assert.equal(first.more, true)
  const second = page("work", request({ cursor: first.cursor }))
  assert.deepEqual(second.events.map((event) => event.external_id), ["m-work-3", "m-work-tie-a", "m-work-tie-b"])
  assert.equal(second.more, false)
})

test("events at one time keep their order across a page boundary, with none skipped or repeated", () => {
  const first = page("work", request({ since: Date.parse("2026-11-05T00:00:00.000Z"), limit: 1 }))
  assert.deepEqual(first.events.map((event) => event.external_id), ["m-work-tie-a"])
  assert.equal(first.more, true)
  const second = page("work", request({ cursor: first.cursor }))
  assert.deepEqual(second.events.map((event) => event.external_id), ["m-work-tie-b"])
  assert.equal(second.more, false)
  const ids = [...first.events, ...second.events].map((event) => event.external_id)
  assert.deepEqual(ids, ["m-work-tie-a", "m-work-tie-b"])
  assert.equal(new Set(ids).size, ids.length)
})

test("a page is fitted to the source's maxBytes, and its cursor covers what it delivered", () => {
  const first = page("work", request({ since: Date.parse("2026-11-01T00:00:00.000Z") }), 2_100)
  assert.ok(first.events.length < 5)
  assert.equal(first.more, true)
  const ids = first.events.map((event) => event.external_id)
  let cursor = first.cursor
  let more: boolean = first.more
  while (more) {
    const next = page("work", request({ cursor }), 2_100)
    ids.push(...next.events.map((event) => event.external_id))
    cursor = next.cursor
    more = next.more
  }
  assert.deepEqual(ids, ["m-work-1", "m-work-2", "m-work-3", "m-work-tie-a", "m-work-tie-b"])
})

test("a cursor another account holds is refused, not restarted", () => {
  const first = page("work", request({ since: Date.parse("2026-11-01T00:00:00.000Z") }))
  assert.equal(refusalCode(() => page("personal", request({ cursor: first.cursor }))), "CURSOR_INVALID")
})

test("a malformed cursor is refused", () => {
  assert.equal(refusalCode(() => page("work", request({ cursor: "not-a-cursor" }))), "CURSOR_INVALID")
})

test("a cursor whose position is not a time-and-id pair is refused", () => {
  const binding = { plugin: "example", source: SOURCE, account: "work" }
  for (const after of ["2026-11-05T12:00:00.000Z", ["2026-11-05T12:00:00.000Z"], ["2026-11-05T12:00:00.000Z", 7], { at: "2026-11-05T12:00:00.000Z" }]) {
    const cursor = encodeBoundCursor(binding, { after })
    assert.equal(refusalCode(() => page("work", request({ cursor }))), "CURSOR_INVALID")
  }
})

test("a scope another account's cursor was bound to is refused", () => {
  const first = page("work", request({ since: Date.parse("2026-11-01T00:00:00.000Z"), scope: { channels: ["C1"] } }))
  assert.equal(refusalCode(() => page("work", request({ cursor: first.cursor, scope: { channels: ["C2"] } }))), "CURSOR_INVALID")
})

test("an empty window still answers a cursor", () => {
  const answer = page("work", request({ since: Date.parse("2026-11-20T00:00:00.000Z") }))
  assert.deepEqual(answer.events, [])
  assert.equal(answer.more, false)
  assert.ok(answer.cursor.length > 0)
})

test("an unknown account is refused", () => {
  assert.equal(refusalCode(() => page("team", request())), "ACCOUNT_UNKNOWN")
  assert.equal(refusalCode(() => provider.owner("team")), "ACCOUNT_UNKNOWN")
  assert.equal(refusalCode(() => provider.channels("team")), "ACCOUNT_UNKNOWN")
})

test("the same call answers the same page, hashes included", () => {
  const call = () => page("work", request({ since: Date.parse("2026-11-01T00:00:00.000Z") }))
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
