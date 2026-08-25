import { sdk } from '../sdk'
import { getPayoutAddress } from './getPayoutAddress'
import { selectChain } from './selectChain'
import { setPeers } from './setPeers'
import { showWalletBalance } from './showWalletBalance'

export const actions = sdk.Actions.of()
  .addAction(selectChain)
  .addAction(setPeers)
  .addAction(getPayoutAddress)
  .addAction(showWalletBalance)
