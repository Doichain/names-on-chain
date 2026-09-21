<script>
	// The control pill of the Le-Space sites: language, theme and the page QR in one
	// group. It sits at the right end of the mainnet banner rather than fixed over
	// the page, because on this site the top row belongs to the warning about real
	// money — the controls ride along with it instead of covering it.
	import LanguageSwitcher from './LanguageSwitcher.svelte';
	import ThemeToggle from './ThemeToggle.svelte';
	import PageQr from './PageQr.svelte';
</script>

<div
	class="flex items-center gap-0.5 rounded-full border border-amber-300 bg-white/70 px-1.5 py-0.5"
	role="group"
	data-testid="controls"
>
	<LanguageSwitcher />
	<span class="mx-0.5 h-5 w-px bg-amber-300" aria-hidden="true"></span>
	<ThemeToggle />
	<PageQr />
</div>
