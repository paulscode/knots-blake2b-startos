# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

**Start every task at the recipe index** — `../start-technologies/projects/start-sdk/docs/src/recipes.md`
(or <https://docs.start9.com/packaging/recipes.html>). It maps an intent ("prompt the user to create
admin credentials", "expose a web UI") to the constructs, the reference pages, and a named production
package to copy. Find the recipe before you read this package's neighbours: a package you reach by
grepping may be non-conformant, and the recipe outranks it.

Freshly scaffolded? Work the
[New Package Checklist](../start-technologies/projects/start-sdk/docs/src/new-package-checklist.md)
(or <https://docs.start9.com/packaging/new-package-checklist.html>) from top to bottom. It is a
guide page, not a file in this repo — read it, don't copy it in.

Keep `README.md` (technical reference for an AI support or administering agent) and
`instructions.md` (end-user docs) in sync with your changes.

**Bugs and feature requests are GitHub issues on this repo** — file them as you find them.
Don't record work in the repo instead: no `TODO.md`, no `NOTES.md`, no `PLAN.md`. What you
verified, tried, and decided belongs in the commit message and the PR body.

## This repo

- **The daemon id is `node` and the chain check is `chain`. Both are a public API.** Three dependents name them (`datum-blake2b`, `electrs-pruned`, `mempool-pruned`), and StartOS treats a required health check id that does not exist exactly like a failing one, so a rename shows every dependent "Required health check not passing" forever with no name to display. Renaming `node` to `bitcoind` to match the official lineage has already been tried once and broke all three. The *image* id is `bitcoind`; the daemon is not.
- **`chain` asks which chain the node is on, not how far along it is.** That is the useful question for this package, because the fork shares magic bytes, port and genesis with the ordinary chain, so a node can sync perfectly while following the wrong one. It keys on height rather than on a `hardfork.active` flag, with `STALL_OBSERVATIONS = 3` before it calls a stall.
- **The upstream pin is a commit, and it lives in exactly one place: `KNOTS_REF` in `Dockerfile`.** There is no BLAKE2b release to track, so no signer quorum and no tarball. It used to be set in `startos/manifest/index.ts` as well, the two drifted, and every StartOS build fetched a commit the Dockerfile had already moved off. Do not reintroduce it there. The commit is baked in at `/etc/knots-pinned-commit` and printed on every start.
- **`-datadir` is not optional here.** The official image runs as root, where `/root/.bitcoin` is bitcoind's own default; this one runs unprivileged with home `/data`. Omitting `-datadir=${rootDir}` makes bitcoind use `/data/.bitcoin`, skip the generated config, and quietly begin syncing a second copy of the chain. That has happened, and it was found only by installing on hardware.
- **`startos/i2pdLogFilter.ts` and its test are shared verbatim with the Knots repos.** Edit all three trees together, and read `UPDATING.md`'s i2pd section before bumping that image: the drop list is keyed to the pinned image's exact message wording, and a reworded family fails open into a log flood rather than loudly.