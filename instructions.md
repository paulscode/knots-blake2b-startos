# Bitcoin Knots BLAKE2b (regtest)

An experimental build of Bitcoin Knots carrying the proposed **BLAKE2b proof-of-work
change**, so you can try mining it with an existing Sia-compatible BLAKE2b ASIC.

**This is a private test chain.** No public network runs these rules, so there is
nothing to sync with and nothing to connect to. The coins are worthless by
construction. It exists so you can find out whether your miner works.

It installs alongside the regular Bitcoin service and does not touch it. They use
different ports and different data, and neither knows about the other.

## What to do with it

On its own, this node does very little. It becomes useful when you also install
**Datum Gateway BLAKE2b (regtest)**, which turns its block templates into work your
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

**BLAKE2b starts at block 1.** The chain uses BLAKE2b from its very first block, so
your miner can start immediately. If you raised this, the chain would use SHA256d
until that height, and a Sia miner cannot mine SHA256d: it would connect, receive
work it cannot use, and appear to do nothing.

**The headline** is a piece of text that has to appear in the first BLAKE2b block,
and it has to be identical on every node of a chain. Changing it means your node
disagrees with anyone else running the default, so only change it if you are running
your own separate chain and changing it everywhere.

**Pruning** is on. This node keeps recent blocks and discards old ones. Mining does
not need the old ones, so this costs you nothing here.

## What "working" looks like

The service shows healthy and its block height rises once something is mining. On
its own, with nothing mining, the height stays where it is. That is normal.
