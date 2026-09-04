// Ports are chosen to not collide with the official `bitcoind` package, which
// uses 8332/58332 (RPC) and 8333/58333/58334 (peer). These numbers are
// bitcoind's regtest defaults, inherited from when this package ran regtest and
// kept afterwards: they are this package's contract with dependents, and moving
// them to mainnet's 8332/8333 would both break every dependent and collide with
// the official package on a server running one node per chain, which is the
// arrangement this package exists for.
//
// Note these are the *internal* container ports, and those are the stable ones.
// `preferredExternalPort` is only a request: if something already holds the
// external port, StartOS silently assigns a random one instead. A dependent
// must read this service's live binding rather than assume a number.
// Host id and internal port are this package's stable contract for dependents.
// Import these rather than hardcoding: the *external* port is assigned at runtime
// and must never be assumed by a caller.
export const rpcHostId = 'rpc'
export const rpcPort = 18443
export const peerPort = 18444

/**
 * A second p2p listener, whitelisted and reachable only over the LXC bridge.
 *
 * A dependent that pulls whole historical blocks over p2p, which is what an
 * Electrum server does both to build its index and to answer history queries,
 * cannot use the plain `peer` port. That one is shared with anonymous inbound
 * peers and earns no permissions: bitcoind may evict the connection to seat
 * another peer, and a pruned node serves only the last 288 blocks
 * (`NODE_NETWORK_LIMITED`) to an unprivileged peer, disconnecting when asked for
 * anything older. electrs does not reconnect p2p, it exits, so one disconnect is
 * a restart loop. Measured: asking for a block 416 deep on the plain port ended
 * the connection and took electrs down with it.
 *
 * `whitebind` on this port grants noban + download, which removes both problems.
 * The binding is deliberately **not** exported as an interface, so it stays off
 * the LAN and lands only on the bridge; a public peer keeps arriving on `peer`
 * and cannot reach these permissions. Same shape as the official bitcoind
 * package's `peer-local`, which is what dependents already expect to resolve.
 */
/**
 * Where bitcoind's RPC moves to when pruning is on.
 *
 * btc-rpc-proxy then takes 18443, the port dependents resolve, and forwards to
 * this one, answering for blocks this node has dropped by fetching them from
 * peers. A dependent therefore sees a node that behaves as though it were
 * archival, with no change on its side. Same arrangement as the official
 * bitcoind package's 8332/58332, on this package's regtest-derived numbering.
 *
 * Loopback only, and `rpcallowipPruned` with it: once the proxy is in front,
 * nothing outside the container should reach bitcoind directly, because doing
 * so would bypass the block fetching that makes pruning workable.
 */
export const rpcPortPruned = 58443
export const rpcBindPruned = '127.0.0.1'
export const rpcAllowIpPruned = '127.0.0.1/32'

export const peerLocalHostId = 'peer-local'
export const peerPortLocal = 18445

export const dataDir = '/data'

/**
 * Blocks to keep, in MiB, when nobody has chosen otherwise.
 *
 * A fresh install is pruned. That is the point of this package: it exists so a
 * second chain can sit beside a first one without a second copy of the chain,
 * and a default that quietly kept everything would defeat that on the only
 * chain where it matters.
 *
 * The previous default was `1`, which is bitcoind's *manual* pruning mode: the
 * node reports `pruned: true`, never discards anything, and grows without
 * bound, with no way to reclaim space from this package. On regtest that is
 * invisible. On mainnet it is the difference between five gigabytes and the
 * whole chain.
 *
 * 5 GiB is a deliberate floor rather than a recommendation. It is comfortably
 * above bitcoind's minimum, and it is small enough that "pruned" means what a
 * reader expects. Raising it costs disk and buys two things: fewer blocks for a
 * dependent indexer to re-fetch, and longer before v2 blocks fall below the
 * prune height, which is when a proxy that cannot decode them stops being
 * enough. Both are in the Select Storage action's reach.
 */
export const defaultPruneMib = 5000

/**
 * bitcoind's own floor for a prune target. Below this it refuses to start
 * rather than rounding up, so the action rejects it rather than letting a form
 * produce a node that will not run.
 */
export const minPruneMib = 550

// ---------------------------------------------------------------------------
// The chain
// ---------------------------------------------------------------------------

/**
 * This package follows one chain: BLAKE2b on mainnet. There is no selector.
 *
 * It used to offer a private regtest chain and, before that, testnet4. Both
 * existed to prove the fork worked before it had a public chain to run on.
 * Mainnet split on 2026-08-30 and has been live since, so the lab chains had
 * become a second configuration to reason about for no remaining benefit, and
 * they were the reason this package's shape differed from the official Knots
 * package at every turn: a chain-dependent cookie path, a chain-dependent
 * conf section, a headline that was consensus on one chain and free text on
 * another, an activation height that was settable on one chain and compiled in
 * on the others.
 *
 * An install that was running regtest keeps its data. bitcoind puts a named
 * chain under its own subdirectory (`/data/regtest`) and mainnet at the root,
 * so nothing is deleted by this; that directory is simply no longer reachable
 * from the UI. See the migration in `versions/current.ts`.
 *
 * The `bitcoin-cli` / `bitcoind` flag is spelled `-chain=main` rather than
 * omitted. Mainnet is bitcoind's default and there is no `-mainnet` option, so
 * naming it explicitly beats relying on the absence of a flag.
 */
export const chainFlag = '-chain=main'

/**
 * The height at which BLAKE2b activates on mainnet, compiled into `CMainParams`.
 * Not settable: `-testactivationheight` is read only by `CRegTestParams`.
 *
 * The two mainnet chains part earlier than this, at 961632, where BIP110
 * activated. 961640 is where the proof of work changes.
 *
 * The headline that block committed to (`8-30 NYPost Deride And Conquer`) is
 * compiled into chainparams as of this pin, so nothing here configures it. It
 * used to be written into `bitcoin.conf` on every chain, because on regtest and
 * testnet4 it was the operator's to choose and getting it wrong rejected the
 * activation block. On mainnet it cannot be got wrong.
 */
export const mainnetActivationHeight = 961640

/**
 * No seed list is shipped for mainnet, and that is deliberate rather than an
 * omission.
 *
 * bitcoind queries every DNS seed as `x<SeedsServiceFlags()>.<seed>`
 * (`net.cpp`), which on this build is x10000009: NODE_NETWORK | NODE_WITNESS |
 * NODE_BLAKE2B. Two of mainnet's seeds advertise hardfork seeding and answer
 * that prefix with fork nodes. Measured 2026-08-30: all ten addresses they
 * returned were on the BLAKE2b chain, and a node started with no peers
 * configured found the chain by itself.
 *
 * Do not substitute gossip. Both chains share magic bytes and port 8333, so one
 * round of getaddr returned 7349 candidates of which a 60-peer sample had none
 * on the fork. The service-bit filter is the only thing that separates them.
 *
 * testnet4 did ship a curated list, because its DNS seeds return ordinary
 * testnet4 nodes. It is in git history if that chain returns.
 */
