# Changelog

## 0.0.0 (unreleased)

- The template: `Plugin.define`, `assertHost`, one `register` call, the `mcp` account mechanism with `work` and
  `personal`, a fake provider, one events source, `status` through `statusAnswer`, `probe`, generated docs and the
  conformance fixture.
- The shared `STATUS_SCHEMA`, `PAGE_SCHEMA`, `PROBE_SCHEMA`, `LIST_OPTIONS_SCHEMA` and `EVENTS_LIST_INPUT_SCHEMA`, and
  a page bounded by the source's `maxBytes`.
- Skills: `src/skills.ts` reads `skills/<name>/SKILL.md` and registers each one through `ctx.skill.transform`, so every
  plugin copied from this repository ships skills OpenCode actually loads.
- Skills: the YAML frontmatter is parsed with `yaml`, so `description: >` and `description: |` register the folded or
  literal text instead of the marker; an empty description or a bare `>`/`|` is refused with a schema error.
- The fake provider orders its feed by `(occurred_at, external_id)` and keeps that pair in its cursor, so two messages
  at the same time are paged without a skip or a repeat.
- Tests under `test/unit/`, `test/conformance/` and `test/host/`, a biome lint gate and a pack check.
