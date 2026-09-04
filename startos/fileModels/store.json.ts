import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'
import { defaultPruneMib } from '../utils'

const shape = z.object({
  // No RPC credentials here on purpose: bitcoind writes a .cookie and the
  // gateway reads it from a read-only mount, so there is no secret to store.
  //
  // No chain, headline or activation height either. This package follows
  // BLAKE2b on mainnet and nothing else, so all three are properties of the
  // build rather than settings; see the chain section of utils.ts. Keys left
  // behind in an existing store are ignored rather than rejected, which is what
  // lets an install carrying `chain: "regtest"` upgrade without erroring.

  // Peers to dial, added to whatever mainnet's own DNS seeds provide. Normally
  // empty: the seeds answer the NODE_BLAKE2B service prefix with fork nodes, so
  // a node finds this chain by itself. This is here for a network where DNS is
  // blocked, and for pinning a known-good peer while diagnosing one that is not
  // finding the fork.
  addnodes: z.array(z.string()).catch([]),

  // Blocks to keep, in MiB. 0 keeps the whole chain. Anything else is a budget
  // bitcoind enforces itself, except the legacy value 1, which is its *manual*
  // mode: reports pruned, never prunes, grows without bound. The Select Storage
  // action does not offer 1, but the schema still accepts it so an install
  // holding it is not rewritten out from under its operator on upgrade.
  //
  // The default is a real pruned target, so a fresh install is pruned without
  // anyone having to ask. Proven in X5: the gateway needs no historical blocks.
  prune: z.number().int().nonnegative().catch(defaultPruneMib),
})

export const storeJson = FileHelper.json(
  { base: sdk.volumes.main, subpath: './store.json' },
  shape,
)
