import { address } from 'bitcoinjs-lib';

/**
 * Is this a valid address of the given network? Checksum, prefix and type are
 * checked the way a node reads them: by turning the address into the output
 * script it stands for.
 *
 * @param {object} network - DOICHAIN, DOICHAIN_REGTEST, ...
 * @param {string} candidate
 * @returns {boolean}
 */
export function isAddressOf(network, candidate) {
	if (!candidate || !network) return false;
	try {
		address.toOutputScript(candidate, network);
		return true;
	} catch {
		return false;
	}
}

/**
 * An address as typed, pasted or scanned: without surrounding spaces and
 * without a "doichain:" payment URI around it.
 *
 * @param {string} text
 * @returns {string}
 */
export function cleanAddressInput(text) {
	return (text ?? '').trim().replace(/^doichain:/i, '').split('?')[0];
}
