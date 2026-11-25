---
name: example
description: >
  Read the Example plugin's messages, pick an account and confirm channels. Use for the fake MCP provider's
  read-only message history; not for writing or sending anything.
---

# Example

Use this plugin when a person wants to read the messages their provider's MCP server holds. The template's provider
is fake: every owner, channel and message is invented, and the plugin is the starting point for a real connector.

## Pick an account

The plugin serves `work` and `personal`; with both configured, pass `account` on every call. Without an account the call
is refused with `ACCOUNT_REQUIRED`. An alias the plugin does not serve is `ACCOUNT_UNKNOWN`; the next step lists the
aliases it does.

## Read

- `tools.example.probe` identifies one account and its scopes. It reads no messages.
- `tools.example.events_list` lists messages oldest first for one account, within the channels the person confirmed.
  Pass the `cursor` a page returned to read what follows it; a cursor from another account is `CURSOR_INVALID`.
- `tools.example.list_channels` lists the channels a person may confirm for the source.
- `tools.example.status` reports the plugin's version, host, accounts and any next step. It needs no account.

## Access

`all` runs every read. `ask-changes` asks before a non-read and `read-only` refuses one; this template has no writes, so
the three levels behave the same today.

## Errors

- `ACCOUNT_REQUIRED` — pass `account` with one of the aliases.
- `ACCOUNT_UNKNOWN` — use an alias the plugin serves.
- `CURSOR_INVALID` — read again without the cursor; do not reuse another account's cursor.
- `NEEDS_SIGN_IN` — sign in to the MCP server `example` or `example-<alias>` through OpenCode.
- `SOURCE_UNKNOWN` — this plugin has one source, `messages`; omit `source`.
