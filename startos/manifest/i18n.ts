// Only en_US is authored here. The other locales carry the same English text
// rather than a machine translation, so a translator can see what still needs
// doing instead of finding plausible-looking text that nobody checked. These
// describe which side of a chain split you are joining, which is not a thing to
// hand to a translation engine.
const shortEn =
  'A Bitcoin Knots node on the BLAKE2b chain, pruned so it fits alongside another'

const longEn =
  "A Bitcoin Knots node built from the BLAKE2b proof-of-work change, following the BLAKE2b chain on mainnet. Bitcoin's mainnet split on 30 August 2026: the two chains part at block 961632, and from block 961640 one of them uses BLAKE2b for proof of work instead of SHA256d. BLAKE2b is the algorithm Sia mines, so ASICs built for Sia can mine this chain. This is a real chain with real block rewards, and both sides of the split claim to be Bitcoin. Which one you follow is your decision, and installing this makes it. It installs alongside the official Bitcoin Knots package without touching it, and it is pruned by default, keeping about 5 GB of blocks, so both chains fit on one server. A dependent that needs an older block still gets one: the package puts an RPC proxy in front of the node that fetches dropped blocks from peers and checks them against it. Pair it with Datum Gateway (BLAKE2b) Companion to mine."

export const short = {
  en_US: shortEn,
  es_ES: shortEn,
  de_DE: shortEn,
  pl_PL: shortEn,
  fr_FR: shortEn,
}

export const long = {
  en_US: longEn,
  es_ES: longEn,
  de_DE: longEn,
  pl_PL: longEn,
  fr_FR: longEn,
}

export const torDescription = {
  en_US:
    'Required for .onion peer connectivity, onlynet=onion, or when a Tor address is requested.',
  es_ES:
    'Requerido para conectividad de pares .onion, onlynet=onion, o cuando se solicita una dirección Tor.',
  de_DE:
    'Erforderlich für .onion Peer-Konnektivität, onlynet=onion oder wenn eine Tor-Adresse angefordert wird.',
  pl_PL:
    'Wymagany dla połączeń .onion z peerami, onlynet=onion lub gdy żądany jest adres Tor.',
  fr_FR:
    "Requis pour la connectivité .onion entre pairs, onlynet=onion, ou lorsqu'une adresse Tor est demandée.",
}
