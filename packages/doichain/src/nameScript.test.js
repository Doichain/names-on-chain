import { describe, it, expect } from 'vitest';
import { payments } from '@doichain/doichainjs-lib';
import { DOICHAIN } from './doichain.js';
import { getNameOPStackScript, NAME_MAX_LENGTH, NAME_MIN_LENGTH } from './getNameOPStackScript.js';
import { describeNameBytes, normalizeName } from './nameBytes.js';
import { fixture } from '../testing/__fixtures__/fakeElectrumClient.js';

const nameOutputs = Object.values(fixture.responses['blockchain.transaction.get'])
	.flatMap((tx) => tx.vout)
	.filter((vout) => vout.scriptPubKey.nameOp);

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
			'5a' + '0568656c6c6f' + '05776f726c64' + '6d75' + '0014' + hash.toString('hex')
		);
	});

	it('counts the name in bytes, not characters', () => {
		const script = getNameOPStackScript('münchen', '', fixture.fundedAddress, DOICHAIN);
		const name = Buffer.from('münchen', 'utf8').toString('hex');
		expect(script.toString('hex').startsWith('5a08' + name)).toBe(true);
	});

	it('keeps a one-byte value as a plain push instead of OP_1…OP_16', () => {
		const script = getNameOPStackScript(
			'hello',
			Buffer.from([0x05]),
			fixture.fundedAddress,
			DOICHAIN
		);
		expect(script.toString('hex').startsWith('5a' + '0568656c6c6f' + '0105' + '6d75')).toBe(true);
	});

	it('writes a name longer than 75 bytes with OP_PUSHDATA1', () => {
		const long = 'a'.repeat(76);
		const script = getNameOPStackScript(long, '', fixture.fundedAddress, DOICHAIN);
		expect(script.toString('hex').startsWith('5a4c4c' + Buffer.from(long).toString('hex'))).toBe(
			true
		);
	});

	it('allows an empty value instead of a placeholder', () => {
		const script = getNameOPStackScript('hello', '', fixture.fundedAddress, DOICHAIN).toString(
			'hex'
		);
		expect(script.startsWith('5a' + '0568656c6c6f' + '00' + '6d75')).toBe(true);
	});

	it('takes the value as bytes too and writes them unchanged', () => {
		const bytes = Buffer.from([0xff, 0x00, 0x05]); // not valid UTF-8
		const script = getNameOPStackScript('hello', bytes, fixture.fundedAddress, DOICHAIN);
		expect(script.toString('hex').startsWith('5a' + '0568656c6c6f' + '03ff0005' + '6d75')).toBe(
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
