import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { defaultChain } from '../utils'

const { InputSpec, Value } = sdk

export const inputSpec = InputSpec.of({
  chain: Value.select({
    name: i18n('Chain'),
    description: i18n(
      'A private chain is yours alone: you pick the activation height and mine every block yourself. Mainnet is the public BLAKE2b chain, where the proof of work changed at block 961640 on 30 August 2026. That height and the value the chain committed to at it are both fixed in the software rather than configurable.',
    ),
    values: {
      regtest: i18n('Private chain (regtest)'),
      mainnet: i18n('Public BLAKE2b chain (mainnet)'),
    },
    default: defaultChain,
  }),
})

/**
 * Choose between a private chain and the public BLAKE2b mainnet.
 *
 * Deliberately *not* destructive, which is worth stating because chain switches
 * usually are. bitcoind keeps a named chain under its own subdirectory of the
 * volume (`/data/regtest`) and mainnet at the root, so switching away leaves the
 * old chain where it was and switching back finds it again. What does change is
 * what every other action reports, since they all follow this setting.
 *
 * The form opens on mainnet, because that is `defaultChain` and it is what a
 * fresh install runs. Picking it is therefore the no-op, and regtest is the
 * deliberate choice, which is the reverse of how this package began.
 */
export const selectChain = sdk.Action.withInput(
  'select-chain',

  async () => ({
    name: i18n('Select Chain'),
    description: i18n(
      'Choose whether this node follows the public BLAKE2b chain or runs a private chain of its own.',
    ),
    warning: i18n(
      'The node restarts and begins following the chain you pick. Nothing is deleted: each chain keeps its own data, so switching back returns you to where you left off.',
    ),
    allowedStatuses: 'any',
    group: i18n('Configuration'),
    visibility: 'enabled',
  }),

  inputSpec,

  async ({ effects }) => ({
    chain: (await storeJson.read((s) => s.chain).once()) ?? defaultChain,
  }),

  async ({ effects, input }) => {
    await storeJson.merge(effects, { chain: input.chain })
  },
)
