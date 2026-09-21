<script>
	// Light or dark, next to the language flags. The choice is kept per browser
	// and shared by every lesson and the overview page (same storage key); until
	// somebody chooses, the page follows the system setting. app.html sets the
	// class before the first paint, so there is no white flash on a dark system.
	import { onMount } from 'svelte';
	import { _ } from '../i18n/index.js';

	const KEY = 'namesOnChain.theme';
	let dark = false;

	onMount(() => {
		dark = document.documentElement.classList.contains('dark');
		// follow the system while nobody has chosen
		const media = matchMedia('(prefers-color-scheme: dark)');
		const follow = (event) => {
			if (stored() === null) apply(event.matches);
		};
		media.addEventListener('change', follow);
		return () => media.removeEventListener('change', follow);
	});

	function stored() {
		try {
			return localStorage.getItem(KEY);
		} catch {
			return null; // storage blocked: the toggle still works for this page
		}
	}

	function apply(value) {
		dark = value;
		document.documentElement.classList.toggle('dark', value);
	}

	function toggle() {
		apply(!dark);
		try {
			localStorage.setItem(KEY, dark ? 'dark' : 'light');
		} catch {
			/* storage blocked */
		}
	}
</script>

<button
	type="button"
	data-testid="theme-toggle"
	aria-pressed={dark}
	aria-label={dark ? $_('theme.toLight') : $_('theme.toDark')}
	title={dark ? $_('theme.toLight') : $_('theme.toDark')}
	class="rounded-md p-1.5 text-amber-900 transition hover:bg-amber-100"
	on:click={toggle}
>
	{#if dark}
		<!-- a sun: pressing it brings the light back -->
		<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" fill="currentColor">
			<path
				d="M10 2a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 2Zm0 13a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 15Zm0-2a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm5.66-8.66a.75.75 0 0 1 0 1.06l-1.06 1.06a.75.75 0 1 1-1.06-1.06l1.06-1.06a.75.75 0 0 1 1.06 0Zm-9.2 9.2a.75.75 0 0 1 0 1.06L5.4 15.66a.75.75 0 0 1-1.06-1.06l1.06-1.06a.75.75 0 0 1 1.06 0ZM18 10a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 18 10ZM5 10a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 5 10Zm10.66 5.66a.75.75 0 0 1-1.06 0l-1.06-1.06a.75.75 0 0 1 1.06-1.06l1.06 1.06a.75.75 0 0 1 0 1.06Zm-9.2-9.2a.75.75 0 0 1-1.06 0L4.34 5.4A.75.75 0 0 1 5.4 4.34l1.06 1.06a.75.75 0 0 1 0 1.06Z"
			/>
		</svg>
	{:else}
		<!-- a moon: pressing it turns the lights down -->
		<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" fill="currentColor">
			<path
				d="M7.46 2.14a.75.75 0 0 1 .17.83A6.5 6.5 0 0 0 17 11.37a.75.75 0 0 1 1 .94A8 8 0 1 1 6.63 1.97a.75.75 0 0 1 .83.17Z"
			/>
		</svg>
	{/if}
</button>
