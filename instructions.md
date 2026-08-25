# Bitcoin Knots BLAKE2b

An experimental build of Bitcoin Knots carrying the proposed **BLAKE2b proof-of-work
change**, so you can try mining it with an existing Sia-compatible BLAKE2b ASIC.

It runs one of two chains, and you pick which with the **Select Chain** action:

- **Private chain (regtest).** Yours alone. Nothing to sync with, nothing to connect
  to, and you mine every block yourself. This is the default and the right choice for
  finding out whether your miner works.
- **Public BLAKE2b test network (testnet4).** Shared with other testers. BLAKE2b
  starts at block 149537 there. Read the section below before choosing it, because it
  needs one extra step that the private chain does not.

Coins on either chain are worthless by construction. Mainnet is not offered, and this
build refuses to run on it.

Switching chains deletes nothing. Each chain keeps its own data, so you can move
between them and come back to find your old chain where you left it.

It installs alongside the regular Bitcoin service and does not touch it. They use
different ports and different data, and neither knows about the other.

## If you choose the public test network

**Peers are set up for you.** This service ships with a list of nodes that are on
the BLAKE2b chain, so choosing the public test network is all you have to do. They
are other people's home nodes though, so they will not last forever, and it is worth
knowing why they are needed at all.

The BLAKE2b chain shares testnet4's network identity: the same genesis block, the
same default port, the same magic bytes. So the addresses testnet4's automatic peer
discovery hands out are real testnet4 nodes, and your node will connect to them
happily. They are even useful, up to block 149537, because both chains share that
history. After it, they have nothing your node will accept.

The result is a node that syncs to block 149536 and stops, with peers connected and
nothing obviously wrong. The **Chain** health check exists to say so plainly: it
reports *Stalled just below the BLAKE2b activation height* rather than leaving you to
work it out.

If that happens, the built-in peers have gone offline, and the fix is the **Set
Peers** action: add a node that is on the BLAKE2b chain, one address per line as
`host:port`. Ask in the Bitcoin Knots Discord for current addresses. Whatever you
add is used alongside the built-in ones, not instead of them. Once one of them
answers, the health check turns to *Following the BLAKE2b chain*.

**The headline is not yours to choose on the public network.** Every chain commits
to a piece of text in its first BLAKE2b block, and a node that disagrees rejects
that block and stops. The public network's is fixed, and the package sets it for
you. The headline setting applies only to a private chain, where you are making the
rules.

## What to do with it

On its own, this node does very little. It becomes useful when you also install
**Datum Gateway BLAKE2b**, which turns its block templates into work your
ASIC can mine.

## Getting a payout address

The gateway asks you for an address to pay block rewards to. To get one:

1. Make sure this service is **running**.
2. Go to **Actions** and run **Get Payout Address**.
3. Copy the address. It starts with `m`, `n` or `2`.

You can run it again whenever you want a fresh address. The first run creates a
wallet on this node; later runs just add addresses to it.

These are regtest addresses. They mean nothing on any other chain, and nothing of
value can be sent to them.

## Seeing what you have mined

Go to **Actions** and run **Show Wallet Balance**.

It shows three things: what is spendable now, what is not spendable yet, and how
many blocks are on your chain.

**A new miner's balance is almost all in "not spendable yet", and that is normal.**
Freshly mined coins need another 100 blocks before they can be spent. If you have
just started, "spendable now" will be `0.00000000` while blocks are piling up. That
is not a sign anything is wrong.

### These coins stay on this machine

They are only on the private test chain running on your own server. You cannot send
them to another person, and they are not worth anything.

This is worth being clear about, because it is different from a testnet node. On
testnet everyone joins one shared network, so testers can send coins to each other.
Your chain has no network: it started empty on your server, it has no way to find
anyone else's, and if two people who had both been mining ever did connect their
chains, one side's blocks would simply be discarded.

If you want to see the numbers move, mine more blocks. That is all the balance is
for: confirming your miner is producing blocks your node accepts.

## Settings worth knowing about

The defaults are chosen so the pair works out of the box, and most people should
leave them alone.

**BLAKE2b starts at block 1** on a private chain. It uses BLAKE2b from its very first
block, so your miner can start immediately. If you raised this, the chain would use
SHA256d until that height, and a Sia miner cannot mine SHA256d: it would connect,
receive work it cannot use, and appear to do nothing.

On the public test network this setting does nothing at all. The activation height
there is 149537 and it is fixed in the software, not configurable, so the node ignores
anything you set.

**The headline** is a piece of text that has to appear in the first BLAKE2b block,
and it has to be identical on every node of a chain. Changing it means your node
disagrees with anyone else running the default, so only change it if you are running
your own separate chain and changing it everywhere.

**Pruning** is on. This node keeps recent blocks and discards old ones. Mining does
not need the old ones, so this costs you nothing here.

## What "working" looks like

Two health checks tell you where you stand.

**RPC** says the node is answering. **Chain** says which chain it is actually on, and
that is the one to read:

| It says | It means |
|---|---|
| Following the BLAKE2b chain | You are past the activation height, on the fork. This is the goal. |
| Before the BLAKE2b activation | Working normally, not yet at the activation height. On a private chain, mine some blocks. |
| Syncing | Downloading blocks it already knows about. Wait. |
| Stalled just below the BLAKE2b activation height | Public network only. No peers on the fork. Use Set Peers. |
| Stuck at the block before BLAKE2b activation | Public network only. It has the blocks on offer and is refusing them, which means the headline does not match. |

On a private chain with nothing mining, the height stays where it is. That is normal.
