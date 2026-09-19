<script>
	import '../app.css';
	import { _ } from '@names-on-chain/doichain/i18n';
	import LanguageSwitcher from '@names-on-chain/doichain/components/LanguageSwitcher.svelte';
</script>

<!-- This app talks to Doichain mainnet. Say so before anyone scans a PSBT. -->
<div
	class="relative z-[60] flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900"
>
	<p role="note" class="text-center">
		{$_('banner.before')} <strong>{$_('banner.network')}</strong>{$_('banner.after')}
		<a class="underline" href="https://github.com/Doichain/names-on-chain">{$_('banner.link')}</a>
	</p>
	<LanguageSwitcher />
</div>

<slot />

<!-- The app never signs: point to the wallet that does, and to its current source code. -->
<footer class="border-t border-gray-200 bg-gray-50 px-4 py-4 text-center text-sm text-gray-700">
	{$_('wallet.intro')}
	<a class="underline" href="https://play.google.com/store/apps/details?id=org.doichain.doiwallet"
		>{$_('wallet.googlePlay')}</a
	>
	·
	<a class="underline" href="https://apps.apple.com/app/doiwallet/id1579900361"
		>{$_('wallet.appStore')}</a
	>
	·
	<a class="underline" href="https://github.com/Doichain/DoiWallet">{$_('wallet.source')}</a>
</footer>
