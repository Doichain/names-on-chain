import { address, Psbt } from '@doichain/doichainjs-lib';
import sb from 'satoshi-bitcoin';
import { VERSION } from '@names-on-chain/doichain/doichain.js';
import { t } from '@names-on-chain/doichain/i18n';
import {
	estimateVsize,
	feeFor,
	MAX_INPUTS,
	MIN_RELAY_FEE_RATE,
	selectCoins
} from '$lib/doichain/fees.js';
import { getNameOPStackScript } from '@names-on-chain/doichain/getNameOPStackScript.js';
import { normalizeName } from '@names-on-chain/doichain/nameBytes.js';
import {
	checkNameTransaction,
	DUST_LIMIT,
	inputFor,
	isNameScript,
	isP2WPKHScript,
	parseNameScript,
	verifiedOutput
} from '$lib/doichain/transactionChecks.js';

const OP_NAME_DOI = 0x5a;

/**
 * Builds the PSBT of an atomic name purchase, for the buyer. Nobody signs here:
 * buyer and seller each sign it in their own wallet.
 *
 * One transaction holds both halves of the trade:
 *
 *   inputs   the buyer's coins, the output that holds the name today
 *   outputs  price to the seller – plus whatever the old name output held
 *            beyond the locked amount, which stays the seller's money,
 *            the name with its current value and the locked amount to the buyer,
 *            change to the buyer
 *
 * The buyer signs the coin inputs, the seller signs the name input last. Neither
 * signature is any use without the other, so either both halves happen or none.
 *
 * Nothing that decides where money goes is taken from the ElectrumX server:
 * - the buyer's address is the one the buyer entered,
 * - the seller's address is read from the name output's script,
 * - every amount is read from a raw transaction checked against its txid.
 *
 * Only as many of the buyer's coins are spent as needed, the largest first, and
 * the fee follows the size of the transaction.
 *
 * Sell offers, where the seller signs first with SIGHASH_SINGLE|ANYONECANPAY,
 * are not built: DoiWallet signs only with SIGHASH_ALL, and an offer signed
 * that way cannot be completed by a buyer.
 *
 * @param {string} name - the name to buy, as typed
 * @param {Array<Object>} fundingUtxos - the buyer's coins: { hash, n, hex }
 * @param {Object} nameUtxo - the output that holds the name today: { hash, n, hex, height }
 * @param {string} buyerAddress - entered by the buyer; receives the name and the change
 * @param {number} price - swartz for the seller
 * @param {number} storageFee - swartz locked in the name output the buyer receives
 * @param {Object} network - DOICHAIN, DOICHAIN_REGTEST, ...
 * @param {number} [feeRate] - swartz per vbyte, see feeRateFor()
 * @returns {Object} either { error } or { psbtBase64, sellerAddress, sellerReceives, surplus,
 *          transactionFee, changeAmount, dust, fromCoins, feeRate, vsize, coinsUsed, coinsAvailable }
 */
