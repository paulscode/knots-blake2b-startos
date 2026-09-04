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
and discards the rest. Change it under **Actions → Other**.

That does not limit what a connected service can ask for. The package runs an RPC
proxy in front of the node, which fetches a dropped block from peers and checks it
against this node before answering. A service pointed at this one sees a node that
behaves as though it kept everything.

## What "working" looks like

Three health checks tell you where you stand.

**RPC** says the node is answering. **Blockchain Sync** is the percentage. **Chain**
says which chain it is actually on, and that is the one to read:

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
If your network blocks DNS, or you want to pin a peer you know is good, add one under
**Actions → Peers**.

## Settings

The settings are the ones the official Bitcoin Knots service has, in the same groups:
**Peers**, **RPC Settings**, **Mempool** and **Other**. Pruning, connection limits,
policy settings, ZMQ, Tor and I2P are all there.

**Auto Config** sets several of them at once for a chosen profile, which is the
quickest way to get sensible values without reading every field.

## Wallet

This node can hold and spend coins on the BLAKE2b chain: **Get Address**, **Get
Balance**, **Send Coins**, **Send All Coins**, **Sign Message**, and **Select
Wallet** to point those at a particular wallet.

**Back the wallet up before you rely on it.** Use **Backup Wallet**, and keep
StartOS backups switched on. A block you mine pays its whole subsidy to a key this
node holds and nothing else does.

**Freshly mined coins need 100 more blocks before they can be spent.** If you have
just found your first block, Get Balance shows it as immature for about a day. That
is normal, not a fault.

For anything beyond occasional use, a wallet like Sparrow (BLAKE2b) pointed at this
node is a better place to keep keys than the node itself.

## Mining

Install **Datum Gateway (BLAKE2b) Companion**, run **Get Address** here, and paste
that address into the gateway's **Set Payout Address**.

## Connecting other services

**Generate RPC User** creates credentials for a remote wallet such as Sparrow. Apps
installed on this server do not need them: they authenticate with the cookie the node
writes, through a read-only mount of its volume.

The RPC and peer ports are 18443, 18444 and 18445, not mainnet's 8332 and 8333. That
is deliberate, so this can run beside the official Bitcoin service, and it is why a
dependent should read the address off the Interfaces tab rather than assuming.

## Only one chain

Earlier versions could also run a private chain of your own, and before that the
BLAKE2b test network. Both existed to prove the fork worked before it had a public
chain to run on. It has had one since August 2026, so they are gone.

If you were running the private chain, its data is still on the volume and still in
your backups. There is no longer a way to select it from this service.
