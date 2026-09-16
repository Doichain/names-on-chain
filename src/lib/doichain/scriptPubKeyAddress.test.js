import { describe, it, expect } from 'vitest';
import { getScriptPubKeyAddress } from './scriptPubKeyAddress.js';
import { fixture } from './__fixtures__/fakeElectrumClient.js';

describe('getScriptPubKeyAddress', () => {
	it('reads `address` as returned by Doichain Core 31', () => {
		const tx = fixture.responses['blockchain.transaction.get'][Object.keys(fixture.responses['blockchain.transaction.get'])[0]];
		const output = tx.vout.find((vout) => vout.scriptPubKey.address);
		expect(output.scriptPubKey.addresses).toBeUndefined();
		expect(getScriptPubKeyAddress(output.scriptPubKey)).toBe(output.scriptPubKey.address);
	});

	it('still reads `addresses[0]` from nodes before the fork', () => {
		expect(getScriptPubKeyAddress({ addresses: [fixture.fundedAddress] })).toBe(fixture.fundedAddress);
	});

	it('returns undefined for outputs without an address', () => {
		expect(getScriptPubKeyAddress({ asm: 'OP_RETURN' })).toBeUndefined();
		expect(getScriptPubKeyAddress(undefined)).toBeUndefined();
	});
});
