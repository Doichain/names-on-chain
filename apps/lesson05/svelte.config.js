import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// The workspace package, so Vite and svelte-check resolve it the same way.
		alias: {
			'@names-on-chain/doichain': '../../packages/doichain/src/index.js',
			'@names-on-chain/doichain/i18n': '../../packages/doichain/src/i18n/index.js',
			'@names-on-chain/doichain/testing': '../../packages/doichain/testing/electrumx.js',
			'@names-on-chain/doichain/testing/fake-client':
				'../../packages/doichain/testing/__fixtures__/fakeElectrumClient.js',
			'@names-on-chain/doichain/testing/*': '../../packages/doichain/testing/*',
			'@names-on-chain/doichain/*': '../../packages/doichain/src/*'
		},
		adapter: adapter({
			// default options are shown. On some platforms
			// these options are set automatically — see below
			pages: 'public',
			assets: 'public',
			precompress: false,
			strict: false
		})
	},
	preprocess: vitePreprocess()
};
export default config;
