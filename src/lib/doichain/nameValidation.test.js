import { describe, it, expect, vi } from 'vitest';
import { _checkName, checkName } from './nameValidation.js';
import { fakeElectrumClient, fixture } from './__fixtures__/fakeElectrumClient.js';

// the address a learner typed before checking a name
const myAddress = fixture.fundedAddress;

describe('name check against Doichain Core 31 responses', () => {
	it('reports a registered name and its owner instead of throwing', async () => {
		const result = await _checkName(fakeElectrumClient(), myAddress, fixture.name, 0, 0);
		expect(result.isNameValid).toBe(false);
		expect(result.currentNameAddress).toBe(fixture.owner);
		expect(result.nameErrorMessage).toContain(fixture.owner);
	});

	it('hands a failed lookup to the callback and keeps the typed address', async () => {
		const callback = vi.fn();
		checkName(fakeElectrumClient({ failWith: new Error('ESOCKET') }), myAddress, 'somename', 0, 0, callback);
		await vi.waitFor(() => expect(callback).toHaveBeenCalledTimes(1), { timeout: 2000 });
		expect(callback.mock.calls[0][0]).toMatchObject({ isNameValid: false, currentNameAddress: myAddress });
		expect(callback.mock.calls[0][0].nameErrorMessage).toContain('ESOCKET');
	});
});
