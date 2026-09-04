import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { chainFlag, dataDir } from '../utils'

/**
 * Show what mining has actually produced, without an SSH session.
 *
 * Immature is reported separately and deliberately. A miner who has just found a
 * block has a spendable balance of zero, because coinbase outputs need 100
 * confirmations (COINBASE_MATURITY), and a single "balance: 0" would read as
 * "mining is not working" when it is working perfectly.
 *
 * The wording used to say these coins were worthless and existed only on this
 * machine, which was true of the private regtest chain this package once ran and
 * is not true of the chain it runs now. A balance here is a real balance on the
 * BLAKE2b chain, spendable to anyone else following it.
 */
export const showWalletBalance = sdk.Action.withoutInput(
  'show-wallet-balance',

  async () => ({
    name: i18n('Show Wallet Balance'),
    description: i18n('See what this node has mined.'),
    warning: null,
    // bitcoin-cli needs the daemon up.
    allowedStatuses: 'only-running',
    group: i18n('Wallet'),
    visibility: 'enabled',
    access: 'user',
  }),

  async ({ effects }) => {
    const stats = await sdk.SubContainer.withTemp(
      effects,
      { imageId: 'knots' },
      sdk.Mounts.of().mountVolume({
        volumeId: 'main',
        subpath: null,
        mountpoint: dataDir,
        readonly: false,
      }),
      'wallet-balance',
      async (sub) => {
        const cli = ['bitcoin-cli', `-datadir=${dataDir}`, chainFlag]

        // Same idempotent pair as Get Payout Address: one succeeds on a fresh
        // node, the other on a node that already has the wallet, and neither is
        // allowed to throw.
        await sub.exec([...cli, 'loadwallet', 'mining'])
        await sub.exec([...cli, 'createwallet', 'mining'])

        const balances = await sub
          .execFail([...cli, '-rpcwallet=mining', 'getbalances'])
          .then((r) => JSON.parse(r.stdout.toString()))
        const height = await sub
          .execFail([...cli, 'getblockcount'])
          .then((r) => r.stdout.toString().trim())

        const mine = balances?.mine ?? {}
        return {
          spendable: Number(mine.trusted ?? 0),
          immature: Number(mine.immature ?? 0),
          pending: Number(mine.untrusted_pending ?? 0),
          height,
        }
      },
    )

    // 8 decimal places, so a balance is shown to the satoshi rather than
    // rounded to something that reads as zero.
    const coins = (n: number) => `${n.toFixed(8)} BTC`

    return {
      version: '1' as const,
      title: i18n('Wallet Balance'),
      message: i18n(
        'This wallet is on the BLAKE2b chain. Its coins are spendable to anyone following that chain, and they are only as safe as your backup of this node’s wallet.',
      ),
      result: {
        type: 'group' as const,
        name: i18n('Mined so far'),
        description: null,
        value: [
          {
            type: 'single' as const,
            name: i18n('Spendable now'),
            description: null,
            value: coins(stats.spendable),
            masked: false,
            copyable: false,
            qr: false,
          },
          {
            type: 'single' as const,
            name: i18n('Not spendable yet'),
            description: i18n(
              'Freshly mined coins need 100 more blocks before they can be spent. This is normal, and it is where a new miner’s rewards sit.',
            ),
            value: coins(stats.immature),
            masked: false,
            copyable: false,
            qr: false,
          },
          {
            type: 'single' as const,
            name: i18n('Block height'),
            description: i18n(
              'How far this node has synced. BLAKE2b activated at block 961640.',
            ),
            value: stats.height,
            masked: false,
            copyable: false,
            qr: false,
          },
        ],
      },
    }
  },
)
