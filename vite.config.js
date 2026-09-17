import { sveltekit } from '@sveltejs/kit/vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { defineConfig } from 'vitest/config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const file = fileURLToPath(new URL('package.json', import.meta.url));
const json = readFileSync(file, 'utf8');
const pkg = JSON.parse(json);

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
		__APP_VERSION__: JSON.stringify(pkg.version)
	}
});
