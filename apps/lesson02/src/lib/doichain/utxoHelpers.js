import { getUTXOSFromAddress } from '@names-on-chain/lesson01/doichain/nameDoi.js';
import { getScriptPubKeyAddress } from '@names-on-chain/doichain/scriptPubKeyAddress.js';

/**
 * Retrieves UTXOs and name operations associated with a Doichain address
 *
 * @async
 * @param {Object} electrumClient - The Electrum client instance
 * @param {string} doichainAddress - The Doichain address to query
 * @param {Object} network - DOICHAIN, DOICHAIN_REGTEST, ...
 * @returns {Promise<{
 *   nameOpTxs: Array<{name: string, value: string, txid: string, height: number, expires: number}>,
 *   utxoAddresses: Array<Object>,
 *   totalUtxoValue: number
 * }>} the coins without a name, the names, and the value of all coins in swartz
 * @throws {Error} If there's an issue querying the Electrum server
 *
 * @example
 * const { nameOpTxs } = await getUtxosAndNamesOfAddress(electrumClient, myAddress, network);
 */
export async function getUtxosAndNamesOfAddress(electrumClient, doichainAddress, network) {
	let nameOpTxs = [];
	let utxoAddresses = [];
	let totalUtxoValue = 0;
	const result = await getUTXOSFromAddress(electrumClient, doichainAddress, network);
	for (let utxo of result) {
		const scriptPubKey = utxo.fullTx.scriptPubKey;
		if (!scriptPubKey.nameOp) {
			utxoAddresses.push({
				txid: utxo.fullTx.txid,
				hex: utxo.fullTx.hex,
				hash: utxo.tx_hash,
				n: utxo.fullTx.n,
				value: utxo.value,
				height: utxo.height,
				address: getScriptPubKeyAddress(utxo.fullTx.scriptPubKey)
			});
		} else {
			nameOpTxs.push({
				name: scriptPubKey.nameOp.name,
				value: scriptPubKey.nameOp.value,
				txid: utxo.fullTx.txid,
				height: utxo.height,
				expires: utxo.height + 36000
				// You might need to fetch additional data to calculate expiration
			});
		}
		totalUtxoValue += utxo.value;
	}
	return { nameOpTxs, utxoAddresses, totalUtxoValue };
}
