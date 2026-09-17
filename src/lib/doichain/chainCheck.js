import { crypto } from '@doichain/doichainjs-lib';

/** Where people can look up a block of the valid Doichain chain themselves. */
export const EXPLORER = 'https://doi-explorer.le-space.de';

/**
 * A block that only the valid Doichain chain has. Doichain Core v31.1.5 split
 * the chain at block 431,017 on 11 September 2026; a server that still follows
 * the old chain has another block at this height.
 *
 * Checked on 17 September 2026 against doi-explorer.le-space.de and all four
 * ElectrumX servers of the app. Regtest and testnet have no checkpoint.
 */
export const CHECKPOINTS = {
	'doichain-mainnet': {
		height: 431017,
		hash: '75a4ca09bf092862061e0e1c9f066145962f222ef965f3e9ccc27c6bcd0da320'
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
 * check does not prove the newest blocks either, but a server on the old
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
