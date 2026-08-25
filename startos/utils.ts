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

// ---------------------------------------------------------------------------
// Chain selection
// ---------------------------------------------------------------------------

/**
 * The chains this package can run.
 *
 * `regtest` is a private chain of your own, where the activation height is
 * whatever you set. `testnet4` is the public BLAKE2b test network, where the
 * activation height is 149537 and is compiled into the binary, not configurable.
 *
 * Mainnet is deliberately absent, and not only by our choice: the release
 * candidate this package builds refuses `ChainType::MAIN` outright
 * (`init.cpp:1077`, "This release candidate only supports test networks").
 */
export const chains = ['regtest', 'testnet4'] as const
export type Chain = (typeof chains)[number]
export const defaultChain: Chain = 'regtest'

/**
 * The height at which BLAKE2b activates on testnet4, compiled into
 * `CTestNet4Params`. Not settable: `-testactivationheight` is read only by
 * `CRegTestParams`, so on testnet4 it is accepted and silently ignored
 * (verified: `getdeploymentinfo` still reports 149537 with it set).
 */
export const testnet4ActivationHeight = 149537

/** The `bitcoin-cli` / `bitcoind` flag selecting a chain. */
export function chainFlag(chain: Chain): string {
  return `-${chain}`
}

/**
 * Peers to dial on testnet4.
 *
 * Empty, and that is the honest state rather than an oversight. testnet4's DNS
 * seeds (`seed.testnet4.bitcoin.sprovoost.nl`, `seed.testnet4.wiz.biz`) return
 * ordinary testnet4 nodes, and the BLAKE2b fork shares testnet4's magic, default
 * port and genesis block, so a fork node and a Core node connect happily and
 * exchange headers. They only disagree from 149537, where the fork node rejects
 * the other chain's 80-byte SHA256d headers.
 *
 * So the failure mode is not following the wrong chain, it is **stalling one
 * block short of the fork with no explanation**. The `chain` health check exists
 * to say so out loud. Filling this list is the fix, but a hardcoded peer list is
 * a maintenance burden and a centralisation point, so it stays empty until there
 * are addresses worth committing to and the user override below covers the
 * meantime.
 */
export const testnet4Seeds: string[] = []
