# knots-blake2b

Bitcoin Knots carrying the proposed **BLAKE2b proof-of-work change**, packaged for
StartOS 0.4.0.x so an existing Sia-compatible BLAKE2b ASIC can mine it.

**This package runs regtest only.** The binary it ships can do more: since the repin to
`v29.4.1.knots20260508rc2`, **testnet4 carries a compiled-in BLAKE2b activation at
height 149537** and that chain is live. But this package has no chain selection yet.
`entrypoint.sh` takes a `CHAIN` variable and defaults it to `regtest`, while the ports
in the generated `[${CHAIN}]` section are still hardcoded to regtest's 18443/18444, so
pointing it at testnet4 today would produce a node on the wrong ports. Chain selection,
per-chain ports and peer bootstrapping are the next piece of work.

On regtest the activation height is set with `-testactivationheight=blake2b@N`, which
is the only chain that can override it. `Blake2bHeight` still defaults to `INT_MAX`
everywhere else, so mainnet and signet remain unscheduled — and in this RC mainnet is
refused outright, see Upstream below.

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

Built from a **pinned commit**, never a branch: `bitcoinknots/bitcoin` @
`c25ad6bcd18fa65cd78f176a52be062411507741`, which is the tag
`v29.4.1.knots20260508rc2`. Recorded as a SHA because a release candidate's tag can be
moved and a SHA cannot. The BLAKE2b change is
[bitcoinknots/bitcoin#359](https://github.com/bitcoinknots/bitcoin/pull/359).

**The pin lives in exactly one place: the `KNOTS_REF` ARG default in the
[Dockerfile](Dockerfile).** It is deliberately not set as a `buildArg` in
`startos/manifest/index.ts` — it used to be, and the two drifted apart, so every
StartOS build silently fetched an orphaned commit while the Dockerfile said otherwise.
Bump it in the Dockerfile and nowhere else.

Why this tag rather than the `pow_hf_blake2b` development branch: **the testnet4
activation height (149537) is compiled into `CTestNet4Params`, and only the
bitcoinknots release-candidate tags carry it.** Regtest works from either tree, since
there the height comes from `-testactivationheight=blake2b@N`, but a testnet4 node
needs this one.

Two consequences of the RC, both verified by running the image:

- **It refuses to run on mainnet.** `init.cpp:1077` rejects `ChainType::MAIN` with
  "This release candidate only supports test networks" unless
  `-allow_mainnet_test_only` is passed. So this package and the mainnet Knots forks
  are not interchangeable.
- **There is no signed release for this tag.** `bitcoinknots.org` publishes nothing
  past `29.4.knots20260508`, and the RC tags have no GitHub release, so there are no
  artifacts and no detached signature. Building from source trades the signed-release
  trust model for a pinned git commit. That is a real reduction in assurance.

`-DRDTS_CONSENT` is **not** passed and must not be: the option exists in
`luke-jr/bitcoin` but not in this tag.

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

## Actions

**Get Payout Address** creates a legacy address in the node's `mining` wallet, to
paste into the gateway. Legacy explicitly, because DATUM's parser only understands
the `bc` and `tb` bech32 prefixes and a `bcrt1...` address fails downstream.

**Show Wallet Balance** reports spendable, immature and block height from
`getbalances` and `getblockcount`.

Immature is shown separately on purpose. Coinbase outputs need 100 confirmations
(`COINBASE_MATURITY`), so a node that has just mined 56 blocks reports a spendable
balance of zero and 2800 immature. A single figure would read as "mining is not
working" at precisely the moment it is working. Measured on the test box, which
had mined exactly that.

The result carries a plain statement that these coins exist only on this machine's
chain. That is not decoration: the action exists because a user asked whether
regtest coins can be sent to other testers, the way a testnet4 balance can be. They
cannot, and a balance screen that does not say so invites the opposite conclusion.
Regtest clears `vFixedSeeds` and sets `vSeeds` to `dummySeed.invalid.`, so nodes
never find each other; two installs that have both mined cannot merge without one
side's blocks being reorged away; `fPowNoRetargeting` is true so difficulty never
rises; and `nSubsidyHalvingInterval` is 150, so the subsidy reaches zero by about
block 4,950.

## Diagnosing

- A no-input action still reads its input from stdin. `start-cli package action run
  knots-blake2b show-wallet-balance` fails with "Deserialization Error: EOF while
  parsing a value" unless something is piped in; `echo null |` in front fixes it.
  Not a package fault, and it looks exactly like a broken action.

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
