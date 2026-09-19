// The network parameters come from doichainjs-lib, which takes them from
// Doichain Core (src/kernel/chainparams.cpp). Only the name is added here:
// the app picks its servers by it.
import { networks } from '@doichain/doichainjs-lib';

/** P2PKH addresses start with M or N, P2SH with 6, bech32 with dc1 */
export const DOICHAIN = { ...networks.doichain, name: 'doichain-mainnet' };

/** P2PKH addresses start with m or n, bech32 with td1 */
export const DOICHAIN_TESTNET = { ...networks.doichainTestnet, name: 'doichain-testnet' };

/** like testnet, with ncrt1 as the bech32 prefix */
export const DOICHAIN_REGTEST = { ...networks.doichainRegtest, name: 'doichain-regtest' };

// every transaction with a name output needs this version
export const VERSION = 0x7100;
