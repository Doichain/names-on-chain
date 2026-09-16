import { describe, it, expect } from 'vitest';
import { getUtxosAndNamesOfAddress } from './utxoHelpers.js';
import { fakeElectrumClient, fixture } from './__fixtures__/fakeElectrumClient.js';

describe('UTXOs of an address against Doichain Core 31 responses', () => {
	it('reads the address of coin UTXOs instead of throwing', async () => {
		const { utxoAddresses, nameOpTxs } = await getUtxosAndNamesOfAddress(fakeElectrumClient(), fixture.fundedAddress);
		expect(utxoAddresses).toHaveLength(1);
		expect(utxoAddresses[0].address).toBe(fixture.fundedAddress);
		expect(JSON.stringify(nameOpTxs)).toContain('hello');
	});
});
