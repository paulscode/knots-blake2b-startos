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

/**
 * The headline that testnet4's BLAKE2b chain actually committed to.
 *
 * This is consensus, not preference, and it is not ours to choose.
 * `validation.cpp:4639` checks, at the activation height only, that the
 * configured headline appears as a substring of the coinbase `scriptSig`.
 * testnet4's block 149537 carries `Totoro` (coinbase
 * d1ef84d41c16813085aff61f098255b59e9ea07f9d42168ff078d06295c17342,
 * scriptSig `0321480207546f746f726f00...`), so any other value makes the node
 * reject that block and every block after it.
 *
 * Getting this wrong is a nasty failure: the node syncs happily to 149536 and
 * stops, logging `bad-headline` but otherwise looking exactly like a node that
 * simply has no peers on the fork. It cost an afternoon to find, which is why the
 * package now sets it rather than offering it, and why the `chain` health check
 * tells the two causes apart.
 */
export const testnet4Headline = 'Totoro'

/** The headline a chain requires. Only regtest leaves the choice open. */
export function headlineFor(chain: Chain, configured: string): string {
  return chain === 'testnet4' ? testnet4Headline : configured
}

/** The `bitcoin-cli` / `bitcoind` flag selecting a chain. */
export function chainFlag(chain: Chain): string {
  return `-${chain}`
}

/**
 * Peers to dial on testnet4, in addition to whatever the user adds.
 *
 * These exist because testnet4's DNS seeds cannot find this chain. The fork
 * shares testnet4's genesis block, magic bytes and default port, so the seeds
 * return ordinary testnet4 nodes: they serve valid blocks up to 149536 and have
 * nothing after it. Measured 2026-08-24: all 33 addresses the two seeds returned
 * were on the SHA256d chain. Without a starting point a new node stalls one block
 * below the fork looking healthy, so shipping some is the difference between the
 * package working and not.
 *
 * Every address below was verified, not collected: each was asked for the headers
 * following block 149536 and answered with a 164-byte header v2, and each
 * reported the same tip height as `mempool.guide/testnet4` at the time. See
 * `spikes/blake2b-testnet4/` in the pruned-electrs repo for the tool that found
 * them, which is the thing to re-run rather than trusting this list.
 *
 * **This list will rot.** These are other people's home nodes, not
 * infrastructure. It is short on purpose: long enough to bootstrap, short enough
 * that maintaining it is not a burden, and the user's own `addnodes` is merged
 * with it for everything else.
 */
export const testnet4Seeds: string[] = [
  '82.67.102.15:48333',
  '178.118.234.189:48333',
  '64.177.11.149:48333',
  '86.8.92.221:48333',
  '136.36.150.88:48333',
  '172.117.233.59:48333',
  '184.179.145.52:48333',
  '207.81.196.105:48333',
]
