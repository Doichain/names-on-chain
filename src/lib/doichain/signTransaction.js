import { Psbt } from "bitcoinjs-lib";
import { t } from "$lib/i18n/index.js";
import { getNameOPStackScript } from "./getNameOPStackScript.js";
import { VERSION } from "./doichain.js";
import {getTransactionFee} from "$lib/doichain/getTransactionFee.js";

/**
 * Creates and signs a Partially Signed Bitcoin Transaction (PSBT) for registering a Doichain name.
 * 
 * @param {Array<Object>} _utxoAddresses - Array of UTXO objects to use as inputs.
 * @param {string} _name - The Doichain name to be registered.
 * @param {Object} _network - The network object (e.g., DOICHAIN) containing network-specific parameters.
 * @param {number} _storageFee - The fee for storing the name on the Doichain network.
 * @param {string} _recipientAddress - The address that will own the registered name.
 * @param {string} _changeAddress - The address to send any remaining funds after the transaction.
 * @param {string} doichainAddress - The Doichain address used for error messages.
 * 
 * @returns {Object} An object containing the PSBT base64 string and transaction details.
 * 
 * @throws {Error} Implicitly throws an error if any of the required parameters are missing or invalid.
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

    _utxoAddresses.forEach(utxo => {
        const scriptPubKeyHex = utxo.hex;
        const isSegWit = utxo?.scriptPubKey?.type === "witness_v0_keyhash" || scriptPubKeyHex?.startsWith('0014') || scriptPubKeyHex?.startsWith('0020');
        // const isSegWit =  scriptPubKeyHex?.startsWith('0014') || scriptPubKeyHex?.startsWith('0020');
        if (isSegWit) {
            psbt.addInput({
                hash: utxo.hash,
                index: utxo.n,
                witnessUtxo: {
                    script: Buffer.from(utxo.scriptPubKey.hex, 'hex'),
                    value: utxo.value,
                }
            });
        } else {
            psbt.addInput({
                hash: utxo.hash,
                index: utxo.n,
                nonWitnessUtxo: Buffer.from(utxo.hex, 'hex')
            });
        }
        totalInputAmount += utxo.value;
    });

    if(_name) {
        try {
            const opCodesStackScript = getNameOPStackScript(_name, ' ', _recipientAddress, _network);
            psbt.setVersion(VERSION); // for name transactions
            psbt.addOutput({
                script: opCodesStackScript,
                value: _storageFee
            });
            console.log("added nameOp", _name, opCodesStackScript);
            totalOutputAmount = totalOutputAmount + _storageFee;
        }catch( ex ) { console.error(ex) }
    }

    transactionFee = getTransactionFee(_utxoAddresses.length)
    changeAmount = totalInputAmount - totalOutputAmount - transactionFee;
    let totalAmount = totalOutputAmount + transactionFee;
    if(changeAmount < 0) {
        return {
            error: t('funds.insufficientForTransaction', { address: doichainAddress }),
            isUTXOAddressValid: false
        };
    }

    psbt.addOutput({
        address: _changeAddress || doichainAddress,
        value: changeAmount,
    });
    console.log("added change", changeAmount, _changeAddress);

    const psbtFile = psbt.toBase64();

    return {
        psbt,
        psbtBase64: psbtFile,
        totalInputAmount,
        totalOutputAmount,
        transactionFee,
        changeAmount,
        totalAmount
    };
}