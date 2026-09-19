<script>
	// The same footer under every lesson: the app never signs, so it points at the
	// wallet that does — and it says who wrote the workshop and what is deployed.
	import { _ } from '../i18n/index.js';

	// The commit, not the clock: rebuilding a commit must give the same bytes, or
	// every build would publish a new IPFS CID for an unchanged site.
	const commit = typeof __BUILD_COMMIT__ === 'string' ? __BUILD_COMMIT__ : 'dev';
	const iso = typeof __BUILD_DATE__ === 'string' ? __BUILD_DATE__ : '';
	const stamp = iso ? `${iso.slice(0, 10)} ${iso.slice(11, 16)}` : '';
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
	<p class="mt-1 flex flex-wrap items-center justify-center gap-x-1.5 text-xs text-gray-600">
		<span>{$_('credit.before')}</span>
		<a class="inline-flex items-center gap-1" href="https://le-space.de" rel="noopener">
			<!--
			The Le-Space mark with its local node — "der erste Knoten" — drawn as a heart,
			in the brand's own coral. Everything else of the mark is untouched: colours,
			geometry, protected space. Minimum size is 20 px, which is why it is 22 here.
		-->
			<svg
				viewBox="0 0 96 96"
				width="22"
				height="22"
				role="img"
				aria-label={$_('credit.markAlt')}
				class="flex-none"
			>
				<line
					x1="42.7"
					y1="49.96"
					x2="58.56"
					y2="34.94"
					stroke="#0E86C4"
					stroke-width="4"
					stroke-linecap="round"
				/>
				<line
					x1="47.43"
					y1="63.58"
					x2="62.8"
					y2="64.98"
					stroke="#0E86C4"
					stroke-width="4"
					stroke-linecap="round"
					stroke-dasharray="0.1 8"
				/>
				<line
					x1="69.85"
					y1="38.36"
					x2="72.41"
					y2="55.37"
					stroke="#0E86C4"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-dasharray="0.1 6"
					opacity="0.65"
				/>
				<path
					d="M 0.5 0.96 C 0.19 0.74 0 0.55 0 0.36 A 0.25 0.25 0 0 1 0.5 0.26 A 0.25 0.25 0 0 1 1 0.36 C 1 0.55 0.81 0.74 0.5 0.96 Z"
					fill="#E8503F"
					transform="translate(15,47) scale(30)"
				/>
				<circle cx="68" cy="26" r="8" fill="none" stroke="#0E86C4" stroke-width="5" />
				<circle cx="74" cy="66" r="6.5" fill="none" stroke="#0E86C4" stroke-width="4.5" />
				<circle cx="17" cy="21" r="2.6" fill="#0E86C4" opacity="0.55" />
			</svg>
			<span class="underline">Le Space</span>
		</a>
		{#if commit !== 'dev'}
			<span class="text-gray-400">·</span>
			<span
				>{$_('build.state')}
				{stamp}
				<a
					class="underline"
					href="https://github.com/Doichain/names-on-chain/commit/{commit}"
					rel="noopener">{commit}</a
				></span
			>
		{/if}
	</p>
</footer>
