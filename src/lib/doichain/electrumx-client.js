import { EventEmitter } from 'events';

/** How long a request may stay unanswered before it fails, in milliseconds. */
export const REQUEST_TIMEOUT = 30_000;

/** ElectrumX drops a silent client after about ten minutes; a ping keeps the connection open. */
export const KEEPALIVE_INTERVAL = 90_000;

const WEBSOCKET_OPEN = 1;

export const makeRequest = (method, params, id) => {
	return JSON.stringify({
		jsonrpc: '2.0',
		method: method,
		params: params,
		id: id,
	});
};

export const createPromiseResult = (resolve, reject) => {
	return (err, result) => {
		if (err) reject(err);
		else resolve(result);
	};
};

export const createPromiseResultBatch = (resolve, reject, argz) => {
	return (err, result) => {
		if (result && result[0] && result[0].id) {
			// this is a batch request response
			for (let r of result) {
				r.param = argz[r.id];
			}
		}
		if (err) reject(err);
		else resolve(result);
	};
};

export class ElectrumxClient {

	/**
	 * @param {string} host
	 * @param {number} port
	 * @param {string} protocol - 'wss' or 'ws'
	 * @param {{timeout?: number, keepAliveInterval?: number}} [options]
	 */
	constructor(host, port, protocol, options) {
		this.id = 0;
		this.port = port;
		this.host = host;
		this.callback_message_queue = {};
		this.subscribe = new EventEmitter();
		this._protocol = protocol; // saving defaults
		this._options = options;
		this.timeout = options?.timeout ?? REQUEST_TIMEOUT;
		this.keepAliveInterval = options?.keepAliveInterval ?? KEEPALIVE_INTERVAL;
		/**
		 * Called when the connection drops without close() having been called,
		 * so the owner can connect again.
		 * @type {((event: any) => void) | null}
		 */
		this.onclose = null;
	}

	getStatus() {
		return this.status;
	}

	connect() {
		if (this.status === 1) {
			return Promise.resolve();
		}
		this.status = 1;
		this.closedOnPurpose = false;
		return this.connectSocket(this.port, this.host, this._protocol);
	}

	connectSocket(port, host, protocol) {
		return new Promise((resolve, reject) => {
			const url = `${protocol}://${host}:${port}/`;
			let ws = new WebSocket(url);
			this.ws = ws;

			ws.onopen = () => {
				console.log("connected websocket main component");
				this.startKeepAlive();
				resolve();
			};

			ws.onmessage = (messageEvent) => {
				this.onMessage(messageEvent.data);
			}

			ws.onclose = e => {
				console.log('Socket is closed: ' + (e?.code ?? ''));
				this.status = 0;
				this.onClose(e);
			};

			ws.onerror = () => {
				console.error("Socket encountered error, closing socket", url);
				this.status = 0;
				ws.close();
				// the error event carries no message, so at least name the server
				reject(new Error(`WebSocket error on ${url}`));
			};
		});
	}

	close() {
		this.closedOnPurpose = true;
		this.stopKeepAlive();
		if (this.status === 0) {
			return;
		}
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
		this.status = 0;
	}

	request(method, params) {
		if (this.status === 0 || this.ws?.readyState !== WEBSOCKET_OPEN) {
			return Promise.reject(new Error('ESOCKET'));
		}
		return new Promise((resolve, reject) => {
			const id = ++this.id;
			const content = makeRequest(method, params, id);
			// a request the server never answers must not hang forever
			const timer = setTimeout(() => {
				if (this.callback_message_queue[id]) {
					delete this.callback_message_queue[id];
					reject(new Error(`ETIMEDOUT ${method}`));
				}
			}, this.timeout);
			this.callback_message_queue[id] = createPromiseResult(
				(result) => { clearTimeout(timer); resolve(result); },
				(error) => { clearTimeout(timer); reject(error); }
			);
			try {
				this.ws.send(content + '\n');
			} catch (error) {
				delete this.callback_message_queue[id];
				clearTimeout(timer);
				reject(error);
			}
		});
	}

	requestBatch(method, params, secondParam) {
		if (this.status === 0) {
			return Promise.reject(new Error('ESOCKET'));
		}
		return new Promise((resolve, reject) => {
			let arguments_far_calls = {};
			let contents = [];
			for (let param of params) {
				const id = ++this.id;
				if (secondParam !== undefined) {
					contents.push(makeRequest(method, [param, secondParam], id));
				} else {
					contents.push(makeRequest(method, [param], id));
				}
				arguments_far_calls[id] = param;
			}
			const content = '[' + contents.join(',') + ']';
			this.callback_message_queue[this.id] = createPromiseResultBatch(resolve, reject, arguments_far_calls);
			// callback will exist only for max id
			this.ws.send(content + '\n');
		});
	}

	response(msg) {
		let callback;
		if (!msg.id && msg[0] && msg[0].id) {
			// this is a response from batch request
			for (let m of msg) {
				if (m.id && this.callback_message_queue[m.id]) {
					callback = this.callback_message_queue[m.id];
					delete this.callback_message_queue[m.id];
				}
			}
		} else {
			callback = this.callback_message_queue[msg.id];
		}

		if (callback) {
			delete this.callback_message_queue[msg.id];
			if (msg.error) {
				const error = /** @type {Error & {code?: number}} */ (
					new Error(msg.error.message ?? JSON.stringify(msg.error))
				);
				error.code = msg.error.code;
				callback(error);
			} else {
				// a result may be 0, false or null; only a batch answer has no result field
				callback(null, 'result' in msg ? msg.result : msg);
			}
		} else {
			console.log("Can't get callback"); // can't get callback
		}
	}

	onMessage(body) {
		let msg;
		try {
			msg = JSON.parse(body);
		} catch (error) {
			console.error('ElectrumX sent something that is not JSON, ignored', error);
			return;
		}
		if (msg instanceof Array) {
			this.response(msg);
		} else if (msg.id === undefined || msg.id === null) {
			// notifications (a new block, a changed script hash) come without an id
			if (msg.method) this.subscribe.emit(msg.method, msg.params);
			else console.error('ElectrumX message without id', msg);
		} else {
			this.response(msg);
		}
	}

	onClose(e) {
		this.status = 0;
		this.stopKeepAlive();
		Object.keys(this.callback_message_queue).forEach(key => {
			this.callback_message_queue[key](new Error('close connect'));
			delete this.callback_message_queue[key];
		});
		if (!this.closedOnPurpose && typeof this.onclose === 'function') {
			this.onclose(e);
		}
	}

	startKeepAlive() {
		this.stopKeepAlive();
		this.keepAliveTimer = setInterval(() => {
			this.request('server.ping').catch((error) => {
				console.error('ElectrumX did not answer the ping, closing the connection', error);
				// a server that stopped answering is treated like a dropped connection
				this.ws?.close();
			});
		}, this.keepAliveInterval);
	}

	stopKeepAlive() {
		if (this.keepAliveTimer) clearInterval(this.keepAliveTimer);
		this.keepAliveTimer = undefined;
	}

}
