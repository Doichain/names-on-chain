<script>
	import '../app.css';
	import { _ } from '@names-on-chain/doichain/i18n';
	import Footer from '@names-on-chain/doichain/components/Footer.svelte';
	import Controls from '@names-on-chain/doichain/components/Controls.svelte';
</script>

<!-- This app talks to Doichain mainnet. Say so before anyone scans a PSBT. -->
<div
	class="relative z-[60] flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900"
>
	<p role="note" class="text-center">
		{$_('banner.before')} <strong>{$_('banner.network')}</strong>{$_('banner.after')}
		<a class="underline" href="https://github.com/Doichain/names-on-chain">{$_('banner.link')}</a>
	</p>
	<Controls />
</div>

<slot />

<Footer />
