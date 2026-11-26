// The one esbuild configuration for `npm run bundle` and the NOTICE test. They must see the same bundle: if a plugin
// changes an external or the entry point here, the test checks the bundle the release actually ships.
import { join } from "node:path"

/**
 * The bundle's esbuild options. `root` and `pkg` come from the caller; `overrides` are for the test
 * (`write: false`, `metafile: true`) and never change what is bundled.
 */
export function bundleOptions({ root, pkg, ...overrides }) {
  return {
    entryPoints: [{ in: join(root, "src", "index.ts"), out: "index" }],
    outdir: join(root, "dist"),
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node24",
    external: ["@opencode/*"],
    legalComments: "none",
    logLevel: "warning",
    // The YAML parser is CommonJS and reads `process` with require(); the bundle is ESM, so give it a real require.
    banner: { js: `import { createRequire } from "node:module";\nconst require = createRequire(import.meta.url);\n// ${pkg.name} ${pkg.version}. Built by scripts/build.mjs; do not edit.` },
    ...overrides,
  }
}
