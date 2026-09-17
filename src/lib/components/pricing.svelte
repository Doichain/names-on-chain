<script>
	import { getConnectionStatus } from '../doichain/connectElectrum.js';
	import { _, locale, t } from '$lib/i18n/index.js';
	import { checkName } from '$lib/doichain/nameValidation.js';
	import { getUtxosAndNamesOfAddress } from '$lib/doichain/utxoHelpers.js';
	import {
		electrumClient,
		connectedServer,
		scanOpen,
		network,
		electrumBlockchainBlockHeadersSubscribe,
		electrumBlockchainRelayfee
	} from '../doichain/doichain-store.js';
	import { feeRateFor } from '$lib/doichain/fees.js';
	import { describeNameBytes } from '$lib/doichain/nameBytes.js';
	import {
		cleanAddressInput,
		isAddressOf,
		isP2WPKHAddress
	} from '$lib/doichain/addressValidation.js';
	import { nameExpiry } from '$lib/doichain/nameExpiry.js';
	import { renderBBQR, renderBCUR } from '$lib/doichain/renderQR.js';
	import ScanModal from '$lib/doichain/ScanModal.svelte';

	import { signTransaction } from '$lib/doichain/signTransaction.js';
	import sb from 'satoshi-bitcoin';
	import { onDestroy, tick } from 'svelte';
	import { generateAtomicNameTradingPSBT } from '$lib/doichain/atomicNameTrading.js';
	import { parseDoiAmount } from '$lib/doichain/doiAmount.js';

	/** @type {string} - The name currently typed in the name input */
	let name = '';

	/** @type {boolean} - Indicates if the name input is valid */
	let isNameValid = true;

	/** @type {boolean} - Indicates if the name already exists on the blockchain (and has not expired) */
	let isNameExists = false;

	/** @type {string} - Error message if there's an issue with the name */
	let nameErrorMessage = '';

	/** @type {string} - Something worth knowing about a free name, e.g. that it expired */
	let nameNotice = '';

	/** @type {string} - The address a taken name belongs to; never written into doichainAddress */
	let currentNameAddress = '';

	/** @type {string} - The name the last answer of the name check belongs to */
	let checkedName = '';

	/** @type {boolean} - From the moment the name changes until its check has answered */
	$: isCheckingName = Boolean(name) && name !== checkedName;

	/** @type {string} - The Doichain address used for UTXOs, transaction recipient, and change
	 * Used for:
	 * - UTXOs (inputs)
	 * - Transaction recipient
	 * - Change address
	 */
	let doichainAddress = '';
	try {
		doichainAddress = localStorage.getItem('doichainAddress') || '';
	} catch (e) {
		console.error('Failed to access localStorage:', e);
	}
	// only a valid address is remembered, so a typo does not come back after a reload
	$: if (isAddressValid) localStorage.setItem('doichainAddress', doichainAddress);

	/**
	 * A scanned "doichain:" URI or an address pasted with spaces becomes the bare address
	 */
	$: if (doichainAddress && cleanAddressInput(doichainAddress) !== doichainAddress)
		doichainAddress = cleanAddressInput(doichainAddress);

	/** @type {boolean} - Is doichainAddress a valid address of the current network? */
	$: isAddressValid = isAddressOf($network, doichainAddress);

	/** @type {{address: string, error: string}|undefined} - Why the coins of the address could not be read */
	let addressError;

	/** @type {string} - The address the UTXOs in utxoAddresses belong to, once they are loaded */
	let utxosLoadedFor = '';

	$: addressLooksWrong = Boolean(doichainAddress) && (!isAddressValid || Boolean(addressError));

	/** @type {number} - Total value of all UTXOs */
	let totalUtxoValue = 0;
	/** @type {number} - Total amount for the transaction */
	let totalAmount = 0;

	/** @type {Array<Object>} - Array of name operation transactions for the current address */
	let nameOpTxs = [];

	/** @type {boolean} - Indicates if the UTXO address is valid */
	let isUTXOAddressValid = true;

	/** @type {string} - Error message for UTXO address validation issues */
	let utxoErrorMessage = '';

	/** @type {Array<Object>} - Array of UTXO addresses */
	let utxoAddresses = [];

	/** @type {string} - Base64 encoded PSBT text */
	let psbtBaseText;

	/** @type {boolean} - Controls visibility of funding scan modal */
	let scanOpenFunding = false;

	/** @type {Object} - Current name operation details */
	let currentNameOp;

	/** @type {Object} - Current name UTXO details */
	let currentNameUtxo;

	/** @type {string} - The buyer's address: it pays for a taken name and receives it. No default: money only moves to addresses the user entered. */
	let fundingUTXOAddress = '';
	try {
		fundingUTXOAddress = localStorage.getItem('fundingUTXOAddress') || '';
	} catch (e) {
		console.error('Failed to access localStorage:', e);
	}
	$: if (isFundingAddressValid) localStorage.setItem('fundingUTXOAddress', fundingUTXOAddress);
	$: if (fundingUTXOAddress && cleanAddressInput(fundingUTXOAddress) !== fundingUTXOAddress)
		fundingUTXOAddress = cleanAddressInput(fundingUTXOAddress);

	/** @type {boolean} - Is fundingUTXOAddress a valid address of the current network? */
	$: isFundingAddressValid = isAddressOf($network, fundingUTXOAddress);

	/** @type {boolean} - Indicates if connected to the network */
	let isConnected = false;

	/** @type {string} - The price for the name as typed, in DOI ("1.5" or "1,5") */
	let priceText = '';

	/** @type {number|undefined} - The price in swartz; undefined while the text is no amount */
	$: price = parseDoiAmount(priceText);

	/** @type {number} - Total value of funding UTXOs */
	let fundingTotalUtxoValue = 0;

	/** @type {Array<Object>} - Array of funding UTXO addresses */
	let fundingUtxoAddresses = [];

	/** @type {{address: string, error: string}|undefined} - Why the coins of the buyer's address could not be read */
	let fundingError;

	/** @type {string} - The address the funding UTXOs belong to, once they are loaded */
	let fundingLoadedFor = '';

	$: fundingLooksWrong =
		Boolean(fundingUTXOAddress) && (!isFundingAddressValid || Boolean(fundingError));

	/**
	 * Check a name, debounce every keyboard typing, return local variables by callback
	 * @param result
	 */
	export async function nameCheckCallback(result) {
		// an answer for a name typed earlier arrives too late to matter
		if (result.name !== name) return;
		checkedName = result.name;
		currentNameAddress = result.currentNameAddress ?? '';
		isNameValid = result.isNameValid;
		nameErrorMessage = result.nameErrorMessage;
		nameNotice = result.nameNotice ?? '';
		isNameExists = Boolean(result.nameExists);
		currentNameOp = result.currentNameOp;
		currentNameUtxo = result.currentNameUtxo;
	}

	/**
	 * Reactive statement to update connection status
	 * @type {{isConnected: boolean, serverName: string}}
	 * @property {boolean} isConnected - Indicates if the server is currently connected
	 * @property {string} serverName - The name of the connected server or a status message
	 */
	$: ({ isConnected, serverName } = getConnectionStatus($connectedServer));

	/**
	 * The connection status in words: the server URL once connected,
	 * otherwise the status the connection store reports, translated.
	 */
	function describeServer(server, translate) {
		if (server === 'offline') return translate('status.offline');
		const retry = /^retrying \((\d+)(?: - (.+))?\)$/.exec(server || '');
		if (retry)
			return translate('status.retrying', { values: { attempt: retry[1], host: retry[2] ?? '' } });
		return server;
	}
	$: serverText = describeServer(serverName, $_);

	/**
	 * Check a name, debounce every keyboard typing, return local variables by callback
	 */
	$: if (name) {
		$locale; // check again when the language changes, so the message follows it
		checkName(
			$electrumClient,
			doichainAddress,
			name,
			totalUtxoValue,
			totalAmount,
			nameCheckCallback
		);
	}

	/**
	 * An empty name has nothing to check and nothing to complain about
	 */
	$: if (!name) {
		checkedName = '';
		isNameValid = true;
		isNameExists = false;
		nameErrorMessage = '';
		nameNotice = '';
		currentNameOp = undefined;
		currentNameUtxo = undefined;
	}

	/**
	 * The bytes the name is stored as, to warn about look-alike names
	 */
	$: nameBytes = describeNameBytes(name);

	/**
	 * If we have a connection to Electrumx and a doichainAddress get UTXOs without and with NameOps.
	 * - UTXOs, we need to calculate the total amount of all inputs to spend
	 * - NameOp UTXOs hold the amount locked in a name; it stays the owner's and moves with the name
	 */
	$: {
		if (isConnected && isAddressValid) {
			const requestedAddress = doichainAddress;
			addressError = undefined;
			getUtxosAndNamesOfAddress($electrumClient, requestedAddress)
				.then((retObj) => {
					if (requestedAddress !== doichainAddress) return; // the user has moved on to another address
					nameOpTxs = retObj.nameOpTxs;
					totalUtxoValue = retObj.totalUtxoValue;
					utxoAddresses = retObj.utxoAddresses;
					utxosLoadedFor = requestedAddress;
				})
				.catch((error) => {
					if (requestedAddress !== doichainAddress) return;
					nameOpTxs = [];
					utxoAddresses = [];
					utxosLoadedFor = '';
					addressError = { address: requestedAddress, error: error?.message ?? String(error) };
				});
		} else if (!isAddressValid) {
			nameOpTxs = [];
			utxoAddresses = [];
			utxosLoadedFor = '';
		}
		// while the connection is down, the coins loaded last stay, so PSBT and QR code remain on screen
	}

	/**
	 * The buyer's coins: loaded when a valid buyer address is entered, never per keystroke in the name field.
	 * Name outputs of that address are left out; they cannot pay for a purchase.
	 */
	$: {
		if (isConnected && isFundingAddressValid) {
			const requestedAddress = fundingUTXOAddress;
			fundingError = undefined;
			getUtxosAndNamesOfAddress($electrumClient, requestedAddress)
				.then((retObj) => {
					if (requestedAddress !== fundingUTXOAddress) return; // the user has moved on to another address
					fundingTotalUtxoValue = retObj.utxoAddresses.reduce((sum, utxo) => sum + utxo.value, 0);
					fundingUtxoAddresses = retObj.utxoAddresses;
					fundingLoadedFor = requestedAddress;
				})
				.catch((error) => {
					if (requestedAddress !== fundingUTXOAddress) return;
					fundingUtxoAddresses = [];
					fundingTotalUtxoValue = 0;
					fundingLoadedFor = '';
					fundingError = { address: requestedAddress, error: error?.message ?? String(error) };
				});
		} else if (!isFundingAddressValid) {
			fundingUtxoAddresses = [];
			fundingTotalUtxoValue = 0;
			fundingLoadedFor = '';
		}
	}

	/**
	 * @type {number} storageFee - The fee for storing the name on the Doichain network, in swartz. Default is 1,000,000 (0.01 DOI).
	 */
	const DEFAULT_STORAGE_FEE = 1_000_000;

	/**
	 * @type {number} transactionFee - The fee for processing the transaction on the network, in swartz. Initially set to 0 and calculated later.
	 */
	let transactionFee = 0;

	/**
	 * @type {number} changeAmount - The amount of DOI to be returned to the sender's address after the transaction, in swartz. Initially set to 0 and calculated later.
	 */
	let changeAmount = 0;

	/**
	 * @type {number} dust - Change too small for an output, added to the mining fee, in swartz.
	 */
	let dust = 0;
	/** fee rate, size and coins of the registration on screen */
	let feeDetails;

	/**
	 * swartz per vbyte: at least Doichain Core's minimum relay fee, more only if the server asks for it
	 */
	$: feeRate = feeRateFor($electrumBlockchainRelayfee);

	/**
	 * @type {string|string[]} qrCodeData - The data to be encoded in the QR code. Can be a string for a single QR code or an array of strings for animated QR codes.
	 */
	let qrCodeData;

	/**
	 * @type {string} qrCode - The current QR code SVG string to be displayed. Used for animated QR codes.
	 */
	let qrCode;

	/**
	 * @type {boolean} bbqr - A flag to determine whether to use BBQR (Binary Bitcoin QR) format. Default is false.
	 */
	let bbqr = false;

	/**
	 * Reactive block for handling name registration transaction and QR code generation.
	 */
	$: {
		// nothing computed for an earlier name or address may stay on screen
		psbtBaseText = undefined;
		transactionFee = 0;
		changeAmount = 0;
		dust = 0;
		feeDetails = undefined;
		totalAmount = 0;
		utxoErrorMessage = '';
		if (
			name &&
			!isCheckingName &&
			isNameValid &&
			!isNameExists &&
			isAddressValid &&
			utxosLoadedFor === doichainAddress
		) {
			$locale; // rebuild when the language changes, so an error message follows it
			const result =
				utxoAddresses.length === 0
					? { error: t('funds.insufficientForTransaction', { address: doichainAddress }) }
					: signTransaction(
							utxoAddresses,
							name,
							$network,
							DEFAULT_STORAGE_FEE,
							doichainAddress,
							doichainAddress,
							doichainAddress,
							feeRate
						);
			if (result.error) {
				utxoErrorMessage = result.error;
			} else {
				psbtBaseText = result.psbtBase64;
				transactionFee = result.transactionFee;
				changeAmount = result.changeAmount;
				dust = result.dust;
				feeDetails = {
					rate: result.feeRate,
					vsize: result.vsize,
					used: result.coinsUsed,
					available: result.coinsAvailable
				};
				totalAmount = result.totalAmount;
			}
		}
	}

	/** time each QR code frame stays on screen, in milliseconds */
	const FRAME_DELAY = 300;

	/** The PSBT the QR code on screen belongs to (not reactive on purpose: it only decides what to keep) */
	const shown = { psbt: undefined };

	/** @type {number|null} animationTimeout - Holds the timeout ID for the QR code animation. */
	let animationTimeout;

	/** @type {number} frameIndex - The frame of the animated QR code on screen, counted from 0. */
	let frameIndex = 0;

	/** The animation stands still on the frame on screen */
	let isPaused = false;

	/** 'copied' or 'failed' for a moment after "Copy PSBT" */
	let copyState;

	/** The QR code, brought into view on small screens once it is created */
	let qrContainer;

	/** Sharing files (e.g. to DoiWallet on the same phone) works in this browser */
	const canShareFiles = (() => {
		try {
			return Boolean(
				navigator.canShare?.({
					files: [new File([new Uint8Array(1)], 'check.psbt', { type: 'application/octet-stream' })]
				})
			);
		} catch {
			return false;
		}
	})();

	/**
	 * Renders the QR code for the PSBT that is on screen right now.
	 * Generates either a BBQR or BCUR QR code for the transaction.
	 */
	function createPsbt() {
		const requested = shownPsbt;
		if (!requested) return;
		const stillCurrent = () => requested === shownPsbt;
		if (bbqr)
			renderBBQR(requested).then((imgurl) => {
				if (stillCurrent()) qrCodeData = imgurl;
			});
		else
			renderBCUR(requested)
				.then(async (_qr) => {
					if (!_qr || !stillCurrent()) return;
					shown.psbt = requested;
					qrCodeData = _qr;
					isPaused = false;
					displayQrCodes();
					await tick();
					qrContainer?.scrollIntoView({ behavior: 'smooth', block: 'center' });
				})
				.catch((error) => {
					console.error('Error generating QR code:', error);
					qrCodeData = undefined;
				});
	}

	/** Shows frame `index` of the animated QR code, wrapping around at both ends */
	function showFrame(index) {
		if (!qrCodeData?.length) return;
		frameIndex = (index + qrCodeData.length) % qrCodeData.length;
		qrCode = qrCodeData[frameIndex];
	}

	/**
	 * Initializes and starts the QR code animation.
	 * Resets the animation if it's already running.
	 */
	function displayQrCodes() {
		showFrame(0);
		scheduleNextFrame();
	}

	/**
	 * Moves on to the next frame after FRAME_DELAY, unless paused.
	 * Stops quietly when qrCodeData has been withdrawn in the meantime.
	 */
	function scheduleNextFrame() {
		if (animationTimeout) clearTimeout(animationTimeout);
		if (isPaused) return;
		animationTimeout = setTimeout(() => {
			// the PSBT can be withdrawn while the animation runs (qrCodeData = undefined)
			if (!qrCodeData?.length) return;
			showFrame(frameIndex + 1);
			scheduleNextFrame();
		}, FRAME_DELAY);
	}

	function stopQrCodes() {
		if (animationTimeout) clearTimeout(animationTimeout);
		qrCodeData = undefined;
		qrCode = undefined;
		shown.psbt = undefined;
	}

	function togglePause() {
		isPaused = !isPaused;
		scheduleNextFrame();
	}

	/** Pauses and shows the previous (-1) or next (+1) frame */
	function stepFrame(delta) {
		isPaused = true;
		if (animationTimeout) clearTimeout(animationTimeout);
		showFrame(frameIndex + delta);
	}

	const psbtBytes = (base64) => Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
	const psbtFileName = () => `${(name || 'transaction').replace(/[^a-z0-9._-]+/gi, '_')}.psbt`;

	async function copyPsbt() {
		try {
			await navigator.clipboard.writeText(shownPsbt);
			copyState = 'copied';
		} catch {
			copyState = 'failed';
		}
		setTimeout(() => (copyState = undefined), 3000);
	}

	/** Saves the PSBT as a binary .psbt file, the format wallets import */
	function downloadPsbt() {
		const url = URL.createObjectURL(
			new Blob([psbtBytes(shownPsbt)], { type: 'application/octet-stream' })
		);
		const link = document.createElement('a');
		link.href = url;
		link.download = psbtFileName();
		document.body.appendChild(link);
		link.click();
		link.remove();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	}

	async function sharePsbt() {
		const file = new File([psbtBytes(shownPsbt)], psbtFileName(), {
			type: 'application/octet-stream'
		});
		try {
			await navigator.share({ files: [file] });
		} catch {
			// closing the share sheet is not an error
		}
	}

	onDestroy(() => {
		if (animationTimeout) clearTimeout(animationTimeout);
	});

	$: totalUtxoValue = utxoAddresses.reduce((sum, utxo) => sum + utxo.value, 0);

	/**
	 * The purchase of a taken name (lesson 5). Like the registration it is built
	 * again on every change, and nothing from the previous input stays on screen.
	 * Sell offers are not built: DoiWallet signs only with SIGHASH_ALL.
	 */
	let trade;
	$: {
		trade = undefined;
		if (
			name &&
			!isCheckingName &&
			isNameExists &&
			currentNameUtxo &&
			isFundingAddressValid &&
			fundingLoadedFor === fundingUTXOAddress &&
			priceText
		) {
			$locale; // rebuild when the language changes, so an error message follows it
			trade = generateAtomicNameTradingPSBT(
				name,
				fundingUtxoAddresses,
				currentNameUtxo,
				fundingUTXOAddress,
				price,
				DEFAULT_STORAGE_FEE,
				$network,
				feeRate
			);
		}
	}
	$: tradeReady = Boolean(trade && !trade.error);

	/**
	 * DoiWallet 7.0.4 signs a name input at a P2WPKH address like a legacy input, and the network
	 * refuses the transaction (proven on regtest). The owner of such a name could not complete a purchase.
	 */
	$: nameHeldBySegwit = isNameExists && isP2WPKHAddress($network, currentNameAddress);

	/** The PSBT on screen: the purchase of a taken name, or the registration of a free one */
	$: shownPsbt = isNameExists ? (tradeReady ? trade.psbtBase64 : undefined) : psbtBaseText;

	/** A new PSBT needs a new QR code; the same PSBT again (after reloading the coins) keeps the running one */
	$: if (shownPsbt !== shown.psbt) stopQrCodes();

	/** fee rate, size and coins of what the fee box shows */
	$: shownFeeDetails = isNameExists
		? tradeReady
			? {
					rate: trade.feeRate,
					vsize: trade.vsize,
					used: trade.coinsUsed,
					available: trade.coinsAvailable
				}
			: undefined
		: feeDetails;

	/** What the fee box shows, for the purchase or for the registration */
	$: feeView = isNameExists
		? {
				mining: tradeReady ? trade.transactionFee : 0,
				fromCoins: tradeReady ? trade.fromCoins : 0,
				change: tradeReady ? trade.changeAmount : 0
			}
		: { mining: transactionFee, fromCoins: totalAmount, change: changeAmount };
