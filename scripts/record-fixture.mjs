// Rewrites fixtures/conformance.json from the plugin's fake provider.
//
//   npm run fixtures
//
// This script is specific to the fake provider: it is deterministic, so every recorded answer can be rebuilt. A real
// plugin records from two real accounts with `npx plugin-kit record --account <alias>` instead, and deletes this
// script. A rename runs it once, because a cursor binds the plugin id and therefore changes with the name.
import { mkdirSync, writeFileSync } from "node:fs"
import { manifest, packageName } from "../src/manifest.ts"
import { run, runtimeFor } from "../test/support/handlers.ts"

const runtime = runtimeFor()
const source = manifest.sources[0]
if (source === undefined) throw new Error("the manifest declares no source")
const sourceName = typeof source.input?.source === "string" ? source.input.source : source.id
const account = "work"
const since = "2026-11-01T00:00:00.000Z"

const page = (input) => run(runtime, "events_list", input, input.account ?? account)
const workPage = await page({ source: sourceName, account: "work", since })
const personalPage = await page({ source: sourceName, account: "personal", since })
const scopedPage = await page({ source: sourceName, account: "work", since, scope: { channels: ["C1"] } })
const emptyPage = await page({ source: sourceName, account: "work", since: "2026-11-20T00:00:00.000Z" })
// Two messages share a timestamp: the first page lists one, and its cursor lists the other.
const tieFirst = await page({ source: sourceName, account: "work", since: "2026-11-05T00:00:00.000Z", limit: 1 })
const tieSecond = await page({ source: sourceName, account: "work", cursor: tieFirst.cursor })

async function refusal(input, chosen = account) {
  try {
    await run(runtime, "events_list", input, chosen)
  } catch (error) {
    if (error instanceof Error) return error.message
    throw error
  }
  throw new Error("expected a refusal")
}

const cursorRefusal = await refusal({ source: sourceName, cursor: workPage.cursor }, "personal")
const sourceRefusal = await refusal({ source: "other" })

const probe = await run(runtime, "probe", { source: sourceName }, account)
const suggest = await run(runtime, "list_channels", {}, account)
const status = await run(runtime, "status", {})

const fixture = {
  plugin: packageName,
  accounts: {
    real: true,
    aliases: ["work", "personal"],
    required: { method: "events_list", code: "ACCOUNT_REQUIRED" },
    unknown: { method: "events_list", account: "nobodyhere", code: "ACCOUNT_UNKNOWN" },
    cursors: [{ method: "events_list", account: "work", other: "personal", code: "CURSOR_INVALID" }],
  },
  sources: {
    [source.id]: {
      cases: [
        { name: "a work page", input: { source: sourceName, account: "work", since }, expect: "page", answer: workPage },
        { name: "a personal page", input: { source: sourceName, account: "personal", since }, expect: "page", answer: personalPage },
        { name: "only the confirmed channels", input: { source: sourceName, account: "work", since, scope: { channels: ["C1"] } }, expect: "page", answer: scopedPage },
        { name: "an empty window", input: { source: sourceName, account: "work", since: "2026-11-20T00:00:00.000Z" }, expect: "empty", answer: emptyPage },
        { name: "one event at a time, the first of a tie", input: { source: sourceName, account: "work", since: "2026-11-05T00:00:00.000Z", limit: 1 }, expect: "page", answer: tieFirst },
        { name: "the cursor after the first of a tie lists the second", input: { source: sourceName, account: "work", cursor: tieFirst.cursor }, expect: "page", answer: tieSecond },
        {
          name: "another account's cursor is refused",
          input: { source: sourceName, account: "personal", cursor: workPage.cursor },
          expect: "CURSOR_INVALID",
          refuses: cursorRefusal,
        },
        { name: "an unknown source is refused", input: { source: "other", account: "work" }, expect: "SOURCE_UNKNOWN", refuses: sourceRefusal },
      ],
      probe: { input: { source: sourceName, account }, answer: probe },
      suggest: { input: { source: sourceName, account }, answer: suggest },
    },
  },
  events: { emitted: [], status },
  namespace: manifest.plugin.summary,
}

mkdirSync("fixtures", { recursive: true })
writeFileSync("fixtures/conformance.json", `${JSON.stringify(fixture, null, 2)}\n`)
console.log(`recorded fixtures/conformance.json for ${packageName}`)
