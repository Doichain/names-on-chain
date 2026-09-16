import { addMessages, init, getLocaleFromNavigator, locale as i18nLocale, _ } from 'svelte-i18n';
import { get } from 'svelte/store';
import de from './de.json';
import en from './en.json';

/**
 * Two languages, both compiled into the bundle.
 *
 * `addMessages` rather than `register()`: register fetches a dictionary over
 * the network on first use, and the lessons are served as static files from
 * GitHub Pages or IPFS. A language switch that needed a request could fail
 * quietly and show raw message keys.
 *
 * The same shape as the simple-todo chapters, so both tutorials load their
 * strings the same way.
 *
 * One dictionary pair serves all five lessons. Keys that an early lesson does
 * not use yet are harmless, and the files stay identical on every lesson
 * branch, so a fixed translation merges forward like any other fix.
 */
addMessages('de', de);
addMessages('en', en);

export const SUPPORTED = /** @type {const} */ (['de', 'en']);
const STORAGE_KEY = 'namesOnChain.locale';

/**
 * The language to start in: a stored choice first, then the browser's own
 * setting (`de-AT` and `de-CH` count as German), otherwise English.
 *
 * @returns {'de' | 'en'}
 */
export function initialLocale() {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored === 'de' || stored === 'en') return stored;
	} catch {
		// Storage blocked or not available (tests); fall through.
	}

	const fromBrowser = (getLocaleFromNavigator() || 'en').slice(0, 2).toLowerCase();
	return fromBrowser === 'de' ? 'de' : 'en';
}

/** @param {'de' | 'en'} next */
export function setLocale(next) {
	i18nLocale.set(next);
	try {
		localStorage.setItem(STORAGE_KEY, next);
	} catch {
		// Storage blocked: the choice holds for this visit only.
	}
}

/**
 * Initialised on import, so every module that can translate has already set a
 * locale. English is the fallback: a missing German key shows the English
 * sentence rather than the key.
 */
init({
	fallbackLocale: 'en',
	initialLocale: initialLocale()
});

// Screen readers and hyphenation follow the language the page is shown in.
if (typeof document !== 'undefined') {
	i18nLocale.subscribe((value) => {
		if (value) document.documentElement.lang = value;
	});
}

/**
 * Translate outside a component, e.g. for messages built in `src/lib/doichain`.
 * The text is fixed when the message is created, so a component re-runs its
 * check when the language changes.
 *
 * @param {string} key
 * @param {Record<string, string | number>} [values]
 * @returns {string}
 */
export function t(key, values) {
	return get(_)(key, { values });
}

export { _, locale } from 'svelte-i18n';
