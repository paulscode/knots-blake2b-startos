import { sdk } from '../sdk'
import { getPayoutAddress } from './getPayoutAddress'
import { selectStorage } from './selectStorage'
import { setPeers } from './setPeers'
import { showWalletBalance } from './showWalletBalance'

// Select Chain used to head this list. This package follows BLAKE2b on mainnet
// and nothing else now, so there is no chain to select; see the chain section of
// utils.ts.
export const actions = sdk.Actions.of()
  .addAction(selectStorage)
  .addAction(setPeers)
  .addAction(getPayoutAddress)
  .addAction(showWalletBalance)
