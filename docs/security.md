# Security

## What leaves the machine

The template's provider is a fake: it makes no network call, and every owner, channel and message is invented. A real
plugin replaces `src/provider/client.ts` with the vendor's client; what leaves the machine is then what the vendor's
MCP server needs, and nothing else.

## Credentials

The vendor's MCP server holds the credentials. OpenCode adds one MCP server per alias and keys OAuth per server, so the
plugin never sees a token, a refresh token or a password. The plugin stores no credential and prints none.

## Scopes

The plugin requests no OpenCode scope of its own. The vendor's MCP OAuth scopes are the provider's; `probe` reports the
scopes the sign-in holds, so a person can tell a read-only sign-in from a wider one.

## Untrusted data

Every answer is marked `trust: "untrusted"`. A message's title and text are data: the plugin never follows them, never
puts them in `status`, and never uses them to choose a tool or a recipient. The provider passes every event through the
contract's `screenEvents`, which refuses an item that holds a secret (`refused[]`, reason `secret`) or
instruction-shaped text from someone else (reason `instruction`). A refused item is never delivered. One page is
bounded by the source's `maxBytes` through the contract's `fitPage`, so a provider cannot answer an oversized page.

## Redaction

`status.nextStep` and every account reason go through the contract's `redactReason`: query values, bearer credentials,
JWTs and token-shaped words are replaced, and the line is cut to 160 characters. Status and logs never carry a URL query
string, a token or a credential.

## Confirmation

This template has no write, so it has nothing to confirm. A write added later follows the contract's plan flow: a
planning read previews `output`, `reaches`, `changes`, `cost` and `trust`, then a commit receives the stored plan as
`call.plan` and writes only what the person saw. It also gets an `actions` entry, and either an OpenCode permission ask
or a host-signed action grant verified by the contract's `grant` module. A non-read method over RPC that has neither is
refused with `PERMISSION_DENIED`.

## Reporting

Report a vulnerability through GitHub's private vulnerability reporting on this repository. Do not open a public issue
with a credential, a token or a person's data in it.
