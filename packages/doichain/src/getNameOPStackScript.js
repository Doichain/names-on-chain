import { address, nameops } from '@doichain/doichainjs-lib';
import { normalizeName } from './nameBytes.js';

// Doichain Core accepts names of any length up to 255 bytes. The app asks for
// at least four characters, and the name check and this builder share the rule.
export const NAME_MIN_LENGTH = 4;
export const NAME_MAX_LENGTH = nameops.MAX_NAME_LENGTH;
export const VALUE_MAX_LENGTH = nameops.MAX_VALUE_LENGTH;

const ERRORS = {
	NAME_ID_DEFINED: 'nameId and nameValue must be defined',
	NAME_ID_LENGTH: `nameId must have at least ${NAME_MIN_LENGTH} characters and at most ${NAME_MAX_LENGTH} bytes`,
	NAME_VALUE_LENGTH: `nameValue must not be longer than ${VALUE_MAX_LENGTH} bytes`,
	INVALID_ADDRESS: 'Invalid recipient address: ',
	UNSUPPORTED_ADDRESS: 'A name can only be sent to a P2PKH or P2WPKH address, not to ',
	NETWORK_MISSING: 'The network is missing: pass DOICHAIN, DOICHAIN_REGTEST or another network'
};

/**
 * OP_DUP OP_HASH160 <20 bytes> OP_EQUALVERIFY OP_CHECKSIG
 * @param {Buffer} output
 */
const isP2PKH = (output) =>
	output.length === 25 &&
	output[0] === 0x76 &&
	output[1] === 0xa9 &&
	output[2] === 0x14 &&
	output[23] === 0x88 &&
	output[24] === 0xac;

/**
 * OP_0 <20 bytes>
 * @param {Buffer} output
 */
const isP2WPKH = (output) => output.length === 22 && output[0] === 0x00 && output[1] === 0x14;

/**
 * Creates a NameOPStackScript from a nameId, nameValue, and recipientAddress:
 *
 *   OP_NAME_DOI <name> <value> OP_2DROP OP_DROP <output script of the address>
 *
 * The bytes come from `nameops.nameDoiScript` in doichainjs-lib, which writes
 * name and value with their length in bytes, never as a number opcode: a
 * one-byte value such as 0x05 would otherwise become OP_5, which Doichain's
 * name parser rejects. The app stays in front of it for three reasons:
 *
 * - the address becomes an output script with address.toOutputScript, which
 *   checks the network and the address type. Taking only the hash out of an
 *   address would turn a P2SH address into a P2PKH script that nobody can ever
 *   spend,
 * - only P2PKH and P2WPKH owners are allowed. A name at any other script can be
 *   registered, but never moved again – the coin and the name would be gone,
 * - a name is registered in NFC and needs at least four characters, the rule the
 *   name check uses.
 *
 * @param {string} nameId - The identifier for the name, stored in NFC.
 * @param {string | Buffer} nameValue - The value associated with the name, as text or as the bytes a name holds today; may be empty.
 * @param {string} recipientAddress - The recipient's Doichain address, P2PKH or P2WPKH.
 * @param {object} network - The Doichain network object (DOICHAIN, DOICHAIN_REGTEST, ...).
 * @returns {Buffer} The compiled script as a Buffer.
 */
export const getNameOPStackScript = (nameId, nameValue, recipientAddress, network) => {
	if (!nameId || nameValue === undefined || nameValue === null) {
		throw new Error(ERRORS.NAME_ID_DEFINED);
	}
	// no silent fallback to mainnet: a regtest address must not become a mainnet script
	if (!network) {
		throw new Error(ERRORS.NETWORK_MISSING);
	}

	const name = normalizeName(nameId);
	// text is written as UTF-8; bytes, such as a value read from the chain, stay as they are
	const value = typeof nameValue === 'string' ? nameValue : Buffer.from(nameValue);

	if (Buffer.byteLength(name, 'utf8') > NAME_MAX_LENGTH || name.length < NAME_MIN_LENGTH) {
		throw new Error(ERRORS.NAME_ID_LENGTH);
	}

	if (Buffer.byteLength(value, 'utf8') > VALUE_MAX_LENGTH) {
		throw new Error(ERRORS.NAME_VALUE_LENGTH);
	}

	let output;
	try {
		output = address.toOutputScript(recipientAddress, network);
	} catch (error) {
		throw new Error(ERRORS.INVALID_ADDRESS + error.message);
	}

	if (!isP2PKH(output) && !isP2WPKH(output)) {
		throw new Error(ERRORS.UNSUPPORTED_ADDRESS + recipientAddress);
	}

	return nameops.nameDoiScript(name, value, output);
};
