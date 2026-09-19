import { address, crypto } from '@doichain/doichainjs-lib';
import { getNameOpUTXOsOfTxHash } from './getNameOpUTXOsOfTxHash.js';

/**
 * The unspent outputs of an address, each with the transaction that created it.
 *
 * The address is read with the parameters of the given network, so the same code
 * works on mainnet and on regtest.
 *
 * @param electrumClient
 * @param {string} utxoAddress
 * @param {object} network - DOICHAIN, DOICHAIN_REGTEST, ...
 * @returns {Promise<*>}
 */
export const getUTXOSFromAddress = async (electrumClient, utxoAddress, network) => {
	if (!electrumClient || !utxoAddress || !network) return [];
	let script = address.toOutputScript(utxoAddress, network);
	let hash = crypto.sha256(script);
	let reversedHash = Buffer.from(hash.reverse()).toString('hex');

	const utxos = await electrumClient.request('blockchain.scripthash.listunspent', [reversedHash]);
	for (let i = 0; i < utxos.length; i++) {
		const utxo = utxos[i];
		const fullTX = await getNameOpUTXOsOfTxHash(electrumClient, utxo.tx_hash, utxo.tx_pos);
		utxo.fullTx = fullTX;
	}
	return utxos;
};
