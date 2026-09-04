# Bitcoin Knots (BLAKE2b) Companion

A Bitcoin Knots node built from the **BLAKE2b proof-of-work change**, following the
BLAKE2b chain on mainnet.

Bitcoin's mainnet split on 30 August 2026. The two chains part at block 961632, and
from block 961640 one of them uses BLAKE2b for proof of work instead of SHA256d.
BLAKE2b is the algorithm Sia mines, so ASICs built for Sia can mine this chain. This
service runs a node that follows it and enforces its rules.

**This is a real chain with real block rewards.** Both sides of the split claim to be
Bitcoin. Which one you follow is your decision, and installing this makes it.

It installs alongside the official Bitcoin service and does not touch it. They use
different ports and different data, and neither knows about the other.

## It is pruned by default

This node exists to sit beside a node on the other chain, and two full copies of a
chain this size do not fit on most servers. So it keeps about 5 GB of recent blocks
and discards the rest.

That does not limit what a connected service can ask for. The package runs an RPC
proxy in front of the node, which fetches a dropped block from peers and checks it
against this node before answering. A service pointed at this one sees a node that
behaves as though it kept everything.

Change it under **Select Storage** if you would rather keep the whole chain.

## What to do with it

On its own, this node does very little. It becomes useful when you also install
**Datum Gateway (BLAKE2b) Companion**, which turns its block templates into work your
ASIC can mine, or an Electrum server or explorer that can read this chain.

## Getting a payout address

The gateway asks you for an address to pay block rewards to. To get one:

1. Make sure this service is **running**.
2. Go to **Actions** and run **Get Payout Address**.
3. Copy the address. It starts with `bc1`.

You can run it again whenever you want a fresh address. The first run creates a
wallet on this node; later runs just add addresses to it.

**Back that wallet up.** A block you mine pays its whole subsidy to a key this node
holds and nothing else does. It is included in this service's StartOS backups, so
having backups switched on is enough, but it is worth checking rather than assuming.

## Seeing what you have mined

Go to **Actions** and run **Show Wallet Balance**.

It shows what is spendable now, what is not spendable yet, and how far the node has
synced.

**A new miner's balance is almost all in "not spendable yet", and that is normal.**
Freshly mined coins need another 100 blocks before they can be spent. If you have
just found your first block, "spendable now" will be `0.00000000` for about a day.
That is not a sign anything is wrong.

## What "working" looks like

Two health checks tell you where you stand.

**RPC** says the node is answering. **Chain** says which chain it is actually on, and
that is the one to read:

| It says | It means |
|---|---|
| Following the BLAKE2b chain | You are past the activation height, on the fork. This is the goal. |
| Syncing | Downloading blocks it already knows about. Wait. |
| Before the BLAKE2b activation | Working normally, not yet at block 961640. |
| Stalled just below the BLAKE2b activation height | No peers on the fork. See below. |

### If it stalls just below activation

This is the one failure worth explaining, because nothing else about the node looks
wrong when it happens.

Both chains share the same message prefix and the same port 8333, so your node can
connect to peers on the other one and get along with them perfectly. They will serve
it everything up to block 961639, because both chains share that history. After it,
they have nothing your node will accept. The result is a node that is fully
connected, reports plenty of peers, and never advances.

Normally this does not arise. The node asks the DNS seeds specifically for peers
advertising the fork, and two of mainnet's seeds answer that request with fork nodes.
If your network blocks DNS, or you want to pin a peer you know is good, use the **Set
Peers** action: one address per line as `host:port`. Whatever you add is dialled in
addition to whatever the seeds provide, not instead of it.

## Only one chain

Earlier versions of this service could also run a private chain of your own, and
before that the BLAKE2b test network. Both existed to prove the fork worked before it
had a public chain to run on. It has had one since August 2026, so they are gone, and
**Select Chain** with them.

If you were running the private chain, its data is still on the volume and still in
your backups. There is no longer a way to select it from this service.
