# Accounts

Several aliases at once, each signed in separately.

<!-- generated:accounts -->
Accounts are held by the **mcp** mechanism: the vendor's MCP server holds them.

| Field | Type | Required |
|---|---|---|
| `region` | string | no |
<!-- /generated:accounts -->

## Sign in

The mechanism is `mcp`: the vendor's MCP server holds the credentials. OpenCode adds one server per alias, named
`example` for `default` and `example-work` / `example-personal` for the other aliases. Each server has its own OAuth, so
two aliases are two independent sessions. Sign in through OpenCode's MCP sign-in, once per alias.

## Picking an account

Pass `account: "<alias>"` on a method that takes one. With two aliases and no account, the call is refused with
`ACCOUNT_REQUIRED`, whose next step lists the aliases. An alias the plugin does not serve is `ACCOUNT_UNKNOWN`.

Cursors are bound to the account. A cursor issued for `work` and passed with `personal` is `CURSOR_INVALID`, never a
silent restart.

## Status

`status` lists every alias in the order the options name them, with `ready`, `needs_sign_in` or `error`. A failure's
reason is one line of at most 160 characters, with query values, bearer credentials and token-shaped words replaced.
