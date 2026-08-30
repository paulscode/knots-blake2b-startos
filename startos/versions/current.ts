import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

const notes =
  'Follows the public BLAKE2b chain on mainnet. The proof of work changed there at block ' +
  '961640 on 30 August 2026, and this release is rebuilt from the first Bitcoin Knots ' +
  'candidate that will run on mainnet at all, v29.4.1.knots20260508rc4. Earlier releases ' +
  'refused mainnet outright, so this is the first version of this package that can follow it. ' +
  'Select it with the Select Chain action. The height it activates at, and the value that ' +
  'block committed to, are both fixed in the software; you do not set them. It finds peers on ' +
  'its own, so no peer list is needed. ' +
  'The public test network has been removed, and this is the part to read twice. The same ' +
  'candidate moved where BLAKE2b begins on testnet4, from block 150027 to 150308, but the ' +
  'live test network activated at 150027 and is already past 150308. Those are two different ' +
  'chains, so this build cannot follow the test network as it stands: it would sync to one ' +
  'block below the switch and stop, looking exactly like a node with no peers. ' +
  'If your node was on the public test network it will be set to the private chain when this ' +
  'installs, because that is the safe default rather than starting a mainnet download you did ' +
  'not ask for. Nothing is deleted: the test network data stays where it is, and it becomes ' +
  'reachable again when that network restarts on the newer candidate. Private chains are ' +
  'unaffected.' +
  ' ' +
  'A new install is now pruned by default, keeping 5 GiB of blocks. It used to ' +
  'default to a mode that reports itself as pruned but never actually discards ' +
  'anything, which is harmless on a private chain and on mainnet is the ' +
  'difference between a few gigabytes and the whole chain. Existing installs ' +
  'keep whatever they are set to; nothing is changed underneath you. ' +
  'A new Select Storage action chooses between keeping only recent blocks and ' +
  'keeping the whole chain, and sets how much disk the blocks may use. It sits ' +
  'with Select Chain and Set Peers under Configuration, and the wallet actions ' +
  'are grouped separately.' +
  ' ' +
  'Stopping the service no longer throws away sync progress. The node was being ' +
  'shut down and then killed a few milliseconds later, before it could write its ' +
  'chain state to disk, so a restart during a long sync resumed from the last ' +
  'time that state was written, which early in a sync is the very beginning. ' +
  'Measured before the fix: stopping at block 84,900 came back at block 327. It ' +
  'now shuts down cleanly and resumes where it left off.' +
  ' ' +
  'Fixes the "The RPC proxy is not ready" health check on mainnet. The helper ' +
  'that serves blocks a pruned node has discarded was being pointed at the ' +
  'wrong file for its credentials, because mainnet keeps them in a different ' +
  'place from the test chains, so it could not talk to the node and never came ' +
  'up. Pruned mainnet nodes were affected; nothing else was.'

export const current = VersionInfo.of({
  version: '1.0.0:24',
  releaseNotes: {
    en_US: notes,
    es_ES: notes,
    de_DE: notes,
    pl_PL: notes,
    fr_FR: notes,
  },
  migrations: {
    // Nothing to migrate. The repin changes the binary, and chain selection adds
    // store fields that all carry defaults, so an existing install reads as
    // `regtest` and keeps the chain it already has under /data/regtest.
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
