# knots-blake2b

Bitcoin Knots carrying the proposed **BLAKE2b proof-of-work change**, packaged for
StartOS 0.4.0.x so an existing Sia-compatible BLAKE2b ASIC can mine it.

**Runs regtest or testnet4**, selected by the `Select Chain` action and stored as
`chain` in `store.json`. Mainnet is neither offered nor possible: this RC refuses
`ChainType::MAIN` at startup (see Upstream), and `entrypoint.sh` refuses it before
bitcoind gets the chance, with a message naming the reason.

| | regtest | testnet4 |
|---|---|---|
| activation height | whatever you set, default 1 | 150027, compiled into `CTestNet4Params` |
| `blake2b_headline` | yours to choose | **fixed at `Catbus`**, set by the package |
| `-testactivationheight` | honoured | **accepted and silently ignored** |
| peer discovery | none, there is nothing to discover | DNS seeds return non-fork nodes |
| data | `/data/regtest` | `/data/testnet4` |

Switching chains is not destructive: bitcoind keeps each chain in its own subdirectory,
so the old chain is still there on switching back. Verified by round-tripping a
56-block regtest chain through testnet4 and finding the same `hashBestChain`.

**The internal ports do not change with the chain.** Both run RPC on 18443 and P2P on
18444, rather than following each chain's defaults. Those ports are this package's
contract with dependents, StartOS gives every package its own bridge address so there
is nothing to collide with, and a dependent should not have to re-read a port because
the operator switched chains.

**`-testactivationheight` is regtest-only and fails silently elsewhere.** It is read by
`CRegTestParams` and nowhere else, so on testnet4 bitcoind logs it as a config arg and
ignores it: `getdeploymentinfo` still reports 150027. `entrypoint.sh` therefore does not
write it on non-regtest chains, rather than writing config that looks effective and is
not.

