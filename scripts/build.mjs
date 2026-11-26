// Builds dist/index.js: the one server entry package.json exports, as one self-contained ES module.
//
//   npm run bundle
//
// @opencode/* stays external, because OpenCode provides it at run time. The contract modules are bundled, so a tag
// installs and runs with no build and no runtime dependency. dist/ is committed, because a tag must install with no
// build; run `npm run bundle` after a source change, and never edit dist/ by hand.
import { readFileSync, rmSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { build } from "esbuild"
import { bundleOptions } from "./bundle-options.mjs"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const dist = join(root, "dist")
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"))

rmSync(dist, { recursive: true, force: true })
await build(bundleOptions({ root, pkg }))

console.log(`built ${pkg.name} ${pkg.version} into dist/index.js`)
