import { describe, it, expect } from 'vitest';
import { estimateVsize, feeFor, feeRateFor, MAX_FEE_RATE, MIN_RELAY_FEE_RATE, selectCoins } from './fees.js';

const P2PKH_OUTPUT = Buffer.alloc(25);
const NAME_OUTPUT = Buffer.alloc(60);

describe('feeRateFor', () => {
	it('pays at least the minimum relay fee of Doichain Core, whatever the server reports', () => {
		expect(feeRateFor(1e-8)).toBe(MIN_RELAY_FEE_RATE); // what big-parrot-60 reported
		expect(feeRateFor(0.00001)).toBe(MIN_RELAY_FEE_RATE);
		expect(feeRateFor(undefined)).toBe(MIN_RELAY_FEE_RATE);
		expect(feeRateFor('nonsense')).toBe(MIN_RELAY_FEE_RATE);
	});

	it('follows a server that asks for more, up to a limit', () => {
		expect(feeRateFor(0.002)).toBe(200);
		expect(feeRateFor(1)).toBe(MAX_FEE_RATE);
	});
});

describe('estimateVsize', () => {
	it('matches the registration Doichain Core measured at 260 vbytes, without falling short', () => {
		// 1 P2PKH input, a 60-byte name output and P2PKH change: the node reported 260 vbytes
		const vsize = estimateVsize([{ segwit: false }], [NAME_OUTPUT, P2PKH_OUTPUT]);
		expect(vsize).toBeGreaterThanOrEqual(260);
		expect(vsize).toBeLessThanOrEqual(264);
	});

	it('counts a P2WPKH input at a quarter of its witness', () => {
		const legacy = estimateVsize([{ segwit: false }], [P2PKH_OUTPUT]);
		const segwit = estimateVsize([{ segwit: true }], [P2PKH_OUTPUT]);
		expect(legacy - segwit).toBeGreaterThan(75);
	});
});

describe('selectCoins', () => {
	const fee = (selected) => feeFor(estimateVsize(selected.map(() => ({ segwit: false })), [NAME_OUTPUT, P2PKH_OUTPUT]), MIN_RELAY_FEE_RATE);

	it('takes the largest coins first and stops as soon as they cover amount and fee', () => {
		const coins = [{ value: 20_000, height: 5 }, { value: 5_000_000, height: 5 }, { value: 700_000, height: 5 }];
		const result = selectCoins(coins, 1_000_000, fee);
		expect(result.selected.map((c) => c.value)).toEqual([5_000_000]);
		expect(result.fee).toBe(fee(result.selected));
	});

	it('prefers confirmed coins over unconfirmed ones', () => {
		const coins = [{ value: 9_000_000, height: 0 }, { value: 2_000_000, height: 7 }];
		expect(selectCoins(coins, 1_000_000, fee).selected.map((c) => c.value)).toEqual([2_000_000]);
	});

	it('reports too little money', () => {
		expect(selectCoins([{ value: 500_000, height: 1 }], 1_000_000, fee)).toEqual({ error: 'insufficient' });
	});

	it('refuses to spend more coins than the limit', () => {
		const dust = Array.from({ length: 30 }, () => ({ value: 60_000, height: 1 }));
		expect(selectCoins(dust, 1_000_000, fee, 20)).toMatchObject({ error: 'tooFragmented' });
	});
});
