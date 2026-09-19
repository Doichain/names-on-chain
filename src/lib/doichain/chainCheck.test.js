import { describe, expect, it } from 'vitest';
import { electrum } from '@doichain/doichainjs-lib';
import { DOICHAIN, DOICHAIN_REGTEST } from './doichain.js';
import headers from './__fixtures__/chain-headers.json';

/**
 * The chain check itself lives in doichainjs-lib and is tested there. What has
 * to hold here is the wiring: that the app's network objects reach the right
 * checkpoint, and that the block the app records in its fixture is the one the
 * library asks for.
 */
const serverWith = (answer) => ({
	requests: [],
	async request(method, params = []) {
		this.requests.push([method, params]);
		return answer;
	}
});

describe('the chain check the app relies on', () => {
	it('asks for the block the two chains do not share', async () => {
		const checkpoint = electrum.CHECKPOINTS[DOICHAIN.bech32];
		expect(checkpoint.height).toBe(headers.checkpoint.height);
		expect(checkpoint.hash).toBe(headers.checkpoint.hash);
		// the flag day block is on both chains, so it cannot be the checkpoint
		expect(headers.sharedWithOldChain.height).toBe(431017);
		expect(checkpoint.height).toBe(headers.oldChain.height);

		const server = serverWith(headers.checkpoint.hex);
		expect(await electrum.verifyChain(server, DOICHAIN)).toEqual({ ok: true });
		expect(server.requests).toEqual([['blockchain.block.header', [checkpoint.height]]]);
	});

	it('refuses a server that answers with the old chain', async () => {
		expect(await electrum.verifyChain(serverWith(headers.oldChain.hex), DOICHAIN)).toEqual({
			ok: false,
			reason: 'wrongChain'
		});
	});

	it('has nothing to check on regtest, and asks nothing', async () => {
		const server = serverWith(headers.checkpoint.hex);
		expect(await electrum.verifyChain(server, DOICHAIN_REGTEST)).toEqual({ ok: true });
		expect(server.requests).toEqual([]);
	});

	it('hashes a recorded header the way the explorer shows it', () => {
		expect(electrum.blockHash(headers.checkpoint.hex)).toBe(headers.checkpoint.hash);
		expect(electrum.blockHash(headers.tip.hex)).toBe(headers.tip.hash);
	});
});
