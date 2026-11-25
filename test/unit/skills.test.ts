import assert from "node:assert/strict"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import type { Plugin } from "@opencode/plugin"
import { fileURLToPath } from "node:url"
import { readSkills, registerSkills } from "../../src/skills.ts"

const root = fileURLToPath(new URL("../..", import.meta.url))

/** A temporary `skills/` directory holding one file per entry. */
function fixture(files: Readonly<Record<string, string>>): string {
  const directory = mkdtempSync(join(tmpdir(), "plugin-skills-"))
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(join(directory, name), { recursive: true })
    writeFileSync(join(directory, name, "SKILL.md"), text)
  }
  return directory
}

test("the template's skill is checked, with its frontmatter name, folded description and body", () => {
  const skills = readSkills()
  assert.deepEqual(skills.map((skill) => skill.id), ["example"])
  const skill = skills[0]
  assert.ok(skill !== undefined)
  assert.equal(skill.name, "example")
  assert.match(skill.description, /^Read the Example plugin's messages/)
  assert.match(skill.description, /read-only message history; not for writing/)
  assert.match(skill.content, /^# Example\n/)
  assert.equal(skill.content.includes("---"), false)
  assert.equal(skill.path, join(root, "skills", "example", "SKILL.md"))
})

test("a skill file must have the frontmatter shape the plugin registers", () => {
  const cases: readonly [string, Readonly<Record<string, string>>, RegExp][] = [
    ["no frontmatter", { broken: "# Broken\n" }, /SCHEMA_VIOLATION: skills\/broken\/SKILL.md has no frontmatter\. Next step: /],
    ["no name", { broken: "---\ndescription: A description.\n---\n\n# Body\n" }, /has no frontmatter name/],
    ["another name", { broken: "---\nname: other\ndescription: A description.\n---\n\n# Body\n" }, /names "other", not its directory "broken"/],
    ["no description", { broken: "---\nname: broken\n---\n\n# Body\n" }, /has no frontmatter description/],
    ["empty content", { broken: "---\nname: broken\ndescription: A description.\n---\n\n" }, /has no content below its frontmatter/],
  ]
  for (const [name, files, expected] of cases) {
    const directory = fixture(files)
    try {
      assert.throws(() => readSkills(directory), expected, name)
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  }
  const missing = mkdtempSync(join(tmpdir(), "plugin-skills-"))
  try {
    mkdirSync(join(missing, "empty"), { recursive: true })
    assert.throws(() => readSkills(missing), /skills\/empty\/SKILL.md is missing/)
  } finally {
    rmSync(missing, { recursive: true, force: true })
  }
  const none = mkdtempSync(join(tmpdir(), "plugin-skills-"))
  try {
    assert.throws(() => readSkills(none), /skills\/ holds no <name>\/SKILL\.md/)
  } finally {
    rmSync(none, { recursive: true, force: true })
  }
})

test("registerSkills adds every checked skill and returns a disposer", async () => {
  const added: { id: string; name: string; description?: string; path: string; content: string }[] = []
  let disposed = false
  const context = {
    skill: {
      async transform(callback: (editor: { add: (skill: (typeof added)[number]) => void }) => void) {
        callback({ add: (skill) => added.push(skill) })
        return {
          async dispose() {
            disposed = true
          },
        }
      },
    },
  } as unknown as Plugin.Context
  const registration = await registerSkills(context)
  assert.equal(added.length, 1)
  const skill = added[0]
  assert.ok(skill !== undefined)
  assert.equal(skill.id, "example")
  assert.equal(skill.name, "example")
  assert.match(skill.description ?? "", /^Read the Example plugin's messages/)
  assert.equal(skill.path, join(root, "skills", "example", "SKILL.md"))
  assert.match(skill.content, /^# Example\n/)
  await registration.dispose()
  assert.equal(disposed, true)
})
