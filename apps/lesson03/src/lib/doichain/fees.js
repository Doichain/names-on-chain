/**
 * Doichain Core v31.1.5 relays no transaction that pays less than 0.001 DOI
 * per 1,000 vbytes (its default minrelaytxfee): 100 swartz per vbyte.
 * The public ElectrumX servers reported between 0.001 and 1 swartz per vbyte
 * as relay fee, so what a server says is only used when it asks for more,
 * and never beyond MAX_FEE_RATE.
 */
export const MIN_RELAY_FEE_RATE = 100;
export const MAX_FEE_RATE = 1000;

/**
 * A transaction spends at most this many coins. Every coin makes the PSBT and
 * its QR code longer and links one more coin to the others on chain.
 */
export const MAX_INPUTS = 20;

/** push of a DER signature with sighash byte (at most 73 bytes) and of a compressed public key */
const P2PKH_SCRIPT_SIG = 1 + 73 + 1 + 33;
/** item count, signature and public key, in weight units */
const P2WPKH_WITNESS = 1 + 1 + 73 + 1 + 33;

const varIntSize = (n) => (n < 0xfd ? 1 : n <= 0xffff ? 3 : 5);

/**
 * The fee rate to pay, in swartz per vbyte.
 *
 * @param {unknown} relayFee - blockchain.relayfee of the ElectrumX server, in DOI per kilobyte.
 *   Whatever else a server sends counts as no answer.
 * @returns {number}
 */
export function feeRateFor(relayFee) {
	const reported = (Number(relayFee) * 1e8) / 1000;
	if (!Number.isFinite(reported) || reported <= MIN_RELAY_FEE_RATE) return MIN_RELAY_FEE_RATE;
	return Math.min(Math.ceil(reported), MAX_FEE_RATE);
}

/**
 * The size of the signed transaction, estimated from its inputs and outputs.
 * Signatures are counted at their largest size, so the fee never falls short.
 *
 * @param {Array<{segwit: boolean}>} inputs - segwit: spent with a witness (P2WPKH)
 * @param {Buffer[]} outputScripts
 * @returns {number} vbytes
 */
export function estimateVsize(inputs, outputScripts) {
	let bytes = 4 + varIntSize(inputs.length) + varIntSize(outputScripts.length) + 4;
	for (const script of outputScripts) bytes += 8 + varIntSize(script.length) + script.length;
	const withWitness = inputs.some((input) => input.segwit);
	let witness = withWitness ? 2 : 0; // marker and flag
	for (const input of inputs) {
		bytes += 32 + 4 + 4 + (input.segwit ? 1 : 1 + P2PKH_SCRIPT_SIG);
		if (withWitness) witness += input.segwit ? P2WPKH_WITNESS : 1;
	}
	return Math.ceil((bytes * 4 + witness) / 4);
}

/**
 * @param {number} vsize
 * @param {number} feeRate - swartz per vbyte
 * @returns {number} swartz
 */
export const feeFor = (vsize, feeRate) => Math.ceil(vsize * feeRate);

/**
 * Chooses the coins for a payment: confirmed before unconfirmed, the largest
 * first, until they cover the amount plus the fee for exactly these coins.
 *
 * @template {{value: number, height?: number}} Coin
 * @param {Coin[]} coins
 * @param {number} amount - swartz the outputs need, change not included
 * @param {(selected: Coin[]) => number} feeFor - fee for these coins, with a change output
 * @param {number} [maxInputs]
 * @returns {{selected?: Coin[], total?: number, fee?: number, error?: 'insufficient' | 'tooFragmented', needed?: number}}
 *   the coins, their total and the fee; or error, with needed for 'tooFragmented'
 */
export function selectCoins(coins, amount, feeFor, maxInputs = MAX_INPUTS) {
	// --8<-- coin-selection · take coins until they cover the amount and the fee for exactly those coins
	const confirmed = (coin) => (coin.height > 0 ? 1 : 0);
	const ordered = [...coins].sort((a, b) => confirmed(b) - confirmed(a) || b.value - a.value);
	const selected = [];
	let total = 0;
	for (const coin of ordered) {
		selected.push(coin);
		total += coin.value;
		const fee = feeFor(selected);
		if (total >= amount + fee) {
			if (selected.length > maxInputs) return { error: 'tooFragmented', needed: selected.length };
			return { selected, total, fee };
		}
	}
	return { error: 'insufficient' };
	// -->8--
}
