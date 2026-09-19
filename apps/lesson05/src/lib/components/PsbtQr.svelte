<script>
	import { onDestroy, tick } from 'svelte';
	import sb from 'satoshi-bitcoin';
	import { _ } from '@names-on-chain/doichain/i18n';
	import { describePsbt } from '$lib/doichain/describePsbt.js';
	import { network } from '@names-on-chain/doichain/doichain-store.js';
	import { renderBCUR } from '$lib/doichain/renderQR.js';

	/** the PSBT to hand over, Base64, or undefined while there is nothing to hand over */
	export let psbt = undefined;
	/** what the saved file is named after, usually the name in the form */
	export let fileBase = '';

	/** time each QR code frame stays on screen, in milliseconds */
	const FRAME_DELAY = 300;

	/**
	 * @type {string[]|undefined} the QR code frames of the PSBT on screen, one SVG per frame
	 */
	let qrCodeData;

	/** @type {string|undefined} the frame on screen, as an SVG */
	let qrCode;

	/** The PSBT the QR code on screen belongs to (not reactive on purpose: it only decides what to keep) */
	const shown = { psbt: undefined };

	/** @type {ReturnType<typeof setTimeout> | undefined} the timeout that brings the next frame */
	let animationTimeout;

	/** @type {number} the frame on screen, counted from 0 */
	let frameIndex = 0;

	/** The animation stands still on the frame on screen */
	let isPaused = false;

	/** 'copied' or 'failed' for a moment after "Copy PSBT" */
	let copyState;

	/** The QR code, brought into view on small screens once it is created */
	let qrContainer;

	/** 'simple' says what happens, 'technical' what the wallet will read */
	let view = 'simple';

	/** The PSBT as the wallet reads it; undefined while nothing is to be shown */
	$: details = view === 'technical' && psbt ? read(psbt) : undefined;

	/** @param {string} base64 */
	function read(base64) {
		try {
			return describePsbt(base64, $network);
		} catch (error) {
			console.error('Could not read the PSBT:', error);
			return undefined;
		}
	}

	/** the transaction version, the way Doichain writes it */
	const hex = (version) => '0x' + version.toString(16);

	/** what an output pays to: the name, an address, or a script without one */
	const payee = (output) =>
		output.isName
			? $_('psbt.technical.nameOutput') +
				' (' +
				(output.address ?? $_('psbt.technical.unknownAddress')) +
				')'
			: (output.address ?? $_('psbt.technical.unknownAddress'));

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

	// a new PSBT needs a new QR code; the same PSBT again (after reloading the coins) keeps the running one
	$: if (psbt !== shown.psbt) stopQrCodes();

	/**
	 * Renders the QR code for the PSBT that is on screen right now.
	 * Splits it into BC-UR fragments, one QR code per animation frame.
	 */
	function createPsbt() {
		const requested = psbt;
		if (!requested) return;
		const stillCurrent = () => requested === psbt;
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
	const psbtFileName = () => `${(fileBase || 'transaction').replace(/[^a-z0-9._-]+/gi, '_')}.psbt`;

	async function copyPsbt() {
		try {
			await navigator.clipboard.writeText(psbt);
			copyState = 'copied';
		} catch {
			copyState = 'failed';
		}
		setTimeout(() => (copyState = undefined), 3000);
	}

	/** Saves the PSBT as a binary .psbt file, the format wallets import */
	function downloadPsbt() {
		const url = URL.createObjectURL(
			new Blob([psbtBytes(psbt)], { type: 'application/octet-stream' })
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
		const file = new File([psbtBytes(psbt)], psbtFileName(), {
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
</script>

{#if psbt && !qrCodeData}
	<button
		type="button"
		on:click={createPsbt}
		class="mt-6 w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
		>{$_('psbt.create')}</button
	>
{/if}
{#if qrCodeData && psbt}
	<div bind:this={qrContainer} class="qr mt-6 rounded-lg bg-white p-4 ring-1 ring-gray-200">
		<!-- vk-qr draws this SVG from the PSBT the page built: squares only, no text from outside -->
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html qrCode}
	</div>
	<div class="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label={$_('psbt.controls')}>
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
			>{$_('psbt.frame', { values: { current: frameIndex + 1, total: qrCodeData.length } })}</span
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
	<div class="mt-4 flex flex-wrap gap-2" role="group" aria-label={$_('psbt.views.label')}>
		{#each ['simple', 'technical'] as which (which)}
			<button
				type="button"
				on:click={() => (view = which)}
				aria-pressed={view === which}
				class="min-h-[44px] rounded-md px-3 text-sm font-semibold ring-1 ring-inset {view === which
					? 'bg-indigo-600 text-white ring-indigo-600'
					: 'bg-white text-gray-900 ring-gray-300 hover:bg-gray-50'} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
				>{$_(`psbt.views.${which}`)}</button
			>
		{/each}
	</div>
	{#if view === 'simple'}
		<ol class="mt-4 list-decimal space-y-1 break-words pl-5 text-sm leading-6 text-gray-800">
			<slot name="steps" />
		</ol>
	{:else if details}
		<div class="mt-4 space-y-3 text-sm leading-6 text-gray-800">
			<p>{$_('psbt.technical.version', { values: { version: hex(details.version) } })}</p>
			<div>
				<h4 class="font-semibold">{$_('psbt.technical.inputs')}</h4>
				<ul class="mt-1 space-y-1">
					{#each details.inputs as input (input.txid + input.n)}
						<li class="break-all font-mono text-xs">
							{$_('psbt.technical.input', {
								values: {
									txid: input.txid,
									n: input.n,
									amount: input.value === undefined ? '?' : sb.toBitcoin(input.value)
								}
							})}
						</li>
					{/each}
				</ul>
			</div>
			<div>
				<h4 class="font-semibold">{$_('psbt.technical.outputs')}</h4>
				<ul class="mt-1 space-y-2">
					{#each details.outputs as output, i (i)}
						<li class="break-words">
							{$_('psbt.technical.output', {
								values: { amount: sb.toBitcoin(output.value), to: payee(output) }
							})}
							{#if output.isName}
								<p class="mt-1 break-all font-mono text-xs text-gray-600">
									{$_('psbt.technical.asm')}: {output.asm}
								</p>
								<p class="mt-1 break-all font-mono text-xs text-gray-600">
									{$_('psbt.technical.script')}: {output.hex}
								</p>
							{/if}
						</li>
					{/each}
				</ul>
			</div>
			{#if details.fee !== undefined}
				<p>{$_('psbt.technical.fee', { values: { amount: sb.toBitcoin(details.fee) } })}</p>
			{/if}
		</div>
	{/if}
	<div class="mt-4">
		<label for="psbt" class="block text-sm font-medium leading-6 text-gray-900"
			>{$_('psbt.label')}</label
		>
		<div class="relative mt-2 rounded-md shadow-sm">
			<textarea
				value={psbt}
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

<style>
	.qr :global(svg) {
		display: block;
		width: 100%;
		height: auto;
	}
</style>
