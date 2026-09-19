import { describe, expect, it } from 'vitest';
import { DOICHAIN } from '@names-on-chain/doichain/doichain.js';
import { buildNameRegistrationPsbt } from './buildNameRegistrationPsbt.js';
import { describePsbt } from './describePsbt.js';
import { getUtxosAndNamesOfAddress } from './utxoHelpers.js';
import { fakeElectrumClient, fixture } from '@names-on-chain/doichain/testing/fake-client';

const STORAGE_FEE = 1_000_000;

/** the coins of the funded address, as the app reads them from a server */
async function coins() {
	const { utxoAddresses } = await getUtxosAndNamesOfAddress(
		fakeElectrumClient(),
		fixture.fundedAddress,
		DOICHAIN
	);
	return utxoAddresses;
}

/** the registration the app builds for a free name, as the wallet would read it */
async function registration() {
	const built = buildNameRegistrationPsbt(
		await coins(),
		'a-free-name',
		DOICHAIN,
		STORAGE_FEE,
		fixture.fundedAddress,
		fixture.fundedAddress,
		fixture.fundedAddress,
		100
	);
	expect(built.error).toBeUndefined();
	return describePsbt(built.psbtBase64, DOICHAIN);
}

describe('describePsbt', () => {
	it('reads the version Doichain needs for a name transaction', async () => {
		expect((await registration()).version).toBe(0x7100);
	});

	it('names every coin the transaction spends, with its amount', async () => {
		const { inputs } = await registration();
		expect(inputs.length).toBeGreaterThan(0);
		for (const input of inputs) {
			expect(input.txid).toMatch(/^[0-9a-f]{64}$/);
			expect(input.value).toBeGreaterThan(0);
		}
	});

	it('marks the name output and reads the holder out of it', async () => {
		const names = (await registration()).outputs.filter((output) => output.isName);
		expect(names).toHaveLength(1);
		expect(names[0].value).toBe(STORAGE_FEE);
		expect(names[0].address).toBe(fixture.fundedAddress);
		// OP_NAME_DOI, the name, an empty value, OP_2DROP OP_DROP, then the holder
		expect(names[0].asm).toMatch(/^OP_10 [0-9a-f]+ OP_0 OP_2DROP OP_DROP /);
		expect(names[0].hex.startsWith('5a')).toBe(true);
	});

	it('leaves the miners what the transaction does not pay out', async () => {
		const { inputs, outputs, fee } = await registration();
		const spent = inputs.reduce((sum, input) => sum + input.value, 0);
		const paid = outputs.reduce((sum, output) => sum + output.value, 0);
		expect(fee).toBe(spent - paid);
		expect(fee).toBeGreaterThan(0);
	});
});
