import { sveltekit } from '@sveltejs/kit/vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { defineConfig } from 'vitest/config';
import { buildInfo } from '@names-on-chain/doichain/build-info';

const build = buildInfo();

export default defineConfig({
	plugins: [
		// wasm(),
		sveltekit(),
		// Of the Node modules only buffer is shimmed: scripts and PSBTs are built from
		// bytes, and events comes from a real package. The globals stay, because the
		// BC-UR libraries read process and global when they load.
		nodePolyfills({
			include: ['buffer'],
			globals: {
				Buffer: true,
				global: true,
				process: true
			},
			protocolImports: false
		})
	],
	build: {
		minify: true
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	},
	define: {
		__BUILD_COMMIT__: JSON.stringify(build.commit),
		__BUILD_DATE__: JSON.stringify(build.date)
	}
});
