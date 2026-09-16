<script>
    import { getConnectionStatus } from "../doichain/connectElectrum.js"
    import { checkName } from "$lib/doichain/nameValidation.js";
    import { getUtxosAndNamesOfAddress } from "$lib/doichain/utxoHelpers.js";
    import { electrumClient, connectedServer, scanOpen } from "../doichain/doichain-store.js";
    import { renderBBQR, renderBCUR } from "$lib/doichain/renderQR.js";
    import ScanModal from "$lib/doichain/ScanModal.svelte";
    import { DOICHAIN } from "$lib/doichain/doichain.js";
    import { signTransaction } from "$lib/doichain/signTransaction.js";
    import sb from "satoshi-bitcoin";
    import { onDestroy } from "svelte";

    /**
     * The name currently typed in the name input
     */
    let name = ''

    /**
     * Is everything ok with the name inside the name input?
     */
    let isNameValid = true;

    /**
     * If there is an issue with the name, this variable contains the error
     */
    let nameErrorMessage = '';

    /**
     * The address which will be used to look for
     * - utxos (inputs)
     * - as recipient for the name transaction
     * - change address
     */
    let doichainAddress = localStorage.getItem('doichainAddress') || '';

    /**
     * Values to calculate the change amount and display a proper 'invoice'
     */
    let totalUtxoValue = 0, totalAmount = 0;

    /**
     * Array of name operation transactions associated with the current address
     * @type {Array<string>}
     */
    let nameOpTxs = [];
    /**
     * Indicates whether the UTXO address is valid
     * @type {boolean}
     */
    let isUTXOAddressValid = true;
    /**
     * Error message for UTXO address validation issues
     * @type {string}
     */
    let utxoErrorMessage = '';

    let utxoAddresses = [];
    let psbtBaseText;

    /**
     * Check a name, debounce every keyboard typing, return local variables by callback
     * @param result
     */
    export async function nameCheckCallback(result) {
        doichainAddress = result.currentNameAddress
        isNameValid = result.isNameValid
        nameErrorMessage  = result.nameErrorMessage
    }

    /**
     * Reactive statement to update connection status
     * @type {{isConnected: boolean, serverName: string}}
     * @property {boolean} isConnected - Indicates if the server is currently connected
     * @property {string} serverName - The name of the connected server or a status message
     */
    $: ({ isConnected, serverName } = getConnectionStatus($connectedServer));

    /**
     * Check a name, debounce every keyboard typing, return local variables by callback
     */
    $: name ? checkName($electrumClient, doichainAddress, name, totalUtxoValue, totalAmount, nameCheckCallback) : null;

    /**
     * If we have a connection to Electrumx and a doichainAddress get UTXOs without and with NameOps.
     * - UTXOs, we need to calculate the total amount of all inputs to spend
     * - Multiple NameOp UTXOs are possible (their values are burned and un spendable
     */
    $: {
        if(name && isConnected && doichainAddress){
            getUtxosAndNamesOfAddress($electrumClient, doichainAddress).then((retObj) => {
                nameOpTxs = retObj.nameOpTxs
                totalUtxoValue = retObj.totalUtxoValue
                utxoAddresses = retObj.utxoAddresses
            })
        }
    }

    /**
     * @type {number} storageFee - The fee for storing the name on the Doichain network, in swartz. Default is 1,000,000 (0.01 DOI).
     */
    let storageFee = 1000000;

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
     * Reactive block for handling name registration transaction and QR code generation.
     * 
     * This block is triggered whenever `name` or `isNameValid` changes.
     * It performs the following actions:
     * 1. Calls `signTransaction` to create a PSBT (Partially Signed Bitcoin Transaction).
     * 2. Updates transaction details (fees, amounts) based on the result.
     * 3. Generates either a BBQR or BCUR QR code for the transaction.
     * 
     * @reactive
     * @depends {string} name - The name to be registered.
     * @depends {boolean} isNameValid - Whether the name is valid for registration.
     * @depends {Array<Object>} utxoAddresses - UTXO addresses for the transaction.
     * @depends {Object} DOICHAIN - Doichain network configuration.
     * @depends {number} storageFee - Fee for storing the name on the network.
     * @depends {string} doichainAddress - The Doichain address for the transaction.
     * @depends {boolean} bbqr - Flag to determine QR code format (BBQR or BCUR).
     * 
     * @affects {string} utxoErrorMessage - Error message if transaction creation fails.
     * @affects {string} psbtBaseText - Base64 encoded PSBT.
     * @affects {number} transactionFee - Calculated transaction fee.
     * @affects {number} changeAmount - Calculated change amount.
     * @affects {number} totalAmount - Total transaction amount.
     * @affects {string|string[]} qrCodeData - Generated QR code data.
     * 
     * @throws {Error} Logs error to console if QR code generation fails.
     */
    $: {
        if(name && isNameValid) {
            const result = signTransaction(utxoAddresses, name, DOICHAIN, storageFee, doichainAddress, doichainAddress, doichainAddress);
            if (result.error) {
                utxoErrorMessage = result.error;
                qrCodeData = undefined;
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
        animationTimeout = setTimeout(animateQrCodes, 300);
    }
    
    onDestroy(() => {
        if (animationTimeout) clearTimeout(animationTimeout);
    });

    $: totalUtxoValue = utxoAddresses.reduce((sum, utxo) => sum + utxo.value, 0);
</script>

{#if $scanOpen}
    <ScanModal bind:scanOpen={ $scanOpen } bind:scanData={ doichainAddress } />
{/if}
<div class="bg-white py-24 sm:py-32">
    <div class="mx-auto max-w-7xl px-6 lg:px-8">
                <div class="mx-auto max-w-2xl sm:text-center">
                    <h2  class="text-3xl font-bold tracking-tight sm:text-4xl fade-red-to-green {isConnected ? 'connected' : ''}">Names-On-Chain</h2>
                    <h2  class="font-bold tracking-tight sm:text-1xl fade-red-to-green {isConnected ? 'connected' : 'blinking'} ">{serverName}</h2>
                </div>
                <div class="mx-auto mt-16 max-w-2xl rounded-3xl ring-1 ring-gray-200 sm:mt-20 lg:mx-0 lg:flex lg:max-w-none">
                    <div class="p-8 sm:p-10 lg:flex-auto">
                        <p class="mt-6 text-base leading-7 text-gray-600">Register your favourite Doichain name!</p>
                        {#if isConnected}
                        <p>&nbsp;</p>
                        <div>
                            <label for="name" class="block text-sm font-medium leading-6 text-gray-900">Name to be registered</label>
                            <div class="relative mt-2 rounded-md shadow-sm">
                                <input bind:value={name} name="name" id="name"
                                       type="text"
                                       class="{isNameValid?'block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6':'block w-full rounded-md border-0 py-1.5 pr-10 text-red-900 ring-1 ring-inset ring-red-300 placeholder:text-red-300 focus:ring-2 focus:ring-inset focus:ring-red-500 sm:text-sm sm:leading-6'}"
                                       placeholder="name"
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
                                <p class="mt-2 text-sm text-green-600" id="name-success">Address: {doichainAddress}</p>
                            {/if}
                        </div>
                            {:else}
                            <p class="mt-2 text-sm text-red-600" id="name-error">offline - please check internet connection or reload browser</p>
                        {/if}
                        <div>
                            <label for="email" class="block text-sm font-medium leading-6 text-gray-900">Doichain Registration Address</label>
                            <div class="relative mt-2 rounded-md shadow-sm flex items-center">
                                <input bind:value={doichainAddress}
                                       on:change={() => checkName($electrumClient, doichainAddress, name, totalUtxoValue, totalAmount, nameCheckCallback)}
                                       type="address" name="address" id="address"
                                       class="{isNameValid?'block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6':'block w-full rounded-md border-0 py-1.5 pr-10 text-red-900 ring-1 ring-inset ring-red-300 placeholder:text-red-300 focus:ring-2 focus:ring-inset focus:ring-red-500 sm:text-sm sm:leading-6'}"
                                       placeholder="address"
                                       aria-invalid="{isUTXOAddressValid}"
                                       aria-describedby="name-error">
                                {#if !isUTXOAddressValid}
                                    <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                        <svg class="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
                                        </svg>
                                    </div>
                                {/if}
                                <button on:click={ () => { $scanOpen = true }} class="ml-2"><svg class="h-8 w-8 text-orange-600"  width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">  <path stroke="none" d="M0 0h24v24H0z"/>  <path d="M4 7v-1a2 2 0 0 1 2 -2h2" />  <path d="M4 17v1a2 2 0 0 0 2 2h2" />  <path d="M16 4h2a2 2 0 0 1 2 2v1" />  <path d="M16 20h2a2 2 0 0 0 2 -2v-1" />  <line x1="5" y1="12" x2="19" y2="12" /></svg></button>
                            </div>

                            {#if !isUTXOAddressValid}
                                <p class="mt-2 text-sm text-red-600" id="name-error"><b>Total UTXO value: { sb.toBitcoin(totalUtxoValue) }</b> {utxoErrorMessage}</p>
                            {:else}
                                <p class="mt-2 text-sm text-gray red-600" id="name-error">Total UTXO value: { sb.toBitcoin(totalUtxoValue) }</p>
                                {#if nameOpTxs.length > 0}
                                    <div class="mt-4">
                                        <h4 class="text-sm font-medium text-gray-900 mb-2">Registered Names on Doichain Address:</h4>
                                        <div class="flex flex-wrap gap-2">
                                            {#each nameOpTxs as nameOp}
                                                <span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                                                    {nameOp.name} (expires: {nameOp.expires})
                                                </span>
                                            {/each}
                                        </div>
                                    </div>
                                {/if}
                            {/if}
                        </div>
                        <p>&nbsp;</p>
                        <div class="mt-10 flex items-center gap-x-4">
                            <h4 class="flex-none text-sm font-semibold leading-6 text-indigo-600">Features:</h4>
                            <div class="h-px flex-auto bg-gray-100"></div>
                        </div>
                        <ul role="list" class="mt-8 grid grid-cols-1 gap-4 text-sm leading-6 text-gray-600 sm:grid-cols-2 sm:gap-6">
                            <li class="flex gap-x-3">
                                <svg class="h-6 w-5 flex-none text-indigo-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                                </svg>
                                Serverless
                            </li>
                            <li class="flex gap-x-3">
                                <svg class="h-6 w-5 flex-none text-indigo-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                                </svg>
                                No Data Processing
                            </li>
                            <li class="flex gap-x-3">
                                <svg class="h-6 w-5 flex-none text-indigo-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                                </svg>
                                No Tracking
                            </li>
                            <li class="flex gap-x-3">
                                <svg class="h-6 w-5 flex-none text-indigo-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                                </svg>
                                IPFS only
                            </li>
                            <li class="flex gap-x-3">
                                <svg class="h-6 w-5 flex-none text-indigo-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                                </svg>
                                Scan PSBT QR-code or Copy & Paste PSBT file
                            </li>
                            <li class="flex gap-x-3">
                                <svg class="h-6 w-5 flex-none text-indigo-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                                </svg>
                                Payment via DoiWallet or ElectrumDoi
                            </li>
                            <li class="flex gap-x-3">
                                <svg class="h-6 w-5 flex-none text-indigo-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                                </svg>
                                auto renewal (coming soon)
                            </li>
                            <li class="flex gap-x-3">
                                <svg class="h-6 w-5 flex-none text-indigo-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                                </svg>
                                Create offer on marketplace (coming soon!)
                            </li>
                        </ul>
            </div>
            <div class="lg:w-1/3 mt-8 lg:mt-0 rounded-2xl bg-gray-50 py-10 text-left ring-1 ring-inset ring-gray-900/5 lg:flex lg:flex-col lg:justify-start lg:py-16">
                <div class="mx-auto max-w-xs px-8">
                    <p class="text-base font-semibold text-gray-600">Register Doichain Name for 31,968 blocks (approximately 222 days)</p>
                    <div class="mt-6">
                        <div class="flex justify-between mt-2">
                            <span class="text-sm font-bold tracking-tight text-gray-900">Storage Fee:</span>
                            <span class="text-sm font-semibold leading-6 tracking-wide text-gray-600">{sb.toBitcoin(storageFee)} DOI</span>
                        </div>
                        <div class="flex justify-between mt-2">
                            <span class="text-sm font-bold tracking-tight text-gray-900">Mining Fee:</span>
                            <span class="text-sm font-semibold leading-6 tracking-wide text-gray-600">{sb.toBitcoin(transactionFee)} DOI</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-sm font-bold tracking-tight text-gray-900">Total Amount:</span>
                            <span class="text-sm font-semibold leading-6 tracking-wide text-gray-600">{sb.toBitcoin(totalAmount)} DOI</span>
                        </div>
                        <div class="flex justify-between mt-2">
                            <span class="text-sm font-bold tracking-tight text-gray-900">Change:</span>
                            <span class="text-sm font-semibold leading-6 tracking-wide text-gray-600">{sb.toBitcoin(changeAmount)} DOI</span>
                        </div>
                    </div>
                    <div id="qr-container"></div>
                    {#if qrCodeData && psbtBaseText && isNameValid}
                        {@html qrCode}
                        <div class="mt-4">
                            <label for="name" class="block text-sm font-medium leading-6 text-gray-900">PSBT File</label>
                            <div class="relative mt-2 rounded-md shadow-sm">
                                <textarea bind:value={psbtBaseText} rows="4" name="comment" id="comment"
                                      class="{isNameValid?'block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6':'block w-full rounded-md border-0 py-1.5 pr-10 text-red-900 ring-1 ring-inset ring-red-300 placeholder:text-red-300 focus:ring-2 focus:ring-inset focus:ring-red-500 sm:text-sm sm:leading-6'}"
                                      placeholder="psbt file"
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
</style>