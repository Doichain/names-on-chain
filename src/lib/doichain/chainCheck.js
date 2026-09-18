import { crypto } from '@doichain/doichainjs-lib';

/** Where people can look up a block of the valid Doichain chain themselves. */
export const EXPLORER = 'https://doi-explorer.le-space.de';

/**
 * The first block the two Doichain chains do not share.
 *
 * The new rules of Doichain Core v31 took effect at height 431,017 on
 * 11 September 2026, but that block is on both chains: Doichain never enforced
 * the difficulty field, so the old 0.20 nodes accepted it too. Both chains
 * build their next block on it, and there they part – at 431,018 the chain of
 * the fork has 71d5…4b67, the old one bab4…2d34. A checkpoint at 431,017 would
 * pass on either chain and prove nothing.
 *
 * Checked on 18 September 2026 against all four ElectrumX servers of the app,
 * doi-explorer.le-space.de and the explorer of the old chain, which is by now
 * some 12,000 blocks ahead because it kept mining at the old difficulty.
 * Regtest and testnet have no checkpoint.
 */
export const CHECKPOINTS = {
	'doichain-mainnet': {
		height: 431018,
		hash: '71d50ff12b090561cc918ddb560334b4350758c7eace3f058dd332fb112f4b67'
	}
};

/**
 * The hash of a block: SHA-256 applied twice to the first 80 bytes of its
 * header, shown in reverse byte order like every block explorer does.
 * ElectrumX sends the merged-mining (AuxPoW) data of a Doichain block after
 * those 80 bytes; it is not part of the hash.
 *
 * @param {string} headerHex - the header as ElectrumX sends it
 * @returns {string}
 */
export function blockHash(headerHex) {
	const header = Buffer.from(headerHex.slice(0, 160), 'hex');
	return Buffer.from(crypto.hash256(header)).reverse().toString('hex');
}

/**
 * Asks a server for the checkpoint block and compares its hash.
 *
 * ElectrumX serves whatever chain its node follows and sends no proof. This
 * check does not prove the newest blocks either, but a server on the other
 * chain, or one that has not reached the split yet, fails it.
 *
 * @param {{request(method: string, params?: unknown[]): Promise<any>}} client
 * @param {{name?: string}} network
 * @returns {Promise<{ok: boolean, reason?: 'wrongChain' | 'unverified'}>}
 */
export async function verifyChain(client, network) {
	const checkpoint = CHECKPOINTS[network?.name];
	if (!checkpoint) return { ok: true };
	let header;
	try {
		header = await client.request('blockchain.block.header', [checkpoint.height]);
	} catch {
		// no answer, or a server that has not reached the checkpoint yet
		return { ok: false, reason: 'unverified' };
	}
	if (typeof header !== 'string' || header.length < 160) return { ok: false, reason: 'unverified' };
	return blockHash(header) === checkpoint.hash ? { ok: true } : { ok: false, reason: 'wrongChain' };
}
