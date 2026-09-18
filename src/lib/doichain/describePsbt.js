import {
	address as addresses,
	nameops,
	Psbt,
	script as scripts,
	Transaction
} from '@doichain/doichainjs-lib';

/**
 * Reads a PSBT the way a wallet reads it, so the page can show what is in it:
 * which coins it spends, where they go, and what is left for the miners.
 *
 * Everything comes out of the PSBT itself – the same bytes the wallet signs –
 * so nothing here depends on what a server said.
 *
 * @param {string} base64 - the PSBT
 * @param {object} network - the network its addresses belong to
 * @returns {{
 *   version: number,
 *   inputs: Array<{txid: string, n: number, value: number|undefined}>,
 *   outputs: Array<{value: number, address: string|undefined, isName: boolean, hex: string, asm: string}>,
 *   fee: number|undefined
 * }}
 */
export function describePsbt(base64, network) {
	const psbt = Psbt.fromBase64(base64, { network });

	const inputs = psbt.txInputs.map((input, i) => ({
		// a txid is the hash of the transaction, written the other way round
		txid: Buffer.from(input.hash).reverse().toString('hex'),
		n: input.index,
		value: spentValue(psbt.data.inputs[i], input.index)
	}));

	const outputs = psbt.txOutputs.map((output) => {
		// a name output pays its holder behind the name prefix
		const owner = nameops.nameScriptOwner(output.script);
		return {
			value: output.value,
			address: addressOf(owner ?? output.script, network),
			isName: owner !== undefined,
			hex: output.script.toString('hex'),
			asm: scripts.toASM(output.script)
		};
	});

	const spent = inputs.reduce(
		(sum, input) => (input.value === undefined ? NaN : sum + input.value),
		0
	);
	const paid = outputs.reduce((sum, output) => sum + output.value, 0);

	return {
		version: psbt.version,
		inputs,
		outputs,
		// what a transaction does not pay out is the miner's, and only known with every input
		fee: Number.isNaN(spent) ? undefined : spent - paid
	};
}

/** The amount an input spends, in whichever form the PSBT carries it */
function spentValue(data, n) {
	if (data?.witnessUtxo) return data.witnessUtxo.value;
	if (data?.nonWitnessUtxo) return Transaction.fromBuffer(data.nonWitnessUtxo).outs[n]?.value;
	return undefined;
}

/** The address a script pays to, or undefined for a script that has none */
function addressOf(script, network) {
	try {
		return addresses.fromOutputScript(script, network);
	} catch {
		return undefined;
	}
}
