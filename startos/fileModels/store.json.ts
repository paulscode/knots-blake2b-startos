import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'
import { defaultActivationHeight, defaultHeadline } from '../utils'

const shape = z.object({
  // No RPC credentials here on purpose: bitcoind writes a .cookie and the
  // gateway reads it from a read-only mount, so there is no secret to store.

  // Consensus-critical: every node on the chain must agree on this exact string,
  // and it must appear in the coinbase of the block at the activation height.
  // Empty is the dangerous value, not a wrong one: the node still starts and the
  // rule becomes unenforceable, so the entrypoint refuses to run with it blank.
  blake2bHeadline: z.string().catch(defaultHeadline),

  // Regtest-only. Where SHA256d stops and BLAKE2b begins.
  activationHeight: z.number().int().nonnegative().catch(defaultActivationHeight),

  // 0 disables pruning; 1 is manual mode, pruned via the pruneblockchain RPC.
  // Proven in X5: the gateway needs no historical blocks, so pruning is safe.
  prune: z.number().int().nonnegative().catch(1),
  fastprune: z.boolean().catch(true),
})

export const storeJson = FileHelper.json(
  { base: sdk.volumes.main, subpath: './store.json' },
  shape,
)
