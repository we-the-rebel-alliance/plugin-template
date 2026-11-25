/**
 * The plugin's one entry: `Plugin.define({ id, setup })`, the host gate, the skills, the accounts and one `register`
 * call.
 *
 * `register` wires doors 1–3 from `handlers`, resolves accounts and generates the access rules. `registerSkills` adds
 * the package's `skills/` files, which OpenCode does not discover on its own. This file never calls `ctx.tool`, `ctx.rpc`
 * or `ctx.permission` itself.
 */
import { Plugin } from "@opencode/plugin"
import { accountsOf } from "@we-the-rebel-alliance/plugin-contract/accounts"
import { assertHost, register } from "@we-the-rebel-alliance/plugin-contract/register"
import { registerMcpAccounts } from "./accounts.ts"
import { handlersFor } from "./handlers/index.ts"
import { manifest, maxBytes, packageName, version } from "./manifest.ts"
import { createProvider } from "./provider/client.ts"
import { readSkills, registerSkills } from "./skills.ts"

export default Plugin.define({
  id: manifest.plugin.name,
  async setup(context) {
    assertHost(context, manifest)
    // Check every skill before anything registers, so a malformed file fails setup with one clear error.
    const skills = readSkills()

    const options = context.options ?? {}
    const plan = accountsOf(manifest, options)
    if (!plan.ok) throw new Error(`OPTIONS_INVALID: ${plan.problems.join("; ")}. Next step: fix the plugin's accounts option.`)

    // The vendor's MCP server holds the credentials: one server per alias, named <plugin> or <plugin>-<alias>.
    const accountRegistration = await registerMcpAccounts(context, manifest, options)

    const handlers = handlersFor({
      manifest,
      version,
      hostVersion: context.app.version,
      accounts: plan.value.accounts,
      maxBytes,
      provider: createProvider({ plugin: manifest.plugin.name, package: packageName }),
      clock: Date.now,
      problems: accountRegistration.problems,
    })

    const registration = await register(context, manifest, handlers)
    const skillRegistration = await registerSkills(context, skills)
    return async () => {
      await skillRegistration.dispose()
      await registration.dispose()
    }
  },
})
