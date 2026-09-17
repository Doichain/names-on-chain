import { describe, it, expect } from 'vitest';
import { payments } from '@doichain/doichainjs-lib';
import { DOICHAIN, DOICHAIN_REGTEST } from './doichain.js';
import { cleanAddressInput, isAddressOf, isP2WPKHAddress } from './addressValidation.js';
import { fixture } from './__fixtures__/fakeElectrumClient.js';

describe('address input', () => {
	it('accepts Doichain P2PKH and P2WPKH addresses', () => {
		expect(isAddressOf(DOICHAIN, fixture.fundedAddress)).toBe(true);
		expect(isAddressOf(DOICHAIN, payments.p2wpkh({ hash: Buffer.alloc(20, 1), network: DOICHAIN }).address)).toBe(true);
	});

	it('refuses typos, other networks and empty input', () => {
		expect(isAddressOf(DOICHAIN, fixture.fundedAddress.slice(0, -1) + 'x')).toBe(false);
		expect(isAddressOf(DOICHAIN_REGTEST, fixture.fundedAddress)).toBe(false);
		expect(isAddressOf(DOICHAIN, payments.p2pkh({ hash: Buffer.alloc(20, 1) }).address)).toBe(false);
		expect(isAddressOf(DOICHAIN, '')).toBe(false);
	});

	it('tells P2WPKH addresses apart from P2PKH ones', () => {
		expect(isP2WPKHAddress(DOICHAIN, payments.p2wpkh({ hash: Buffer.alloc(20, 1), network: DOICHAIN }).address)).toBe(true);
		expect(isP2WPKHAddress(DOICHAIN, fixture.fundedAddress)).toBe(false);
		expect(isP2WPKHAddress(DOICHAIN, 'dc1qnotanaddress')).toBe(false);
	});

	it('takes the address out of a scanned payment URI', () => {
		expect(cleanAddressInput(` doichain:${fixture.fundedAddress}?amount=1 `)).toBe(fixture.fundedAddress);
		expect(cleanAddressInput(fixture.fundedAddress)).toBe(fixture.fundedAddress);
	});
});