Maintained by Paul Lamb (<https://github.com/paulscode>). Not affiliated with Start9
or Bitcoin Knots.

## Install

Add this registry to StartOS and install from it:

```
https://start9.paulscode.com
```

That is the quickest route, and it is the one to use unless you have a reason to
build. Installing from the registry gets the signed release; building from source
gets whatever is in the working tree, which is not the same thing.

## How this differs from the official `bitcoind` package

| | official `bitcoind` | this package |
|---|---|---|
| id | `bitcoind` | `knots-blake2b` |
| PoW | SHA256d | BLAKE2b after the activation height |
| header | 80 bytes | 164 bytes (header v2) after activation |
| chain | mainnet and friends | regtest or testnet4, never mainnet |
| RPC / peer ports | 8332 / 8333 / 58334 | 18443 / 18444 / 18445 |

The ids and ports are deliberately disjoint so **both install and run at once**.
Verified: this package runs on a box with `bitcoind` and `datum` already installed.

## Upstream

Built from a **pinned commit**, never a branch: `bitcoinknots/bitcoin` @
`afbe91c299e16519f03902939fdbda8af9bd527d`, which is the tag
`v29.4.1.knots20260508rc3`. Recorded as a SHA because a release candidate's tag can be
moved and a SHA cannot. The BLAKE2b change is
[bitcoinknots/bitcoin#359](https://github.com/bitcoinknots/bitcoin/pull/359).

**The pin lives in exactly one place: the `KNOTS_REF` ARG default in the
[Dockerfile](Dockerfile).** It is deliberately not set as a `buildArg` in
`startos/manifest/index.ts` — it used to be, and the two drifted apart, so every
StartOS build silently fetched an orphaned commit while the Dockerfile said otherwise.
Bump it in the Dockerfile and nowhere else.

Why this tag rather than the `pow_hf_blake2b` development branch: **the testnet4
activation height (150027) is compiled into `CTestNet4Params`, and only the
bitcoinknots release-candidate tags carry it.** Regtest works from either tree, since
there the height comes from `-testactivationheight=blake2b@N`, but a testnet4 node
needs this one.

Two consequences of the RC, both verified by running the image:

- **It refuses to run on mainnet.** `init.cpp:1079` rejects `ChainType::MAIN` with
  "This release candidate only supports test networks" unless
  `-allow_mainnet_test_only` is passed. So this package and the mainnet Knots forks
  are not interchangeable.
- **There is no signed release for this tag.** `bitcoinknots.org` publishes nothing
  past `29.4.knots20260508`, and the RC tags have no GitHub release, so there are no
  artifacts and no detached signature. Building from source trades the signed-release
  trust model for a pinned git commit. That is a real reduction in assurance.

`-DRDTS_CONSENT` is **not** passed and must not be: the option exists in
`luke-jr/bitcoin` but not in this tag.

## The headline is not a setting on testnet4

`validation.cpp:4565` checks, at the activation height and only there, that the
configured `blake2b_headline` appears as a substring of that block's coinbase
`scriptSig`. testnet4's block 150027 carries **`Catbus`** (coinbase
`41140832...1e7a7d`, scriptSig `030b4a0206436174627573...`, which is a 3-byte BIP34
height push of 150027 followed by a 6-byte push of the headline). Any other value and
the node rejects 150027 and every block after it with
`AcceptBlock FAILED (bad-headline, Headline is wrong)`.

So on testnet4 the headline is a property of the chain, not of the operator, and
`headlineFor()` in `utils.ts` supplies it. The store's `blake2bHeadline` applies to
regtest only, where you are making your own chain and any consistent value works.

This was found the hard way: a node with good peers stalled at 150026 for an hour
before the log was read closely enough. **It looks identical to having no fork
peers** from the outside, which is why the health check below distinguishes them.

## The testnet4 peering problem, and the health check for it

The BLAKE2b fork shares testnet4's genesis block, default port and magic bytes. So
testnet4's DNS seeds (`seed.testnet4.bitcoin.sprovoost.nl`, `seed.testnet4.wiz.biz`)
return ordinary testnet4 nodes, this node connects to them happily, and they serve
valid blocks right up to 150027 because both chains share that history. Past it they
have nothing this node will accept.

The failure is therefore **not** following the wrong chain. It is stalling at 150026
with peers connected and nothing visibly wrong. The `Set Peers` action is the fix
(`addnodes` in `store.json`, merged with `testnet4Seeds` in `utils.ts`, which is
deliberately empty until there are addresses worth committing to).

The **`chain` health check** exists to name that state. It reads `getdeploymentinfo`,
whose `blake2b` object carries the activation height and is present on both regtest
(rc3 renamed this key from `hardfork`; the health check reads either)
and testnet4, plus `getblockchaininfo` for the heights:

| condition | result | meaning |
|---|---|---|
| `blocks >= activation` | success | on the fork |
| `blocks == activation - 1` and `headers == blocks`, testnet4, 3 polls | **failure** | no peers on the fork |
| `blocks == activation - 1` and `headers > blocks`, testnet4, 3 polls | **failure** | has the headers, refusing the blocks: wrong headline |
| `headers > blocks` | loading | still downloading |
| otherwise | loading | before activation, working normally |
| `blake2b` and `hardfork` both absent | failure | build has no BLAKE2b schedule for this chain |
| testnet4 and `activation != 150027` | failure | the pin moved a consensus height |

The `headers` count is what separates the two stall causes, and it is exact rather
than a guess: a node with no fork peers never *learns* the fork's headers, so its
header count stops at 150026 alongside its block count. A node with a wrong
headline has all 170,000-odd headers and is refusing to connect the blocks. Both
were observed.

The three-poll delay is because a healthy node passes through `activation - 1`
briefly on its way across the fork, so reporting on the first observation would
false-positive on every successful sync.

**It keys on height, not on `blake2b.active`, and that distinction is load-bearing.**
Measured on a regtest chain with activation at 20: `active` becomes `true` at height
**19**, because it reports whether the *next* block is subject to the rule. A testnet4
node stalled at 150026 therefore has `active: true`, so keying success off it would
report "Following the BLAKE2b chain" for precisely the situation the check exists to
catch. This was caught by running it, not by reading it.

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

## Two p2p listeners

`bind=0.0.0.0:18444` is the ordinary one, shared with anonymous inbound peers.
`whitebind=0.0.0.0:18445` grants `noban` + `download` to whatever arrives on it,
and its binding (`peer-local`) is **not exported as an interface**, so StartOS
keeps it off the LAN and only services on the bridge can reach it. A public peer
keeps arriving on `peer` and cannot reach those permissions.

This exists for dependents that pull whole historical blocks over p2p, which is
what an Electrum server does both to build its index and to answer a history
query. On the plain port such a peer is subject to inbound eviction and, on a
pruned node, to `NODE_NETWORK_LIMITED`: bitcoind serves only the last 288 blocks
to an unprivileged peer and disconnects when asked for anything older. electrs
does not reconnect p2p, it exits, so one disconnect is a restart loop. Measured:
asking for a block 416 deep on the plain port ended the connection.

Verified: an inbound peer on 18444 reports `permissions: []`, and the same peer
on 18445 reports `['noban', 'relay', 'mempool', 'download', 'addr']`.

Both are written explicitly because naming either `bind` or `whitebind` disables
bitcoind's default listener, so omitting `bind` would leave no ordinary p2p port.

Same shape and same host id as the official bitcoind package's `peer-local`,
which is what dependents already expect to resolve.

## Actions

**Select Chain** switches between regtest and testnet4, writing `chain` to
`store.json`. Not destructive; see the chain table at the top. Everything else that
shells out to `bitcoin-cli` reads this and passes the matching flag, so the actions
below follow the selected chain rather than assuming regtest.

**Set Peers** writes `addnodes` to `store.json`, one `host:port` per line, which
`entrypoint.sh` emits as `addnode=` lines. Free text with no validation beyond
trimming: `addnode` accepts hostnames, IPv4, bracketed IPv6 and onion addresses, with
or without a port, and rejecting something bitcoind would have accepted is worse than
passing a bad entry through to a log line. Required on testnet4; see above.

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
| `chain` | `regtest` | `regtest` or `testnet4`; set by the Select Chain action |
| `blake2bHeadline` | `BLAKE2b lab 2026-08-21` | **regtest only**; on testnet4 the chain fixes it at `Catbus` |
| `activationHeight` | **1** | regtest only; ignored on testnet4, where it is 150027 and compiled in |
| `addnodes` | `[]` | `host:port` per entry; set by the Set Peers action, merged with `testnet4Seeds` |
| `prune` / `fastprune` | 1 / true | manual pruning; `fastprune` is written on regtest only |

`activationHeight` defaults to 1 on purpose. A Sia ASIC cannot mine SHA256d, so any
higher value leaves the chain serving work the miner cannot use, with no indication
why: it connects, gets jobs, and produces nothing. At 1 the first template is already
header v2 (`!blake2b`, version `0xa0000000`), so a user can install both packages,
set a payout address, point their miner, and mine. Raising it is only useful for
deliberately testing the SHA256d to BLAKE2b transition, and then the pre-activation
blocks have to be mined with the node's own miner.

**RPC credentials are not stored here.** No `rpcuser`/`rpcpassword` is set, so
bitcoind generates `/data/<chain>/.cookie` and dependents read it through a read-only
mount of this volume. **Note the chain in that path**: a dependent hardcoding
`/data/regtest/.cookie` breaks when the operator selects testnet4. That is how the official Datum package authenticates against the
official Bitcoin package, and it means neither side generates, stores or hands around
an RPC secret. Verified in `1.0.0:4`: "Using random cookie authentication".

`chain` and `addnodes` have actions. The rest are store values with defaults and no UI
yet.

## Status

Builds, installs and **runs** on StartOS 0.4.0.1 (`1.0.0:4` verified: "Using random
cookie authentication", "init message: Done loading", no crashes since start).
Installs and runs alongside the official `bitcoind` and `datum`.

`rpcHostId` and `rpcPort` in `startos/utils.ts` are this package's stable contract for
dependents. The *external* port is assigned at runtime and must not be assumed.

Chain selection is verified on the box, not just compiled: `1.0.0:13` was installed on
StartOS 0.4.0.x, switched regtest to testnet4 and back through the Select Chain action,
and the 56-block regtest chain came back with the same `hashBestChain`. On testnet4 the
generated conf carried the `addnode` lines from Set Peers and omitted
`testactivationheight` and `fastprune`. The `chain` health check reported
`Before the BLAKE2b activation 0/150027` on testnet4 and `Following the BLAKE2b chain
(56)` back on regtest.

Not done: **testnet4 has not been synced through this package**, because that needs a
peer that is on the fork and `testnet4Seeds` is still empty. So the stalled-below-
activation branch of the health check is verified by construction and against captured
node output, not against a live stall. And **it has not been mined against on
StartOS**: the mining path is proven on the host and in plain Docker (docs/X5, docs/X6),
not yet through this package.
