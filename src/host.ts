/**
 * The host gate a plugin runs itself: outside the tested OpenCode range it refuses to start, cleanly, unless the person
 * set `allowUntestedHost`.
 *
 * The refusal reads `CODE: What happened. Next step: What to do.`, and T1 requires the unsupported host to answer it.
 */
import { OPENCODE_RANGE } from "@we-the-rebel-alliance/plugin-contract/manifest"

/** True when `version` is inside `>=2.4.1 <2.5.0`. */
export function hostInRange(version: string): boolean {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version)
  if (match === null) return false
  return Number(match[1]) === 2 && Number(match[2]) === 4 && Number(match[3]) >= 1
}

/** The refusal for an untested host, or undefined when the host may start. */
export function hostRefusal(name: string, version: string, options: Readonly<Record<string, unknown>>): string | undefined {
  if (hostInRange(version) || options["allowUntestedHost"] === true) return undefined
  return `HOST_UNTESTED: ${name} supports ${OPENCODE_RANGE}, and OpenCode ${version} is outside it. Next step: install OpenCode 2.4.1, or set allowUntestedHost.`
}
