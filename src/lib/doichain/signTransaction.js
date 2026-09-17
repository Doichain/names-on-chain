import { address, Psbt } from "@doichain/doichainjs-lib";
import { t } from "$lib/i18n/index.js";
import { getNameOPStackScript } from "./getNameOPStackScript.js";
import { VERSION } from "./doichain.js";
import { checkNameTransaction, DUST_LIMIT, inputFor, isNameScript, isP2WPKHScript, verifiedOutput } from "./transactionChecks.js";
import { estimateVsize, feeFor, MAX_INPUTS, MIN_RELAY_FEE_RATE, selectCoins } from "./fees.js";

/**
 * Creates and signs a Partially Signed Bitcoin Transaction (PSBT) for registering a Doichain name.
 *
 * Nothing is taken on trust from the ElectrumX server: amounts and scripts of
 * the inputs are read from the raw previous transactions, after checking that
 * they hash to the txids being spent. If any step fails, the result is an
 * error and no PSBT at all – never a PSBT that pays a fee but registers nothing.
 *
 * Only as many coins are spent as needed, the largest first, and the fee
 * follows the size of the transaction: a fixed fee fell below Doichain Core's
 * minimum relay fee as soon as an address paid with three or more coins.
 *
 * @param {Array<Object>} _utxoAddresses - The UTXOs of the address, candidates for the inputs.
 * @param {string} _name - The Doichain name to be registered.
 * @param {Object} _network - The network object (e.g., DOICHAIN) containing network-specific parameters.
 * @param {number} _storageFee - The amount locked in the name output, in swartz.
 * @param {string} _recipientAddress - The address that will own the registered name.
 * @param {string} _changeAddress - The address to send any remaining funds after the transaction.
 * @param {string} doichainAddress - The Doichain address used for error messages.
 * @param {number} [feeRate] - swartz per vbyte, see feeRateFor()
 *
 * @returns {Object} Either { error } or the PSBT base64 string and transaction details.
 */
export function signTransaction(_utxoAddresses, _name, _network, _storageFee, _recipientAddress, _changeAddress, doichainAddress, feeRate = MIN_RELAY_FEE_RATE) {
    if(!_name || _utxoAddresses.length === 0 || !_recipientAddress || !_changeAddress) {
        return { error: t('funds.missingParameters') };
    }

    // every coin is checked before any is chosen
    const coins = [];
    for (const utxo of _utxoAddresses) {
        let output;
        try {
            output = verifiedOutput(utxo);
        } catch (error) {
            return { error: t('psbt.errors.prevout', { txid: utxo.hash }) };
        }
        // a name output spent without a name operation would be refused by the network
        if (isNameScript(output.script)) {
            return { error: t('psbt.errors.nameInput', { txid: utxo.hash, n: utxo.n }) };
        }
        coins.push({ utxo, output, value: output.value, height: utxo.height, segwit: isP2WPKHScript(output.script) });
    }

    // An empty value: the name is registered, a value can follow with an update.
    // (Earlier versions wrote the placeholder 'empty', which now sits on chain.)
    let opCodesStackScript;
    let changeScript;
    try {
        opCodesStackScript = getNameOPStackScript(_name, '', _recipientAddress, _network);
        changeScript = address.toOutputScript(_changeAddress || doichainAddress, _network);
    } catch (error) {
        return { error: t('psbt.errors.nameScript', { error: error.message }) };
    }

    const outputScripts = [opCodesStackScript, changeScript];
    const selection = selectCoins(coins, _storageFee, (selected) => feeFor(estimateVsize(selected, outputScripts), feeRate));
    if (selection.error === 'tooFragmented') {
        return { error: t('funds.tooFragmented', { address: doichainAddress, max: MAX_INPUTS }), isUTXOAddressValid: false };
    }
    if (selection.error) {
        return {
            error: t('funds.insufficient', { address: doichainAddress }),
            isUTXOAddressValid: false
        };
    }

    const psbt = new Psbt({ network: _network });
    for (const coin of selection.selected) {
        psbt.addInput(inputFor(coin.utxo, coin.output));
    }
    psbt.setVersion(VERSION); // for name transactions
    psbt.addOutput({
        script: opCodesStackScript,
        value: _storageFee
    });

    const totalInputAmount = selection.total;
    const totalOutputAmount = _storageFee;
    let transactionFee = selection.fee;
    let changeAmount = totalInputAmount - totalOutputAmount - transactionFee;

    // change too small to relay goes to the miners instead of into a dust output
    let dust = 0;
    if (changeAmount < DUST_LIMIT) {
        dust = changeAmount;
        transactionFee += changeAmount;
        changeAmount = 0;
    } else {
        psbt.addOutput({
            script: changeScript,
            value: changeAmount,
        });
    }
    let totalAmount = totalOutputAmount + transactionFee;

    const problem = checkNameTransaction(psbt);
    if (problem) {
        return { error: t('psbt.errors.nameScript', { error: problem }) };
    }

    const psbtFile = psbt.toBase64();

    return {
        psbt,
        psbtBase64: psbtFile,
        totalInputAmount,
        totalOutputAmount,
        transactionFee,
        changeAmount,
        totalAmount,
        dust,
        feeRate,
        vsize: estimateVsize(selection.selected, outputScripts),
        coinsUsed: selection.selected.length,
        coinsAvailable: coins.length
    };
}
