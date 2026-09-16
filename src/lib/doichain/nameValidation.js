import { nameShow } from "$lib/doichain/nameShow.js";
import { getScriptPubKeyAddress } from "$lib/doichain/scriptPubKeyAddress.js";
import sb from "satoshi-bitcoin";
import { debounce } from 'lodash';

export const checkName = debounce((electrumClient, currentNameAddress , name, totalUtxoValue, totalAmount, callback) => {
    _checkName(electrumClient, currentNameAddress, name, totalUtxoValue, totalAmount).then(result => {
        callback(result);
    }).catch(error => {
        // a failed lookup must not leave the previous result on screen,
        // and must not wipe the address the callback writes back
        callback({ currentNameAddress, nameErrorMessage: `Could not check "${name}": ${error?.message ?? error}`, isNameValid: false });
    });
}, 300);

export async function _checkName(electrumClient, currentNameAddress, _name, totalUtxoValue, totalAmount) {

    let nameErrorMessage = '';
    let utxoErrorMessage = '';
    let isNameValid = true;
    let isUTXOAddressValid = true;

    if(!_name) {
        const nameErrorMessage = `No name provided`;
        return { nameErrorMessage }
    }

    if(_name.split(' ').length > 1) {
        const nameErrorMessage = `Only one name is allowed`;
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
            nameErrorMessage = `Name "${_name}" already registered under address ${currentNameAddress}`;
            isNameValid = false;
            return { currentNameAddress, nameErrorMessage, utxoErrorMessage, isNameValid, isUTXOAddressValid }
        }
        else if(totalUtxoValue <= sb.toSatoshi(totalAmount)){
            utxoErrorMessage = `Funds on ${currentNameAddress} are insufficient for this Doichain name`;
            isUTXOAddressValid = false;
            return { currentNameAddress, nameErrorMessage, utxoErrorMessage, isNameValid, isUTXOAddressValid }
        }
        else {
            isNameValid = true;
            return { currentNameAddress, nameErrorMessage, utxoErrorMessage, isNameValid, isUTXOAddressValid }
        }
    } else {
        nameErrorMessage = `Name "${_name}" is too short`;
        isNameValid = false;
        return { currentNameAddress, nameErrorMessage, utxoErrorMessage, isNameValid, isUTXOAddressValid };
    }
}