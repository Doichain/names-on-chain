import { describe, it, expect } from 'vitest';
import { address, payments, Psbt, Transaction } from '@doichain/doichainjs-lib';
import { DOICHAIN, VERSION } from './doichain.js';
import { generateAtomicNameTradingPSBT } from './atomicNameTrading.js';
import { parseDoiAmount } from './doiAmount.js';
import { getNameOPStackScript } from './getNameOPStackScript.js';
import { MIN_RELAY_FEE_RATE } from './fees.js';
import { pushData } from './pushData.js';
import { isNameScript, parseNameScript } from './transactionChecks.js';
import { fixture } from './__fixtures__/fakeElectrumClient.js';

const STORAGE_FEE = 1_000_000;
const transactions = fixture.responses['blockchain.transaction.get'];
const heightOf = (txid) =>
	Object.values(fixture.responses['blockchain.scripthash.listunspent'])
		.flat()
		.find((utxo) => utxo.tx_hash === txid).height;

/** An output from the recorded mainnet transactions, as the name check hands it over */
function utxo(txid, n) {
	return { hash: txid, txid, n, hex: transactions[txid].hex, height: heightOf(txid) };
}

const canaryTx = Object.keys(transactions).find((txid) =>
	transactions[txid].vout.some((vout) => vout.scriptPubKey.nameOp?.name === fixture.name)
);
const helloTx = Object.keys(transactions).find((txid) =>
	transactions[txid].vout.some((vout) => vout.scriptPubKey.nameOp?.name === 'hello')
);
const canary = utxo(
	canaryTx,
	transactions[canaryTx].vout.findIndex((vout) => vout.scriptPubKey.nameOp)
);
const hello = utxo(
	helloTx,
	transactions[helloTx].vout.findIndex((vout) => vout.scriptPubKey.nameOp)
);
const coin = utxo(
	helloTx,
	transactions[helloTx].vout.findIndex((vout) => !vout.scriptPubKey.nameOp)
);
const buyer = payments.p2wpkh({ hash: Buffer.alloc(20, 7), network: DOICHAIN }).address;

/** @type {(nameUtxo: any, name: string, price: number, fundingUtxos?: object[], buyerAddress?: string) => any} */
const buy = (nameUtxo, name, price, fundingUtxos = [coin], buyerAddress = buyer) =>
	generateAtomicNameTradingPSBT(
		name,
		fundingUtxos,
		nameUtxo,
		buyerAddress,
		price,
		STORAGE_FEE,
		DOICHAIN
	);

const outputsOf = (result) =>
	Psbt.fromBase64(result.psbtBase64, { network: DOICHAIN }).txOutputs.map((output) => ({
		value: output.value,
		to: isNameScript(output.script) ? 'name' : address.fromOutputScript(output.script, DOICHAIN),
		script: output.script
	}));

