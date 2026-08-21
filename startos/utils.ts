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
