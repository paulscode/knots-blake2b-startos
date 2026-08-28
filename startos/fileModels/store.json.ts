import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'
import {
  chains,
  defaultActivationHeight,
  defaultChain,
  defaultHeadline,
  type Chain,
} from '../utils'

const shape = z.object({
  // No RPC credentials here on purpose: bitcoind writes a .cookie and the
  // gateway reads it from a read-only mount, so there is no secret to store.

  // Consensus-critical: every node on the chain must agree on this exact string,
  // and it must appear in the coinbase of the block at the activation height.
  // Empty is the dangerous value, not a wrong one: the node still starts and the
  // rule becomes unenforceable, so the entrypoint refuses to run with it blank.
  blake2bHeadline: z.string().catch(defaultHeadline),

  // Which chain to run. See `chains` in utils.ts. Changing it does not destroy
  // anything: bitcoind keeps each chain's data in its own subdirectory of the
  // volume, so switching back finds the old chain where it was left.
  chain: z.enum(chains as unknown as [Chain, ...Chain[]]).catch(defaultChain),

  // Regtest-only. Where SHA256d stops and BLAKE2b begins. Ignored on testnet4,
  // where the activation height is compiled into the binary at 150027, so the
  // entrypoint does not write it there rather than writing config that looks
  // effective and is not.
  activationHeight: z.number().int().nonnegative().catch(defaultActivationHeight),

  // Peers to dial, one `host:port` per entry, added to whatever the chain's own
  // seeds provide. On testnet4 this is how a node finds the BLAKE2b chain at
  // all, since the DNS seeds return ordinary testnet4 nodes; see
  // `testnet4Seeds` in utils.ts.
  addnodes: z.array(z.string()).catch([]),

  // 0 disables pruning; 1 is manual mode, pruned via the pruneblockchain RPC.
  // Proven in X5: the gateway needs no historical blocks, so pruning is safe.
  prune: z.number().int().nonnegative().catch(1),
  fastprune: z.boolean().catch(true),
})

export const storeJson = FileHelper.json(
  { base: sdk.volumes.main, subpath: './store.json' },
  shape,
)
