// The plumbing every lesson shares. Components live under
// `@names-on-chain/doichain/components/…`, the recorded server answers and the
// WebSocket simulator under `@names-on-chain/doichain/testing`.
export { connectElectrum, getConnectionStatus, MAX_RETRIES } from './connectElectrum.js';
export { DOICHAIN, DOICHAIN_REGTEST, DOICHAIN_TESTNET, VERSION } from './doichain.js';
export { EXPLORER } from './explorer.js';
export { debounce } from './debounce.js';
export { describeNameBytes, normalizeName } from './nameBytes.js';
export { nameExpirationDepth, nameExpiry, latestNameOperation } from './nameExpiry.js';
export { createQrReader } from './scanQr.js';
export { getScriptPubKeyAddress } from './scriptPubKeyAddress.js';
export {
	getNameOPStackScript,
	NAME_MAX_LENGTH,
	NAME_MIN_LENGTH,
	VALUE_MAX_LENGTH
} from './getNameOPStackScript.js';
