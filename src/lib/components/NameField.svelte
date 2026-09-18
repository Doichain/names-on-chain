<script>
	import { createEventDispatcher } from 'svelte';
	import { _ } from '$lib/i18n/index.js';

	/** the name, bound both ways */
	export let value = '';
	/** true while a check is on its way to a server */
	export let checking = false;
	/** true when the answer on screen says the name cannot be used */
	export let invalid = false;
	/** true when the answer on screen belongs to the name in the field */
	export let checked = false;

	const dispatch = createEventDispatcher();
</script>

<label for="name" class="block text-sm font-medium leading-6 text-gray-900"
	>{$_('name.label')}</label
>
<div class="mt-2 flex items-start gap-2">
	<div class="relative flex-1 rounded-md shadow-sm">
		<input
			bind:value
			name="name"
			id="name"
			type="text"
			autocomplete="off"
			autocapitalize="off"
			spellcheck="false"
			class={checking || !invalid
				? 'block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6'
				: 'block w-full rounded-md border-0 py-1.5 pr-10 text-red-900 ring-1 ring-inset ring-red-300 placeholder:text-red-300 focus:ring-2 focus:ring-inset focus:ring-red-500 sm:text-sm sm:leading-6'}
			placeholder={$_('name.placeholder')}
			aria-invalid={!checking && invalid}
			aria-describedby="name-status"
			on:keydown={(event) => event.key === 'Enter' && dispatch('check')}
		/>

		{#if checking}
			<!-- no verdict while the check runs -->
		{:else if invalid}
			<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
				<svg
					class="h-5 w-5 text-red-600"
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
		{:else if value && checked}
			<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
				<svg
					class="h-5 w-5 text-green-700"
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
	<button
		type="button"
		on:click={() => dispatch('check')}
		disabled={!value || checking}
		class="min-h-[44px] flex-none rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-gray-300"
		>{$_('name.check')}</button
	>
</div>

<!-- room for two lines, so the fields below do not jump while the check answers -->
<div id="name-status" class="min-h-12" aria-live="polite">
	<slot name="status" />
</div>
