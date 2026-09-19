/**
 * Returns the address an output pays to, as ElectrumX reports it.
 *
 * Since the Doichain fork at block 431017 the servers run Doichain Core 31,
 * whose verbose transactions carry `scriptPubKey.address` (a string).
 * Nodes up to 0.20.x returned `scriptPubKey.addresses` (an array) instead.
 *
 * @param {{address?: string, addresses?: string[], [key: string]: any} | undefined} scriptPubKey
 * @returns {string | undefined}
 */
export function getScriptPubKeyAddress(scriptPubKey) {
	return scriptPubKey?.address ?? scriptPubKey?.addresses?.[0];
}
