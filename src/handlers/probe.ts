/** `probe`: whose an account is. It reads the account, never any content. */
import { parseProbeInput } from "@we-the-rebel-alliance/plugin-contract/events"
import type { MethodHandler } from "@we-the-rebel-alliance/plugin-contract/register"
import { OBJECT, refuseInput, refuseSource } from "./shared.ts"
import { SOURCE } from "../provider/client.ts"
import type { HandlerRuntime } from "./index.ts"

/** `probe`: the owner and the provider sign-in's scopes for one account. */
export function probeHandler(runtime: HandlerRuntime): MethodHandler {
  return {
    description: "Read the signed-in owner and scopes for one account. Use it to tell accounts apart; it reads no messages.",
    input: {
      type: "object",
      properties: { source: { type: "string", description: "The source to probe; only messages." } },
      additionalProperties: false,
    },
    output: OBJECT,
    async run(input, call) {
      const parsed = parseProbeInput(input)
      if (!parsed.ok) refuseInput(parsed.problems)
      if (parsed.value.source !== undefined && parsed.value.source !== SOURCE) refuseSource(runtime.plugin, parsed.value.source)
      return runtime.provider.probe(call.account)
    },
  }
}
