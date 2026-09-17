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
		// Only Buffer is polyfilled: the name scripts and PSBTs are built from bytes.
		// Everything else comes from real packages (events), so no Node shim ends up
		// in the bundle.
		nodePolyfills({
			include: ['buffer'],
			globals: {
				Buffer: true,
				global: false,
				process: false
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
