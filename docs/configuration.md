# Configuration

The options and their defaults, generated from `capabilities.options`.

<!-- generated:configuration -->
| Option | Type | Default | Description |
|---|---|---|---|
| `access` | `all` \| `ask-changes` \| `read-only` | `"all"` | How much the plugin's methods may do. |
| `accounts` | object | — | One profile per account alias. |
| `allowUntestedHost` | boolean | `false` | Start outside the tested OpenCode range. |
<!-- /generated:configuration -->

## Configure two accounts

```json
{
  "access": "ask-changes",
  "accounts": {
    "work": { "region": "eu" },
    "personal": { "region": "us" }
  },
  "allowUntestedHost": false
}
```

- `access` is the ceiling. `all` runs every method, `ask-changes` asks before a non-read and `read-only` refuses one.
- `accounts` is one profile per alias. A profile's `region` is a placeholder the fake provider ignores; a real plugin
  declares the fields its vendor needs.
- `allowUntestedHost` starts the plugin outside `>=2.4.1 <2.5.0`. Leave it `false`: the plugin refuses an untested host
  with `HOST_UNTESTED` and a next step.
