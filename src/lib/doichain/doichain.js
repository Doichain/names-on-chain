// Network parameters from Doichain Core (src/kernel/chainparams.cpp).
// The message prefix starts with its own length: 0x19 = 25 characters.
export const DOICHAIN = {
    name: 'doichain-mainnet',
    messagePrefix: '\x19Doichain Signed Message:\n',
    bech32: 'dc',
    bip32: {
        public: 0x0488b21e,
        private: 0x0488ade4
    },
    pubKeyHash: 52, // P2PKH addresses start with M or N
    scriptHash: 13, // P2SH addresses start with 6
    wif: 180,
};

export const DOICHAIN_TESTNET = {
    name: 'doichain-testnet',
    messagePrefix: '\x19Doichain Signed Message:\n',
    bech32: 'td',
    bip32: {
        public: 0x043587CF,
        private: 0x04358394
    },
    pubKeyHash: 111, // P2PKH addresses start with m or n
    scriptHash: 196,
    wif: 239,
};

export const DOICHAIN_REGTEST = {
    name: "doichain-regtest",
    messagePrefix: "\x19Doichain Signed Message:\n",
    bech32: "ncrt",
    bip32: {
        public: 0x043587cf,
        private: 0x04358394,
    },
    pubKeyHash: 111,
    scriptHash: 196,
    wif: 239,
};

// every transaction with a name output needs this version
export const VERSION = 0x7100
