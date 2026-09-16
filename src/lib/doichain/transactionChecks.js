import { Transaction } from 'bitcoinjs-lib';
import { VERSION } from './doichain.js';

/**
 * Change below this many swartz makes a transaction non-standard: nodes would
 * not relay it. Such a remainder goes to the miners instead.
 */
export const DUST_LIMIT = 546;

/** OP_NAME_NEW, OP_NAME_FIRSTUPDATE, OP_NAME_UPDATE and Doichain's OP_NAME_DOI */
const NAME_OPCODES = [0x51, 0x52, 0x53, 0x5a];

/**
 * Does this output script carry a name?
 * @param {Buffer} script
 */
export const isNameScript = (script) => NAME_OPCODES.includes(script?.[0]);

/**
 * OP_0 <20 bytes>
 * @param {Buffer} script
 */
export const isP2WPKHScript = (script) => script?.length === 22 && script[0] === 0x00 && script[1] === 0x14;

/**
 * The output a UTXO points to, read from the raw transaction instead of the
 * server's JSON. The hash of the raw transaction must be the txid the input
 * spends, so the server cannot make up an amount: a wallet signing a legacy
 * input does not see amounts, and the app would show a wrong fee.
 *
 * @param {{hash: string, n: number, hex: string}} utxo
 * @returns {{script: Buffer, value: number}}
 * @throws {Error} if the raw transaction does not belong to the txid or lacks the output
 */
export function verifiedOutput(utxo) {
	const tx = Transaction.fromHex(utxo.hex);
	if (tx.getId() !== utxo.hash) {
		throw new Error(`raw transaction does not hash to ${utxo.hash}`);
	}
	const output = tx.outs[utxo.n];
	if (!output) {
		throw new Error(`transaction ${utxo.hash} has no output ${utxo.n}`);
	}
	return { script: output.script, value: output.value };
}

/**
 * The input for a verified UTXO. Every input carries its whole previous
 * transaction (nonWitnessUtxo), so a wallet can check amounts on its own;
 * SegWit inputs also get witnessUtxo, which their signatures commit to.
 *
 * @param {{hash: string, n: number, hex: string}} utxo
 * @param {{script: Buffer, value: number}} output - from verifiedOutput(utxo)
 * @param {object} [extra] - further input fields, e.g. sequence
 */
export function inputFor(utxo, output, extra = {}) {
	const input = { hash: utxo.hash, index: utxo.n, nonWitnessUtxo: Buffer.from(utxo.hex, 'hex'), ...extra };
	if (isP2WPKHScript(output.script)) {
		input.witnessUtxo = { script: output.script, value: output.value };
	}
	return input;
}

/**
 * What must hold for every name transaction before it is handed to a wallet:
 * version 0x7100 and exactly one name output.
 *
 * @param {import('bitcoinjs-lib').Psbt} psbt
 * @returns {string|undefined} what is wrong, or undefined
 */
export function checkNameTransaction(psbt) {
	if (psbt.version !== VERSION) {
		return `version is ${psbt.version}, not ${VERSION}`;
	}
	const nameOutputs = psbt.txOutputs.filter((output) => isNameScript(output.script)).length;
	if (nameOutputs !== 1) {
		return `the transaction has ${nameOutputs} name outputs instead of one`;
	}
	return undefined;
}
