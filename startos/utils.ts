// Ports are chosen to not collide with the official `bitcoind` package, which
// uses 8332/58332 (RPC) and 8333/58333/58334 (peer). These are the regtest
// defaults, which is what this chain is.
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

// Consensus-critical, and must be identical on every node of the chain. An
// empty value is worse than a wrong one: it satisfies the node's startup check
// but makes the rule unenforceable, because std::search with an empty needle
// always matches. The entrypoint refuses to start on empty.
export const defaultHeadline = 'BLAKE2b lab 2026-08-21'

// Where SHA256d stops and BLAKE2b begins.
//
// Defaults to 1, meaning the very first mined block is already BLAKE2b, because
// the point of this package is that someone can install it, point a Sia ASIC at
// the gateway, and mine. A higher value leaves the chain on SHA256d until that
// height, and a Sia ASIC cannot mine SHA256d at all: the miner would connect,
// receive work it cannot use, and produce nothing, with no indication why.
//
// Verified: with blake2b@1 the block at height 1 is a 164-byte header v2 and GBT
// advertises !blake2b with version 0xa0000000 straight away.
//
// Raising this is only useful for deliberately testing the transition, and it
// then requires mining the pre-activation blocks with the node's own miner,
// since no Sia ASIC can produce them.
export const defaultActivationHeight = 1

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
// Chain selection
// ---------------------------------------------------------------------------

/**
 * The chains this package can run.
 *
 * `regtest` is a private chain of your own, where the activation height is
 * whatever you set. `testnet4` is the public BLAKE2b test network, where the
 * activation height is 150027 and is compiled into the binary, not configurable.
 *
 * Mainnet is here as of the rc4 pin, and testnet4 is not, which is the reverse
 * of how this package began.
 *
 * BLAKE2b activated on mainnet at height 961640 on 2026-08-30, and rc4 is the
 * first release that will run there: rc2 and rc3 refused `ChainType::MAIN`
 * outright.
 *
 * testnet4 is gone because rc4 compiles its activation at 150308 while the live
 * testnet4 chain activated at 150027 and has passed 150308 already. Those are
 * different chains, so this build cannot follow that network, and offering it
 * would only produce a node that stalls at 150026. It comes back when that
 * network restarts on rc4; the constants to restore are in git history and the
 * procedure is in UPDATING.md.
 *
 * `defaultChain` is mainnet. This package exists to follow the BLAKE2b chain,
 * that chain is live on mainnet, and a node that follows it is what someone
 * installing this almost always wants; regtest is one action away for anyone
 * who wants a private chain instead. A fresh install is also pruned by default
 * (see `defaultPruneMib`), so the mainnet sync costs gigabytes rather than the
 * whole chain.
 *
 * This default reaches new installs only. The store gains a `chain` key just
 * when someone runs Select Chain, so an existing install that never ran it has
 * no key and would otherwise read the new default and walk off its own chain on
 * upgrade. The migration in `versions/current.ts` pins those to regtest, which
 * is what they were actually running.
 */
export const chains = ['regtest', 'mainnet'] as const
export type Chain = (typeof chains)[number]
export const defaultChain: Chain = 'mainnet'

/**
 * The height at which BLAKE2b activates on mainnet, compiled into `CMainParams`.
 * Not settable: `-testactivationheight` is read only by `CRegTestParams`.
 *
 * The two mainnet chains part earlier than this, at 961632, where BIP110
 * activated. 961640 is where the proof of work changes.
 */
export const mainnetActivationHeight = 961640

/**
 * The headline mainnet's BLAKE2b chain committed to.
 *
 * Consensus, not preference. `validation.cpp` checks at the activation height
 * that this string appears somewhere in that block's coinbase `scriptSig`.
 * Block 961640's carries `SilentWave` and then this, taken from the New York
 * Post's Sunday print edition as a proof of time. Confirmed against
 * `btc-blake2b.org/faq`, which names the same string.
 *
 * Because the check is a substring search, any string genuinely present in that
 * coinbase satisfies it, so this is safe by construction rather than by luck.
 *
 * Getting it wrong is a nasty failure: the node syncs happily to 961639 and
 * stops, logging `bad-headline` but otherwise looking exactly like a node with
 * no peers on the fork. That is why the package sets it rather than offering
 * it, and why the `chain` health check tells the two causes apart.
 */
export const mainnetHeadline = '8-30 NYPost Deride And Conquer'

/** The headline a chain requires. Only regtest leaves the choice open. */
export function headlineFor(chain: Chain, configured: string): string {
  return chain === 'mainnet' ? mainnetHeadline : configured
}

/**
 * The subdirectory of the data directory holding a chain's files, cookie
 * included. Empty for mainnet, which lives at the root.
 *
 * Dependents read the node's cookie out of a read-only mount, so getting this
 * wrong means no RPC credentials rather than a clear error.
 */
export function chainDataSubdir(chain: Chain): string {
  return chain === 'mainnet' ? '' : chain
}

/**
 * The chain a generated `bitcoin.conf` selects.
 *
 * Every chain but mainnet is chosen with a `<chain>=1` line. Mainnet has no
 * such option, because it is bitcoind's default, so *absence* is the signal.
 * A dependent that looks only for a positive marker silently concludes regtest
 * on a mainnet node and then cannot find the cookie.
 */
export function chainFromConf(conf: string | null | undefined): Chain {
  const lines = (conf ?? '').split('\n').map((l) => l.trim())
  const named = chains.find(
    (c) => c !== 'mainnet' && lines.some((l) => l === `${c}=1`),
  )
  return named ?? 'mainnet'
}

/**
 * The `bitcoin-cli` / `bitcoind` flag selecting a chain.
 *
 * Mainnet is the odd one out and cannot be written `-mainnet`: there is no such
 * option, because mainnet is the default. `-chain=main` is the spelling that
 * works, and naming it explicitly beats relying on the absence of a flag.
 */
export function chainFlag(chain: Chain): string {
  return chain === 'mainnet' ? '-chain=main' : `-${chain}`
}

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
