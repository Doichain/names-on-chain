/**
 * An amount of DOI as a person types it – "1", "1.5", "1,5" or "0.00000001" –
 * in swartz (1 DOI = 100,000,000 swartz). Anything else is undefined, so
 * "2" + 1000000 can never turn into "21000000" and "1,5" no longer makes
 * QR code and PSBT vanish without a word.
 *
 * @param {string} text
 * @returns {number|undefined} swartz
 */
export function parseDoiAmount(text) {
	const match = /^\s*(\d*)(?:[.,](\d{1,8}))?\s*$/.exec(String(text ?? ''));
	if (!match || (match[1] === '' && match[2] === undefined)) return undefined;
	const whole = Number(match[1] || '0');
	const fraction = Number((match[2] ?? '').padEnd(8, '0'));
	const swartz = whole * 100_000_000 + fraction;
	return Number.isSafeInteger(swartz) ? swartz : undefined;
}
