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
				// the language's own objects (Intl, …), which browser and node do not list
				...globals.builtin,
				...globals.browser,
				...globals.node,
				// the commit the build came from, set in vite.config.js from git
				__BUILD_COMMIT__: 'readonly',
				__BUILD_DATE__: 'readonly'
			}
		}
	},
	{
		// public/ is the build output of every app (adapter-static pages: 'public')
		ignores: ['**/build/', '**/.svelte-kit/', '**/dist/', '**/public/', '**/node_modules/']
	}
];
