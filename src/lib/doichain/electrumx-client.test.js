import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ElectrumxClient, KEEPALIVE_INTERVAL, REQUEST_TIMEOUT } from './electrumx-client.js';

/** A WebSocket the test drives by hand: open it, fail it, drop it, let the server talk. */
class FakeWebSocket {
	static last;

	constructor(url) {
		this.url = url;
		this.readyState = 0;
		this.sent = [];
		/** @type {any} */ this.onopen = null;
		/** @type {any} */ this.onerror = null;
		/** @type {any} */ this.onclose = null;
		/** @type {any} */ this.onmessage = null;
		FakeWebSocket.last = this;
	}

	open() {
		this.readyState = 1;
		this.onopen?.();
	}

	fail() {
		this.onerror?.({ type: 'error' });
	}

	send(data) {
		this.sent.push(JSON.parse(data));
	}

	close() {
		if (this.readyState === 3) return;
		this.readyState = 3;
		this.onclose?.({ code: 1006 });
	}

	receive(message) {
		this.onmessage?.({ data: typeof message === 'string' ? message : JSON.stringify(message) });
	}
}

async function connectedClient() {
	const client = new ElectrumxClient('electrum.example', 50004, 'wss');
	const connected = client.connect();
	FakeWebSocket.last.open();
	await connected;
	return { client, socket: FakeWebSocket.last };
}

describe('ElectrumxClient', () => {
	beforeEach(() => {
		vi.stubGlobal('WebSocket', FakeWebSocket);
		vi.spyOn(console, 'log').mockImplementation(() => {});
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('resolves a result of 0 as 0, not as the whole message', async () => {
		const { client, socket } = await connectedClient();
		const answer = client.request('blockchain.scripthash.get_balance', ['00']);
		socket.receive({ jsonrpc: '2.0', id: socket.sent[0].id, result: 0 });
		await expect(answer).resolves.toBe(0);
	});

	it('hands notifications without an id to the subscribers', async () => {
		const { client, socket } = await connectedClient();
		const listener = vi.fn();
		client.subscribe.on('blockchain.headers.subscribe', listener);
		socket.receive({
			jsonrpc: '2.0',
			method: 'blockchain.headers.subscribe',
			params: [{ height: 431800, hex: '00' }]
		});
		expect(listener).toHaveBeenCalledWith([{ height: 431800, hex: '00' }]);
	});

	it('turns a server error into an Error with its message', async () => {
		const { client, socket } = await connectedClient();
		const answer = client.request('blockchain.transaction.get', ['ff']);
		socket.receive({
			jsonrpc: '2.0',
			id: socket.sent[0].id,
			error: { code: 2, message: 'no such transaction' }
		});
		await expect(answer).rejects.toThrow('no such transaction');
	});

	it('gives up on a request the server never answers', async () => {
		vi.useFakeTimers();
		const { client } = await connectedClient();
		const answer = client.request('server.banner');
		const outcome = expect(answer).rejects.toThrow(/ETIMEDOUT server.banner/);
		vi.advanceTimersByTime(REQUEST_TIMEOUT);
		await outcome;
	});

	it('ignores a message that is not JSON', async () => {
		const { socket } = await connectedClient();
		expect(() => socket.receive('<html>502 Bad Gateway</html>')).not.toThrow();
	});

	it('rejects a failed connection with an Error that names the server', async () => {
		const client = new ElectrumxClient('electrum.example', 50004, 'wss');
		const connected = client.connect();
		FakeWebSocket.last.fail();
		await expect(connected).rejects.toThrow('wss://electrum.example:50004/');
		expect(client.getStatus()).toBe(0);
	});

	it('pings the server so an idle connection stays open', async () => {
		vi.useFakeTimers();
		const { socket } = await connectedClient();
		vi.advanceTimersByTime(KEEPALIVE_INTERVAL);
		expect(socket.sent.map((message) => message.method)).toContain('server.ping');
	});

	it('reports a dropped connection and rejects what was still waiting', async () => {
		const { client, socket } = await connectedClient();
		const dropped = vi.fn();
		client.onclose = dropped;
		const answer = client.request('server.banner');
		socket.close();
		await expect(answer).rejects.toThrow('close connect');
		expect(dropped).toHaveBeenCalledTimes(1);
		await expect(client.request('server.banner')).rejects.toThrow('ESOCKET');
	});

	it('does not report a connection it was asked to close', async () => {
		const { client, socket } = await connectedClient();
		const dropped = vi.fn();
		client.onclose = dropped;
		client.close();
		expect(socket.readyState).toBe(3);
		expect(dropped).not.toHaveBeenCalled();
	});
});
