import assert from "node:assert/strict"
import { readdirSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { OpenCode } from "@opencode/sdk"
import type { Plugin } from "@opencode/plugin"
import { load, resolve } from "@opencode/plugin/host"
import { waitForActivation } from "@we-the-rebel-alliance/plugin-contract/kit"

const root = fileURLToPath(new URL("../..", import.meta.url))

/** The real host's domains this test reads, as `@opencode/plugin` exposes them to a plugin. */
interface Host {
  readonly sessions: {
    create(input: Record<string, unknown>): Promise<{ readonly id: string }>
    prompt(input: Record<string, unknown>): Promise<unknown>
  }
  readonly skill: {
    list(input: Record<string, unknown>): Promise<{
      readonly data: readonly { readonly id: string; readonly name: string; readonly description?: string; readonly path: string; readonly content: string }[]
    }>
  }
  close(): Promise<void>
}

test("the real OpenCode 2.4.1 host registers every skills/<name>/SKILL.md after load", async () => {
  const entry = resolve({ directory: root }).server
  assert.ok(entry !== undefined, "the package has no server entry")
  const module = (await load(entry)) as { readonly default?: Plugin.Plugin }
  const definition = module.default
  assert.ok(definition !== undefined, "the server entry exports no Plugin.define value")

  const ids = readdirSync(join(root, "skills"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
  assert.ok(ids.length > 0, "the package ships no skill")

  const host = (await OpenCode.create({
    plugins: [definition],
    config: { directory: root },
    app: { name: "opencode", version: "2.4.1" },
    log: { level: "error", emit: () => undefined },
  })) as unknown as Host

  try {
    const session = await host.sessions.create({ location: { directory: root }, agent: "build", permissions: [] })
    await host.sessions.prompt({ sessionID: session.id, text: "activate the skill registration", delivery: "queue" }).catch(() => undefined)
    await waitForActivation({
      isActive: async () => {
        const answer = await host.skill.list({ location: { directory: root } }).catch(() => undefined)
        return answer !== undefined && ids.every((id) => answer.data.some((skill) => skill.id === id))
      },
      timeoutMs: 20_000,
    })
    const answer = await host.skill.list({ location: { directory: root } })
    for (const id of ids) {
      const skill = answer.data.find((candidate) => candidate.id === id)
      assert.ok(skill !== undefined, `the host did not register the ${id} skill`)
      assert.equal(skill.name, id)
      assert.ok((skill.description ?? "").trim().length > 0, `the ${id} skill has no description`)
      assert.equal(skill.path, join(root, "skills", id, "SKILL.md"))
      assert.ok(skill.content.trim().length > 0, `the ${id} skill has no body`)
    }
  } finally {
    await host.close()
  }
})
