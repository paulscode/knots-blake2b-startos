# knots-blake2b

Bitcoin Knots carrying the **BLAKE2b proof-of-work change**, packaged for StartOS
0.4.0.x so an existing Sia-compatible BLAKE2b ASIC can mine it.

**One chain: BLAKE2b on mainnet.** The two mainnet chains part at block 961632, where
BIP110 activated, and the proof of work changes at 961640. Both heights, and the
headline block 961640 commits to, are compiled into `CMainParams` in this build, so
none of them is configurable here.

**Pruned by default**, keeping 5000 MiB of blocks, because this node exists to sit
beside a node on the other chain and two full copies do not fit. `btc-rpc-proxy` runs
in front of it when pruning is on, so a dependent still gets any block it asks for.

**The internal ports are 18443 (RPC), 18444 (P2P) and 18445 (whitebind P2P).** They are
bitcoind's regtest defaults, inherited from when this package ran regtest, and they are
kept because they are this package's contract with dependents. Moving them to mainnet's
8332/8333 would break every dependent and collide with the official `bitcoind` package
on the one server layout this package exists for.

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
| PoW | SHA256d | BLAKE2b from block 961640 |
| header | 80 bytes | 164 bytes (header v2) after activation |
| chain | mainnet and friends | the BLAKE2b chain, mainnet only |
| storage | archival by default | pruned by default, with a fetching proxy |
| RPC / peer ports | 8332 / 8333 / 58334 | 18443 / 18444 / 18445 |

The ids and ports are deliberately disjoint so **both install and run at once**.
Verified: this package runs on a box with `bitcoind` and `datum` already installed.

## Upstream

