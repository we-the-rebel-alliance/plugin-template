/** The handlers, driven through their real entry, with a fixed clock and no host. */
import { accountsOf } from "@we-the-rebel-alliance/plugin-contract/accounts"
import type { UnguardedAgentsResult } from "@we-the-rebel-alliance/plugin-contract/access"
import type { Bus } from "@we-the-rebel-alliance/plugin-contract/bus"
import type { MethodCall } from "@we-the-rebel-alliance/plugin-contract/register"
import { manifest, maxBytes, packageName, version } from "../../src/manifest.ts"
import { handlersFor, type HandlerRuntime } from "../../src/handlers/index.ts"
import { createProvider } from "../../src/provider/client.ts"

/** The fixed time every recorded answer is stamped with. */
export const NOW = Date.parse("2026-11-25T09:00:00.000Z")

/** The options the fixture and the T1 host use: two aliases. */
const OPTIONS = { accounts: { work: {}, personal: {} } } as const

/** A runtime with the real manifest, the fake provider and a fixed clock. */
export function runtimeFor(options: Readonly<Record<string, unknown>> = OPTIONS, overrides: Partial<HandlerRuntime> = {}): HandlerRuntime {
  const plan = accountsOf(manifest, options)
  if (!plan.ok) throw new Error(plan.problems.join("; "))
  return {
    manifest,
    version,
    hostVersion: "2.4.1",
    accounts: plan.value.accounts,
    maxBytes,
    provider: createProvider({ plugin: manifest.plugin.name, package: packageName }),
    clock: () => NOW,
    problems: [],
    ...overrides,
  }
}

/** The bus `register` gives every call; this template emits no event, so a call never reaches it. */
const bus: Bus = { name: manifest.plugin.name, emit: async () => ({ ok: true }) }

/** The call context a handler sees, as `register` builds it. */
function callFor(account: string, unguardedAgents: UnguardedAgentsResult): MethodCall {
  return {
    sessionID: "ses_test",
    agent: "build",
    messageID: "msg_test",
    id: "call_test",
    signal: new AbortController().signal,
    progress: async () => undefined,
    account,
    bus,
    unguardedAgents: async () => unguardedAgents,
    door: "tool",
  }
}

/** Run one handler with an account and the input `register` would pass. */
export async function run(
  runtime: HandlerRuntime,
  method: "status" | "probe" | "events_list" | "list_channels",
  input: Readonly<Record<string, unknown>>,
  account = "work",
  unguardedAgents: UnguardedAgentsResult = { ok: true, agents: [] },
): Promise<unknown> {
  const handler = handlersFor(runtime)[method]
  if (handler === undefined) throw new Error(`the handler table has no ${method}`)
  return handler.run(input, callFor(account, unguardedAgents))
}
