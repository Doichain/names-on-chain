<script>
	import {
		connection,
		electrumBlockchainBlockHeadersSubscribe as tip,
		network
	} from '../doichain-store.js';
	import { electrum } from '@doichain/doichainjs-lib';
	import { EXPLORER } from '../explorer.js';
	import { _ } from '../i18n/index.js';

	/** Each tone has a colour and an icon, so the state reads without colour too. */
	const TONES = {
		ok: {
			style: 'bg-green-50 text-green-800 ring-green-600/30',
			icon: 'M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z'
		},
		busy: {
			style: 'bg-gray-50 text-gray-800 ring-gray-500/30',
			icon: 'M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z'
		},
		warn: {
			style: 'bg-amber-50 text-amber-900 ring-amber-600/30',
			icon: 'M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z'
		},
		error: {
			style: 'bg-red-50 text-red-800 ring-red-600/30',
			icon: 'M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z'
		}
	};

	$: status = $connection.status;
	/** mainnet, testnet or regtest */
	$: networkKey = ($network?.name ?? 'doichain-mainnet').replace('doichain-', '');
	$: values = {
		host: $connection.host ?? '',
		attempt: $connection.attempt,
		max: $connection.maxAttempts,
		network: $_(`status.networks.${networkKey}`),
		height: $tip?.height
	};
	$: text =
		status === 'connected' && !$tip?.height
			? $_('status.connectedNoTip', { values })
			: $_(`status.${status}`, { values });
	$: tone =
		status === 'connected'
			? TONES.ok
			: status === 'connecting' || status === 'reconnecting'
				? TONES.busy
				: status === 'retrying'
					? TONES.warn
					: TONES.error;
	/** the newest block in the explorer, to compare the height with what the server says */
	$: explorerLink =
		status === 'connected' && networkKey === 'mainnet' && $tip?.hex
			? `${EXPLORER}/block/${electrum.blockHash($tip.hex)}`
			: undefined;
</script>

<div class="mx-auto max-w-2xl sm:text-center">
	<h1 class="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">{$_('app.title')}</h1>
	<p class="mt-2 text-base font-semibold text-gray-700">{$_('app.subtitle')}</p>
	<p
		role="status"
		class="mt-4 inline-flex items-start gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium ring-1 ring-inset {tone.style}"
	>
		<svg
			class="mt-0.5 h-4 w-4 flex-none"
			viewBox="0 0 20 20"
			fill="currentColor"
			aria-hidden="true"
		>
			<path fill-rule="evenodd" clip-rule="evenodd" d={tone.icon} />
		</svg>
		<span>{text}</span>
	</p>
	{#if status === 'connected'}
		<p class="mt-2 text-xs text-gray-700">
			{$_('status.server', { values })}
			{#if explorerLink}
				·
				<a class="underline" href={explorerLink} target="_blank" rel="noreferrer"
					>{$_('status.explorer', { values })}</a
				>
			{/if}
		</p>
	{/if}
</div>
