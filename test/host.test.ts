import assert from "node:assert/strict"
import { test } from "node:test"
import { hostInRange, hostRefusal } from "../src/host.ts"

test("the tested range is 2.4.1 and later 2.4.x", () => {
  assert.equal(hostInRange("2.4.1"), true)
  assert.equal(hostInRange("2.4.9"), true)
  assert.equal(hostInRange("2.4.0"), false)
  assert.equal(hostInRange("2.5.0"), false)
  assert.equal(hostInRange("3.0.0"), false)
  assert.equal(hostInRange("not a version"), false)
})

test("an untested host gets the contract's clean refusal", () => {
  const refusal = hostRefusal("example", "2.5.0", {})
  assert.ok(refusal !== undefined)
  assert.ok(refusal.startsWith("HOST_UNTESTED: "))
  assert.ok(refusal.includes("Next step: "))
})

test("allowUntestedHost starts the plugin anyway, and a tested host needs no exception", () => {
  assert.equal(hostRefusal("example", "2.5.0", { allowUntestedHost: true }), undefined)
  assert.equal(hostRefusal("example", "2.4.1", {}), undefined)
})
