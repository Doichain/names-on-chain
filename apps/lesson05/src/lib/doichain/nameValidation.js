import { nameShow } from '$lib/doichain/nameShow.js';
import { describeNameBytes } from '@names-on-chain/doichain/nameBytes.js';
import { NAME_MAX_LENGTH, NAME_MIN_LENGTH } from '@names-on-chain/doichain/getNameOPStackScript.js';
import { getScriptPubKeyAddress } from '@names-on-chain/doichain/scriptPubKeyAddress.js';
import { latestNameOperation, nameExpiry } from '@names-on-chain/doichain/nameExpiry.js';
import {
	electrumBlockchainBlockHeadersSubscribe,
	network
} from '@names-on-chain/doichain/doichain-store.js';
import { normalizeName } from '@names-on-chain/doichain/nameBytes.js';
import { get } from 'svelte/store';
import { t } from '@names-on-chain/doichain/i18n';
import { debounce } from '@names-on-chain/doichain/debounce.js';

export const checkName = debounce(
	(electrumClient, doichainAddress, name, totalUtxoValue, totalAmount, callback) => {
		_checkName(electrumClient, doichainAddress, name, totalUtxoValue, totalAmount)
			.then((result) => {
				// every answer names the name it was computed for, so the caller can drop
				// an answer that arrives after the user has typed on
				callback({ ...result, name });
			})
			.catch((error) => {
				// a failed lookup must not leave the previous result on screen
				callback({
					name,
					nameErrorMessage: t('name.errors.lookupFailed', {
						name,
						error: error?.message ?? String(error)
					}),
					isNameValid: false
				});
			});
	},
	300
);

/**
 * @param electrumClient
 * @param doichainAddress - the user's own address, only used in messages about funds
 * @param _name - the name to check
 * @param totalUtxoValue - swartz available on doichainAddress
 * @param totalAmount - swartz the registration takes
 * @returns the result; for a taken name also the address it belongs to (currentNameAddress),
 *          its name operation (currentNameOp) and the output that holds it (currentNameUtxo)
 */
export async function _checkName(
	electrumClient,
	doichainAddress,
	_name,
	totalUtxoValue,
	totalAmount
) {
	let currentNameAddress = '';
	let nameErrorMessage = '';
	let utxoErrorMessage = '';
	let isNameValid = true;
	let isUTXOAddressValid = true;
	let currentNameOp;
	let currentNameUtxo;
	let nameExists;

	if (!_name) {
		const nameErrorMessage = t('name.errors.empty');
		return { nameErrorMessage, isNameValid: false };
	}

	if (_name.split(' ').length > 1) {
		const nameErrorMessage = t('name.errors.space');
		return { nameErrorMessage, isNameValid: false };
	}

	// Doichain limits names by bytes; "ü" takes two of them
	const { byteLength } = describeNameBytes(_name);
	if (byteLength > NAME_MAX_LENGTH) {
		const nameErrorMessage = t('name.errors.tooLong', { bytes: byteLength, max: NAME_MAX_LENGTH });
		return { nameErrorMessage, isNameValid: false };
	}
	if (normalizeName(_name).length >= NAME_MIN_LENGTH) {
		const res = await nameShow(electrumClient, _name);
		// the newest name operation decides: who holds the name, and until which block
		const latest = latestNameOperation(res, normalizeName(_name));
		const expiry = latest
			? nameExpiry(
					latest.height,
					get(electrumBlockchainBlockHeadersSubscribe)?.height,
					get(network)
				)
			: undefined;
		let nameNotice = '';
		if (res.length > 0 && !expiry?.expired) {
			currentNameAddress = latest ? getScriptPubKeyAddress(latest.scriptPubKey) : '';
			if (latest) {
				currentNameOp = latest.scriptPubKey.nameOp;
				// the output that holds the name today, the one a trade has to spend
				currentNameUtxo = {
					...latest,
					nameOp: currentNameOp,
					address: currentNameAddress,
					hash: latest.txid
				};
			}
			nameExists = true;
			if (expiry && !expiry.confirmed) {
				nameErrorMessage = t('name.errors.pending', { name: _name, address: currentNameAddress });
			} else if (expiry?.blocksLeft !== undefined) {
				nameErrorMessage = t('name.errors.takenUntil', {
					name: _name,
					address: currentNameAddress,
					expiresAt: expiry.expiresAt,
					blocksLeft: expiry.blocksLeft
				});
			} else {
				nameErrorMessage = t('name.errors.taken', { name: _name, address: currentNameAddress });
			}
			isNameValid = false;
			return {
				currentNameAddress,
				currentNameOp,
				currentNameUtxo,
				nameErrorMessage,
				utxoErrorMessage,
				nameExists,
				isNameValid,
				isUTXOAddressValid
			};
		} else if (expiry?.expired) {
			// an expired name is free again, anybody may register it
			nameNotice = t('name.expired', { expiresAt: expiry.expiresAt });
		}
		if (totalUtxoValue <= totalAmount) {
			utxoErrorMessage = t('funds.insufficient', { address: doichainAddress });
			isUTXOAddressValid = false;
			return { nameErrorMessage, nameNotice, utxoErrorMessage, isNameValid, isUTXOAddressValid };
		} else {
			return { nameErrorMessage, nameNotice, utxoErrorMessage, isNameValid, isUTXOAddressValid };
		}
	} else {
		nameErrorMessage = t('name.errors.tooShort', { name: _name, min: NAME_MIN_LENGTH });
		isNameValid = false;
		return {
			currentNameAddress,
			nameErrorMessage,
			utxoErrorMessage,
			isNameValid,
			isUTXOAddressValid
		};
	}
}
