<script>
    import { getConnectionStatus } from "../doichain/connectElectrum.js"
    import { _, locale } from "$lib/i18n/index.js";
    import { checkName } from "$lib/doichain/nameValidation.js";
    import { getUtxosAndNamesOfAddress } from "$lib/doichain/utxoHelpers.js";
    import {electrumClient, connectedServer, scanOpen, network} from "../doichain/doichain-store.js";
    import { renderBBQR, renderBCUR } from "$lib/doichain/renderQR.js";
    import ScanModal from "$lib/doichain/ScanModal.svelte";

    import { signTransaction } from "$lib/doichain/signTransaction.js";
    import sb from "satoshi-bitcoin";
    import { onDestroy } from "svelte";
    import { generateAtomicNameTradingPSBT } from "$lib/doichain/atomicNameTrading.js";

    /** @type {string} - The name currently typed in the name input */
    let name = ''

    /** @type {boolean} - Indicates if the name input is valid */
    let isNameValid = true;

    /** @type {boolean} - Indicates if the name already exists on the blockchain */
    let isNameExists = true

    /** @type {string} - Error message if there's an issue with the name */
    let nameErrorMessage = '';

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
    $:localStorage.setItem('doichainAddress', doichainAddress)

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

    /** @type {string} - Address used for funding UTXOs */
    let fundingUTXOAddress = localStorage.getItem('fundingUTXOAddress') || 'N8YtTBMRqMq9E45VMT9KVbfwt5X5oLD4vt';
    $:localStorage.setItem('fundingUTXOAddress',fundingUTXOAddress)

    /** @type {boolean} - Indicates if connected to the network */
    let isConnected = false;

    /** @type {boolean} - Indicates if the funding UTXO address is valid */
    let isFundingUTXOAddressValid = true;

    /** @type {number} - Price for transferring the name */
    let transferPrice = 1;

    /** @type {number} - Total amount needed for funding */
    let fundingTotalAmount = 0;

    /** @type {number} - Total value of funding UTXOs */
    let fundingTotalUtxoValue = 0;

    /** @type {Array<Object>} - Array of funding UTXO addresses */
    let fundingUtxoAddresses = [];

    /** @type {boolean} - Indicates if the buy offer is valid */
    let isBuyOfferValid = false;

    /** @type {number} - Reactive calculation of total funding amount */
    $: fundingTotalAmount = transferPrice + DEFAULT_STORAGE_FEE;


    /**
     * Check a name, debounce every keyboard typing, return local variables by callback
     * @param result
     */
    export async function nameCheckCallback(result) {
        console.log("nameCheckCallback",result)
        doichainAddress = result.currentNameAddress
        isNameValid = result.isNameValid
        nameErrorMessage  = result.nameErrorMessage
        isNameExists = result.nameExists
        isUTXOAddressValid = result.isUTXOAddressValid
        currentNameOp = result.currentNameOp
        currentNameUtxo = result.currentNameUtxo
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
        if (retry) return translate('status.retrying', { values: { attempt: retry[1], host: retry[2] ?? '' } });
        return server;
    }
    $: serverText = describeServer(serverName, $_);

    /**
     * Check a name, debounce every keyboard typing, return local variables by callback
     */
    $: {
        if (name) {
            $locale; // check again when the language changes, so the message follows it
            try {
                checkName($electrumClient, doichainAddress, name, totalUtxoValue, totalAmount, nameCheckCallback);
            } catch (error) {
                console.error('Error checking name:', error);
                // Handle error appropriately
            }
        }
    }

    /**
     * If we have a connection to Electrumx and a doichainAddress get UTXOs without and with NameOps.
     * - UTXOs, we need to calculate the total amount of all inputs to spend
     * - Multiple NameOp UTXOs are possible (their values are burned and un spendable
     */
    $: {
        if(name && isConnected && doichainAddress){
            getUtxosAndNamesOfAddress($electrumClient, doichainAddress).then((retObj) => {
                console.log("getUtxosAndNamesOfAddress for doichainAddress",retObj)
                nameOpTxs = retObj.nameOpTxs
                totalUtxoValue = retObj.totalUtxoValue
                utxoAddresses = retObj.utxoAddresses
            })
        }
    }

    /**
     * If we have a connection to Electrumx and a doichainAddress get UTXOs without and with NameOps.
     * - UTXOs, we need to calculate the total amount of all inputs to spend
     * - Multiple NameOp UTXOs are possible (their values are burned and un spendable
     */
    $: {
        if(isConnected && fundingUTXOAddress){
            getUtxosAndNamesOfAddress($electrumClient, fundingUTXOAddress).then((retObj) => {
                console.log("getUtxosAndNamesOfAddress of fundingUTXOAddress",retObj)
                fundingTotalUtxoValue = retObj.totalUtxoValue
                fundingUtxoAddresses = retObj.utxoAddresses
            })
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
    let bbqr = false

    /**
     * @type {boolean} ownerOfName - If the current name is already on chain, it could be the user is the owner of it.
     * If he is the owner he can create a PSPT-part (1) to sell the name.
     * If he is NOT the owner he, could create a PSBT-part to buy the name (only if Part 1 is known)
     */
    let ownerOfName = false

    /**
     * Reactive block for handling name registration transaction and QR code generation.
     */
    $: {
        if(name && isNameValid && !isNameExists) {
            $locale; // rebuild when the language changes, so an error message follows it
            const result = signTransaction(utxoAddresses, name, $network, DEFAULT_STORAGE_FEE, doichainAddress, doichainAddress, doichainAddress);
            console.log("signTransaction:result",result)
            if (result.error) {
                console.log("error",result)
                utxoErrorMessage = result.error;
                qrCodeData = undefined;
                psbtBaseText = undefined;
                transactionFee = 0;
                changeAmount = 0;
                totalAmount = 0;
            } else {
                psbtBaseText = result.psbtBase64;
                transactionFee = result.transactionFee;
                changeAmount = result.changeAmount;
                totalAmount = result.totalAmount;

                if(bbqr)
                    renderBBQR(psbtBaseText).then(imgurl => qrCodeData = imgurl)
                else
                    renderBCUR(psbtBaseText).then(_qr => {
                        qrCodeData = _qr;
                        displayQrCodes();
                    }).catch(error => {
                        console.error('Error generating QR code:', error);
                        qrCodeData = undefined;
                    });
            }
        }
    }

    /**
     * @type {number|null} animationTimeout - Holds the timeout ID for the QR code animation.
     */
    let animationTimeout;

    /**
     * @type {number} currentSvgIndex - The index of the currently displayed SVG in the QR code animation.
     */
    let currentSvgIndex;

    /**
     * Initializes and starts the QR code animation.
     * Resets the animation if it's already running.
     */
    function displayQrCodes() {
        currentSvgIndex = 0;
        if (animationTimeout) clearTimeout(animationTimeout);
        animateQrCodes();
    }

    /**
     * Animates through the QR code SVGs.
     * This function is called recursively to create a loop through all QR code frames.
     * 
     * Stops quietly when qrCodeData has been withdrawn in the meantime.
     */
    function animateQrCodes() {
        // the PSBT can be withdrawn while the animation runs (qrCodeData = undefined)
        if (!qrCodeData?.length) return;
        qrCode = qrCodeData[currentSvgIndex];
        currentSvgIndex = (currentSvgIndex + 1) % qrCodeData.length;
        // console.log("currentSvgIndex", currentSvgIndex);
        animationTimeout = setTimeout(animateQrCodes, 200);
    }
    
    onDestroy(() => {
        if (animationTimeout) clearTimeout(animationTimeout);
    });

    $: totalUtxoValue = utxoAddresses.reduce((sum, utxo) => sum + utxo.value, 0);
    $: if (name && isNameExists && (ownerOfName || fundingUtxoAddresses.length > 0)) {
        generateAtomicNameTradingPSBT(name, fundingUtxoAddresses, currentNameUtxo?[currentNameUtxo]:[], ownerOfName, isNameExists, transferPrice, DEFAULT_STORAGE_FEE, $network).then( (_psbtBaseText) => {
            psbtBaseText = _psbtBaseText;
            if(bbqr)
                renderBBQR(_psbtBaseText).then(imgurl => qrCodeData = imgurl)
            else
                renderBCUR(_psbtBaseText).then(_qr => {
                    if(!_qr) return
                    qrCodeData = _qr;
                    isBuyOfferValid = true
                    displayQrCodes();
                }).catch(error => {
                    console.error('Error generating QR code:', error);
                    qrCodeData = undefined;
                })
        });
    }

    function handleQRCodeClick() {
        if (qrCodeData && qrCodeData.length > 0) {
            currentSvgIndex = (currentSvgIndex + 1) % qrCodeData.length;
            qrCode = qrCodeData[currentSvgIndex];
        }
    }

</script>

{#if $scanOpen}
    <ScanModal bind:scanOpen={ $scanOpen } bind:scanData={ doichainAddress } />
{/if}

{#if scanOpenFunding}
    <ScanModal bind:scanOpen={ scanOpenFunding } bind:scanData={ fundingUTXOAddress } />
{/if}
<div class="bg-white py-24 sm:py-32">
    <div class="mx-auto max-w-7xl px-6 lg:px-8">
                <div class="mx-auto max-w-2xl sm:text-center">
                    <h2  class="text-3xl font-bold tracking-tight sm:text-4xl fade-red-to-green {isConnected ? 'connected' : ''}">{$_('app.title')}</h2>
                    <h2  class="font-bold tracking-tight sm:text-1xl fade-red-to-green {isConnected ? 'connected' : 'blinking'} ">{serverText}</h2>
                </div>
                <div class="mx-auto mt-16 max-w-2xl rounded-3xl ring-1 ring-gray-200 sm:mt-20 lg:mx-0 lg:flex lg:max-w-none">
                    <div class="p-8 sm:p-10 lg:flex-auto">
                        <p class="mt-6 text-base leading-7 text-gray-600">{$_('name.intro')}</p>
                        {#if isConnected}
                        <p>&nbsp;</p>
                        <div>
                            <label for="name" class="block text-sm font-medium leading-6 text-gray-900">{$_('name.label')}</label>
                            <div class="relative mt-2 rounded-md shadow-sm">
                                <input bind:value={name} name="name" id="name"
                                       type="text"
                                       class="{isNameValid?'block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6':'block w-full rounded-md border-0 py-1.5 pr-10 text-red-900 ring-1 ring-inset ring-red-300 placeholder:text-red-300 focus:ring-2 focus:ring-inset focus:ring-red-500 sm:text-sm sm:leading-6'}"
                                       placeholder={$_('name.placeholder')}
                                       aria-invalid="{isNameValid}"
                                       aria-describedby="name-error"/>

                                        {#if !isNameValid}
                                            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                                <svg class="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
                                                </svg>
                                            </div>
                                        {:else if name}
                                            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                                <svg class="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
                                                </svg>
                                            </div>
                                        {/if}
                            </div>
                            {#if !isNameValid}
                                <p class="mt-2 text-sm text-red-600" id="name-error">{nameErrorMessage}</p>
                            {:else if name}
                                <p class="mt-2 text-sm text-green-600" id="name-success">{$_('name.address', { values: { address: doichainAddress } })}</p>
                            {/if}
                        </div>
                            {:else}
                            <p class="mt-2 text-sm text-red-600" id="name-error">{$_('status.offlineHelp')}</p>
                        {/if}
                        <div>
                            <label for="email" class="block text-sm font-medium leading-6 text-gray-900">{$_('address.label')}</label>
                            <div class="relative mt-2 rounded-md shadow-sm flex items-center">
                                <input bind:value={doichainAddress}
                                       on:change={() => checkName($electrumClient, doichainAddress, name, totalUtxoValue, totalAmount, nameCheckCallback)}
                                       type="address" name="address" id="address"
                                       class="{isNameValid?'block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6':'block w-full rounded-md border-0 py-1.5 pr-10 text-red-900 ring-1 ring-inset ring-red-300 placeholder:text-red-300 focus:ring-2 focus:ring-inset focus:ring-red-500 sm:text-sm sm:leading-6'}"
                                       placeholder={$_('address.placeholder')}
                                       aria-invalid="{isUTXOAddressValid}"
                                       aria-describedby="name-error">
                                {#if !isUTXOAddressValid}
                                    <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                        <svg class="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
                                        </svg>
                                    </div>
                                {/if}
                                <button type="button" aria-label={$_('address.scan')} title={$_('address.scan')} on:click={ () => { $scanOpen = true }} class="ml-2"><svg class="h-8 w-8 text-orange-600"  width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">  <path stroke="none" d="M0 0h24v24H0z"/>  <path d="M4 7v-1a2 2 0 0 1 2 -2h2" />  <path d="M4 17v1a2 2 0 0 0 2 2h2" />  <path d="M16 4h2a2 2 0 0 1 2 2v1" />  <path d="M16 20h2a2 2 0 0 0 2 -2v-1" />  <line x1="5" y1="12" x2="19" y2="12" /></svg></button>
                            </div>

                            {#if !isUTXOAddressValid}
                                <p class="mt-2 text-sm text-red-600" id="name-error"><b>{$_('address.total', { values: { amount: sb.toBitcoin(totalUtxoValue) } })}</b> {utxoErrorMessage}</p>
                            {:else}
                                <p class="mt-2 text-sm text-gray red-600" id="name-error">{$_('address.total', { values: { amount: sb.toBitcoin(totalUtxoValue) } })}</p>
                                {#if nameOpTxs.length > 0}
                                    <div class="mt-4">
                                        <h4 class="text-sm font-medium text-gray-900 mb-2">{$_('address.names')}</h4>
                                        <div class="flex flex-wrap gap-2">
                                            {#each nameOpTxs as nameOp}
                                                <span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                                                    {$_('address.expires', { values: { name: nameOp.name, height: nameOp.expires } })}
                                                </span>
                                            {/each}
                                        </div>
                                    </div>
                                {/if}
                            {/if}
                        </div>
                        <p>&nbsp;</p>
                        {#if isNameExists}
                            <div class="flex items-center justify-between">
                              <span class="flex flex-grow flex-col">
                                <span class="text-sm font-medium leading-6 text-gray-900" id="availability-label">{ownerOfName ? $_('trade.seller') : $_('trade.buyer')}</span>
                                <span class="text-sm text-gray-500" id="availability-description">{ownerOfName ? $_('trade.sellerHint') : $_('trade.buyerHint')}</span>
                              </span>
                                <button on:click={() => ownerOfName=!ownerOfName} type="button" class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent {ownerOfName?'bg-indigo-600':'bg-gray-200'} transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2" role="switch" aria-checked="false" aria-labelledby="availability-label" aria-describedby="availability-description">
                                  <span aria-hidden="true" class="pointer-events-none inline-block h-5 w-5 {ownerOfName?'translate-x-5':'translate-x-0'} transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
                                </button>
                            </div>
                            <p>&nbsp;</p>
                            {#if ownerOfName}
                                {$_('trade.sellerExplanation')}
                            {/if}
                            {#if !ownerOfName}
                                <label for="email" class="block text-sm font-medium leading-6 text-gray-900">{$_('trade.fundingLabel')}</label>
                                <div class="relative mt-2 rounded-md shadow-sm flex items-center">
                                    <input bind:value={fundingUTXOAddress}
                                           type="fundingUTXOAddress" name="fundingUTXOAddress" id="fundingUTXOAddress"
                                           on:change={() => checkName($electrumClient, fundingUTXOAddress, name, fundingTotalUtxoValue, fundingTotalAmount,
                                           (result) => {
                                               console.log("fundingResult",result)
                                               isFundingUTXOAddressValid=result.isUTXOAddressValid
                                           })}
                                           class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6':'block w-full rounded-md border-0 py-1.5 pr-10 text-red-900 ring-1 ring-inset ring-red-300 placeholder:text-red-300 focus:ring-2 focus:ring-inset focus:ring-red-500 sm:text-sm sm:leading-6"
                                           placeholder={$_('address.placeholder')}
                                           aria-invalid="{isFundingUTXOAddressValid}"
                                           aria-describedby="name-error">

                                            {#if !isFundingUTXOAddressValid}
                                                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                                    <svg class="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
                                                    </svg>
                                                </div>
                                            {/if}

                                    <button type="button" aria-label={$_('trade.fundingScan')} title={$_('trade.fundingScan')} on:click={ () => { scanOpenFunding = true }} class="ml-2"><svg class="h-8 w-8 text-orange-600"  width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">  <path stroke="none" d="M0 0h24v24H0z"/>  <path d="M4 7v-1a2 2 0 0 1 2 -2h2" />  <path d="M4 17v1a2 2 0 0 0 2 2h2" />  <path d="M16 4h2a2 2 0 0 1 2 2v1" />  <path d="M16 20h2a2 2 0 0 0 2 -2v-1" />  <line x1="5" y1="12" x2="19" y2="12" /></svg></button>
                                </div>
                                {#if !isFundingUTXOAddressValid}
                                    <p class="mt-2 text-sm text-red-600" id="name-error"><b>{$_('trade.fundingTotal', { values: { amount: sb.toBitcoin(fundingTotalUtxoValue) } })}</b> {$_('trade.fundingInvalid')}</p>
                                {:else}
                                    <p class="mt-2 text-sm text-gray red-600" id="name-error">{$_('trade.fundingTotal', { values: { amount: sb.toBitcoin(fundingTotalUtxoValue) } })}</p>
                                {/if}
                            {/if}
                            <p>&nbsp;</p>
                            <div>
                                <label for="price" class="block text-sm font-medium leading-6 text-gray-900">{$_('trade.priceLabel')}</label>
                                <div class="relative mt-2 rounded-md shadow-sm">
                                    <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <span class="text-gray-500 sm:text-sm">&#8383</span>
                                    </div>
                                    <input type="text" bind:value={transferPrice} name="price" id="price" class="block w-full rounded-md border-0 py-1.5 pl-7 pr-12 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" placeholder="0.00" aria-describedby="price-currency">
                                    <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                        <span class="text-gray-500 sm:text-sm" id="price-currency">DOI</span>
                                    </div>
                                </div>
                            </div>
                        {/if}
            </div>
            <div class="lg:w-1/3 mt-8 lg:mt-0 rounded-2xl bg-gray-50 py-10 text-left ring-1 ring-inset ring-gray-900/5 lg:flex lg:flex-col lg:justify-start lg:py-16">
                <div class="mx-auto max-w-xs px-8">
                    <p class="text-base font-semibold text-gray-600">{$_('fees.heading')}</p>
                    <div class="mt-6">
                        <div class="flex justify-between mt-2">
                            <span class="text-sm font-bold tracking-tight text-gray-900">{$_('fees.locked')}</span>
                            <span class="text-sm font-semibold leading-6 tracking-wide text-gray-600">{sb.toBitcoin(DEFAULT_STORAGE_FEE)} DOI</span>
                        </div>
                        <div class="flex justify-between mt-2">
                            <span class="text-sm font-bold tracking-tight text-gray-900">{$_('fees.mining')}</span>
                            <span class="text-sm font-semibold leading-6 tracking-wide text-gray-600">{sb.toBitcoin(transactionFee)} DOI</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-sm font-bold tracking-tight text-gray-900">{$_('fees.total')}</span>
                            <span class="text-sm font-semibold leading-6 tracking-wide text-gray-600">{sb.toBitcoin(totalAmount)} DOI</span>
                        </div>
                        <div class="flex justify-between mt-2">
                            <span class="text-sm font-bold tracking-tight text-gray-900">{$_('fees.change')}</span>
                            <span class="text-sm font-semibold leading-6 tracking-wide text-gray-600">{sb.toBitcoin(changeAmount)} DOI</span>
                        </div>
                    </div>
                    <div id="qr-container"></div>
                    {$_('psbt.utxosToSign', { values: { count: fundingUtxoAddresses.length } })}
                    {#if qrCodeData && psbtBaseText && (psbtBaseText || isBuyOfferValid)}
                        {@html qrCode}
                        <div on:click={handleQRCodeClick} class="cursor-pointer">
                            { currentSvgIndex + 1 } / { qrCodeData ? qrCodeData.length : 0 }
                        </div>
                        <div class="mt-4">
                            <label for="name" class="block text-sm font-medium leading-6 text-gray-900">{$_('psbt.label')}</label>
                            <div class="relative mt-2 rounded-md shadow-sm">
                                <textarea bind:value={psbtBaseText} rows="4" name="comment" id="comment"
                                      class="{isNameValid?'block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6':'block w-full rounded-md border-0 py-1.5 pr-10 text-red-900 ring-1 ring-inset ring-red-300 placeholder:text-red-300 focus:ring-2 focus:ring-inset focus:ring-red-500 sm:text-sm sm:leading-6'}"
                                      placeholder={$_('psbt.placeholder')}
                                      aria-invalid="{!psbtBaseText}"
                                      aria-describedby="name-error"/>
                                        {#if !psbtBaseText}
                                            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                                <svg class="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
                                                </svg>
                                            </div>
                                        {/if}
                            </div>
                            {#if !psbtBaseText}
                                <p class="mt-2 text-sm text-red-600" id="name-error">{nameErrorMessage}</p>
                            {/if}
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
    .blinking {
        animation: blinkingText 1.5s infinite;
    }
    @keyframes blinkingText {
        0% { opacity: 1; }
        50% { opacity: 0; }
        100% { opacity: 1; }
    }
    .cursor-pointer {
        cursor: pointer;
    }
</style>