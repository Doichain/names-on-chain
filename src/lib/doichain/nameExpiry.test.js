import { afterEach, describe, expect, it } from 'vitest';
import { DOICHAIN, DOICHAIN_REGTEST } from './doichain.js';
import { electrumBlockchainBlockHeadersSubscribe } from './doichain-store.js';
import { latestNameOperation, nameExpiry } from './nameExpiry.js';
import { _checkName } from './nameValidation.js';
import { fakeElectrumClient, fixture } from './__fixtures__/fakeElectrumClient.js';

const REGISTERED_AT =
	fixture.responses['blockchain.scripthash.get_history'][fixture.nameIndexScripthash][0].height;

const output = (name, height, address = 'N-owner') => ({
	height,
	scriptPubKey: { address, nameOp: { name, name_encoding: 'utf8' } }
});

describe('nameExpiry', () => {
	it('keeps a name for 36,000 blocks after its last operation', () => {
		expect(nameExpiry(431320, 431774, DOICHAIN)).toEqual({
			confirmed: true,
			expiresAt: 467320,
			blocksLeft: 35546,
			expired: false
		});
		expect(nameExpiry(431320, 467320, DOICHAIN).expired).toBe(true);
		expect(nameExpiry(431320, 467319, DOICHAIN).expired).toBe(false);
	});

	it('uses 30 blocks on regtest', () => {
		expect(nameExpiry(100, 130, DOICHAIN_REGTEST).expired).toBe(true);
	});

	it('never calls an unconfirmed operation expired', () => {
		expect(nameExpiry(0, 431774, DOICHAIN)).toEqual({ confirmed: false, expired: false });
		expect(nameExpiry(-1, 431774, DOICHAIN)).toEqual({ confirmed: false, expired: false });
	});

	it('does not guess without a known tip', () => {
		expect(nameExpiry(431320, undefined, DOICHAIN)).toEqual({
			confirmed: true,
			expiresAt: 467320,
			expired: false
		});
	});
});

describe('latestNameOperation', () => {
	it('picks the newest operation of that name, unconfirmed ones first', () => {
		const outputs = [
			output('hello', 100, 'N-old'),
			output('hello', 300, 'N-new'),
			output('other', 900),
			{ height: 300, scriptPubKey: {} }
		];
		expect(latestNameOperation(outputs, 'hello').scriptPubKey.address).toBe('N-new');
		expect(
			latestNameOperation([...outputs, output('hello', 0, 'N-pending')], 'hello').scriptPubKey
				.address
		).toBe('N-pending');
		expect(latestNameOperation(outputs, 'missing')).toBeUndefined();
	});
});

describe('name check with expiry', () => {
	afterEach(() => electrumBlockchainBlockHeadersSubscribe.set(undefined));

	it('says until which block a taken name belongs to its owner', async () => {
		electrumBlockchainBlockHeadersSubscribe.set({ height: fixture.tipHeight });
		const result = await _checkName(fakeElectrumClient(), fixture.name, 0, 0);
		expect(result.isNameValid).toBe(false);
		expect(result.currentNameAddress).toBe(fixture.owner);
		expect(result.nameErrorMessage).toContain(
			`until block ${REGISTERED_AT + 36000}, ${REGISTERED_AT + 36000 - fixture.tipHeight} blocks`
		);
	});

	it('offers an expired name for registration again', async () => {
		electrumBlockchainBlockHeadersSubscribe.set({ height: REGISTERED_AT + 36000 });
		const result = await _checkName(fakeElectrumClient(), fixture.name, 0, 0);
		expect(result.isNameValid).toBe(true);
		expect(result.nameNotice).toContain('expired');
	});
});
