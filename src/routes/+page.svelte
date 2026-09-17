<script>
	import '../app.css';
	import Pricing from '$lib/components/pricing.svelte';
	import { _ } from '$lib/i18n/index.js';

	// the static title and description for link previews are in src/app.html
	$: title = $_('app.title');
</script>

<svelte:head>
	<!-- svelte-ignore missing-declaration -->
	<title>{title} {__APP_VERSION__}</title>
</svelte:head>
<div class="bg-white">
	<section id="pricing"><Pricing /></section>
</div>
