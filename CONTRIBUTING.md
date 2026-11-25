# Contributing

This repository is an OpenCode plugin on [plugin-contract](https://github.com/we-the-rebel-alliance/plugin-contract) v0.
The contract is [docs/contract.md](https://github.com/we-the-rebel-alliance/plugin-contract/blob/master/docs/contract.md),
the bar for every plugin repository is
[docs/plugin-standard.md](https://github.com/we-the-rebel-alliance/plugin-contract/blob/master/docs/plugin-standard.md),
and [AGENTS.md](AGENTS.md) is the working guide.

## Set up and check

You need Node 24.

```sh
npm ci --ignore-scripts
npm run check
```

`npm run check` runs the whole gate:

| Step | What it proves |
|---|---|
| `npm run lint` | `@biomejs/biome` finds no lint problem |
| `npm run typecheck` | the sources and tests typecheck under strict settings |
| `npm run bundle` | `dist/index.js` is bundled from `src/index.ts` with esbuild |
| `npm test` | the unit tests, the recorded fixture and the `assertHost` gate |
| `npm run pack` | the tarball holds `package.json`, `dist/index.js`, the skill, the assets, `README.md` and `LICENSE` |
| `plugin-kit check` | conformance T0 and T1, the doc file set, the forbidden patterns and no bundled kit |
| `plugin-kit docs --check` | every generated doc section matches the manifest |

CI runs the same steps in one job named `ci`. A second job, `install`, installs the pushed commit with OpenCode's own
installer in an isolated HOME and proves the installed package carries `dist/index.js`.

## The committed bundle

`dist/index.js` is committed. The contract's rule is that a tag installs with no build, and that is also what npm
requires of a git dependency: npm prepares a repository that declares a `build`, `prepare`, `prepack`, `preinstall`,
`install` or `postinstall` script by running `npm install` inside it, and OpenCode 2.4.1's bundled npm cannot do that,
so the install fails with `git dep preparation failed`. The template therefore has no such script, ships the bundle in
`dist/`, and CI runs `npm run bundle && git diff --exit-code dist/` so the committed file is exactly the one the sources
produce. Run `npm run bundle` after changing `src/`, commit the result with the change, and never edit `dist/` by hand.

## The contract pin

`package.json` pins the contract to `github:we-the-rebel-alliance/plugin-contract#v0.0.0`. Move the pin to the
contract's next release tag; never follow a branch. Never copy a contract module into this repository.

The committed `package-lock.json` records the contract's repository over `git+https`, so a fresh `npm ci` needs no SSH
key. Keep it that way; CI also rewrites an `ssh://git@github.com/` URL to HTTPS for an older lockfile.

## Pull requests

One change per pull request, based on `master`, with a conventional commit (`feat:`, `fix:`, `docs:`, `chore:`). The
pull request says what changed and why, the contract section it implements, and the exact `npm run check` result.

A new method, source or action starts in `package.json` `capabilities`, then its handler in `src/handlers/`, then its
tests, then `npx plugin-kit docs`, then `npx plugin-kit check`. Every capability has tests, including its negative cases.

## Fixtures

`fixtures/conformance.json` is the plugin's evidence to the conformance kit. This template records the fake provider, and
`test/conformance/fixture.test.ts` replays every recorded answer through the handlers so the fixture cannot drift.
Rebuild it with `npm run fixtures` after changing the fake provider; after `scripts/new-plugin.sh`, it runs for you when
the dependencies are installed. Once a real provider replaces the fake one, delete `scripts/record-fixture.mjs` and
record from two real accounts:

```sh
npx plugin-kit record --account work
npx plugin-kit record --account personal
```

`npx plugin-kit record` redacts credentials, emails, phone numbers and home directories before it writes.

## Releases

Releases are tags, not npm packages. A release is prepared in one pull request,
`chore(release): prepare vX.Y.Z`: the version in `package.json` and `package-lock.json`, the `CHANGELOG.md` section, and
`npx plugin-kit docs` if the manifest changed. The released heading is `## X.Y.Z (YYYY-MM-DD)`; the template's first
release heading becomes `## 0.0.0 (YYYY-MM-DD)` with the real date, for example `## 0.0.0 (2026-11-25)`. The template
keeps `## 0.0.0 (unreleased)` until its first release is dated. The owner pushes
the tag after `master`'s CI passed; the release workflow checks the tag, packs the committed bundle, and creates the
GitHub release with the tarball, the conformance report and `SHA256SUMS`.

## Template

This repository is also the template. `scripts/new-plugin.sh <name>` renames the package, the plugin id, the skill
directory, the capability ids and the fake hosts, rewrites the repository, homepage and bugs URLs, removes the
template-only sections and the script itself, and refuses a second run. Replace the copyright holder in `LICENSE`, and
adjust `.github/CODEOWNERS` only if the plugin has its own maintainer teams.
