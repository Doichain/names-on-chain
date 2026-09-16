import { nameShow } from "$lib/doichain/nameShow.js";
import { getScriptPubKeyAddress } from "$lib/doichain/scriptPubKeyAddress.js";
import { t } from "$lib/i18n/index.js";
import sb from "satoshi-bitcoin";
import { debounce } from 'lodash';

export const checkName = debounce((electrumClient, currentNameAddress , name, totalUtxoValue, totalAmount, callback) => {
    _checkName(electrumClient, currentNameAddress, name, totalUtxoValue, totalAmount).then(result => {
        callback(result);
    }).catch(error => {
        // a failed lookup must not leave the previous result on screen,
        // and must not wipe the address the callback writes back
        callback({ currentNameAddress, nameErrorMessage: t('name.errors.lookupFailed', { name, error: error?.message ?? String(error) }), isNameValid: false });
    });
}, 300);

export async function _checkName(electrumClient, currentNameAddress, _name, totalUtxoValue, totalAmount) {

    let nameErrorMessage = '';
    let utxoErrorMessage = '';
    let isNameValid = true;
    let isUTXOAddressValid = true;

    if(!_name) {
        const nameErrorMessage = t('name.errors.empty');
        return { nameErrorMessage }
    }

    if(_name.split(' ').length > 1) {
        const nameErrorMessage = t('name.errors.space');
        return { nameErrorMessage };
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
            return { currentNameAddress, nameErrorMessage, utxoErrorMessage, isNameValid, isUTXOAddressValid }
        }
        else {
            isNameValid = true;
            return { currentNameAddress, nameErrorMessage, utxoErrorMessage, isNameValid, isUTXOAddressValid }
        }
    } else {
        nameErrorMessage = t('name.errors.tooShort', { name: _name });
        isNameValid = false;
        return { currentNameAddress, nameErrorMessage, utxoErrorMessage, isNameValid, isUTXOAddressValid };
    }
}