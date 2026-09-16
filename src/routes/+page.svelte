<script>
   import "../app.css"
   import Pricing from "$lib/components/pricing.svelte"
   import { onMount } from "svelte";
   import { _ } from "$lib/i18n/index.js";

   $: title = $_('app.title')
   $: description = $_('app.description')
   const url = "ipns://name-on-chain.com"
   let image = "/nasa-Q1p7bh3SHj8-unsplash.jpg"
   const favicon = "./favicon.ico"
   let menuOpen

   onMount(() => {
        menuOpen = false;
   });
</script>
<svelte:head>
   <title>{title } {__APP_VERSION__}</title>
   <link rel="icon" type="image/svg" href={favicon} />
   <meta property="og:type" content="article" />
   <meta property="og:title" content={title} />
   <meta property="og:description" content={description} />
   <meta property="og:image" content={image} />
   <meta property="og:url" content={url} />
   <meta name="description" content={description}/>
   <meta name="twitter:card" content={description} />
   <meta name="twitter:title" content={title} />
   <meta name="twitter:description" content={description} />
   <meta name="twitter:image" content={image} />
</svelte:head>
<div class="bg-white">
   <header class="absolute inset-x-0 top-0 z-50">
      <nav class="flex items-center justify-between p-6 lg:px-8" aria-label="Global">
      </nav>
      <div class={menuOpen ? 'lg:hidden' : 'hidden'} role="dialog" aria-modal="true">
         <!-- Background backdrop, show/hide based on slide-over state. -->
         <div class="fixed inset-0 z-50"></div>
         <div class="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
            <div class="flex items-center justify-between">
               <button type="button" class="-m-2.5 rounded-md p-2.5 text-gray-700"
                       on:click={() => menuOpen = !menuOpen}>
                  <span class="sr-only">{$_('page.closeMenu')}</span>
                  <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                     <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
               </button>
            </div>
            <div class="mt-6 flow-root">
               <div class="-my-6 divide-y divide-gray-500/10">
               </div>
            </div>
         </div>
      </div>
   </header>

   <section id="pricing"><Pricing /></section>
</div>