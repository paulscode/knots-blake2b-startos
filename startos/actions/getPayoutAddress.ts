import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { chainFlag, dataDir } from '../utils'

/**
 * Hand the user an address they can paste into the gateway.
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
    warning: i18n(
      'A block mined to this address pays its whole subsidy to a key held by this node’s wallet, and nowhere else. Back the wallet up before you rely on it.',
    ),
    // bitcoin-cli needs the daemon up.
    allowedStatuses: 'only-running',
    group: i18n('Wallet'),
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
        const cli = ['bitcoin-cli', `-datadir=${dataDir}`, chainFlag]

        // Idempotent: one of these succeeds on a fresh node, the other on a
        // node that already has the wallet. Both failing is fine as long as
        // getnewaddress then works, so neither is allowed to throw.
        await sub.exec([...cli, 'loadwallet', 'mining'])
        await sub.exec([...cli, 'createwallet', 'mining'])

        // bech32, and named explicitly rather than left to the wallet's
        // default, because the consumer is DATUM rather than bitcoind. Its
        // parser handles bech32 only for the `bc` and `tb` prefixes
        // (datum_utils.c:415-425), falling back to libblkmaker for base58.
        // `bc1...` is understood directly.
        //
        // This used to pick between legacy and bech32 by chain, because a
        // regtest `bcrt1...` matches neither and the gateway refused to start
        // on it. There is no regtest here any more, so the workaround is gone
        // and the address type is simply the one a modern wallet shows and the
        // cheaper one to spend.
        const { stdout } = await sub.execFail([
          ...cli,
          'getnewaddress',
          '',
          'bech32',
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
