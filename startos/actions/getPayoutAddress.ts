import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { storeJson } from '../fileModels/store.json'
import { chainFlag, dataDir, defaultChain } from '../utils'

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
    group: i18n('Wallet'),
    visibility: 'enabled',
    access: 'user',
  }),

  async ({ effects }) => {
    const chain = (await storeJson.read((s) => s.chain).once()) ?? defaultChain

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
        // Follow the selected chain rather than assuming regtest: this package
        // can also run testnet4, where `-regtest` would talk to a node that is
        // not there.
        const cli = ['bitcoin-cli', `-datadir=${dataDir}`, chainFlag(chain)]

        // Idempotent: one of these succeeds on a fresh node, the other on a
        // node that already has the wallet. Both failing is fine as long as
        // getnewaddress then works, so neither is allowed to throw.
        await sub.exec([...cli, 'loadwallet', 'mining'])
        await sub.exec([...cli, 'createwallet', 'mining'])

        // Address type by chain, and the reason is DATUM rather than bitcoind.
        // Its parser handles bech32 only for the `bc` and `tb` prefixes
        // (datum_utils.c:415-425), falling back to libblkmaker for base58. So a
        // regtest `bcrt1...` matches neither and the gateway refuses to start,
        // while testnet4's `tb1...` is understood directly.
        //
        // Legacy on regtest is therefore a workaround, not a preference, and it
        // should not follow us onto a chain that does not need it: bech32 is
        // what a modern wallet shows and it is cheaper to spend. Base58 testnet
        // addresses would also work, since they share regtest's prefixes.
        //
        // Neither case relies on the wallet's default type, which is bech32 in
        // recent Core and would silently hand out something unusable on regtest.
        const addressType = chain === 'regtest' ? 'legacy' : 'bech32'
        const { stdout } = await sub.execFail([
          ...cli,
          'getnewaddress',
          '',
          addressType,
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
