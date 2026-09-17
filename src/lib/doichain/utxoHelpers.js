import { getUTXOSFromAddress } from './nameDoi.js';
import { getScriptPubKeyAddress } from './scriptPubKeyAddress.js';

/**
 * Retrieves UTXOs and name operations associated with a Doichain address
 *
 * @async
 * @param {Object} electrumClient - The Electrum client instance
 * @param {string} doichainAddress - The Doichain address to query
 * @returns {Promise<{
 *   nameOpTxs: Array<{name: string, nameValue: string, expires: number, txid: string, hex: string, scriptPubKey: any, hash: string, n: number, value: number, height: number, address: string}>,
 *   utxoAddresses: Array<Object>,
 *   totalUtxoValue: number
 * }>} the coins without a name, the names with their outputs, and the value of all coins in swartz
 * @throws {Error} If there's an issue querying the Electrum server
 *
 * @example
 * const { nameOpTxs } = await getUtxosAndNamesOfAddress(electrumClient, myAddress);
 */
export async function getUtxosAndNamesOfAddress(electrumClient, doichainAddress) {
	let nameOpTxs = [];
	let utxoAddresses = [];
	let totalUtxoValue = 0;
	const result = await getUTXOSFromAddress(electrumClient, doichainAddress);
	for (let utxo of result) {
		const scriptPubKey = utxo.fullTx.scriptPubKey;
		if (!scriptPubKey?.nameOp) {
			utxoAddresses.push({
				txid: utxo.fullTx.txid,
				hex: utxo.fullTx.hex,
				scriptPubKey: utxo.fullTx.scriptPubKey,
				hash: utxo.tx_hash,
				n: utxo.tx_pos,
				value: utxo.value,
				height: utxo.height,
				address: getScriptPubKeyAddress(utxo.fullTx?.scriptPubKey)
			});
		} else {
			nameOpTxs.push({
				name: scriptPubKey.nameOp.name,
				nameValue: scriptPubKey.nameOp.value,
				expires: utxo.height + 36000,
				txid: utxo.fullTx.txid,
				hex: utxo.fullTx.hex,
				scriptPubKey: utxo.fullTx.scriptPubKey,
				hash: utxo.tx_hash,
				n: utxo.tx_pos,
				value: utxo.value,
				height: utxo.height,
				address: getScriptPubKeyAddress(utxo.fullTx?.scriptPubKey)
			});
		}
		totalUtxoValue += utxo.value;
	}
	return { nameOpTxs, utxoAddresses, totalUtxoValue };
}
