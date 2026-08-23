import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { dataDir } from '../utils'

/**
 * Show what mining has actually produced, without an SSH session.
 *
 * Asked for by a user who wanted to see a balance the way a testnet4 node shows
 * one. The balance half of that is a fair request and this answers it. The other
 * half, sending coins to other testers, is not a missing feature: regtest has no
 * peer discovery, so every install is its own private chain, and two of them that
 * have both been mining cannot merge without one side's blocks being reorged
 * away. Nothing here should imply otherwise, hence the framing below.
 *
 * Immature is reported separately and deliberately. A miner who has just found 40
 * blocks has a spendable balance of zero, because coinbase outputs need 100
 * confirmations (COINBASE_MATURITY), and a single "balance: 0" would read as
 * "mining is not working" when it is working perfectly.
 */
export const showWalletBalance = sdk.Action.withoutInput(
  'show-wallet-balance',

  async () => ({
    name: i18n('Show Wallet Balance'),
    description: i18n(
      'See what this node has mined. These coins exist only on your own private test chain.',
    ),
    warning: null,
    // bitcoin-cli needs the daemon up.
    allowedStatuses: 'only-running',
    group: null,
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
        const cli = ['bitcoin-cli', `-datadir=${dataDir}`, '-regtest']

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

    // 8 decimal places, because a regtest subsidy halves every 150 blocks and is
    // down to fractions of a coin within a few hundred. Rounding to 2 would show
    // a miner who is plainly working a balance of 0.00.
    const coins = (n: number) => `${n.toFixed(8)} BTC (test)`

    return {
      version: '1' as const,
      title: i18n('Wallet Balance'),
      message: i18n(
        'These coins are only on the private test chain running on this server. They cannot be sent to anyone else, and they are not worth anything. Nothing outside this machine knows they exist.',
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
            name: i18n('Blocks on this chain'),
            description: i18n(
              'Your chain started empty, so this is how many blocks have been mined here.',
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
