<script>
	import '../app.css';
	import Pricing from '$lib/components/pricing.svelte';
	import { _ } from '@names-on-chain/doichain/i18n';

	// the static title and description for link previews are in src/app.html
	$: title = $_('app.title');
</script>

<svelte:head>
	<title>{title} · {$_('app.lesson', { values: { n: 3 } })}</title>
</svelte:head>
<div class="bg-white">
	<section id="pricing"><Pricing /></section>
</div>
