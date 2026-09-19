import fixture from './core31-electrumx.json';

/**
 * A stand-in for ElectrumxClient that answers from responses recorded on a
 * Doichain Core 31 backed ElectrumX server (see core31-electrumx.json).
 * A request that was not recorded rejects, so a test fails loudly when the
 * code asks for something else than expected.
 *
 * @param {{failWith?: Error}} [options] reject every request with this error
 */
export function fakeElectrumClient({ failWith } = {}) {
	return {
		requests: [],
		async connect() {},
		async request(method, params = []) {
			this.requests.push([method, params]);
			if (failWith) throw failWith;
			const recorded = fixture.responses[method];
			const key = params[0];
			if (!recorded || !(key in recorded)) {
				throw new Error(`not recorded: ${method} ${JSON.stringify(params)}`);
			}
			// the app mutates what it receives, so every answer is a fresh copy
			return structuredClone(recorded[key]);
		}
	};
}

export { fixture };
