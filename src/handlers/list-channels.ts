/** `list_channels`: the bind-time read that lists the values a person may confirm for the source's scope. */
import { LIST_OPTIONS_SCHEMA } from "@we-the-rebel-alliance/plugin-contract/events"
import type { MethodHandler } from "@we-the-rebel-alliance/plugin-contract/register"
import { refuseSource } from "./shared.ts"
import { SOURCE } from "../provider/client.ts"
import type { HandlerRuntime } from "./index.ts"

/** `list_channels`: the channels of one account, at most 64, each `{ id, label }`. */
export function listChannelsHandler(runtime: HandlerRuntime): MethodHandler {
  return {
    description: "List the channels a person may confirm for the messages source.",
    input: {
      type: "object",
      properties: { source: { type: "string", description: "The source to list channels for; only messages." } },
      additionalProperties: false,
    },
    output: LIST_OPTIONS_SCHEMA,
    async run(input, call) {
      const source = input.source
      if (source !== undefined && (typeof source !== "string" || source !== SOURCE)) refuseSource(runtime.manifest.plugin.name, String(source))
      return runtime.provider.channels(call.account)
    },
  }
}
