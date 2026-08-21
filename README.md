# knots-blake2b

Bitcoin Knots carrying the proposed **BLAKE2b proof-of-work change**, packaged for
StartOS 0.4.0.x so an existing Sia-compatible BLAKE2b ASIC can mine it.

**Regtest only.** No chain has the BLAKE2b activation height set: `Blake2bHeight`
defaults to `INT_MAX` on mainnet, testnet, signet and regtest alike, and only
regtest can override it (`-testactivationheight=blake2b@N`). There is no network to
join and the coins are worthless by construction.

Maintained by Paul Lamb (<https://github.com/paulscode>). Not affiliated with Start9
or Bitcoin Knots.

## How this differs from the official `bitcoind` package

| | official `bitcoind` | this package |
|---|---|---|
| id | `bitcoind` | `knots-blake2b` |
| PoW | SHA256d | BLAKE2b after the activation height |
| header | 80 bytes | 164 bytes (header v2) after activation |
| chain | mainnet and friends | regtest only |
| RPC / peer ports | 8332 / 8333 | 18443 / 18444 |

The ids and ports are deliberately disjoint so **both install and run at once**.
Verified: this package runs on a box with `bitcoind` and `datum` already installed.

## Upstream

Built from a **pinned commit**, never a branch: `luke-jr/bitcoin` @
`95ecbc35e540b8e3784790d101e6fbeb3aca01a9` (branch `pow_hf_blake2b`, the subject of
[bitcoinknots/bitcoin#359](https://github.com/bitcoinknots/bitcoin/pull/359)). That
branch moves, and a floating build would silently cross consensus revisions between
package versions. Bump `KNOTS_REF` in `startos/manifest/index.ts` to move it.

`-DRDTS_CONSENT=IMPLICIT` is required at configure time; the build fails without an
explicit choice.

## Two hazards this package handles for the user

**An empty headline silently disables a consensus rule.** The node requires
`-blake2b_headline`, and the block at the activation height must carry that byte
string in its coinbase. But the startup guard is `IsArgSet`, so `-blake2b_headline=`
passes while `std::search` with an empty needle always matches, making the rule
unenforceable. `entrypoint.sh` refuses to start on an empty value.

**Volumes are mounted root-owned.** The image runs as the unprivileged `bitcoin`
user, so the node cannot write its own `bitcoin.conf` without help. A `chown` oneshot
in `startos/main.ts` runs before the daemon. Without it the package installs cleanly
and then crash-loops on `/data/bitcoin.conf: Permission denied`, which is how it was
found.

## Diagnosing

- `start-cli package logs knots-blake2b`, bitcoind's own log goes to console.
- Health check is `checkPortListening` on the RPC port. "The node is not accepting
  RPC yet" during startup is normal; persisting past a minute is not.
- The node writes `/data/bitcoin.conf` from the environment on every start. To see
  what it decided, read that file.

## Build

```
make ARCHES=x86            # build the s9pk (install does NOT rebuild it)
make ARCHES=x86 install    # install to the host in .startos/config.yaml
../release.sh knots-blake2b-startos   # stage into builds/<version>/ for the registry
```

`install` has only order-only prerequisites, so it will happily ship a stale
artifact. Always build first. StartOS also treats installing an unchanged version as
a no-op, so bump `startos/versions/current.ts` when testing a change.

## Configuration

Settings live in `store.json` on the main volume, typed by
`startos/fileModels/store.json.ts`:

| Key | Default | Notes |
|---|---|---|
| `blake2bHeadline` | `BLAKE2b lab 2026-08-21` | consensus-critical, must match every node on the chain |
| `activationHeight` | **1** | BLAKE2b from the very first mined block |
| `prune` / `fastprune` | 1 / true | manual pruning; the gateway needs no historical blocks |

`activationHeight` defaults to 1 on purpose. A Sia ASIC cannot mine SHA256d, so any
higher value leaves the chain serving work the miner cannot use, with no indication
why: it connects, gets jobs, and produces nothing. At 1 the first template is already
header v2 (`!blake2b`, version `0xa0000000`), so a user can install both packages,
set a payout address, point their miner, and mine. Raising it is only useful for
deliberately testing the SHA256d to BLAKE2b transition, and then the pre-activation
blocks have to be mined with the node's own miner.

**RPC credentials are not stored here.** No `rpcuser`/`rpcpassword` is set, so
bitcoind generates `/data/regtest/.cookie` and dependents read it through a read-only
mount of this volume. That is how the official Datum package authenticates against the
official Bitcoin package, and it means neither side generates, stores or hands around
an RPC secret. Verified in `1.0.0:4`: "Using random cookie authentication".

There is not yet a UI for editing these; they are store values with defaults.

## Status

Builds, installs and **runs** on StartOS 0.4.0.1 (`1.0.0:4` verified: "Using random
cookie authentication", "init message: Done loading", no crashes since start).
Installs and runs alongside the official `bitcoind` and `datum`.

`rpcHostId` and `rpcPort` in `startos/utils.ts` are this package's stable contract for
dependents. The *external* port is assigned at runtime and must not be assumed.

Not done: no user-facing actions for editing settings, and **it has not been mined
against on StartOS**. The mining path is proven on the host and in plain Docker
(docs/X5, docs/X6), not yet through this package.
