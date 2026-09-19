/**
 * Takes a txid and returns its outputs, each with the txid and the raw
 * transaction. ElectrumX decodes a name operation into scriptPubKey.nameOp.
 *
 * @param electrumClient
 * @param {string} tx - the txid
 * @param {number} [n] - only this output
 * @returns {Promise<any>} the output n, or all outputs when n is not given
 */
export async function getNameOpUTXOsOfTxHash(electrumClient, tx, n) {
	const parsedUtxos = [];
	const txDetails = await electrumClient.request('blockchain.transaction.get', [tx, true]);
	if (n !== undefined) {
		const parsedUtxo = txDetails.vout[n]; //await getNameOpOfVout(electrumClient, vout)
		parsedUtxo.txid = txDetails.txid;
		parsedUtxo.hex = txDetails.hex;
		return parsedUtxo;
	} else {
		for (const vout of txDetails.vout) {
			const parsedUtxo = vout; //await getNameOpOfVout(electrumClient, vout)
			parsedUtxo.txid = txDetails.txid;
			parsedUtxo.hex = txDetails.hex;
			parsedUtxos.push(parsedUtxo);
		}
		return parsedUtxos;
	}
}
