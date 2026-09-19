<script>
	import { createEventDispatcher } from 'svelte';
	import { _ } from '@names-on-chain/doichain/i18n';

	/** the input's id; its message region is `<id>-status` */
	export let id;
	/** the label above the field */
	export let label;
	/** what the scan button says to screen readers */
	export let scanLabel;
	/** the address, bound both ways */
	export let value = '';
	/** true when the address cannot be used: wrong, or its coins could not be read */
	export let invalid = false;
	/** the label's classes, so a form can keep its own spacing */
	export let labelClass = 'block text-sm font-medium leading-6 text-gray-900';

	const dispatch = createEventDispatcher();
</script>

<label for={id} class={labelClass}>{label}</label>
<div class="relative mt-2 flex items-center rounded-md shadow-sm">
	<input
		bind:value
		type="text"
		name={id}
		{id}
		autocomplete="off"
		autocapitalize="off"
		spellcheck="false"
		class={!invalid
			? 'block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6'
			: 'block w-full rounded-md border-0 py-1.5 pr-10 text-red-900 ring-1 ring-inset ring-red-300 placeholder:text-red-300 focus:ring-2 focus:ring-inset focus:ring-red-500 sm:text-sm sm:leading-6'}
		placeholder={$_('address.placeholder')}
		aria-invalid={invalid}
		aria-describedby="{id}-status"
	/>
	{#if invalid}
		<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
			<svg class="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
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
		aria-label={scanLabel}
		title={scanLabel}
		on:click={() => dispatch('scan')}
		class="ml-2 inline-flex h-11 w-11 flex-none items-center justify-center rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 disabled:opacity-50"
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
<div id="{id}-status" class="min-h-12" aria-live="polite">
	<slot name="status" />
</div>
