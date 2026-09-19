import { getUTXOSFromAddress } from '$lib/doichain/nameDoi.js';
import { getScriptPubKeyAddress } from '@names-on-chain/doichain/scriptPubKeyAddress.js';

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
				address: getScriptPubKeyAddress(utxo.fullTx.scriptPubKey)
			});
		} else {
			nameOpTxs.push(scriptPubKey.nameOp.name);
		}
	}
	return { nameOpTxs, utxoAddresses, totalUtxoValue };
}
