/**
 * pushData checks length of data and decides formatting of data
 * For details:
 * Oct 6, 2018 • Jeremy Rand
 * - https://www.namecoin.org/2018/10/06/electrum-nmc-name-transaction-creation.html
 * - https://github.com/namecoin/electrum-nmc/blob/master/electrum_nmc/electrum/commands.py#L1430
 *
 * The length prefix counts bytes, not characters: "münchen" has 7 characters
 * but 8 bytes in UTF-8. Counting characters gives a different script and a
 * different name index hash, so a taken name would look free.
 *
 * A single byte 0x01–0x10 stays a plain push. bitcoinjs-lib's script.compile
 * would turn it into OP_1…OP_16, which Doichain's name parser rejects.
 *
 * @param {string|Uint8Array} data - a string is encoded as UTF-8
 * @returns {string} a hex string to be inserted into a op script which can be sent to ElectrumX
 */
export function pushData(data) {
	const bytes = typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data);
	const len = bytes.length;
	let prefix;

	if (len < 0x4c) {
		prefix = [len];
	} else if (len <= 0xff) {
		prefix = [0x4c, len];
	} else if (len <= 0xffff) {
		prefix = [0x4d, len & 0xff, len >>> 8];
	} else {
		prefix = [0x4e, len & 0xff, (len >>> 8) & 0xff, (len >>> 16) & 0xff, len >>> 24];
	}

	return Buffer.from(prefix).toString('hex') + bytes.toString('hex');
}
