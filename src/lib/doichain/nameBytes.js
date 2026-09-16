/**
 * A Doichain name is a string of bytes, not of characters. The same visible
 * name can be typed as different bytes: "ü" as one code point (NFC) or as "u"
 * followed by a combining mark (NFD). The app looks up and registers every
 * name in NFC, so the two spellings cannot end up as two different names.
 *
 * @param {string} name
 * @returns {string}
 */
export function normalizeName(name) {
	return name.normalize('NFC');
}

/** Alphabets with letters that look like Latin ones: "pаypаl" with a Cyrillic "а". */
const LOOK_ALIKE_SCRIPTS = [/\p{Script=Latin}/u, /\p{Script=Cyrillic}/u, /\p{Script=Greek}/u, /\p{Script=Armenian}/u, /\p{Script=Cherokee}/u];

/**
 * What a name looks like on chain, for warnings about look-alike names.
 *
 * @param {string} name
 * @returns {{byteLength: number, hex: string, isAscii: boolean, mixesScripts: boolean}}
 */
export function describeNameBytes(name) {
	const bytes = Buffer.from(normalizeName(name), 'utf8');
	const scripts = LOOK_ALIKE_SCRIPTS.filter((script) => script.test(name));
	return {
		byteLength: bytes.length,
		hex: bytes.toString('hex').replace(/(..)(?!$)/g, '$1 '),
		isAscii: /^[\x20-\x7e]*$/.test(name),
		mixesScripts: scripts.length > 1
	};
}
