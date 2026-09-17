/**
 * A Doichain name stays with its owner for 36,000 blocks after its last name
 * operation, about 250 days at ten minutes per block. After that anybody can
 * register it again. Regtest uses 30 blocks, so expiry can be tried out.
 */
const EXPIRATION_DEPTH = {
	'doichain-mainnet': 36000,
	'doichain-testnet': 36000,
	'doichain-regtest': 30
};

/**
 * @param {{name?: string}} [network]
 * @returns {number}
 */
export function nameExpirationDepth(network) {
	return EXPIRATION_DEPTH[network?.name] ?? EXPIRATION_DEPTH['doichain-mainnet'];
}

/**
 * How long a name operation mined at `height` keeps the name.
 * ElectrumX reports transactions still in the mempool with a height of 0 or -1.
 *
 * @param {number} height - block height of the name operation
 * @param {number|undefined} tipHeight - height of the newest block, if known
 * @param {{name?: string}} [network]
 * @returns {{confirmed: boolean, expiresAt?: number, blocksLeft?: number, expired: boolean}}
 */
export function nameExpiry(height, tipHeight, network) {
	if (!(height > 0)) return { confirmed: false, expired: false };
	const expiresAt = height + nameExpirationDepth(network);
	if (!(tipHeight > 0)) return { confirmed: true, expiresAt, expired: false };
	return { confirmed: true, expiresAt, blocksLeft: expiresAt - tipHeight, expired: expiresAt <= tipHeight };
}

/**
 * The output that holds a name today: its newest name operation.
 * Unconfirmed operations count as newer than any mined one.
 *
 * @param {Array<{height?: number, scriptPubKey?: {nameOp?: {name: string, name_encoding?: string}, [key: string]: any}, [key: string]: any}>} outputs
 * @param {string} name - in NFC, as the app looks names up
 */
export function latestNameOperation(outputs, name) {
	const rank = (output) => (output.height > 0 ? output.height : Number.POSITIVE_INFINITY);
	return outputs
		.filter((output) => nameOfOutput(output) === name)
		.reduce((latest, output) => (!latest || rank(output) >= rank(latest) ? output : latest), undefined);
}

function nameOfOutput(output) {
	const nameOp = output?.scriptPubKey?.nameOp;
	if (!nameOp) return undefined;
	const name = nameOp.name_encoding === 'hex' ? Buffer.from(nameOp.name, 'hex').toString('utf8') : nameOp.name;
	return name.normalize('NFC');
}
