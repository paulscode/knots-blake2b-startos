import { sdk } from '../sdk'
import { getPayoutAddress } from './getPayoutAddress'

export const actions = sdk.Actions.of().addAction(getPayoutAddress)
