/**
 * The handler table: one entry per method the manifest declares, by the method's name.
 *
 * A handler says what one method looks like and does the work; `register` adds the account selector, the doors, the
 * permission assertions and the answer checks. The provider is the only layer that talks to the vendor.
 */
import type { AccountProfile } from "@we-the-rebel-alliance/plugin-contract/accounts"
import type { Manifest } from "@we-the-rebel-alliance/plugin-contract/manifest"
import type { HandlerTable } from "@we-the-rebel-alliance/plugin-contract/register"
import { eventsListHandler } from "./events-list.ts"
import { listChannelsHandler } from "./list-channels.ts"
import { probeHandler } from "./probe.ts"
import { statusHandler } from "./status.ts"
import type { Provider } from "../provider/client.ts"

/** The plugin state the handlers read, built once in `setup`. Nothing here changes after `register` returns. */
export interface HandlerRuntime {
  /** The validated manifest: status and the answer shapes come from it. */
  readonly manifest: Manifest
  /** The package version, which `status` reports. */
  readonly version: string
  /** The OpenCode release the plugin runs on. */
  readonly hostVersion: string
  /** The accounts the options declare, in their order. */
  readonly accounts: readonly AccountProfile[]
  /** The most bytes one page of the events source may hold. */
  readonly maxBytes: number
  readonly provider: Provider
  /** The clock a page's `asOf` is stamped with; tests pass a fixed one. */
  readonly clock: () => number
  /** What registering the accounts could not do, for `status.nextStep`. */
  readonly problems: readonly string[]
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
