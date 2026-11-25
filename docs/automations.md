# Automations

An events source is read on a timer with a cursor in the automation's state. The manifest's `cadence.suggestMinutes` is
the suggested interval; the provider's own floor, when it states one, is the minimum.

<!-- generated:automations -->
| Source | Method | Provider floor | Suggested | Signals |
|---|---|---|---|---|
| `example.messages` | `tools.example.events_list` | — | 1 min | — |
<!-- /generated:automations -->

## The recipe

1. Read `tools.example.events_list` with the account and the cursor saved by the previous run.
2. Apply the page's events, then save the `cursor` it answers in the automation's state.
3. If `failed` is not empty, keep the old cursor: a failed event holds the read back.
4. Read again on the suggested cadence. `more: true` means another page is ready now, not that the source is done.

```ts
// The automation's state holds one cursor per account and source.
const page = await tools.example.events_list({
  source: "messages",
  account: "work",
  cursor: state.cursor,
})
state.cursor = page.cursor
```

A cursor is bound to its plugin, source, account and scope. Do not share one between accounts: the plugin refuses it
with `CURSOR_INVALID`.
