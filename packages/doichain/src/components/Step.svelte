<script>
	import { _ } from '../i18n/index.js';

	/** the step's number, shown in front of its title */
	export let number;
	/** what this step asks of the reader */
	export let title;
	/** 'done' once it is answered, 'next' while it is the one to do, else 'later' */
	export let state = 'later';

	const RING = {
		done: 'bg-green-700 text-white',
		next: 'bg-indigo-600 text-white',
		later: 'bg-gray-200 text-gray-700'
	};
	const CHIP = {
		done: 'bg-green-50 text-green-800 ring-green-600/30',
		next: 'bg-indigo-50 text-indigo-800 ring-indigo-600/30'
	};
</script>

<section class="mt-8 first:mt-0" aria-labelledby="step-{number}-title">
	<h3 id="step-{number}-title" class="flex flex-wrap items-center gap-x-3 gap-y-1">
		<span
			class="inline-flex h-7 w-7 flex-none items-center justify-center rounded-full text-sm font-bold {RING[
				state
			]}"
			aria-hidden="true">{number}</span
		>
		<span class="text-base font-semibold leading-7 text-gray-900">{title}</span>
		{#if state !== 'later'}
			<span
				class="rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ring-1 ring-inset {CHIP[
					state
				]}">{$_(`steps.${state}`)}</span
			>
		{/if}
	</h3>
	<div class="mt-3">
		<slot />
	</div>
</section>