</script>

{#if $scanOpen}
	<ScanModal bind:scanOpen={$scanOpen} bind:scanData={doichainAddress} />
{/if}

{#if scanOpenFunding}
	<ScanModal bind:scanOpen={scanOpenFunding} bind:scanData={fundingUTXOAddress} />
{/if}
<div class="bg-white py-24 sm:py-32">
	<div class="mx-auto max-w-7xl px-6 lg:px-8">
		<div class="mx-auto max-w-2xl sm:text-center">
			<h2
				class="text-3xl font-bold tracking-tight sm:text-4xl fade-red-to-green {isConnected
					? 'connected'
					: ''}"
			>
				{$_('app.title')}
			</h2>
			<h2
				class="font-bold tracking-tight sm:text-1xl fade-red-to-green {isConnected
					? 'connected'
					: 'blinking'} "
			>
				{serverText}
			</h2>
		</div>
		<div
			class="mx-auto mt-16 max-w-2xl rounded-3xl ring-1 ring-gray-200 sm:mt-20 lg:mx-0 lg:flex lg:max-w-none"
		>
			<div class="p-8 sm:p-10 lg:flex-auto">
				<p class="mt-6 text-base leading-7 text-gray-600">{$_('name.intro')}</p>
				{#if isConnected}
					<p>&nbsp;</p>
					<div>
						<label for="name" class="block text-sm font-medium leading-6 text-gray-900"
							>{$_('name.label')}</label
						>
						<div class="relative mt-2 rounded-md shadow-sm">
							<input
								bind:value={name}
								name="name"
								id="name"
								type="text"
								autocomplete="off"
								autocapitalize="off"
								spellcheck="false"
								class={isCheckingName || isNameValid
									? 'block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6'
									: 'block w-full rounded-md border-0 py-1.5 pr-10 text-red-900 ring-1 ring-inset ring-red-300 placeholder:text-red-300 focus:ring-2 focus:ring-inset focus:ring-red-500 sm:text-sm sm:leading-6'}
								placeholder={$_('name.placeholder')}
								aria-invalid={!isCheckingName && !isNameValid}
								aria-describedby="name-status"
							/>

							{#if isCheckingName}
								<!-- no verdict while the check runs -->
							{:else if !isNameValid}
								<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
									<svg
										class="h-5 w-5 text-red-500"
										viewBox="0 0 20 20"
										fill="currentColor"
										aria-hidden="true"
									>
										<path
											fill-rule="evenodd"
											d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
											clip-rule="evenodd"
										/>
									</svg>
								</div>
							{:else if name}
								<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
									<svg
										class="h-5 w-5 text-green-500"
										viewBox="0 0 20 20"
										fill="currentColor"
										aria-hidden="true"
									>
										<path
											fill-rule="evenodd"
											d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
											clip-rule="evenodd"
										/>
									</svg>
								</div>
							{/if}
						</div>
						<div id="name-status" aria-live="polite">
							{#if !name}
								<!-- nothing to say yet -->
							{:else if isCheckingName}
								<p class="mt-2 text-sm text-gray-600">
									{$_('name.checking', { values: { name } })}
								</p>
							{:else if !isNameValid}
								<p class="mt-2 text-sm text-red-600">{nameErrorMessage}</p>
							{:else}
								<p class="mt-2 text-sm text-green-700">
									{$_('name.available', { values: { name } })}
									{nameNotice}
								</p>
								{#if doichainAddress}
									<p class="mt-1 text-sm text-gray-600">
										{$_('name.address', { values: { address: doichainAddress } })}
									</p>
								{/if}
							{/if}
							{#if name && nameBytes.mixesScripts}
								<p class="mt-2 text-sm text-amber-800">
									{$_('name.warnings.mixedScripts', { values: { hex: nameBytes.hex } })}
								</p>
							{:else if name && !nameBytes.isAscii}
								<p class="mt-2 text-sm text-amber-800">
									{$_('name.warnings.nonAscii', { values: { hex: nameBytes.hex } })}
								</p>
							{/if}
						</div>
					</div>
				{:else}
					<p class="mt-2 text-sm text-red-600" id="connection-status">{$_('status.offlineHelp')}</p>
				{/if}
				<div>
					<label for="address" class="block text-sm font-medium leading-6 text-gray-900"
						>{$_('address.label')}</label
					>
					<div class="relative mt-2 rounded-md shadow-sm flex items-center">
						<input
							bind:value={doichainAddress}
							type="text"
							name="address"
							id="address"
							autocomplete="off"
							autocapitalize="off"
							spellcheck="false"
							class={!addressLooksWrong
								? 'block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6'
								: 'block w-full rounded-md border-0 py-1.5 pr-10 text-red-900 ring-1 ring-inset ring-red-300 placeholder:text-red-300 focus:ring-2 focus:ring-inset focus:ring-red-500 sm:text-sm sm:leading-6'}
							placeholder={$_('address.placeholder')}
							aria-invalid={addressLooksWrong}
							aria-describedby="address-status"
						/>
						{#if addressLooksWrong}
							<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
								<svg
									class="h-5 w-5 text-red-500"
									viewBox="0 0 20 20"
									fill="currentColor"
									aria-hidden="true"
								>
									<path
										fill-rule="evenodd"
										d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
										clip-rule="evenodd"
									/>
								</svg>
							</div>
						{/if}
						<button
							type="button"
							aria-label={$_('address.scan')}
							title={$_('address.scan')}
							on:click={() => {
								$scanOpen = true;
							}}
							class="ml-2"
							><svg
								class="h-8 w-8 text-orange-600"
								width="24"
								height="24"
								viewBox="0 0 24 24"
								stroke-width="2"
								stroke="currentColor"
								fill="none"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<path stroke="none" d="M0 0h24v24H0z" /> <path d="M4 7v-1a2 2 0 0 1 2 -2h2" />
								<path d="M4 17v1a2 2 0 0 0 2 2h2" /> <path d="M16 4h2a2 2 0 0 1 2 2v1" />
								<path d="M16 20h2a2 2 0 0 0 2 -2v-1" /> <line x1="5" y1="12" x2="19" y2="12" /></svg
							></button
						>
					</div>

					<div id="address-status" aria-live="polite">
						{#if doichainAddress && !isAddressValid}
							<p class="mt-2 text-sm text-red-600">{$_('address.errors.invalid')}</p>
						{:else if addressError}
							<p class="mt-2 text-sm text-red-600">
								{$_('address.errors.lookupFailed', { values: addressError })}
							</p>
						{:else if utxoErrorMessage}
							<p class="mt-2 text-sm text-red-600">
								<b>{$_('address.total', { values: { amount: sb.toBitcoin(totalUtxoValue) } })}</b>
								{utxoErrorMessage}
							</p>
						{:else}
							<p class="mt-2 text-sm text-gray-600">
								{$_('address.total', { values: { amount: sb.toBitcoin(totalUtxoValue) } })}
							</p>
							{#if nameOpTxs.length > 0}
								<div class="mt-4">
									<h4 class="text-sm font-medium text-gray-900 mb-2">{$_('address.names')}</h4>
									<div class="flex flex-wrap gap-2">
										{#each nameOpTxs as nameOp}
											{@const expiry = nameExpiry(
												nameOp.height,
												$electrumBlockchainBlockHeadersSubscribe?.height,
												$network
											)}
											<span
												class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium {expiry.expired
													? 'bg-gray-100 text-gray-700'
													: 'bg-blue-100 text-blue-800'}"
											>
												{#if !expiry.confirmed}
													{$_('address.namePending', { values: { name: nameOp.name } })}
												{:else if expiry.expired}
													{$_('address.nameExpired', {
														values: { name: nameOp.name, height: expiry.expiresAt }
													})}
												{:else if expiry.blocksLeft !== undefined}
													{$_('address.nameValidUntil', {
														values: {
															name: nameOp.name,
															height: expiry.expiresAt,
															blocksLeft: expiry.blocksLeft
														}
													})}
												{:else}
													{$_('address.expires', {
														values: { name: nameOp.name, height: expiry.expiresAt }
													})}
												{/if}
											</span>
										{/each}
									</div>
								</div>
							{/if}
						{/if}
					</div>
				</div>
				<p>&nbsp;</p>
				{#if isNameExists && !isCheckingName}
					<div class="border-t border-gray-100 pt-6">
						<h3 class="text-base font-semibold leading-7 text-gray-900">{$_('trade.heading')}</h3>
						<p class="mt-2 text-sm leading-6 text-gray-600">
							{$_('trade.intro', { values: { seller: currentNameAddress } })}
						</p>
						<p class="mt-2 text-sm leading-6 text-gray-500">{$_('trade.sellOfferOff')}</p>
						{#if nameHeldBySegwit}
							<p
								class="mt-3 rounded-md bg-amber-50 p-3 text-sm leading-6 text-amber-900"
								role="note"
							>
								{$_('trade.segwitName', { values: { address: currentNameAddress } })}
							</p>
						{/if}

						<label
							for="fundingUTXOAddress"
							class="mt-6 block text-sm font-medium leading-6 text-gray-900"
							>{$_('trade.fundingLabel')}</label
						>
						<div class="relative mt-2 rounded-md shadow-sm flex items-center">
							<input
								bind:value={fundingUTXOAddress}
								type="text"
								name="fundingUTXOAddress"
								id="fundingUTXOAddress"
								autocomplete="off"
								autocapitalize="off"
								spellcheck="false"
								class={!fundingLooksWrong
									? 'block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6'
									: 'block w-full rounded-md border-0 py-1.5 pr-10 text-red-900 ring-1 ring-inset ring-red-300 placeholder:text-red-300 focus:ring-2 focus:ring-inset focus:ring-red-500 sm:text-sm sm:leading-6'}
								placeholder={$_('address.placeholder')}
								aria-invalid={fundingLooksWrong}
								aria-describedby="funding-status"
							/>
							{#if fundingLooksWrong}
								<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
									<svg
										class="h-5 w-5 text-red-500"
										viewBox="0 0 20 20"
										fill="currentColor"
										aria-hidden="true"
									>
										<path
											fill-rule="evenodd"
											d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
											clip-rule="evenodd"
										/>
									</svg>
								</div>
							{/if}
							<button
								type="button"
								aria-label={$_('trade.fundingScan')}
								title={$_('trade.fundingScan')}
								on:click={() => {
									scanOpenFunding = true;
								}}
								class="ml-2"
								><svg
									class="h-8 w-8 text-orange-600"
									width="24"
									height="24"
									viewBox="0 0 24 24"
									stroke-width="2"
									stroke="currentColor"
									fill="none"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<path stroke="none" d="M0 0h24v24H0z" /> <path d="M4 7v-1a2 2 0 0 1 2 -2h2" />
									<path d="M4 17v1a2 2 0 0 0 2 2h2" /> <path d="M16 4h2a2 2 0 0 1 2 2v1" />
									<path d="M16 20h2a2 2 0 0 0 2 -2v-1" />
									<line x1="5" y1="12" x2="19" y2="12" /></svg
								></button
							>
						</div>
						<div id="funding-status" aria-live="polite">
							{#if fundingUTXOAddress && !isFundingAddressValid}
								<p class="mt-2 text-sm text-red-600">{$_('address.errors.invalid')}</p>
							{:else if fundingError}
								<p class="mt-2 text-sm text-red-600">
									{$_('address.errors.lookupFailed', { values: fundingError })}
								</p>
							{:else if fundingLoadedFor && fundingLoadedFor === fundingUTXOAddress}
								<p
									class="mt-2 text-sm {fundingUtxoAddresses.length > 0
										? 'text-gray-600'
										: 'text-red-600'}"
								>
									{$_('trade.fundingTotal', {
										values: { amount: sb.toBitcoin(fundingTotalUtxoValue) }
									})}
									{#if fundingUtxoAddresses.length === 0}{$_('trade.fundingInvalid')}{/if}
								</p>
							{/if}
						</div>

						<label for="price" class="mt-6 block text-sm font-medium leading-6 text-gray-900"
							>{$_('trade.priceLabel')}</label
						>
						<div class="relative mt-2 rounded-md shadow-sm">
							<input
								type="text"
								inputmode="decimal"
								bind:value={priceText}
								name="price"
								id="price"
								autocomplete="off"
								class="{priceText && price === undefined
									? 'block w-full rounded-md border-0 py-1.5 pr-10 text-red-900 ring-1 ring-inset ring-red-300 placeholder:text-red-300 focus:ring-2 focus:ring-inset focus:ring-red-500 sm:text-sm sm:leading-6'
									: 'block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6'} pr-12"
								placeholder="1.5"
								aria-invalid={Boolean(priceText) && price === undefined}
								aria-describedby="price-currency trade-status"
							/>
							<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
								<span class="text-gray-500 sm:text-sm" id="price-currency">DOI</span>
							</div>
						</div>
						<div id="trade-status" aria-live="polite">
							{#if trade?.error}
								<p class="mt-2 text-sm text-red-600">{trade.error}</p>
							{/if}
						</div>
					</div>
				{/if}
			</div>
			<div
				class="lg:w-1/3 mt-8 lg:mt-0 rounded-2xl bg-gray-50 py-10 text-left ring-1 ring-inset ring-gray-900/5 lg:flex lg:flex-col lg:justify-start lg:py-16"
			>
				<div class="mx-auto max-w-xs px-8">
					<p class="text-base font-semibold text-gray-600">{$_('fees.heading')}</p>
					<div class="mt-6">
						<div class="flex justify-between mt-2">
							<span class="text-sm font-bold tracking-tight text-gray-900">{$_('fees.locked')}</span
							>
							<span class="text-sm font-semibold leading-6 tracking-wide text-gray-600"
								>{sb.toBitcoin(DEFAULT_STORAGE_FEE)} DOI</span
							>
						</div>
						<div class="flex justify-between mt-2">
							<span class="text-sm font-bold tracking-tight text-gray-900">{$_('fees.mining')}</span
							>
							<span class="text-sm font-semibold leading-6 tracking-wide text-gray-600"
								>{sb.toBitcoin(feeView.mining)} DOI</span
							>
						</div>
						<div class="flex justify-between">
							<span class="text-sm font-bold tracking-tight text-gray-900">{$_('fees.total')}</span>
							<span class="text-sm font-semibold leading-6 tracking-wide text-gray-600"
								>{sb.toBitcoin(feeView.fromCoins)} DOI</span
							>
						</div>
						<div class="flex justify-between mt-2">
							<span class="text-sm font-bold tracking-tight text-gray-900">{$_('fees.change')}</span
							>
							<span class="text-sm font-semibold leading-6 tracking-wide text-gray-600"
								>{sb.toBitcoin(feeView.change)} DOI</span
							>
						</div>
					</div>
					{#if isNameExists && tradeReady}
						<p class="mt-6 text-sm leading-6 text-gray-800">
							{$_('trade.summary', {
								values: {
									price: sb.toBitcoin(price),
									seller: trade.sellerAddress,
									fee: sb.toBitcoin(trade.transactionFee),
									buyer: fundingUTXOAddress,
									locked: sb.toBitcoin(DEFAULT_STORAGE_FEE),
									change: sb.toBitcoin(trade.changeAmount)
								}
							})}
						</p>
						{#if trade.surplus > 0}
							<p class="mt-2 text-sm leading-6 text-gray-600">
								{$_('trade.surplus', { values: { surplus: sb.toBitcoin(trade.surplus) } })}
							</p>
						{/if}
						{#if trade.dust > 0}
							<p class="mt-2 text-sm leading-6 text-gray-600">
								{$_('fees.dust', { values: { amount: sb.toBitcoin(trade.dust) } })}
							</p>
						{/if}
					{:else if psbtBaseText && !isNameExists}
						<p class="mt-6 text-sm leading-6 text-gray-800">
							{$_('fees.summary', {
								values: {
									fee: sb.toBitcoin(transactionFee),
									locked: sb.toBitcoin(DEFAULT_STORAGE_FEE),
									change: sb.toBitcoin(changeAmount)
								}
							})}
						</p>
						{#if dust > 0}
							<p class="mt-2 text-sm leading-6 text-gray-600">
								{$_('fees.dust', { values: { amount: sb.toBitcoin(dust) } })}
							</p>
						{/if}
					{/if}
					{#if shownFeeDetails}
						<p class="mt-2 text-xs leading-5 text-gray-500">
							{$_('fees.details', { values: shownFeeDetails })}
						</p>
					{/if}
					<div id="qr-container"></div>
					{#if shownPsbt && !qrCodeData}
						<button
							type="button"
							on:click={createPsbt}
							class="mt-6 w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
							>{$_('psbt.create')}</button
						>
					{/if}
					{#if qrCodeData && shownPsbt}
						<div
							bind:this={qrContainer}
							class="qr mt-6 rounded-lg bg-white p-4 ring-1 ring-gray-200"
						>
							{@html qrCode}
						</div>
						<div
							class="mt-3 flex flex-wrap items-center gap-2"
							role="group"
							aria-label={$_('psbt.controls')}
						>
							<button
								type="button"
								on:click={() => stepFrame(-1)}
								aria-label={$_('psbt.previous')}
								title={$_('psbt.previous')}
								class="min-h-[44px] min-w-[44px] rounded-md bg-white px-3 text-lg font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
								>‹</button
							>
							<button
								type="button"
								on:click={togglePause}
								aria-pressed={isPaused}
								class="min-h-[44px] rounded-md bg-white px-3 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
								>{isPaused ? $_('psbt.play') : $_('psbt.pause')}</button
							>
							<button
								type="button"
								on:click={() => stepFrame(1)}
								aria-label={$_('psbt.next')}
								title={$_('psbt.next')}
								class="min-h-[44px] min-w-[44px] rounded-md bg-white px-3 text-lg font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
								>›</button
							>
							<span class="text-sm text-gray-600"
								>{$_('psbt.frame', {
									values: { current: frameIndex + 1, total: qrCodeData.length }
								})}</span
							>
						</div>
						<div class="mt-3 flex flex-wrap gap-2">
							<button
								type="button"
								on:click={copyPsbt}
								class="min-h-[44px] rounded-md bg-white px-3 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
								>{copyState === 'copied' ? $_('psbt.copied') : $_('psbt.copy')}</button
							>
							<button
								type="button"
								on:click={downloadPsbt}
								class="min-h-[44px] rounded-md bg-white px-3 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
								>{$_('psbt.download')}</button
							>
							{#if canShareFiles}
								<button
									type="button"
									on:click={sharePsbt}
									class="min-h-[44px] rounded-md bg-white px-3 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
									>{$_('psbt.share')}</button
								>
							{/if}
						</div>
						<div role="status">
							{#if copyState === 'failed'}
								<p class="mt-2 text-sm text-red-600">{$_('psbt.copyFailed')}</p>
							{/if}
						</div>
						<ol
							class="mt-4 list-decimal space-y-1 break-words pl-5 text-sm leading-6 text-gray-800"
						>
							{#if isNameExists && tradeReady}
								<li>{$_('trade.steps.scan')}</li>
								<li>
									{$_('trade.steps.check', {
										values: {
											price: sb.toBitcoin(trade.sellerReceives),
											seller: trade.sellerAddress,
											change: sb.toBitcoin(trade.changeAmount),
											buyer: fundingUTXOAddress
										}
									})}
								</li>
								<li>{$_('trade.steps.handOver')}</li>
							{:else}
								<li>{$_('psbt.steps.scan')}</li>
								<li>
									{$_('psbt.steps.check', {
										values: {
											locked: sb.toBitcoin(DEFAULT_STORAGE_FEE),
											change: sb.toBitcoin(changeAmount),
											address: doichainAddress
										}
									})}
								</li>
								<li>{$_('psbt.steps.send')}</li>
							{/if}
						</ol>
						<div class="mt-4">
							<label for="psbt" class="block text-sm font-medium leading-6 text-gray-900"
								>{$_('psbt.label')}</label
							>
							<div class="relative mt-2 rounded-md shadow-sm">
								<textarea
									value={shownPsbt}
									readonly
									rows="4"
									name="psbt"
									id="psbt"
									class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6"
									placeholder={$_('psbt.placeholder')}
								></textarea>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.fade-red-to-green {
		transition: color 1s;
		color: red;
	}
	.fade-red-to-green.connected {
		color: green;
	}
	.qr :global(svg) {
		display: block;
		width: 100%;
		height: auto;
	}
	.blinking {
		animation: blinkingText 1.5s infinite;
	}
	@keyframes blinkingText {
		0% {
			opacity: 1;
		}
		50% {
			opacity: 0;
		}
		100% {
			opacity: 1;
		}
	}
	.cursor-pointer {
		cursor: pointer;
	}
</style>
