<script>
	import NameField from '$lib/components/NameField.svelte';
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

	/** The name a check is on its way for; empty when nothing is on its way */
	let checkingName = '';

	/**
	 * A check belongs to the field only as long as the name has not changed.
	 * Typing on leaves the answer without a field to land in, and the form is
	 * free again right away instead of waiting for an answer nobody wants.
	 */
	$: isCheckingName = Boolean(checkingName) && checkingName === name;

	/** The name in the field has not been asked about yet */
	$: needsCheck = Boolean(name) && name !== checkedName && !isCheckingName;

	/**
	 * Check a name, debounce every keyboard typing, return local variables by callback
	 * @param result
	 */
	export async function nameCheckCallback(result) {
		if (result.name === checkingName) checkingName = '';
		// an answer for a name typed earlier arrives too late to matter
		if (result.name !== name) return;
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
		checkingName = name;
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
					<NameField
						bind:value={name}
						checking={isCheckingName}
						invalid={!isNameValid}
						checked={name === checkedName}
						on:check={checkNow}
					>
						<svelte:fragment slot="status">
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
						</svelte:fragment>
					</NameField>
				{:else}
					<p class="mt-2 text-sm text-gray-700" id="connection-status">
						{$_('status.offlineHelp')}
					</p>
				{/if}
			</div>
		</div>
	</div>
</div>
