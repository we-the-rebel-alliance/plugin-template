#!/usr/bin/env bash
# Rename this template's placeholders for a new plugin.
#
#   scripts/new-plugin.sh <name>
#
# <name> is the plugin id: 2 to 31 lowercase letters or digits, as contract §3 defines it. The script renames the
# package, the repository URL, the plugin id and title, the capability ids, the skill directory, the fake hosts and the
# lockfile's root name. It runs once: a second run fails because the placeholders are already gone.
set -euo pipefail

usage() {
  echo "usage: scripts/new-plugin.sh <name>" >&2
  echo "  <name> is 2 to 31 lowercase letters or digits, such as acme." >&2
}

name="${1:-}"
if [[ -z "$name" ]]; then
  usage
  exit 2
fi
if [[ ! "$name" =~ ^[a-z0-9]{2,31}$ ]]; then
  echo "new-plugin: $name is not a plugin id: use 2 to 31 lowercase letters or digits." >&2
  exit 2
fi
if [[ "$name" == "example" ]]; then
  echo "new-plugin: example is the template's placeholder, not a plugin id." >&2
  exit 2
fi

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

if ! grep -q '"name": "@we-the-rebel-alliance/example-plugin"' package.json; then
  echo "new-plugin: package.json no longer names @we-the-rebel-alliance/example-plugin; this template has already been renamed." >&2
  exit 1
fi
if [[ ! -d skills/example ]]; then
  echo "new-plugin: skills/example is missing; this template has already been renamed." >&2
  exit 1
fi

title="$(printf '%s' "${name:0:1}" | tr '[:lower:]' '[:upper:]')${name:1}"
package_name="@we-the-rebel-alliance/${name}-plugin"

# The script's own replacement table keeps the placeholders so it can find them; the walk and the final check exclude
# this file.
PLUGIN_NAME="$name" PLUGIN_TITLE="$title" node --input-type=module - <<'NODE'
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { extname, join } from "node:path"

const name = process.env.PLUGIN_NAME
const title = process.env.PLUGIN_TITLE
const packageName = `@we-the-rebel-alliance/${name}-plugin`

const replacements = [
  ["we-the-rebel-alliance/example-plugin", `we-the-rebel-alliance/${name}-plugin`],
  ["github:we-the-rebel-alliance/<name>-plugin#v<version>", `github:we-the-rebel-alliance/${name}-plugin#v0.0.0`],
  ["skills/<name>", `skills/${name}`],
  ["mcp.example.test/example", `mcp.${name}.test/${name}`],
  ["example-work", `${name}-work`],
  ["example-personal", `${name}-personal`],
  ["example-<alias>", `${name}-<alias>`],
  ["example.messages", `${name}.messages`],
  ["example.users", `${name}.users`],
  ["example.channels", `${name}.channels`],
  ["example.events_list", `${name}.events_list`],
  ["example.list_channels", `${name}.list_channels`],
  ["example.status", `${name}.status`],
  ["example.probe", `${name}.probe`],
  ["`example.<method>`", `\`${name}.<method>\``],
  ["example.test", `${name}.test`],
  ["files.example.com", `files.${name}.example.com`],
  ['"example"', `"${name}"`],
  ["`example`", `\`${name}\``],
  ["name: example", `name: ${name}`],
  ["source of example.", `source of ${name}.`],
  ["Example", title],
  ["skills/example", `skills/${name}`],
]

const skipDirs = new Set(["node_modules", "dist", ".git", "release"])
const skipFiles = new Set(["package-lock.json", "scripts/new-plugin.sh"])
const skipExtensions = new Set([".png", ".jpg", ".jpeg", ".gif", ".ico", ".webp", ".pdf", ".zip", ".gz", ".tgz", ".woff", ".woff2"])
const files = []
function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!skipDirs.has(entry.name)) walk(join(directory, entry.name))
      continue
    }
    if (!entry.isFile()) continue
    const path = join(directory, entry.name)
    if (skipFiles.has(path) || skipExtensions.has(extname(entry.name).toLowerCase())) continue
    files.push(path)
  }
}
walk(".")

let changed = 0
for (const path of files) {
  let text
  try {
    text = readFileSync(path, "utf8")
  } catch {
    continue
  }
  if (text.includes("\u0000")) continue
  let next = text
  for (const [from, to] of replacements) next = next.split(from).join(to)
  if (next === text) continue
  writeFileSync(path, next)
  changed += 1
}

// The lockfile's root name is the package name; npm ci reads it.
if (existsSync("package-lock.json")) {
  const lock = JSON.parse(readFileSync("package-lock.json", "utf8"))
  lock.name = packageName
  if (lock.packages?.[""] !== undefined) lock.packages[""].name = packageName
  writeFileSync("package-lock.json", `${JSON.stringify(lock, null, 2)}\n`)
}

console.log(`new-plugin: renamed ${changed} file${changed === 1 ? "" : "s"}`)
NODE

mv skills/example "skills/${name}"

if [[ -d node_modules/@we-the-rebel-alliance/plugin-contract ]]; then
  node scripts/record-fixture.mjs
else
  echo "new-plugin: run npm ci && npm run fixtures to rewrite the recorded fixture for ${name}." >&2
fi

# The placeholders a global replacement cannot see, or that must not survive.
# shellcheck disable=SC2016 # the pattern is a regex, and backticks are literal
leftovers="$(grep -RInE \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git --exclude-dir=release \
  --exclude=package-lock.json --exclude=new-plugin.sh \
  'we-the-rebel-alliance/example-plugin|tools\.example\.|example\.(status|probe|list_channels|messages|users|channels|events_list)|example-(work|personal)|example-<alias>|"example"|`example`|skills/example|example\.test|files\.example\.com|source of example\.|\bExample\b' \
  . || true)"
if [[ -n "$leftovers" ]]; then
  echo "new-plugin: these placeholders are left; rename them by hand:" >&2
  echo "$leftovers" >&2
  exit 1
fi

if ! grep -q "\"name\": \"${package_name}\"" package.json; then
  echo "new-plugin: package.json does not name ${package_name}; nothing was renamed." >&2
  exit 1
fi

echo "new-plugin: ${package_name}, plugin id ${name}, title ${title}, skill skills/${name}"
echo "new-plugin: replace the copyright holder in LICENSE and the owner in .github/CODEOWNERS."
