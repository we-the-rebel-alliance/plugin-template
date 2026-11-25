/**
 * `events_list`: the source's one read (contract §7). The input, its normalisation and the page come from the contract's
 * `events` module; this handler validates what only the plugin knows (the source) and asks the provider.
 */
import { parseEventsListInput } from "@we-the-rebel-alliance/plugin-contract/events"
import type { MethodHandler } from "@we-the-rebel-alliance/plugin-contract/register"
import { OBJECT, refuseInput, refuseSource } from "./shared.ts"
import { SCOPE_KEYS, SOURCE } from "../provider/client.ts"
import type { HandlerRuntime } from "./index.ts"

/** `events_list`: one account's page of messages, oldest first, with a cursor bound to the account and scope. */
export function eventsListHandler(runtime: HandlerRuntime): MethodHandler {
  return {
    description: "List one account's messages, oldest first, within the confirmed channels. Pass the cursor a page returned to read what follows it.",
    input: {
      type: "object",
      properties: {
        source: { type: "string", description: "The source to read; only messages." },
        cursor: { type: "string", description: "The cursor a previous page returned." },
        since: { type: "string", description: "An ISO date or date-time; ignored when cursor is given." },
        limit: { type: "integer", minimum: 1, maximum: 500, description: "How many events to list, from 1 to 500." },
        scope: { type: "object", additionalProperties: true, description: "The channels a person confirmed." },
      },
      additionalProperties: false,
    },
    output: OBJECT,
    async run(input, call) {
      const parsed = parseEventsListInput(input, { scopeKeys: [...SCOPE_KEYS] })
      if (!parsed.ok) refuseInput(parsed.problems)
      if (parsed.value.source !== undefined && parsed.value.source !== SOURCE) refuseSource(runtime.plugin, parsed.value.source)
      return runtime.provider.page({ account: call.account, request: parsed.value, now: runtime.clock() })
    },
  }
}
