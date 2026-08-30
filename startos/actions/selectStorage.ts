import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { defaultPruneMib, minPruneMib } from '../utils'

const { InputSpec, Value, Variants } = sdk

export const inputSpec = InputSpec.of({
  storage: Value.union({
    name: i18n('Storage'),
    description: i18n(
      'Whether to keep the whole chain on disk, or keep only recent blocks and discard the rest.',
    ),
    warning: i18n(
      'The node restarts to apply this. Going from keeping everything to keeping recent blocks deletes the older ones, and getting them back means downloading the chain again. Going the other way also means downloading the chain again, because the blocks that were discarded are gone.',
    ),
    default: 'pruned',
    variants: Variants.of({
      pruned: {
        name: i18n('Keep recent blocks only (pruned)'),
        spec: InputSpec.of({
          keepMib: Value.number({
            name: i18n('Blocks to keep'),
            description: i18n(
              'How much disk to allow for blocks, in MiB. Older blocks are discarded automatically once this is exceeded. This does not cover the rest of the node’s data, which grows on its own.',
            ),
            required: true,
            default: defaultPruneMib,
            min: minPruneMib,
            integer: true,
            units: 'MiB',
          }),
        }),
      },
      archival: {
        name: i18n('Keep the whole chain (archival)'),
        spec: InputSpec.of({}),
      },
    }),
  }),
})

/**
 * Choose between a pruned node and an archival one.
 *
 * This exists because the setting was previously reachable only by editing the
 * store by hand, and its stored default was `1`. That is a real bitcoind mode,
 * "manual pruning", and it is a trap on any chain with a real amount of history:
 * the node reports `pruned: true` while never actually discarding anything, so
 * it grows without bound and the only way to reclaim space is a
 * `pruneblockchain` call this package never offers. On mainnet that is the
 * difference between a few gigabytes and the whole chain.
 *
 * So manual mode is not offered here. The two variants map to the only two
 * behaviours worth choosing: a byte budget that bitcoind enforces itself, or
 * keeping everything. An install still holding `1` keeps it until someone runs
 * this action, because silently rewriting a stored consensus-adjacent setting
 * during an upgrade is worse than leaving it and saying so in the release notes.
 *
 * `min` is bitcoind's own floor. Below it bitcoind refuses to start rather than
 * rounding up, so rejecting it here turns a failed start into a form error.
 */
export const selectStorage = sdk.Action.withInput(
  'select-storage',

  async () => ({
    name: i18n('Select Storage'),
    description: i18n(
      'Choose whether this node keeps the whole chain or only recent blocks.',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: i18n('Configuration'),
    visibility: 'enabled',
  }),

  inputSpec,

  async ({ effects }) => {
    const prune =
      (await storeJson.read((s) => s.prune).once()) ?? defaultPruneMib
    // 0 is archival. Anything else is pruning of some kind, including the legacy
    // manual `1`, which has no slider position of its own: show it as pruned at
    // the default so the form opens on something valid.
    return prune === 0
      ? { storage: { selection: 'archival' as const, value: {} } }
      : {
          storage: {
            selection: 'pruned' as const,
            value: { keepMib: prune < minPruneMib ? defaultPruneMib : prune },
          },
        }
  },

  async ({ effects, input }) => {
    const prune =
      input.storage.selection === 'archival' ? 0 : input.storage.value.keepMib
    await storeJson.merge(effects, { prune })
  },
)
