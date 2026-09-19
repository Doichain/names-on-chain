import { describe, it, expect } from 'vitest';
import { nameShow } from './nameShow.js';
import { fakeElectrumClient, fixture } from '@names-on-chain/doichain/testing/fake-client';

describe('nameShow', () => {
	it('queries the name index hash ElectrumX computes for a registered name', async () => {
		const client = fakeElectrumClient();
		const outputs = await nameShow(client, fixture.name);
		expect(client.requests[0]).toEqual([
			'blockchain.scripthash.get_history',
			[fixture.nameIndexScripthash]
		]);
		expect(outputs.some((vout) => vout.scriptPubKey.nameOp?.name === fixture.name)).toBe(true);
	});

	it('asks for the same hash whether a name was typed in NFC or NFD', async () => {
		const nfc = fakeElectrumClient();
		const nfd = fakeElectrumClient();
		await nameShow(nfc, 'münchen').catch(() => {});
		await nameShow(nfd, 'münchen').catch(() => {});
		expect(nfd.requests[0]).toEqual(nfc.requests[0]);
	});
});
