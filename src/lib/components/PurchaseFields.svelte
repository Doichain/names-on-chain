<script>
	import { createEventDispatcher } from 'svelte';
	import AddressField from '$lib/components/AddressField.svelte';
	import { _ } from '$lib/i18n/index.js';

	/** true while the fields wait, because the connection to a server is gone */
	export let disabled = false;
	/** the address that holds the name today */
	export let seller = '';
	/** the name sits at a P2WPKH address, which DoiWallet 7.0.4 cannot sign */
	export let heldBySegwit = false;
	/** the buyer's address, bound both ways */
	export let fundingAddress = '';
	/** true when the buyer's address cannot be used: wrong, or its coins could not be read */
	export let fundingInvalid = false;
	/** the price as typed, bound both ways */
	export let price = '';
	/** true when what was typed is not an amount of DOI */
	export let priceInvalid = false;
	/** what went wrong while the purchase was built, if anything */
	export let error = '';

	const dispatch = createEventDispatcher();
</script>

<!-- a purchase needs the server: the fields wait while the connection is gone -->
<fieldset {disabled} class="min-w-0 border-t border-gray-100 pt-6">
	<h3 class="text-base font-semibold leading-7 text-gray-900">{$_('trade.heading')}</h3>
	<p class="mt-2 text-sm leading-6 text-gray-600">
		{$_('trade.intro', { values: { seller } })}
	</p>
	<p class="mt-2 text-sm leading-6 text-gray-500">{$_('trade.sellOfferOff')}</p>
	{#if heldBySegwit}
		<p class="mt-3 rounded-md bg-amber-50 p-3 text-sm leading-6 text-amber-900" role="note">
			{$_('trade.segwitName', { values: { address: seller } })}
		</p>
	{/if}

	<AddressField
		id="fundingUTXOAddress"
		label={$_('trade.fundingLabel')}
		scanLabel={$_('trade.fundingScan')}
		labelClass="mt-6 block text-sm font-medium leading-6 text-gray-900"
		invalid={fundingInvalid}
		bind:value={fundingAddress}
		on:scan={() => dispatch('scan')}
	>
		<svelte:fragment slot="status">
			<slot name="funding" />
		</svelte:fragment>
	</AddressField>

	<label for="price" class="mt-6 block text-sm font-medium leading-6 text-gray-900"
		>{$_('trade.priceLabel')}</label
	>
	<div class="relative mt-2 rounded-md shadow-sm">
		<input
			type="text"
			inputmode="decimal"
			bind:value={price}
			name="price"
			id="price"
			autocomplete="off"
			class="{priceInvalid
				? 'block w-full rounded-md border-0 py-1.5 pr-10 text-red-900 ring-1 ring-inset ring-red-300 placeholder:text-red-300 focus:ring-2 focus:ring-inset focus:ring-red-500 sm:text-sm sm:leading-6'
				: 'block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6'} pr-12"
			placeholder="1.5"
			aria-invalid={priceInvalid}
			aria-describedby="price-currency trade-status"
		/>
		<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
			<span class="text-gray-500 sm:text-sm" id="price-currency">DOI</span>
		</div>
	</div>
	<div id="trade-status" aria-live="polite">
		{#if error}
			<p class="mt-2 text-sm text-red-600">{error}</p>
		{/if}
	</div>
</fieldset>
