/**
 * The handler table: one entry per method the manifest declares, by the method's name.
 *
 * A handler says what one method looks like and does the work; `register` adds the account selector, the doors, the
 * permission assertions and the answer checks. The provider is the only layer that talks to the vendor.
 */
import type { AccountProfile } from "@we-the-rebel-alliance/plugin-contract/accounts"
import type { AgentLike, PermissionRule } from "@we-the-rebel-alliance/plugin-contract/access"
import type { HandlerTable } from "@we-the-rebel-alliance/plugin-contract/register"
import { eventsListHandler } from "./events-list.ts"
import { listChannelsHandler } from "./list-channels.ts"
import { probeHandler } from "./probe.ts"
import { statusHandler } from "./status.ts"
import type { Provider } from "../provider/client.ts"

/** The plugin state the handlers may read, built once in `setup`. */
export interface HandlerRuntime {
  /** The plugin's id, as the manifest names it. */
  readonly plugin: string
  /** The installed package name, which a page states. */
  readonly packageName: string
  /** The package version, which `status` reports. */
  readonly version: string
  /** The OpenCode release the plugin runs on. */
  readonly hostVersion: string
  /** The releases the manifest's `tested` list names. */
  readonly tested: readonly string[]
  /** The accounts the options declare, in their order. */
  readonly accounts: readonly AccountProfile[]
  readonly provider: Provider
  /** The clock a page's `asOf` is stamped with; tests pass a fixed one. */
  readonly clock: () => number
  /** The agents OpenCode has now, for `status.unguardedAgents`. */
  readonly agents: () => Promise<readonly AgentLike[]>
  /** The access rules `register` generated. */
  readonly rules: () => readonly PermissionRule[]
  /** One line for `status.nextStep`, or null. */
  readonly nextStep: () => string | null
}

/** Every method's handler. */
export function handlersFor(runtime: HandlerRuntime): HandlerTable {
  return {
    status: statusHandler(runtime),
    probe: probeHandler(runtime),
    events_list: eventsListHandler(runtime),
    list_channels: listChannelsHandler(runtime),
  }
}
