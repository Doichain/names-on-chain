import { address } from '@doichain/doichainjs-lib';
import { DOICHAIN } from './doichain.js';
import { normalizeName } from './nameBytes.js';
import { pushData } from './pushData.js';

// Doichain Core accepts names of any length up to 255 bytes. The app asks for
// at least four characters, and the name check and this builder share the rule.
export const NAME_MIN_LENGTH = 4;
export const NAME_MAX_LENGTH = 255;
export const VALUE_MAX_LENGTH = 520;

const OP_NAME_DOI = 0x5a; // OP_10
const OP_2DROP = 0x6d;
const OP_DROP = 0x75;

const ERRORS = {
	NAME_ID_DEFINED: 'nameId and nameValue must be defined',
	NAME_ID_LENGTH: `nameId must have at least ${NAME_MIN_LENGTH} characters and at most ${NAME_MAX_LENGTH} bytes`,
	NAME_VALUE_LENGTH: `nameValue must not be longer than ${VALUE_MAX_LENGTH} bytes`,
	INVALID_ADDRESS: 'Invalid recipient address: ',
	UNSUPPORTED_ADDRESS: 'A name can only be sent to a P2PKH or P2WPKH address, not to '
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
 * Reference implementations:
 * - https://github.com/brandonrobertz/bitcore-namecoin/blob/master/lib/names.js
 * - https://github.com/doichain/doichain-transaction
 *
 * The script is put together from bytes instead of script.fromASM:
 * - fromASM drops an empty hex token, so an empty value could not be written,
 * - script.compile turns a 1-byte push 0x01–0x10 into OP_1…OP_16, which
 *   Doichain's name parser rejects,
 * - the address part comes from address.toOutputScript, which checks network
 *   and address type. Taking only the hash out of an address would turn a
 *   P2SH address into a P2PKH script that nobody can ever spend.
 *
 * @param {string} nameId - The identifier for the name, stored in NFC.
 * @param {string} nameValue - The value associated with the name, may be empty.
 * @param {string} recipientAddress - The recipient's Doichain address, P2PKH or P2WPKH.
 * @param {object} network - The Doichain network object (DOICHAIN, DOICHAIN_REGTEST, ...).
 * @returns {Buffer} The compiled script as a Buffer.
 */
export const getNameOPStackScript = (nameId, nameValue, recipientAddress, network = DOICHAIN) => {
	if (!nameId || nameValue === undefined || nameValue === null) {
		throw new Error(ERRORS.NAME_ID_DEFINED);
	}

	const name = Buffer.from(normalizeName(nameId), 'utf8');
	const value = Buffer.from(nameValue, 'utf8');

	if (name.length > NAME_MAX_LENGTH || normalizeName(nameId).length < NAME_MIN_LENGTH) {
		throw new Error(ERRORS.NAME_ID_LENGTH);
	}

	if (value.length > VALUE_MAX_LENGTH) {
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

	return Buffer.concat([
		Buffer.from([OP_NAME_DOI]),
		Buffer.from(pushData(name), 'hex'),
		Buffer.from(pushData(value), 'hex'),
		Buffer.from([OP_2DROP, OP_DROP]),
		output
	]);
};
