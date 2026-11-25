/**
 * `status`: what a person and an app read before anything else. It carries no content and no credential.
 *
 * The host range, the version and the account list come from the manifest and the options; `unguardedAgents` names an
 * agent that no longer holds the rules `register` generated, and is never patched.
 */
import { accountStatuses, redactReason, type AccountSignal } from "@we-the-rebel-alliance/plugin-contract/accounts"
import { unguardedAgents } from "@we-the-rebel-alliance/plugin-contract/access"
import { OPENCODE_RANGE } from "@we-the-rebel-alliance/plugin-contract/manifest"
import type { MethodHandler } from "@we-the-rebel-alliance/plugin-contract/register"
import { EMPTY, OBJECT } from "./shared.ts"
import type { HandlerRuntime } from "./index.ts"

/** `status`: name, version, host, state, one entry per alias, unguarded agents and a next step. */
export function statusHandler(runtime: HandlerRuntime): MethodHandler {
  return {
    description: "Read the plugin's version, OpenCode host, account status and any next step.",
    input: EMPTY,
    output: OBJECT,
    async run() {
      const signals: Record<string, AccountSignal> = {}
      for (const account of runtime.accounts) signals[account.alias] = { state: "ready", owner: runtime.provider.owner(account.alias) }
      const nextStep = runtime.nextStep()
      return {
        name: runtime.plugin,
        version: runtime.version,
        host: { version: runtime.hostVersion, range: OPENCODE_RANGE, tested: runtime.tested },
        state: nextStep === null ? "ready" : "error",
        accounts: accountStatuses(runtime.accounts, signals),
        unguardedAgents: unguardedAgents(await runtime.agents(), runtime.rules()),
        nextStep: nextStep === null ? null : redactReason(nextStep),
      }
    },
  }
}
