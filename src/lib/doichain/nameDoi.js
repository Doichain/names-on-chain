import { address, crypto } from '@doichain/doichainjs-lib';
import { DOICHAIN } from './doichain.js';
import { getNameOpUTXOsOfTxHash } from './getNameOpUTXOsOfTxHash.js';

/**
 * Gets the unspent transaction outputs
 * @param electrumClient
 * @param utxoAddress
 * @returns {Promise<*>}
 */
export const getUTXOSFromAddress = async (electrumClient, utxoAddress) => {
	if (!electrumClient || !utxoAddress) return [];
	let script = address.toOutputScript(utxoAddress, DOICHAIN);
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
