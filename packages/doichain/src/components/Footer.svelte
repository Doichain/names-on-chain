<script>
	// The same footer under every lesson: the app never signs, so it points at the
	// wallet that does — and says who wrote the workshop.
	import { _ } from '../i18n/index.js';
</script>

<footer class="border-t border-gray-200 bg-gray-50 px-4 py-4 text-center text-sm text-gray-700">
	<p>
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
	</p>
	<p class="mt-1 text-xs text-gray-600">
		{$_('credit.madeBy')}
		<a class="underline" href="https://le-space.de" rel="noopener">Le Space</a>
	</p>
</footer>
