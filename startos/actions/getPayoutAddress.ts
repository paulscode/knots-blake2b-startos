import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { dataDir } from '../utils'

/**
 * Hand the user a regtest address they can paste into the gateway.
 *
 * Without this the only way to get one is `bitcoin-cli getnewaddress` over SSH,
 * which is exactly what a non-technical user cannot do, and it was the last
 * chicken-and-egg left: the gateway asks for a payout address and nothing on the
 * box would give you one.
 *
 * The wallet is created lazily here rather than on install, so a user who never
 * mines never gets one.
 */
export const getPayoutAddress = sdk.Action.withoutInput(
  'get-payout-address',

  async () => ({
    name: i18n('Get Payout Address'),
    description: i18n(
      'Create an address in this node’s wallet, to paste into the gateway as its payout address.',
    ),
    warning: null,
    // bitcoin-cli needs the daemon up.
    allowedStatuses: 'only-running',
    group: null,
    visibility: 'enabled',
    access: 'user',
  }),

  async ({ effects }) => {
    const address = await sdk.SubContainer.withTemp(
      effects,
      { imageId: 'knots' },
      sdk.Mounts.of().mountVolume({
        volumeId: 'main',
        subpath: null,
        mountpoint: dataDir,
        readonly: false,
      }),
      'get-address',
      async (sub) => {
        const cli = ['bitcoin-cli', `-datadir=${dataDir}`, '-regtest']

        // Idempotent: one of these succeeds on a fresh node, the other on a
        // node that already has the wallet. Both failing is fine as long as
        // getnewaddress then works, so neither is allowed to throw.
        await sub.exec([...cli, 'loadwallet', 'mining'])
        await sub.exec([...cli, 'createwallet', 'mining'])

        // Explicitly legacy. DATUM's address parser only understands bech32
        // with the `bc` and `tb` prefixes (datum_utils.c:415-425), so a regtest
        // bech32 address (`bcrt1...`) fails to convert and the gateway refuses
        // to start. Base58 regtest addresses share testnet's prefixes and work.
        // Not relying on the wallet's default address type, which is bech32 in
        // recent Core and would silently hand out something unusable.
        const { stdout } = await sub.execFail([
          ...cli,
          'getnewaddress',
          '',
          'legacy',
        ])
        return stdout.toString().trim()
      },
    )

    if (!address) {
      throw new Error(
        'The node returned no address. Is it finished starting up?',
      )
    }

    return {
      version: '1' as const,
      title: i18n('Payout Address'),
      message: i18n(
        'Copy this into the gateway’s Set Payout Address action. Blocks mined will pay here.',
      ),
      result: {
        type: 'single' as const,
        name: i18n('Address'),
        description: null,
        value: address,
        masked: false,
        copyable: true,
        qr: true,
      },
    }
  },
)
