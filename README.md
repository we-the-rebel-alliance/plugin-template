# Example

A minimal, conforming OpenCode plugin on [plugin-contract](https://github.com/we-the-rebel-alliance/plugin-contract) v0.
It is the `mcp` starting point: the vendor's MCP server holds the credentials, one server per account alias, and one
events source reads messages from a deterministic fake provider. Replace the fake provider in `src/provider/` with the
vendor's client, and the rest of the plugin is a connector.

This repository is a template. Copy it, run `scripts/new-plugin.sh <name>`, and replace the placeholders before you
install it.

## Install

This template has no release tag. A copy installs from its own tag once it is released:

```sh
opencode plugin add github:we-the-rebel-alliance/<name>-plugin#v<version>
```

## Sign in

The vendor's MCP server holds the credentials, so OpenCode gets one MCP server per account alias:

| Alias | MCP server |
|---|---|
| `default` | `example` |
| `work` | `example-work` |
| `personal` | `example-personal` |

Sign in to each server through OpenCode's MCP sign-in. Each alias has its own OAuth session. The template's
`src/provider/client.ts` names a fake MCP URL; a real plugin names the vendor's server URL there instead.

Configure the aliases in `opencode.json`:

```json
{ "accounts": { "work": { "region": "eu" }, "personal": { "region": "us" } } }
```

Methods that take an account accept `account: "work"` or `account: "personal"`. With two aliases and no account, a call
is refused with `ACCOUNT_REQUIRED`.

## Access

`access` is `all` (the default), `ask-changes` or `read-only`. A read runs under every level. A write asks under
`ask-changes` and is off under `read-only`; this template has no writes yet, so the three levels behave the same today.

## Capabilities

<!-- generated:capabilities -->
### Methods

| Method | Class | Accounts | Operations |
|---|---|---|---|
| `status` | read | none | — |
| `probe` | read | optional | `example.users.get` |
| `events_list` | read | optional | `example.messages.list`, `example.users.get` |
| `list_channels` | read | optional | `example.channels.list` |

### Sources

| Source | Kind | Reads or output | Method | Cost |
|---|---|---|---|---|
| `example.messages` | events | `message` | `events_list` | free |

### Actions

None.

### Bus events

None.
<!-- /generated:capabilities -->

## Errors

<!-- generated:errors -->
| Code | Meaning |
|---|---|
| `NEEDS_SIGN_IN` | the account is not signed in |
| `SCOPE_MISSING` | the call needs a scope the person has not confirmed |
| `ACCOUNT_REQUIRED` | the plugin serves several accounts and the call names none |
| `ACCOUNT_UNKNOWN` | the call names an alias the plugin does not serve |
| `ACCOUNT_MISMATCH` | the item belongs to another account |
| `CURSOR_INVALID` | the cursor is malformed, or belongs to another source, account or scope |
| `CURSOR_EXPIRED` | the provider no longer keeps the history the cursor names |
| `RATE_LIMITED` | the provider asked the plugin to slow down |
| `BUDGET_EXCEEDED` | the read would cost more than the person allows |
| `SOURCE_DISABLED` | the person turned this source or action off |
| `TOO_LARGE` | the answer is larger than the source's maxBytes |
| `INPUT_INVALID` | the input does not match the method's schema |
| `SOURCE_UNKNOWN` | the plugin declares no such source |
| `SCHEMA_VIOLATION` | an answer does not keep the contract's shape |
| `PERMISSION_DENIED` | the person's grant does not cover the call |
| `PLAN_INVALID` | the plan is missing, or belongs to another method |
| `GRANT_INVALID` | the action grant did not verify, or was already spent |
| `HOST_UNTESTED` | OpenCode is outside the plugin's tested range |
| `OPTIONS_INVALID` | the plugin's options do not match their schema |
| `UNAVAILABLE` | the provider could not be reached |
<!-- /generated:errors -->

## Working on the template

- **The contract pin.** `package.json` pins
  `github:we-the-rebel-alliance/plugin-contract#master` while the contract is unreleased. A released plugin switches
  that pin to the release tag, `github:we-the-rebel-alliance/plugin-contract#v0.0.0`, and moves the pin with the
  contract's release.
- **`dist/` is generated.** `npm run build` writes it, CI builds it before `plugin-kit check`, and it is not committed.
  Never edit `dist/` by hand in a pull request.
- **The layout.** `src/index.ts` is the one entry, `src/accounts.ts` wires the MCP servers, `src/handlers/` holds one file
  per method, `src/provider/` is the only place the vendor's URL is named, `skills/<name>/SKILL.md` is the agent guide,
  and `docs/` is the documentation.
- **Rename it.** `scripts/new-plugin.sh <name>` renames the package, the plugin id, the skill directory, the capability
  ids and the fake hosts. It refuses a second run.

## Docs

- [Capabilities](docs/capabilities.md)
- [Configuration](docs/configuration.md)
- [Accounts](docs/accounts.md)
- [Automations](docs/automations.md)
- [Architecture](docs/architecture.md)
- [Security](docs/security.md)
