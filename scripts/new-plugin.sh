#!/usr/bin/env bash
# Rename this template's placeholders for a new plugin.
#
#   scripts/new-plugin.sh <name>
#
# <name> is the plugin id: 2 to 31 lowercase letters or digits, as contract §3 defines it. The script renames the
# package, the repository, homepage and bugs URLs, the plugin id and title, the capability ids, the skill directory, the
# fake hosts and the lockfile's root name. It also removes the template-only sections and itself, so the copy no longer
# describes itself as a template. A second run fails because the placeholders are already gone.
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

script_path="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"
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

/** Remove a `## <heading>` section up to the next `## ` heading. */
function withoutSection(text, heading) {
  const start = text.indexOf(heading)
  if (start === -1) return text
  const rest = text.slice(start + heading.length)
  const next = rest.search(/^## /m)
  return text.slice(0, start) + (next === -1 ? "" : rest.slice(next))
}

/** The template-only wording a renamed copy must not keep. */
function withoutTemplate(text) {
  let next = text
  // The README's first paragraph tells a reader to copy the template; a copy does not.
  next = next.replace(/^This repository is a template\.[^\n]*(?:\n(?!\n)[^\n]*)*\n\n/m, "")
  while (next.includes("## Working on the template")) next = withoutSection(next, "## Working on the template")
  while (next.includes("## Template")) next = withoutSection(next, "## Template")
  next = next.replace(/Copy it, run `npm ci`,\s*then `scripts\/new-plugin\.sh <name>`, and replace the fake provider with the vendor's client\./g, "Replace the fake provider with the vendor's client.")
  next = next.replace(/; after `scripts\/new-plugin\.sh`, it runs for you when\s+the dependencies are installed\./g, ".")
  next = next.replace(/^scripts\/new-plugin\.sh .*\n/m, "")
  next = next.replace(/This template has no release tag\. A copy installs from its own tag once it is released:/g, "This plugin installs from its own release tag:")
  // A line wrap between the article and "template" must not hide the phrase from the replacements below.
  next = next.replace(/\b(The|the|This|this)[ \t]*\n[ \t]*(template)/g, "$1 $2")
  next = next.replace(/\bThe template's\b/g, "The plugin's")
  next = next.replace(/\bthe template's\b/g, "the plugin's")
  next = next.replace(/\bThis template\b/g, "This plugin")
  next = next.replace(/\bthis template\b/g, "this plugin")
  next = next.replace(/\bThe template:/g, "The plugin:")
  next = next.replace(/\bThe template\b/g, "The plugin")
  next = next.replace(/\bthe template\b/g, "the plugin")
  next = next.replace(/\n{3,}/g, "\n\n")
  return next
}

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
const writes = []
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
  next = withoutTemplate(next)
  if (/\btemplate\b/i.test(next)) throw new Error(`${path} still describes the template after the rename`)
  if (next === text) continue
  writes.push([path, next])
  changed += 1
}
// Write only after every file passed, so a failed rename leaves the tree as it was.
for (const [path, next] of writes) writeFileSync(path, next)

// The package's repository, homepage and bugs name the new repository, whether or not the template carried them.
const pkg = JSON.parse(readFileSync("package.json", "utf8"))
pkg.name = packageName
pkg.repository = { type: "git", url: `git+https://github.com/we-the-rebel-alliance/${name}-plugin.git` }
pkg.homepage = `https://github.com/we-the-rebel-alliance/${name}-plugin#readme`
pkg.bugs = { url: `https://github.com/we-the-rebel-alliance/${name}-plugin/issues` }
writeFileSync("package.json", `${JSON.stringify(pkg, null, 2)}\n`)

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
  'we-the-rebel-alliance/example-plugin|tools\.example\.|example\.(status|probe|list_channels|messages|users|channels|events_list)|example-(work|personal)|example-<alias>|"example"|`example`|skills/example|example\.test|files\.example\.com|source of example\.|\bExample\b|template' \
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

rm -f -- "$script_path"

echo "new-plugin: ${package_name}, plugin id ${name}, title ${title}, skill skills/${name}"
echo "new-plugin: removed scripts/new-plugin.sh and the template-only sections."
echo "new-plugin: date CHANGELOG.md's first heading as '## 0.0.0 (YYYY-MM-DD)' when the first release is cut."
echo "new-plugin: replace the copyright holder in LICENSE; adjust .github/CODEOWNERS only for the plugin's own teams."
