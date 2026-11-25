/** The handlers, driven through their real entry, with a fixed clock and no host. */
import { accountsOf } from "@we-the-rebel-alliance/plugin-contract/accounts"
import { manifest, packageName, version } from "../../src/manifest.ts"
import { handlersFor, type HandlerRuntime } from "../../src/handlers/index.ts"
import { createProvider } from "../../src/provider/client.ts"
import type { MethodCall } from "@we-the-rebel-alliance/plugin-contract/register"

/** The fixed time every recorded answer is stamped with. */
export const NOW = Date.parse("2026-11-25T09:00:00.000Z")

/** The options the fixture and the T1 host use: two aliases. */
const OPTIONS = { accounts: { work: {}, personal: {} } } as const

/** A runtime with the real manifest, the fake provider and a fixed clock. */
export function runtimeFor(options: Readonly<Record<string, unknown>> = OPTIONS, overrides: Partial<HandlerRuntime> = {}): HandlerRuntime {
  const plan = accountsOf(manifest, options)
  if (!plan.ok) throw new Error(plan.problems.join("; "))
  return {
    plugin: manifest.plugin.name,
    packageName,
    version,
    hostVersion: "2.4.1",
    tested: manifest.plugin.host.tested,
    accounts: plan.value.accounts,
    provider: createProvider({ plugin: manifest.plugin.name, package: packageName }),
    clock: () => NOW,
    agents: async () => [],
    rules: () => [],
    nextStep: () => null,
    ...overrides,
  }
}

/** The call context a handler sees, as `register` builds it. */
function callFor(account: string): MethodCall {
  return {
    sessionID: "ses_test",
    agent: "build",
    messageID: "msg_test",
    id: "call_test",
    signal: new AbortController().signal,
    progress: async () => undefined,
    account,
    door: "tool",
  }
}

/** Run one handler with an account and the input `register` would pass. */
export async function run(runtime: HandlerRuntime, method: "status" | "probe" | "events_list" | "list_channels", input: Readonly<Record<string, unknown>>, account = "work"): Promise<unknown> {
  return handlersFor(runtime)[method]!.run(input, callFor(account))
}
