import { describe, it, expect } from 'vitest';
import { getUtxosAndNamesOfAddress } from './utxoHelpers.js';
import { DOICHAIN } from '@names-on-chain/doichain/doichain.js';
import { fakeElectrumClient, fixture } from '@names-on-chain/doichain/testing/fake-client';

describe('UTXOs of an address against Doichain Core 31 responses', () => {
	it('reads the address of coin UTXOs instead of throwing', async () => {
		const { utxoAddresses, nameOpTxs } = await getUtxosAndNamesOfAddress(
			fakeElectrumClient(),
			fixture.fundedAddress,
			DOICHAIN
		);
		expect(utxoAddresses).toHaveLength(1);
		expect(utxoAddresses[0].address).toBe(fixture.fundedAddress);
		expect(JSON.stringify(nameOpTxs)).toContain('hello');
	});
});
