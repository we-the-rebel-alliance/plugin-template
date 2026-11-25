/**
 * `status`: what a person and an app read before anything else. It carries no content and no credential.
 *
 * The contract's `statusAnswer` assembles the whole answer from the manifest, the versions, the account states, the
 * problems setup recorded and `call.unguardedAgents()`. The handler keeps no state and patches no agent.
 */
import { accountStatuses, STATUS_SCHEMA, statusAnswer, type AccountSignal } from "@we-the-rebel-alliance/plugin-contract/accounts"
import type { MethodHandler } from "@we-the-rebel-alliance/plugin-contract/register"
import { EMPTY } from "./shared.ts"
import type { HandlerRuntime } from "./index.ts"

/** `status`: name, version, host, state, one entry per alias, unguarded agents and a next step. */
export function statusHandler(runtime: HandlerRuntime): MethodHandler {
  return {
    description: "Read the plugin's version, OpenCode host, account status and any next step.",
    input: EMPTY,
    output: STATUS_SCHEMA,
    async run(_input, call) {
      const signals: Record<string, AccountSignal> = {}
      for (const account of runtime.accounts) signals[account.alias] = { state: "ready", owner: runtime.provider.owner(account.alias) }
      return statusAnswer({
        manifest: runtime.manifest,
        version: runtime.version,
        hostVersion: runtime.hostVersion,
        accounts: accountStatuses(runtime.accounts, signals),
        problems: runtime.problems,
        unguardedAgents: await call.unguardedAgents(),
      })
    },
  }
}
