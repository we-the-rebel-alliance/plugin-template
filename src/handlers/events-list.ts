/**
 * `events_list`: the source's one read (contract §7). The input schema, its normalisation and the page shape come from
 * the contract's `events` module; this handler validates what only the plugin knows (the source) and asks the provider.
 */
import { EVENTS_LIST_INPUT_SCHEMA, PAGE_SCHEMA, parseEventsListInput } from "@we-the-rebel-alliance/plugin-contract/events"
import type { MethodHandler } from "@we-the-rebel-alliance/plugin-contract/register"
import { refuseInput, refuseSource } from "./shared.ts"
import { SCOPE_KEYS, SOURCE } from "../provider/client.ts"
import type { HandlerRuntime } from "./index.ts"

/** `events_list`: one account's page of messages, oldest first, with a cursor bound to the account and scope. */
export function eventsListHandler(runtime: HandlerRuntime): MethodHandler {
  return {
    description: "List one account's messages, oldest first, within the confirmed channels. Pass the cursor a page returned to read what follows it.",
    input: EVENTS_LIST_INPUT_SCHEMA,
    output: PAGE_SCHEMA,
    async run(input, call) {
      const parsed = parseEventsListInput(input, { scopeKeys: [...SCOPE_KEYS] })
      if (!parsed.ok) refuseInput(parsed.problems)
      if (parsed.value.source !== undefined && parsed.value.source !== SOURCE) refuseSource(runtime.manifest.plugin.name, parsed.value.source)
      return runtime.provider.page({ account: call.account, request: parsed.value, now: runtime.clock(), maxBytes: runtime.maxBytes })
    },
  }
}
