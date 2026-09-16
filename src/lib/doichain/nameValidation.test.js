import { describe, it, expect, vi } from 'vitest';
import { _checkName, checkName } from './nameValidation.js';
import { fakeElectrumClient, fixture } from './__fixtures__/fakeElectrumClient.js';

describe('name check against Doichain Core 31 responses', () => {
	it('reports a registered name and its owner instead of throwing', async () => {
		const result = await _checkName(fakeElectrumClient(), fixture.name, 0, 0);
		expect(result.isNameValid).toBe(false);
		expect(result.currentNameAddress).toBe(fixture.owner);
		expect(result.nameErrorMessage).toContain(fixture.owner);
	});

	it('hands a failed lookup to the callback instead of keeping the previous result', async () => {
		const callback = vi.fn();
		checkName(fakeElectrumClient({ failWith: new Error('ESOCKET') }), 'somename', 0, 0, callback);
		await vi.waitFor(() => expect(callback).toHaveBeenCalledTimes(1), { timeout: 2000 });
		expect(callback.mock.calls[0][0]).toMatchObject({ isNameValid: false });
		expect(callback.mock.calls[0][0].nameErrorMessage).toContain('ESOCKET');
	});

	it('tells the callback which name an answer belongs to', async () => {
		const callback = vi.fn();
		checkName(fakeElectrumClient({ failWith: new Error('ESOCKET') }), 'othername', 0, 0, callback);
		await vi.waitFor(() => expect(callback).toHaveBeenCalledTimes(1), { timeout: 2000 });
		expect(callback.mock.calls[0][0].name).toBe('othername');
	});

	it('limits a name by bytes before asking the server', async () => {
		const client = fakeElectrumClient();
		const result = await _checkName(client, 'ü'.repeat(128), 0, 0);
		expect(result.isNameValid).toBe(false);
		expect(result.nameErrorMessage).toContain('256');
		expect(client.requests).toEqual([]);
	});
});