export const buildNameTradePsbt = (
	name,
	fundingUtxos,
	nameUtxo,
	buyerAddress,
	price,
	storageFee,
	network,
	feeRate = MIN_RELAY_FEE_RATE
) => {
	if (!Number.isSafeInteger(price) || price < 0) {
		return { error: t('trade.errors.price') };
	}
	if (!nameUtxo) {
		return { error: t('trade.errors.nameMismatch', { name }) };
	}
	if (!(nameUtxo.height > 0)) {
		return { error: t('trade.errors.unconfirmed') };
	}

	// 1. The name input: checked against its txid, then taken apart
	let nameOutput;
	try {
		nameOutput = verifiedOutput(nameUtxo);
	} catch (error) {
		return { error: t('psbt.errors.prevout', { txid: nameUtxo.hash }) };
	}
	if (nameOutput.script[0] !== OP_NAME_DOI) {
		// a name last written with name_update cannot be moved with OP_NAME_DOI
		return {
			error: isNameScript(nameOutput.script)
				? t('trade.errors.nameOperation')
				: t('trade.errors.nameMismatch', { name })
		};
	}
	let current;
	let sellerAddress;
	try {
		current = parseNameScript(nameOutput.script);
		sellerAddress = address.fromOutputScript(current.ownerScript, network);
	} catch (error) {
		return { error: t('trade.errors.nameMismatch', { name }) };
	}
	if (!current.name.equals(Buffer.from(normalizeName(name), 'utf8'))) {
		return { error: t('trade.errors.nameMismatch', { name }) };
	}
	if (sellerAddress === buyerAddress) {
		return { error: t('trade.errors.ownName', { address: sellerAddress }) };
	}

	// 2. The buyer's coins, all checked before any is chosen
	const coins = [];
	for (const utxo of fundingUtxos) {
		let output;
		try {
			output = verifiedOutput(utxo);
		} catch (error) {
			return { error: t('psbt.errors.prevout', { txid: utxo.hash }) };
		}
		if (isNameScript(output.script)) {
			return { error: t('psbt.errors.nameInput', { txid: utxo.hash, n: utxo.n }) };
		}
		coins.push({
			utxo,
			output,
			value: output.value,
			height: utxo.height,
			segwit: isP2WPKHScript(output.script)
		});
	}

	// 3. Price to the seller. The old name output may hold more than the locked
	//    amount (hello holds 1 DOI); that surplus is the seller's, not a gift to the buyer.
	const surplus = Math.max(0, nameOutput.value - storageFee);
	const sellerReceives = price + surplus;
	if (sellerReceives < DUST_LIMIT) {
		return { error: t('trade.errors.priceTooLow', { minimum: sb.toBitcoin(DUST_LIMIT) }) };
	}

	// 4. The name to the buyer, keeping the value it holds today (the bytes as they are)
	let nameScript;
	let sellerScript;
	let changeScript;
	try {
		nameScript = getNameOPStackScript(name, current.value, buyerAddress, network);
		sellerScript = address.toOutputScript(sellerAddress, network);
		changeScript = address.toOutputScript(buyerAddress, network);
	} catch (error) {
		return { error: t('psbt.errors.nameScript', { error: error.message }) };
	}

	// 5. The coins the buyer spends: the price, plus whatever the old name output lacks
	//    of the locked amount, plus the fee for exactly these inputs
	const nameInput = { segwit: isP2WPKHScript(current.ownerScript) };
	const outputScripts = [sellerScript, nameScript, changeScript];
	const vsizeWith = (selected) => estimateVsize([...selected, nameInput], outputScripts);
	const needed = Math.max(0, sellerReceives + storageFee - nameOutput.value);
	const selection = selectCoins(coins, needed, (selected) => feeFor(vsizeWith(selected), feeRate));
	if (selection.error === 'tooFragmented') {
		return { error: t('funds.tooFragmented', { address: buyerAddress, max: MAX_INPUTS }) };
	}
	if (selection.error) {
		return { error: t('trade.errors.insufficient', { address: buyerAddress }) };
	}

	const psbt = new Psbt({ network: network });
	// Set the version for name operations
	psbt.setVersion(VERSION);
	for (const coin of selection.selected) {
		psbt.addInput(inputFor(coin.utxo, coin.output));
	}

	// The name input goes last. A name owned by a SegWit address is signed like
	// SegWit, so it also gets witnessUtxo with the whole name script.
	const segwitName = nameInput.segwit
		? { witnessUtxo: { script: nameOutput.script, value: nameOutput.value } }
		: {};
	psbt.addInput(inputFor(nameUtxo, nameOutput, segwitName));

	psbt.addOutput({
		script: sellerScript,
		value: sellerReceives
	});
	psbt.addOutput({
		script: nameScript,
		value: storageFee
	});

	// 6. Change to the buyer; too little for an output goes to the miners
	let transactionFee = selection.fee;
	let changeAmount =
		selection.total + nameOutput.value - sellerReceives - storageFee - transactionFee;
	let dust = 0;
	if (changeAmount < DUST_LIMIT) {
		dust = changeAmount;
		transactionFee += changeAmount;
		changeAmount = 0;
	} else {
		psbt.addOutput({
			script: changeScript,
			value: changeAmount
		});
	}

	const problem = checkNameTransaction(psbt);
	if (problem) {
		return { error: t('psbt.errors.nameScript', { error: problem }) };
	}

	return {
		psbtBase64: psbt.toBase64(),
		sellerAddress,
		sellerReceives,
		surplus,
		transactionFee,
		changeAmount,
		dust,
		fromCoins: selection.total - changeAmount,
		feeRate,
		vsize: vsizeWith(selection.selected),
		coinsUsed: selection.selected.length,
		coinsAvailable: coins.length
	};
};