describe('name purchase', () => {
	it('pays the seller, moves the name with its value to the buyer and returns the change', () => {
		const price = 50_000_000;
		const result = buy(canary, fixture.name, price);
		expect(result.error).toBeUndefined();

		const psbt = Psbt.fromBase64(result.psbtBase64, { network: DOICHAIN });
		expect(psbt.version).toBe(VERSION);
		expect(psbt.txInputs).toHaveLength(2);

		const [seller, name, change] = outputsOf(result);
		expect(seller).toMatchObject({ to: fixture.owner, value: price });
		expect(name.value).toBe(STORAGE_FEE);
		expect(
			name.script.equals(
				getNameOPStackScript(fixture.name, 'v31.1.4 canary test 2026-09-13', buyer, DOICHAIN)
			)
		).toBe(true);
		expect(change.to).toBe(buyer);

		const coinValue = 199_418_520;
		expect(result.transactionFee).toBeGreaterThanOrEqual(MIN_RELAY_FEE_RATE * result.vsize);
		expect(change.value).toBe(coinValue - price - result.transactionFee);
		expect(coinValue + STORAGE_FEE - seller.value - name.value - change.value).toBe(
			result.transactionFee
		);
	});

	it('gives what the old name output held beyond the locked amount back to the seller', () => {
		const price = 10_000_000;
		const result = buy(hello, 'hello', price);
		expect(result.surplus).toBe(99_000_000);
		const [seller, , change] = outputsOf(result);
		expect(seller.value).toBe(price + 99_000_000);
		expect(change.value).toBe(199_418_520 - price - result.transactionFee);
	});

	it('reads the seller from the verified name script, whatever the server says', () => {
		const attacker = payments.p2pkh({ hash: Buffer.alloc(20, 9), network: DOICHAIN }).address;
		const lied = { ...canary, address: attacker, value: 1, scriptPubKey: { address: attacker } };
		const [seller] = outputsOf(buy(lied, fixture.name, 50_000_000));
		expect(seller.to).toBe(fixture.owner);
	});

	it('sends name and change only to the address the buyer entered', () => {
		const result = buy(canary, fixture.name, 50_000_000);
		const destinations = outputsOf(result)
			.slice(1)
			.map((output) =>
				output.to === 'name'
					? address.fromOutputScript(parseNameScript(output.script).ownerScript, DOICHAIN)
					: output.to
			);
		expect(new Set(destinations)).toEqual(new Set([buyer]));
	});

	it('refuses raw transactions that do not belong to their txid', () => {
		expect(buy({ ...canary, hash: '11'.repeat(32) }, fixture.name, 50_000_000).error).toContain(
			'11'.repeat(32)
		);
		expect(
			buy(canary, fixture.name, 50_000_000, [{ ...coin, hash: '22'.repeat(32) }]).error
		).toContain('22'.repeat(32));
	});

	it("refuses a name output as the buyer's coin and a name that is not in the output", () => {
		expect(buy(canary, fixture.name, 50_000_000, [hello]).error).toContain(`${helloTx}:${hello.n}`);
		expect(buy(canary, 'hello', 50_000_000).error).toContain('hello');
	});

	it('refuses names last written with another operation than name_doi', () => {
		const owner = address.toOutputScript(fixture.owner, DOICHAIN);
		const tx = new Transaction();
		tx.version = VERSION;
		tx.addInput(Buffer.alloc(32, 1), 0);
		tx.addOutput(
			Buffer.concat([
				Buffer.from('53' + pushData('update-me') + pushData('') + '6d75', 'hex'),
				owner
			]),
			STORAGE_FEE
		);
		const updated = { hash: tx.getId(), n: 0, hex: tx.toHex(), height: 431000 };
		expect(buy(updated, 'update-me', 50_000_000).error).toContain('name_doi');
	});

	it('refuses an unconfirmed name, a missing price, dust for the seller and too few coins', () => {
		expect(buy({ ...canary, height: 0 }, fixture.name, 50_000_000).error).toContain('block');
		expect(buy(canary, fixture.name, undefined).error).toContain('DOI');
		expect(buy(canary, fixture.name, 0).error).toContain('0.00000546');
		expect(buy(canary, fixture.name, 5_00000000).error).toContain(buyer);
	});

	it('spends only the buyer coins it needs, the largest first', () => {
		const tx = new Transaction();
		tx.addInput(Buffer.alloc(32, 9), 0);
		const values = [30_000_000, 90_000_000, 10_000_000, 60_000_000];
		for (const value of values) tx.addOutput(address.toOutputScript(buyer, DOICHAIN), value);
		const coins = values.map((value, n) => ({
			hash: tx.getId(),
			n,
			value,
			height: 431000,
			hex: tx.toHex()
		}));
		const result = buy(canary, fixture.name, 50_000_000, coins);
		expect(result.error).toBeUndefined();
		expect(result.coinsUsed).toBe(1);
		expect(result.coinsAvailable).toBe(4);
		expect(result.fromCoins).toBe(50_000_000 + result.transactionFee);
	});

	it('refuses to sell a name to its owner', () => {
		expect(buy(canary, fixture.name, 50_000_000, [coin], fixture.owner).error).toContain(
			fixture.owner
		);
	});
});

describe('parseDoiAmount', () => {
	it('reads DOI with a point or a comma', () => {
		expect(parseDoiAmount('1')).toBe(100_000_000);
		expect(parseDoiAmount('1.5')).toBe(150_000_000);
		expect(parseDoiAmount(' 1,5 ')).toBe(150_000_000);
		expect(parseDoiAmount('.25')).toBe(25_000_000);
		expect(parseDoiAmount('0.00000001')).toBe(1);
	});

	it('refuses what is not an amount', () => {
		for (const text of ['', ' ', 'abc', '-1', '1e3', '0.000000001', '1.2.3', undefined]) {
			expect(parseDoiAmount(text), String(text)).toBeUndefined();
		}
	});
});
