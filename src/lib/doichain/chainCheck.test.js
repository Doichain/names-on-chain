import { describe, expect, it } from 'vitest';
import { blockHash, CHECKPOINTS, verifyChain } from './chainCheck.js';
import { DOICHAIN, DOICHAIN_REGTEST } from './doichain.js';
import headers from './__fixtures__/chain-headers.json';

/** A server that answers blockchain.block.header from a table, or fails. */
const serverWith = (answers) => ({
	requests: [],
	async request(method, params = []) {
		this.requests.push([method, params]);
		if (method !== 'blockchain.block.header') throw new Error(`unexpected ${method}`);
		const answer = answers[params[0]];
		if (answer instanceof Error) throw answer;
		if (answer === undefined) throw new Error(`height ${params[0]} out of range`);
		return answer;
	}
});

describe('blockHash', () => {
	it('hashes the first 80 bytes of a recorded header, AuxPoW data and all', () => {
		expect(headers.checkpoint.hex.length / 2).toBeGreaterThan(80);
		expect(blockHash(headers.checkpoint.hex)).toBe(headers.checkpoint.hash);
		expect(blockHash(headers.tip.hex)).toBe(headers.tip.hash);
	});
});

describe('verifyChain', () => {
	it('accepts a server that has the checkpoint block of the valid chain', async () => {
		expect(CHECKPOINTS['doichain-mainnet'].hash).toBe(headers.checkpoint.hash);
		const server = serverWith({ 431017: headers.checkpoint.hex });
		expect(await verifyChain(server, DOICHAIN)).toEqual({ ok: true });
		expect(server.requests).toEqual([['blockchain.block.header', [431017]]]);
	});

	it('refuses a server with another block at the checkpoint height', async () => {
		const server = serverWith({ 431017: headers.blockBeforeSplit.hex });
		expect(await verifyChain(server, DOICHAIN)).toEqual({ ok: false, reason: 'wrongChain' });
	});

	it('does not trust a server that cannot show the checkpoint', async () => {
		expect(await verifyChain(serverWith({}), DOICHAIN)).toEqual({
			ok: false,
			reason: 'unverified'
		});
		expect(await verifyChain(serverWith({ 431017: 'abcd' }), DOICHAIN)).toEqual({
			ok: false,
			reason: 'unverified'
		});
	});

	it('has nothing to check on regtest', async () => {
		const server = serverWith({});
		expect(await verifyChain(server, DOICHAIN_REGTEST)).toEqual({ ok: true });
		expect(server.requests).toEqual([]);
	});
});
