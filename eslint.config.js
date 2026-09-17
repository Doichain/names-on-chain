import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

/** @type {import('eslint').Linter.Config[]} */
export default [
	js.configs.recommended,
	...svelte.configs['flat/recommended'],
	prettier,
	...svelte.configs['flat/prettier'],
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
				// the version from package.json, set in vite.config.js
				__APP_VERSION__: 'readonly'
			}
		}
	},
	{
		// public/ is the build output (adapter-static pages: 'public')
		ignores: ['build/', '.svelte-kit/', 'dist/', 'public/']
	}
];