Built from a **pinned commit**, never a branch: `bitcoinknots/bitcoin` @
`8c85b1585dac23f964e2dd32045624de7f02aa58`, the tag `v29.4.1.knots20260508`. Recorded
as a SHA because a tag can be moved and a SHA cannot. The BLAKE2b change is
[bitcoinknots/bitcoin#359](https://github.com/bitcoinknots/bitcoin/pull/359); the
opt-in signature hash that gives replay protection is
[#357](https://github.com/bitcoinknots/bitcoin/pull/357).

**The pin lives in exactly one place: the `KNOTS_REF` ARG default in the
[Dockerfile](Dockerfile).** It is deliberately not set as a `buildArg` in
`startos/manifest/index.ts`. It used to be, and the two drifted apart, so every StartOS
build silently fetched an orphaned commit while the Dockerfile said otherwise. Bump it
in the Dockerfile and nowhere else. See [UPDATING.md](UPDATING.md).

**There is no signed release for this tag.** `bitcoinknots.org` and the GitHub releases
page both stop at `29.4.knots20260508`, so there are no artifacts and no detached
signature. Building from source trades the signed-release trust model for a pinned git
commit, which is a real reduction in assurance. The tag does carry reproducible-build
attestations in `bitcoinknots/guix.sigs` from four builders, which is not a signature
over anything this image downloads but does mean independent parties rebuilt this
commit and agreed on the output.

`-DRDTS_CONSENT` is **not** passed and must not be: the option exists in
`luke-jr/bitcoin` but not in this tag.

## Only one chain, as of 1.0.0:30

This package used to select between a private regtest chain and mainnet, and before
that testnet4. Those existed to prove the fork worked before it had a public chain to
run on, and carrying them shaped most of the package:

- the RPC cookie lived at `/data/<chain>/.cookie` on a named chain and `/data/.cookie`
  on mainnet, so every dependent had to work out which;
- `bitcoin.conf`'s section was `[main]` on mainnet and the chain's own name otherwise;
- `blake2b_headline` was consensus on regtest and testnet4, chosen by the operator, and
  ignored on mainnet;
- `-testactivationheight=blake2b@N` was honoured on regtest and silently ignored
  everywhere else, so writing it on the wrong chain produced config that looked
  effective and was not;
- testnet4 needed a curated peer list, because its DNS seeds returned non-fork nodes.

All of that is gone. What is left is the shape of the official Knots package plus a
different proof of work. Existing regtest data stays under `/data/regtest`, unreachable
from the UI; the migration in `startos/versions/current.ts` clears the dead store keys
so the file stops claiming a chain the node is not on.

The constants and code for the other chains are in git history if a BLAKE2b test
network ever comes back.

## The peering problem, and the health check for it

Both mainnet chains share magic bytes, port 8333 and every block up to 961631. So this
node connects to peers on the other chain happily, and they serve it valid blocks right
up to 961639. Past that they have nothing it will accept.

The failure is therefore **not** following the wrong chain. It is stalling at 961639
with peers connected and nothing visibly wrong.

Normally it does not arise. bitcoind queries every DNS seed as
`x<SeedsServiceFlags()>.<seed>`, which on this build is `x10000009`
(`NODE_NETWORK | NODE_WITNESS | NODE_BLAKE2B`), and two of mainnet's seeds answer that
prefix with fork nodes. Measured 2026-08-30: all ten addresses they returned were on the
BLAKE2b chain, and a node started with no peers configured found the chain by itself.
The final release also prefers fork-advertising peers for its first outbound slots.

**Do not substitute gossip for that.** One round of `getaddr` returned 7349 candidates
of which a 60-peer sample had none on the fork. The service-bit filter is the only thing
that separates the two chains.

`Set Peers` (`addnodes` in `store.json`) is the fallback for a network that blocks DNS,
or for pinning a known-good peer while diagnosing one that is not finding the fork. No
peer list ships with the package.

The **`chain` health check** names the stall. It reads `getdeploymentinfo`, whose
`blake2b` object carries the activation height (rc3 renamed this key from `hardfork`;
the check reads either), plus `getblockchaininfo` for the heights:

| condition | result | meaning |
|---|---|---|
| `blocks >= activation` | success | on the fork |
| `headers > blocks` | loading | still downloading |
| `blocks == activation - 1`, 3 consecutive polls | **failure** | no peers on the fork |
| otherwise | loading | before activation, working normally |
| `blake2b` and `hardfork` both absent | failure | build has no BLAKE2b schedule |
| `activation != 961640` | failure | the pin moved a consensus height |

This check used to distinguish two stall causes by comparing `headers` to `blocks`: a
node with no fork peers never learns the fork's headers, so both counts stop together,
while a node with a wrong `blake2b_headline` has all the headers and refuses to connect
the blocks. Both were observed on testnet4. The second cause cannot occur here, because
mainnet's headline is compiled in, so the two-way message is gone.

**It keys on height, not on `blake2b.active`, and that distinction is load-bearing.**
Measured on a regtest chain with activation at 20: `active` becomes `true` at height
**19**, because it reports whether the *next* block is subject to the rule. A node
stalled at 961639 therefore has `active: true`, so keying success off it would report
"Following the BLAKE2b chain" for precisely the situation the check exists to catch.
This was caught by running it, not by reading it.

The three-poll delay is because a healthy node passes through `activation - 1` briefly
on its way across the fork, so reporting on the first observation would false-positive
on every successful sync.

## Volumes are mounted root-owned

The image runs as the unprivileged `bitcoin` user, so the node cannot write its own
`bitcoin.conf` without help. A `chown` oneshot in `startos/main.ts` runs before the
daemon. Without it the package installs cleanly and then crash-loops on
`/data/bitcoin.conf: Permission denied`, which is how it was found.

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

## The pruning proxy

When `prune != 0`, `startos/main.ts` starts a second daemon: our build of
`btc-rpc-proxy`, which takes 18443 (the port dependents resolve) and moves bitcoind
behind it on loopback 58443. The proxy answers for blocks this node has dropped by
fetching them from peers and validating them against this node, so a dependent sees a
node that behaves as though it were archival, with no change on its side.

The image is `paulscode/btc-rpc-proxy:v0.8.0-blake2b.1`, carrying
[PR #33](https://github.com/Start9Labs/btc-rpc-proxy/pull/33). Stock v0.8.0 cannot
parse a 164-byte BLAKE2b header, and it parses the block for **any** request it
intercepts, not only one it had to fetch. So every verbose `getblock` and every
intercepted `getrawtransaction` above 961640 returned "IO error: failed to fill whole
buffer" on blocks this node still had. Verbosity 0 was unaffected, which is why
indexing worked and this looked like it only mattered later. Swap back to
`ghcr.io/start9labs/btc-rpc-proxy` once #33 lands upstream.

Unpruned there is nothing to fetch, the proxy does not run, and bitcoind holds 18443
itself. A dependent needs no notion of any of this.

## Actions

**Select Storage** writes `prune` to `store.json`: pruned with a MiB budget, or
archival. It does not offer bitcoind's value `1`, which is *manual* pruning: the node
reports itself pruned, never discards anything, and grows without bound. The schema
still accepts 1 so an install holding it is not rewritten out from under its operator.

**Set Peers** writes `addnodes`, one `host:port` per line, which `entrypoint.sh` emits
as `addnode=` lines. Free text with no validation beyond trimming: `addnode` accepts
hostnames, IPv4, bracketed IPv6 and onion addresses, with or without a port, and
rejecting something bitcoind would have accepted is worse than passing a bad entry
through to a log line.

**Get Payout Address** creates a bech32 address in the node's `mining` wallet, to paste
into the gateway. bech32 explicitly rather than by wallet default, because the consumer
is DATUM: its parser handles bech32 only for the `bc` and `tb` prefixes
(`datum_utils.c`), falling back to libblkmaker for base58. This used to pick legacy on
regtest, where `bcrt1...` matched neither and the gateway refused to start.

**Show Wallet Balance** reports spendable, immature and block height from `getbalances`
and `getblockcount`.

Immature is shown separately on purpose. Coinbase outputs need 100 confirmations
(`COINBASE_MATURITY`), so a node that has just found a block reports a spendable balance
of zero. A single figure would read as "mining is not working" at precisely the moment
it is working.

Both wallet actions used to describe these coins as worthless and confined to this
machine, which was true of the private chain and is not true of this one. Corrected in
1.0.0:30, along with a warning on Get Payout Address about backing the wallet up: a
block mined here pays its whole subsidy to a key only this node holds.

## Diagnosing

- A no-input action still reads its input from stdin. `start-cli package action run
  knots-blake2b show-wallet-balance` fails with "Deserialization Error: EOF while
  parsing a value" unless something is piped in; `echo null |` in front fixes it.
  Not a package fault, and it looks exactly like a broken action.
- `start-cli package logs knots-blake2b`; bitcoind's own log goes to console.
- The node writes `/data/bitcoin.conf` from the environment on every start. To see what
  it decided, read that file.
- Health check is `checkPortListening` on the RPC port. "The node is not accepting RPC
  yet" during startup is normal; persisting past a minute is not.

## Build

```
make ARCHES=x86            # build the s9pk (install does NOT rebuild it)
make ARCHES=x86 install    # install to the host in .startos/config.yaml
../release.sh knots-blake2b-startos   # stage into builds/<version>/ for the registry
```

`install` has only order-only prerequisites, so it will happily ship a stale
artifact. Always build first. StartOS also treats installing an unchanged version as
a no-op, so bump `startos/versions/current.ts` when testing a change.

After changing any `i18n('...')` string, regenerate the dictionary:

```
python3 scripts/gen-i18n-dict.py .
```

## Configuration

Settings live in `store.json` on the main volume, typed by
`startos/fileModels/store.json.ts`:

| Key | Default | Notes |
|---|---|---|
| `prune` | `5000` | MiB of blocks to keep; 0 is archival. Set by Select Storage. |
| `addnodes` | `[]` | `host:port` per entry; set by Set Peers. Normally empty. |

That is the whole schema. `chain`, `blake2bHeadline`, `activationHeight` and
`fastprune` were removed in 1.0.0:30 and are cleared from existing stores by its
migration.

**RPC credentials are not stored here.** No `rpcuser`/`rpcpassword` is set, so bitcoind
generates `/data/.cookie` and dependents read it through a read-only mount of this
volume. That is how the official Datum package authenticates against the official
Bitcoin package, and it means neither side generates, stores or hands around an RPC
secret.

## Status

Builds, installs and runs on StartOS 0.4.0.x, alongside the official `bitcoind` and
`datum` packages. `rpcHostId` and `rpcPort` in `startos/utils.ts` are this package's
stable contract for dependents; the *external* port is assigned at runtime and must not
be assumed.
