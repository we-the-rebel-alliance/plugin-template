/**
 * The plugin's one entry: `Plugin.define({ id, setup })`, the host gate, the accounts, and one `register` call.
 *
 * `register` wires doors 1–3 from `handlers`, resolves accounts and generates the access rules. This file never calls
 * `ctx.tool`, `ctx.rpc` or `ctx.permission` itself.
 */
import { Plugin } from "@opencode/plugin"
import { accountsOf, redactReason } from "@we-the-rebel-alliance/plugin-contract/accounts"
import type { PermissionRule } from "@we-the-rebel-alliance/plugin-contract/access"
import { register } from "@we-the-rebel-alliance/plugin-contract/register"
import { registerMcpAccounts } from "./accounts.ts"
import { handlersFor } from "./handlers/index.ts"
import { hostRefusal } from "./host.ts"
import { manifest, packageName, version } from "./manifest.ts"
import { createProvider } from "./provider/client.ts"

export default Plugin.define({
  id: manifest.plugin.name,
  async setup(context) {
    const options = context.options ?? {}
    const refusal = hostRefusal(manifest.plugin.name, context.app.version, options)
    if (refusal !== undefined) throw new Error(refusal)

    const plan = accountsOf(manifest, options)
    if (!plan.ok) throw new Error(`OPTIONS_INVALID: ${plan.problems.join("; ")}. Next step: fix the plugin's accounts option.`)

    // The vendor's MCP server holds the credentials: one server per alias, named <plugin> or <plugin>-<alias>.
    const accountRegistration = await registerMcpAccounts(context, manifest, options)

    let rules: readonly PermissionRule[] = []
    const handlers = handlersFor({
      plugin: manifest.plugin.name,
      packageName,
      version,
      hostVersion: context.app.version,
      tested: manifest.plugin.host.tested,
      accounts: plan.value.accounts,
      provider: createProvider({ plugin: manifest.plugin.name, package: packageName }),
      clock: Date.now,
      agents: async () => (await context.agent.list()).data.map((agent) => ({ id: agent.id, permissions: agent.permissions })),
      rules: () => rules,
      nextStep: () => {
        const problem = accountRegistration.problems[0]
        return problem === undefined ? null : redactReason(problem)
      },
    })

    const registration = await register(context, manifest, handlers)
    rules = registration.access.rules
    return () => registration.dispose()
  },
})
