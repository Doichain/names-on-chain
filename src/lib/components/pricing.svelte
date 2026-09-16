<script>
    import { getConnectionStatus } from "../doichain/connectElectrum.js"
    import { _, locale } from "$lib/i18n/index.js";
    import { checkName } from "$lib/doichain/nameValidation.js";
    import { getUtxosAndNamesOfAddress } from "$lib/doichain/utxoHelpers.js";

    import { electrumClient, connectedServer, scanOpen } from "../doichain/doichain-store.js";
    import sb from "satoshi-bitcoin";
    import ScanModal from "$lib/doichain/ScanModal.svelte";

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

    /**
     * Check a name, debounce every keyboard typing, return local variables by callback
     * @param result
     */
    export async function nameCheckCallback(result) {
        doichainAddress = result.currentNameAddress || doichainAddress
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
    $: if (name) {
        $locale; // check again when the language changes, so the message follows it
        checkName($electrumClient, name, totalUtxoValue, totalAmount, nameCheckCallback);
    }

    /**
     * If we have a connection to Electrumx and a doichainAddress get UTXOs without and with NameOps.
     * - UTXOs, we need to calculate the total amount of all inputs to spend
     * - Multiple NameOp UTXOs are possible (their values are burned and un spendable
     */
    $: {
        if(isConnected && doichainAddress){
            getUtxosAndNamesOfAddress($electrumClient, doichainAddress).then((retObj) => {
                nameOpTxs = retObj.nameOpTxs
                totalUtxoValue = retObj.totalUtxoValue
            })
        }
    }
</script>

{#if $scanOpen}
    <ScanModal bind:scanOpen={ $scanOpen } bind:scanData={ doichainAddress } />
{/if}
<div class="bg-white py-24 sm:py-32">
    <div class="mx-auto max-w-7xl px-6 lg:px-8">
        <div class="mx-auto max-w-2xl sm:text-center">
            <h2  class="text-3xl font-bold tracking-tight sm:text-4xl fade-red-to-green {isConnected ? 'connected' : ''}">{$_('app.title')}</h2>
            <h2  class="font-bold tracking-tight sm:text-1xl fade-red-to-green {isConnected ? 'connected' : ''}">{$_('app.subtitle')}</h2>
            <h3 class="text-sm font-semibold tracking-tight fade-red-to-green {isConnected ? 'connected' : 'blinking'} ">{serverText}</h3>
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
                               on:change={() => checkName($electrumClient, name, totalUtxoValue, totalAmount, nameCheckCallback)}
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