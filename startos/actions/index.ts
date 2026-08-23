import { sdk } from '../sdk'
import { getPayoutAddress } from './getPayoutAddress'
import { showWalletBalance } from './showWalletBalance'

export const actions = sdk.Actions.of()
  .addAction(getPayoutAddress)
  .addAction(showWalletBalance)
