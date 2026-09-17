<script>
	import ConnectionStatus from '$lib/components/ConnectionStatus.svelte';
	import { getConnectionStatus } from '../doichain/connectElectrum.js';
	import { checkName } from '$lib/doichain/nameValidation.js';
	import { describeNameBytes } from '$lib/doichain/nameBytes.js';
	import { electrumClient, connectedServer } from '../doichain/doichain-store.js';
	import { _, locale } from '$lib/i18n/index.js';

	/**
	 * The name currently typed in the name input
	 */
	let name = '';

	/**
	 * Is everything ok with the name inside the name input?
	 */
	let isNameValid = true;

	/**
	 * If there is an issue with the name, this variable contains the error
	 */
	let nameErrorMessage = '';

	/**
	 * Something worth knowing about a free name, e.g. that it expired
	 */
	let nameNotice = '';

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
	let totalUtxoValue = 0,
		totalAmount = 0;

	/** The name the answer on screen belongs to; empty while nothing has been checked */
	let checkedName = '';

	/** True while a check is on its way to a server */
	let isCheckingName = false;

	/** The name in the field has not been asked about yet */
	$: needsCheck = Boolean(name) && name !== checkedName && !isCheckingName;

	/**
	 * Check a name, debounce every keyboard typing, return local variables by callback
	 * @param result
	 */
	export async function nameCheckCallback(result) {
		// an answer for a name typed earlier arrives too late to matter
		if (result.name !== name) return;
		isCheckingName = false;
		checkedName = result.name;
		isNameValid = result.isNameValid;
		nameErrorMessage = result.nameErrorMessage;
		nameNotice = result.nameNotice ?? '';
	}

	/**
	 * The form opens once a server on the valid chain answers;
	 * ConnectionStatus shows where the connection stands.
	 */
	$: ({ isConnected } = getConnectionStatus($connectedServer));

	/**
	 * Asks a server about the name, when you click Check or press Enter.
	 *
	 * Every check sends the name to one of the servers, as the hash of its
	 * index script. Asking on every keystroke would hand over every name
	 * somebody tries out, so the app asks once, for the name you mean.
	 */
	function checkNow() {
		if (!name || isCheckingName) return;
		isCheckingName = true;
		checkName($electrumClient, name, totalUtxoValue, totalAmount, nameCheckCallback);
	}

	/** The language the answer on screen was written in */
	let messageLocale = $locale;
	$: if ($locale !== messageLocale) {
		messageLocale = $locale;
		// the answer carries its message: after a switch the same name is asked again
		if (name && name === checkedName) checkNow();
	}

	/**
	 * A changed name has no answer yet, and nothing of the old one stays on screen
	 */
	$: if (name !== checkedName) {
		checkedName = '';
		isNameValid = true;
		nameErrorMessage = '';
		nameNotice = '';
	}

	/**
	 * The bytes the name is stored as, to warn about look-alike names
	 */
	$: nameBytes = describeNameBytes(name);
</script>

<div class="bg-white py-24 sm:py-32">
	<div class="mx-auto max-w-7xl px-6 lg:px-8">
		<ConnectionStatus />
		<div
			class="mx-auto mt-16 max-w-2xl rounded-3xl ring-1 ring-gray-200 sm:mt-20 lg:mx-0 lg:flex lg:max-w-none"
		>
			<div class="p-8 sm:p-10 lg:flex-auto">
				<p class="mt-6 text-base leading-7 text-gray-600">{$_('name.intro')}</p>
				{#if isConnected}
					<p>&nbsp;</p>
					<div>
						<label for="name" class="block text-sm font-medium leading-6 text-gray-900"
							>{$_('name.label')}</label
						>
						<div class="mt-2 flex items-start gap-2">
							<div class="relative flex-1 rounded-md shadow-sm">
								<input
									bind:value={name}
									name="name"
									id="name"
									type="text"
									autocomplete="off"
									autocapitalize="off"
									spellcheck="false"
									class={isCheckingName || isNameValid
										? 'block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6'
										: 'block w-full rounded-md border-0 py-1.5 pr-10 text-red-900 ring-1 ring-inset ring-red-300 placeholder:text-red-300 focus:ring-2 focus:ring-inset focus:ring-red-500 sm:text-sm sm:leading-6'}
									placeholder={$_('name.placeholder')}
									aria-invalid={!isCheckingName && !isNameValid}
									aria-describedby="name-status"
									on:keydown={(event) => event.key === 'Enter' && checkNow()}
								/>

								{#if isCheckingName}
									<!-- no verdict while the check runs -->
								{:else if !isNameValid}
									<div
										class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3"
									>
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
								{:else if name && name === checkedName}
									<div
										class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3"
									>
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
								on:click={checkNow}
								disabled={!name || isCheckingName}
								class="min-h-[44px] flex-none rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-gray-300"
								>{$_('name.check')}</button
							>
						</div>

						<!-- room for two lines, so the fields below do not jump while the check answers -->
						<div id="name-status" class="min-h-12" aria-live="polite">
							{#if !name}
								<!-- nothing to say yet -->
							{:else if isCheckingName}
								<p class="mt-2 text-sm text-gray-600">
									{$_('name.checking', { values: { name } })}
								</p>
							{:else if needsCheck}
								<p class="mt-2 text-sm text-gray-700">{$_('name.notChecked')}</p>
							{:else if !isNameValid}
								<p class="mt-2 text-sm text-red-600">{nameErrorMessage}</p>
							{:else}
								<p class="mt-2 text-sm text-green-700">
									{$_('name.available', { values: { name } })}
									{nameNotice}
								</p>
								{#if doichainAddress}
									<p class="mt-1 text-sm text-gray-600">
										{$_('name.address', { values: { address: doichainAddress } })}
									</p>
								{/if}
							{/if}
							{#if name && nameBytes.mixesScripts}
								<p class="mt-2 text-sm text-amber-800">
									{$_('name.warnings.mixedScripts', { values: { hex: nameBytes.hex } })}
								</p>
							{:else if name && !nameBytes.isAscii}
								<p class="mt-2 text-sm text-amber-800">
									{$_('name.warnings.nonAscii', { values: { hex: nameBytes.hex } })}
								</p>
							{/if}
						</div>
					</div>
				{:else}
					<p class="mt-2 text-sm text-gray-700" id="connection-status">
						{$_('status.offlineHelp')}
					</p>
				{/if}
			</div>
		</div>
	</div>
</div>
