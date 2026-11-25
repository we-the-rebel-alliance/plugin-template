# Capabilities

Every method, source, action and bus event the manifest declares.

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

## Notes

- **`status`** reads no account. It reports the plugin's version, the OpenCode host, one entry per alias and any next
  step. It carries no content and no credential.
- **`probe`** reads one account's owner and the provider sign-in's scopes. It reads no messages.
- **`events_list`** reads the `messages` source for one account, oldest first, within the confirmed channels. A cursor is
  bound to the plugin, source, account and scope; another account's cursor is `CURSOR_INVALID`.
- **`list_channels`** is the bind-time read behind the source's scope. It lists at most 64 channels, each `{ id, label }`.
- **The source** is `example.messages`: an events feed of `message` items, private, free, 64 KB per answer. Its URLs are
  on `files.example.com`.
- **No actions and no bus events.** This template writes nothing and receives no push, so it has nothing to confirm and
  no `changed` nudge to send. Add both together when you add a write.
- **The provider is a fake.** Every owner, channel and message is invented and deterministic; see
  [architecture](architecture.md).
