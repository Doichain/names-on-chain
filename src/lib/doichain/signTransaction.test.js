import { describe, it, expect, vi } from 'vitest';
import { payments, Psbt } from 'bitcoinjs-lib';
import { DOICHAIN, VERSION } from './doichain.js';
import { getNameOPStackScript } from './getNameOPStackScript.js';
import { signTransaction } from './signTransaction.js';
import { DUST_LIMIT, isNameScript } from './transactionChecks.js';
import { getUtxosAndNamesOfAddress } from './utxoHelpers.js';
import { fakeElectrumClient, fixture } from './__fixtures__/fakeElectrumClient.js';

const STORAGE_FEE = 1_000_000;

async function coins() {
	const { utxoAddresses } = await getUtxosAndNamesOfAddress(fakeElectrumClient(), fixture.fundedAddress);
	return utxoAddresses;
}

const register = (utxos, name = 'noc-test-name', storageFee = STORAGE_FEE, recipient = fixture.fundedAddress) =>
	signTransaction(utxos, name, DOICHAIN, storageFee, recipient, fixture.fundedAddress, fixture.fundedAddress);

describe('registration PSBT', () => {
	it('registers the name with an empty value and pays the change back', async () => {
		const utxos = await coins();
		const result = register(utxos);
		expect(result.error).toBeUndefined();

		const psbt = Psbt.fromBase64(result.psbtBase64, { network: DOICHAIN });
		expect(psbt.version).toBe(VERSION);
		const nameOutputs = psbt.txOutputs.filter((output) => isNameScript(output.script));
		expect(nameOutputs).toHaveLength(1);
		expect(nameOutputs[0].script.equals(getNameOPStackScript('noc-test-name', '', fixture.fundedAddress, DOICHAIN))).toBe(true);
		expect(nameOutputs[0].value).toBe(STORAGE_FEE);

		const inputs = psbt.data.inputs.length;
		expect(inputs).toBe(utxos.length);
		expect(psbt.data.inputs.every((input) => input.nonWitnessUtxo)).toBe(true);
		const outputs = psbt.txOutputs.reduce((sum, output) => sum + output.value, 0);
		expect(result.totalInputAmount - outputs).toBe(result.transactionFee);
	});

	it('takes amounts from the raw transaction, not from the server JSON', async () => {
		const honest = register(await coins());
		const lied = (await coins()).map((utxo) => ({ ...utxo, value: utxo.value + 99_00000000 }));
		const result = register(lied);
		expect(result.totalInputAmount).toBe(honest.totalInputAmount);
		expect(result.changeAmount).toBe(honest.changeAmount);
	});

	it('refuses a raw transaction that does not belong to the txid', async () => {
		const utxos = (await coins()).map((utxo) => ({ ...utxo, hash: '00'.repeat(32) }));
		const result = register(utxos);
		expect(result.psbtBase64).toBeUndefined();
		expect(result.error).toContain('00'.repeat(32));
	});

	it('refuses to spend a name output as a coin', async () => {
		const [coin] = await coins();
		const nameOutput = { ...coin, n: 0 }; // output 0 of the same transaction holds the name hello
		const result = register([nameOutput]);
		expect(result.psbtBase64).toBeUndefined();
		expect(result.error).toContain(':0');
	});

	it('builds no PSBT at all when the name output cannot be built', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const p2sh = payments.p2sh({ hash: Buffer.alloc(20, 2), network: DOICHAIN }).address;
		const result = register(await coins(), 'noc-test-name', STORAGE_FEE, p2sh);
		expect(result.psbtBase64).toBeUndefined();
		expect(result.error).toContain('P2PKH or P2WPKH');
	});

	it('gives change below the dust limit to the miners instead of creating a dust output', async () => {
		const utxos = await coins();
		const { totalInputAmount, transactionFee } = register(utxos);
		const leftOver = DUST_LIMIT - 1;
		const result = register(utxos, 'noc-test-name', totalInputAmount - transactionFee - leftOver);
		expect(result.error).toBeUndefined();
		expect(result.changeAmount).toBe(0);
		expect(result.dust).toBe(leftOver);
		const psbt = Psbt.fromBase64(result.psbtBase64, { network: DOICHAIN });
		expect(psbt.txOutputs).toHaveLength(1);
		expect(result.transactionFee).toBe(transactionFee + leftOver);
	});
});
