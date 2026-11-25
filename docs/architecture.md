# Architecture

## Layers

| Layer | Files | Does |
|---|---|---|
| Entry | `src/index.ts` | `Plugin.define({ id, setup })`, `assertHost`, the skills, the account wiring and one `register` call |
| Accounts | `src/accounts.ts` | one vendor MCP server per alias, through the contract's `accounts` module |
| Manifest | `src/manifest.ts` | reads `package.json` `capabilities`, checks it with the contract's validator and reads the source's `maxBytes` |
| Skills | `src/skills.ts` | reads every `skills/<name>/SKILL.md`, checks its frontmatter and registers it with `ctx.skill.transform` |
| Handlers | `src/handlers/` | one handler per method: the input, the answer schema, the description and the work |
| Provider | `src/provider/client.ts` | the fake MCP vendor: owners, channels, messages, pages, cursors and probes |

The entry is deliberately thin. `assertHost` refuses a host outside the manifest's range before anything registers.
`register` from the contract wires doors 1–3: one agent tool per method in the `example` namespace, the same tools in
Code Mode, one RPC registration under `example`, the permission assertions on `<alias>:<operation>`, and the access rules
inserted into every agent. This repository never calls `ctx.tool`, `ctx.rpc` or `ctx.permission` itself.

## The call path

1. OpenCode loads `dist/index.js` through the package's `./server` export and calls `setup(ctx)`.
2. `assertHost` refuses an OpenCode release outside `>=2.4.1 <2.5.0`, unless `allowUntestedHost` is set.
3. The account wiring in `src/accounts.ts` adds one MCP server per alias through `ctx.mcp.transform`, named `example` or
   `example-<alias>`.
4. `register` checks the handler table against `capabilities.methods`, resolves the accounts from the options,
   generates the access rules into every agent, and registers the tools and the single RPC id.
5. `src/skills.ts` registers each `skills/<name>/SKILL.md` through `ctx.skill.transform`, because OpenCode does not
   discover a plugin's `skills/` directory on its own.
6. A call resolves the account, validates the input against the handler's schema, asserts the method's operations,
   runs the handler against the provider, checks the answer and maps a failure to the contract's error table.

## The provider

`src/provider/client.ts` is the only file that names the vendor. It holds a fixed owner, channel list and message list
per alias, and it builds every answer with the contract's own modules:

- `makeEvent` normalises an event and computes its hash;
- `encodeBoundCursor` / `decodeBoundCursor` bind a cursor to the plugin, source, account and scope;
- `screenEvents` refuses an item that holds a secret or instruction-shaped text;
- `fitPage` bounds a page by the call's `limit` and the source's `maxBytes`;
- `eventsListResult` and `probeResult` build the page and the probe answer.

A real plugin replaces this file with a client for the vendor's MCP server. It keeps the handler contract: an
`events_list` page, a `probe` answer with an owner, and the channels a person may confirm.

## OpenCode APIs

| API | Who calls it |
|---|---|
| `Plugin.define` | `src/index.ts` |
| `ctx.app.version`, `ctx.options` | `assertHost` in `src/index.ts` |
| `ctx.mcp.transform` | `src/accounts.ts` |
| `ctx.skill.transform` | `src/skills.ts` |
| `ctx.agent.transform` | `register`'s access rules |
| `ctx.agent.list` | `register`, and `call.unguardedAgents()` for status |
| `ctx.tool.transform`, `ctx.rpc.register`, `ctx.permission.assert` | `register` only |

## State and caching

The plugin keeps no content cache and no credential. The consumer owns the cursor and stores it; the plugin binds the
cursor to the account and scope and refuses one that another account presents. `status` reads the host and the accounts
on demand and never calls the provider for content. Nothing is assigned after `register` returns: `status` takes the
agents from `call.unguardedAgents()`.

## Build

`npm run bundle` runs `scripts/build.mjs`, which bundles `src/index.ts` into `dist/index.js` with esbuild. `@opencode/*`
stays external, because OpenCode provides it; the contract modules are bundled, so an install needs no build.

`dist/` is committed, because a tag must install with no build. npm prepares a git dependency that declares a `build`,
`prepare`, `prepack`, `preinstall`, `install` or `postinstall` script by running `npm install` inside the repository, and
OpenCode 2.4.1's bundled npm fails at that with `git dep preparation failed`. The template declares none of those
scripts and ships the bundle. CI runs `npm run bundle && git diff --exit-code dist/`, so the committed file is exactly
what the sources produce; never edit it by hand.
