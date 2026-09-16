<script>
    import "../app.css";
</script>

<!-- This app talks to Doichain mainnet. Say so before anyone scans a PSBT. -->
<div role="note" class="relative z-[60] border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900">
    Tutorial app on <strong>Doichain mainnet</strong>: a PSBT you sign in your wallet spends real DOI.
    Check every output before you sign.
    <a class="underline" href="https://github.com/NiKrause/names-on-chain">Source and known issues</a>
</div>

<slot />