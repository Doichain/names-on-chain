<script>
	import { createEventDispatcher, onDestroy, onMount } from 'svelte';
	import { createQrReader } from '../scanQr.js';
	import { _ } from '../i18n/index.js';

	/** true while the dialog is open; the dialog sets it to false when it closes */
	export let scanOpen;
	/** the scanned or pasted text, as it is: the page turns a doichain: URI into an address */
	export let scanData;

	const dispatch = createEventDispatcher();
	/** one set of ids per dialog, since lesson 5 has two scanners on one page */
	const id = `scan-${Math.random().toString(36).slice(2, 10)}`;

	/** @type {HTMLDialogElement} */
	let dialog;
	/** @type {HTMLVideoElement} */
	let video;
	/** @type {MediaStream | undefined} */
	let stream;
	/** @type {ReturnType<typeof setInterval> | undefined} */
	let reading;
	let scanning = false;
	let pasted = '';
	/** @type {'' | 'denied' | 'missing' | 'unavailable'} why the camera cannot be used */
	let cameraProblem = '';

	/** how often a frame is read, in milliseconds */
	const FRAME_INTERVAL = 250;

	onMount(async () => {
		// a native modal dialog keeps the focus inside and closes with Esc
		dialog.showModal();
		try {
			if (!navigator.mediaDevices?.getUserMedia) throw new Error('no camera API');
			// the camera is asked for first, so a refusal or a missing camera can be named
			stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
			video.srcObject = stream;
			await video.play();
			scanning = true;
			const read = await createQrReader();
			reading = setInterval(async () => {
				const text = await read(video).catch(() => undefined);
				if (text) use(text);
			}, FRAME_INTERVAL);
		} catch (error) {
			cameraProblem = ['NotAllowedError', 'SecurityError'].includes(error?.name)
				? 'denied'
				: ['NotFoundError', 'OverconstrainedError'].includes(error?.name)
					? 'missing'
					: 'unavailable';
		}
	});

	/** the camera is let go as soon as the dialog closes */
	onDestroy(() => {
		clearInterval(reading);
		stream?.getTracks().forEach((track) => track.stop());
	});

	/** @param {string} text */
	function use(text) {
		scanData = text;
		close();
	}

	function close() {
		// closing the dialog first gives the focus back to the button that opened it
		if (dialog?.open) dialog.close();
		scanOpen = false;
		dispatch('close');
	}
</script>

<!-- A click on the dimmed background closes the dialog; the keyboard closes it with Esc (cancel). -->
<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
<dialog
	bind:this={dialog}
	aria-labelledby="{id}-title"
	class="scan-modal w-full max-w-sm rounded-lg p-0 shadow-xl backdrop:bg-gray-500/75"
	on:cancel|preventDefault={close}
	on:click={(event) => event.target === dialog && close()}
>
	<div class="px-4 pb-4 pt-5 sm:p-6">
		<h2 id="{id}-title" class="text-base font-semibold text-gray-900">{$_('scan.title')}</h2>
		{#if cameraProblem}
			<p class="mt-2 rounded-md bg-amber-50 p-3 text-sm text-amber-900" role="alert">
				{$_(`scan.errors.${cameraProblem}`)}
			</p>
		{:else}
			<p class="mt-1 text-sm text-gray-700">
				{scanning ? $_('scan.tip') : $_('scan.starting')}
			</p>
			<!-- the camera picture, not a film: no sound, no captions -->
			<video bind:this={video} class="mt-3 w-full rounded-md bg-gray-900" muted autoplay playsinline
			></video>
		{/if}

		<form class="mt-4" on:submit|preventDefault={() => pasted.trim() && use(pasted.trim())}>
			<label for="{id}-paste" class="block text-sm font-medium text-gray-900"
				>{$_('scan.paste')}</label
			>
			<div class="mt-1 flex gap-2">
				<input
					id="{id}-paste"
					bind:value={pasted}
					type="text"
					autocomplete="off"
					autocapitalize="off"
					spellcheck="false"
					class="block min-h-[44px] w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm"
				/>
				<button
					type="submit"
					class="min-h-[44px] rounded-md bg-indigo-600 px-3 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
					>{$_('scan.use')}</button
				>
			</div>
		</form>

		<button
			on:click={close}
			type="button"
			class="mt-5 inline-flex min-h-[44px] w-full items-center justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
			>{$_('scan.close')}</button
		>
	</div>
</dialog>
