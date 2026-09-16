import { Psbt } from "bitcoinjs-lib";
import { t } from "$lib/i18n/index.js";
import { getNameOPStackScript } from "./getNameOPStackScript.js";
import { VERSION } from "./doichain.js";
import { checkNameTransaction, DUST_LIMIT, inputFor, isNameScript, verifiedOutput } from "./transactionChecks.js";
import {getTransactionFee} from "$lib/doichain/getTransactionFee.js";

/**
 * Creates and signs a Partially Signed Bitcoin Transaction (PSBT) for registering a Doichain name.
 *
 * Nothing is taken on trust from the ElectrumX server: amounts and scripts of
 * the inputs are read from the raw previous transactions, after checking that
 * they hash to the txids being spent. If any step fails, the result is an
 * error and no PSBT at all – never a PSBT that pays a fee but registers nothing.
 *
 * @param {Array<Object>} _utxoAddresses - Array of UTXO objects to use as inputs.
 * @param {string} _name - The Doichain name to be registered.
 * @param {Object} _network - The network object (e.g., DOICHAIN) containing network-specific parameters.
 * @param {number} _storageFee - The amount locked in the name output, in swartz.
 * @param {string} _recipientAddress - The address that will own the registered name.
 * @param {string} _changeAddress - The address to send any remaining funds after the transaction.
 * @param {string} doichainAddress - The Doichain address used for error messages.
 *
 * @returns {Object} Either { error } or the PSBT base64 string and transaction details.
 */
export function signTransaction(_utxoAddresses, _name, _network, _storageFee, _recipientAddress, _changeAddress, doichainAddress) {
    if(!_name || _utxoAddresses.length === 0 || !_recipientAddress || !_changeAddress) {
        return { error: t('funds.missingParameters') };
    }

    const psbt = new Psbt({ network: _network });
    let totalInputAmount = 0;
    let totalOutputAmount = 0;
    let transactionFee;
    let changeAmount;

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
        psbt.addInput(inputFor(utxo, output));
        totalInputAmount += output.value;
    }

    // An empty value: the name is registered, a value can follow with an update.
    // (Earlier versions wrote the placeholder 'empty', which now sits on chain.)
    let opCodesStackScript;
    try {
        opCodesStackScript = getNameOPStackScript(_name, '', _recipientAddress, _network);
    } catch (error) {
        return { error: t('psbt.errors.nameScript', { error: error.message }) };
    }
    psbt.setVersion(VERSION); // for name transactions
    psbt.addOutput({
        script: opCodesStackScript,
        value: _storageFee
    });
    totalOutputAmount = totalOutputAmount + _storageFee;

    transactionFee = getTransactionFee(_utxoAddresses.length)
    changeAmount = totalInputAmount - totalOutputAmount - transactionFee;
    if(changeAmount < 0) {
        return {
            error: t('funds.insufficientForTransaction', { address: doichainAddress }),
            isUTXOAddressValid: false
        };
    }

    // change too small to relay goes to the miners instead of into a dust output
    let dust = 0;
    if (changeAmount < DUST_LIMIT) {
        dust = changeAmount;
        transactionFee += changeAmount;
        changeAmount = 0;
    } else {
        psbt.addOutput({
            address: _changeAddress || doichainAddress,
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
        dust
    };
}
