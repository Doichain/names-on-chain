// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	/** The version from package.json, set in vite.config.js */
	const __BUILD_COMMIT__: string;
	const __BUILD_DATE__: string;

	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
