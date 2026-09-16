import { nameShow } from "$lib/doichain/nameShow.js";
import { describeNameBytes } from "$lib/doichain/nameBytes.js";
import { NAME_MAX_LENGTH } from "$lib/doichain/getNameOPStackScript.js";
import { getScriptPubKeyAddress } from "$lib/doichain/scriptPubKeyAddress.js";
import { t } from "$lib/i18n/index.js";
import sb from "satoshi-bitcoin";
import { debounce } from 'lodash';

export const checkName = debounce((electrumClient, name, totalUtxoValue, totalAmount, callback) => {
    _checkName(electrumClient, name, totalUtxoValue, totalAmount).then(result => {
        // every answer names the name it was computed for, so the caller can drop
        // an answer that arrives after the user has typed on
        callback({ ...result, name });
    }).catch(error => {
        // a failed lookup must not leave the previous result on screen
        callback({ name, nameErrorMessage: t('name.errors.lookupFailed', { name, error: error?.message ?? String(error) }), isNameValid: false });
    });
}, 300);

export async function _checkName(electrumClient, _name, totalUtxoValue, totalAmount) {

    let nameErrorMessage = '';
    let utxoErrorMessage = '';
    let isNameValid = true;
    let isUTXOAddressValid = true;

    let currentNameAddress = '';

    if(!_name) {
        const nameErrorMessage = t('name.errors.empty');
        return { nameErrorMessage, isNameValid: false }
    }

    if(_name.split(' ').length > 1) {
        const nameErrorMessage = t('name.errors.space');
        return { nameErrorMessage, isNameValid: false };
    }

    // Doichain limits names by bytes; "ü" takes two of them
    const { byteLength } = describeNameBytes(_name);
    if (byteLength > NAME_MAX_LENGTH) {
        const nameErrorMessage = t('name.errors.tooLong', { bytes: byteLength, max: NAME_MAX_LENGTH });
        return { nameErrorMessage, isNameValid: false };
    }
    if (_name.length > 3) {
        const res = await nameShow(electrumClient, _name);
        if (res.length > 0) {
            for (let utxo of res) {
                const scriptPubKey = utxo.scriptPubKey;
                if (scriptPubKey && scriptPubKey.nameOp) {
                    currentNameAddress = getScriptPubKeyAddress(scriptPubKey);
                }
            }
            nameErrorMessage = t('name.errors.taken', { name: _name, address: currentNameAddress });
            isNameValid = false;
            return { currentNameAddress, nameErrorMessage, utxoErrorMessage, isNameValid, isUTXOAddressValid }
        }
        else if(totalUtxoValue <= sb.toSatoshi(totalAmount)){
            utxoErrorMessage = t('funds.insufficient', { address: currentNameAddress });
            isUTXOAddressValid = false;
            return { nameErrorMessage, utxoErrorMessage, isNameValid, isUTXOAddressValid }
        }
        else {
            return { nameErrorMessage, utxoErrorMessage, isNameValid, isUTXOAddressValid }
        }
    } else {
        nameErrorMessage = t('name.errors.tooShort', { name: _name });
        isNameValid = false;
        return { nameErrorMessage, currentNameAddress, utxoErrorMessage, isNameValid, isUTXOAddressValid };
    }
}