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
 * usually are. bitcoind keeps each chain under its own subdirectory of the
 * volume (`/data/regtest`, `/data/testnet4`), so switching away leaves the old
 * chain where it was and switching back finds it again. What does change is what
 * every other action reports, since they all follow this setting.
 *
 * Mainnet is not offered and could not be: the release candidate this package
 * builds refuses `ChainType::MAIN` at startup.
 */
export const selectChain = sdk.Action.withInput(
  'select-chain',

  async () => ({
    name: i18n('Select Chain'),
    description: i18n(
      'Choose whether this node runs its own private chain or joins the public BLAKE2b test network.',
    ),
    warning: i18n(
      'The node restarts and begins following the chain you pick. Nothing is deleted: each chain keeps its own data, so switching back returns you to where you left off.',
    ),
    allowedStatuses: 'any',
    group: null,
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
