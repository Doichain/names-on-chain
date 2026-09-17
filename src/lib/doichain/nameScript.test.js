import { describe, it, expect } from 'vitest';
import { payments } from '@doichain/doichainjs-lib';
import { DOICHAIN } from './doichain.js';
import { getNameOPStackScript, NAME_MAX_LENGTH, NAME_MIN_LENGTH } from './getNameOPStackScript.js';
import { describeNameBytes, normalizeName } from './nameBytes.js';
import { nameShow } from './nameShow.js';
import { pushData } from './pushData.js';
import { fakeElectrumClient, fixture } from './__fixtures__/fakeElectrumClient.js';

const nameOutputs = Object.values(fixture.responses['blockchain.transaction.get'])
	.flatMap((tx) => tx.vout)
	.filter((vout) => vout.scriptPubKey.nameOp);

describe('pushData', () => {
	it('counts bytes, not characters', () => {
		expect(pushData('münchen')).toBe('08' + Buffer.from('münchen', 'utf8').toString('hex'));
	});

	it('keeps a single small byte as a plain push instead of OP_1…OP_16', () => {
		expect(pushData(new Uint8Array([0x05]))).toBe('0105');
	});

	it('writes an empty value as OP_0 and long data with OP_PUSHDATA1', () => {
		expect(pushData('')).toBe('00');
		expect(pushData('a'.repeat(76)).slice(0, 4)).toBe('4c4c');
	});
});

describe('name bytes', () => {
	it('looks up and registers names in NFC', () => {
		expect(normalizeName('münchen')).toBe('münchen');
	});

	it('flags names beyond ASCII and names mixing Latin with Cyrillic', () => {
		expect(describeNameBytes('hello')).toMatchObject({
			isAscii: true,
			mixesScripts: false,
			byteLength: 5
		});
		expect(describeNameBytes('münchen')).toMatchObject({
			isAscii: false,
			mixesScripts: false,
			byteLength: 8
		});
		expect(describeNameBytes('pаypаl')).toMatchObject({
			isAscii: false,
			mixesScripts: true,
			hex: '70 d0 b0 79 70 d0 b0 6c'
		});
	});
});

describe('getNameOPStackScript', () => {
	it('rebuilds the name outputs recorded on Doichain mainnet byte for byte', () => {
		expect(nameOutputs.length).toBeGreaterThan(0);
		for (const vout of nameOutputs) {
			const { name, value } = vout.scriptPubKey.nameOp;
			const script = getNameOPStackScript(name, value, vout.scriptPubKey.address, DOICHAIN);
			expect(script.toString('hex')).toBe(vout.scriptPubKey.hex);
		}
	});

	it('pays a P2WPKH address with its witness program', () => {
		const hash = Buffer.alloc(20, 0x11);
		const { address } = payments.p2wpkh({ hash, network: DOICHAIN });
		const script = getNameOPStackScript('hello', 'world', address, DOICHAIN).toString('hex');
		expect(script).toBe(
			'5a' + pushData('hello') + pushData('world') + '6d75' + '0014' + hash.toString('hex')
		);
	});

	it('allows an empty value instead of a placeholder', () => {
		const script = getNameOPStackScript('hello', '', fixture.fundedAddress, DOICHAIN).toString(
			'hex'
		);
		expect(script.startsWith('5a' + pushData('hello') + '00' + '6d75')).toBe(true);
	});

	it('takes the value as bytes too and writes them unchanged', () => {
		const bytes = Buffer.from([0xff, 0x00, 0x05]); // not valid UTF-8
		const script = getNameOPStackScript('hello', bytes, fixture.fundedAddress, DOICHAIN);
		expect(script.toString('hex').startsWith('5a' + pushData('hello') + '03ff0005' + '6d75')).toBe(
			true
		);
	});

	it('refuses a P2SH address, which would lock name and coins for good', () => {
		const { address } = payments.p2sh({ hash: Buffer.alloc(20, 0x22), network: DOICHAIN });
		expect(() => getNameOPStackScript('hello', '', address, DOICHAIN)).toThrow(/P2PKH or P2WPKH/);
	});

	it('refuses an address of another network', () => {
		const bitcoinAddress = payments.p2pkh({ hash: Buffer.alloc(20, 0x33) }).address;
		expect(() => getNameOPStackScript('hello', '', bitcoinAddress, DOICHAIN)).toThrow(
			/Invalid recipient address/
		);
	});

	it('refuses to guess the network', () => {
		expect(() => getNameOPStackScript('hello', '', fixture.fundedAddress, undefined)).toThrow(
			/network is missing/
		);
	});

	it('asks for the same minimum length as the name check', () => {
		expect(NAME_MIN_LENGTH).toBe(4);
		expect(() => getNameOPStackScript('abc', '', fixture.fundedAddress, DOICHAIN)).toThrow(
			/at least 4 characters/
		);
		expect(() => getNameOPStackScript('abcd', '', fixture.fundedAddress, DOICHAIN)).not.toThrow();
	});

	it('limits the name by bytes, not characters', () => {
		const name = 'ü'.repeat(128); // 128 characters, 256 bytes
		expect(name.length).toBeLessThanOrEqual(NAME_MAX_LENGTH);
		expect(() => getNameOPStackScript(name, '', fixture.fundedAddress, DOICHAIN)).toThrow(/bytes/);
	});

	it('stores the NFC form of a name typed in NFD', () => {
		const nfd = getNameOPStackScript('münchen', '', fixture.fundedAddress, DOICHAIN);
		const nfc = getNameOPStackScript('münchen', '', fixture.fundedAddress, DOICHAIN);
		expect(nfd.equals(nfc)).toBe(true);
	});
});

describe('nameShow', () => {
	it('queries the name index hash ElectrumX computes for a registered name', async () => {
		const client = fakeElectrumClient();
		const outputs = await nameShow(client, fixture.name);
		expect(client.requests[0]).toEqual([
			'blockchain.scripthash.get_history',
			[fixture.nameIndexScripthash]
		]);
		expect(outputs.some((vout) => vout.scriptPubKey.nameOp?.name === fixture.name)).toBe(true);
	});

	it('asks for the same hash whether a name was typed in NFC or NFD', async () => {
		const nfc = fakeElectrumClient();
		const nfd = fakeElectrumClient();
		await nameShow(nfc, 'münchen').catch(() => {});
		await nameShow(nfd, 'münchen').catch(() => {});
		expect(nfd.requests[0]).toEqual(nfc.requests[0]);
	});
});
