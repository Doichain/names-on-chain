<script>
	// The Le-Space page-QR convention (Le-Space/landing, AGENTS.md): a click shows
	// a QR of exactly what the address bar says at that moment — hash included —
	// so a phone lands on the page under test. Generated here with uqr: the page
	// still makes no request to anyone but ElectrumX.
	import { encode } from 'uqr';
	import { onMount } from 'svelte';
	import { _ } from '../i18n/index.js';

	let open = false;
	let url = '';
	/** dark modules as horizontal runs: {x, y, w} in module units */
	let runs = [];
	let size = 0;
	/** @type {HTMLElement} */
	let root;

	function toggle() {
		open = !open;
		if (open) {
			url = location.href;
			// the matrix, drawn as elements below — no markup string, nothing to escape
			const qr = encode(url, { border: 2 });
			size = qr.size;
			runs = [];
			qr.data.forEach((row, y) => {
				for (let x = 0; x < row.length; x++) {
					if (!row[x]) continue;
					const start = x;
					while (x + 1 < row.length && row[x + 1]) x++;
					runs.push({ x: start, y, w: x - start + 1 });
				}
			});
		}
	}

	onMount(() => {
		const close = (event) => {
			if (!open) return;
			if (event.type === 'keydown' && event.key !== 'Escape') return;
			if (event.type === 'pointerdown' && root.contains(event.target)) return;
			open = false;
		};
		document.addEventListener('keydown', close);
		document.addEventListener('pointerdown', close);
		return () => {
			document.removeEventListener('keydown', close);
			document.removeEventListener('pointerdown', close);
		};
	});
</script>

<div class="relative" bind:this={root}>
	<button
		type="button"
		data-testid="page-qr"
		aria-expanded={open}
		aria-label={$_('qr.open')}
		title={$_('qr.open')}
		class="rounded-md p-1.5 text-amber-900 transition hover:bg-amber-100"
		on:click={toggle}
	>
		<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor">
			<path
				d="M3 3h8v8H3zm2 2v4h4V5zM13 3h8v8h-8zm2 2v4h4V5zM3 13h8v8H3zm2 2v4h4v-4zM13 13h3v3h-3zM18 13h3v3h-3zM13 18h3v3h-3zM18 18h3v3h-3z"
			/>
		</svg>
	</button>

	{#if open}
		<div
			role="dialog"
			aria-label={$_('qr.dialog')}
			data-testid="page-qr-dialog"
			class="absolute right-0 top-full z-[70] mt-2 w-64 rounded-lg border border-gray-200 bg-white p-3 text-left shadow-lg"
		>
			<!--
				A white plaque in both themes, never a themed colour: a camera reads the
				code, not the theme, and it needs its quiet zone.
			-->
			<div class="rounded-md p-2" style="background-color: #ffffff" data-testid="page-qr-plaque">
				<svg
					viewBox="0 0 {size} {size}"
					class="block h-auto w-full"
					shape-rendering="crispEdges"
					aria-hidden="true"
				>
					<rect width={size} height={size} fill="#ffffff" />
					{#each runs as run}
						<rect x={run.x} y={run.y} width={run.w} height="1" fill="#000000" />
					{/each}
				</svg>
			</div>
			<p class="mt-2 break-all font-mono text-xs text-gray-700" data-testid="page-qr-url">{url}</p>
			<p class="mt-1 text-xs text-gray-600">{$_('qr.hint')}</p>
		</div>
	{/if}
</div>
