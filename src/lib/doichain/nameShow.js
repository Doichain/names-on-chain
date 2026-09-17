import { nameops } from '@doichain/doichainjs-lib'
import { getNameOpUTXOsOfTxHash } from './getNameOpUTXOsOfTxHash.js'
import { normalizeName } from './nameBytes.js'

/**
 * Queries Electrumx to find transactions associated with a given nameId
 *
 * ElectrumX indexes every name under the script hash of
 * OP_NAME_UPDATE <name> <empty value> OP_2DROP OP_DROP OP_RETURN.
 * nameops.nameIndexScriptHash from doichainjs-lib builds that script from the
 * bytes of the name and hashes it the way Electrum expects.
 * The name is looked up in NFC, the same form the app registers.
 *
 * @param {ElectrumClient} electrumClient - The Electrum client instance to use for querying
 * @param {string} nameToCheck - The nameId to search for in the blockchain
 *
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of UTXO objects
 * @throws {Error} If there's an issue connecting to the Electrum server or querying the blockchain
 *
 * @example
 * const electrumClient = new ElectrumClient( );
 * const nameId = 'example.doi';
 * const utxos = await nameShow(electrumClient, nameId);
 */
export const nameShow = async (electrumClient, nameToCheck) => {

	const scriptHash = nameops.nameIndexScriptHash(normalizeName(nameToCheck));
	let results = []
	await electrumClient.connect("electrum-client-js", "1.4.2");
	const result = await electrumClient.request('blockchain.scripthash.get_history', [scriptHash]);

	for (const item of result) {
		const detailResults = await getNameOpUTXOsOfTxHash(electrumClient,item.tx_hash);
		// the block height tells which operation is the newest and when the name expires
		for (const output of detailResults) output.height = item.height;
		results = [...detailResults, ...results];
	}
	return results
}