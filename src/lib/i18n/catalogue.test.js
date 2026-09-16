import { describe, expect, it } from 'vitest';

import en from './en.json';
import de from './de.json';

// The two dictionaries are edited by hand. A key missing from one of them fails
// silently: svelte-i18n falls back to English, so a half-translated German page
// looks like a decision rather than an omission. These tests compare the shapes.

/**
 * Every leaf path in a nested dictionary.
 *
 * @param {any} node
 * @param {string} [prefix]
 * @returns {string[]}
 */
function paths(node, prefix = '') {
	if (typeof node !== 'object' || node === null) return [prefix];
	return Object.entries(node).flatMap(([key, value]) =>
		paths(value, prefix ? `${prefix}.${key}` : key)
	);
}

/** @param {string} message */
function placeholders(message) {
	return new Set([...message.matchAll(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g)].map((m) => m[1]));
}

/**
 * @param {any} dictionary
 * @param {string} path
 */
function at(dictionary, path) {
	return path.split('.').reduce((node, key) => node?.[key], dictionary);
}

describe('the message catalogues', () => {
	const english = paths(en);
	const german = paths(de);

	it('translate the same set of keys', () => {
		expect(german.filter((key) => !english.includes(key))).toEqual([]);
		expect(english.filter((key) => !german.includes(key))).toEqual([]);
	});

	it('have no empty messages', () => {
		for (const key of english) {
			expect(String(at(en, key)).trim(), `en: ${key}`).not.toBe('');
			expect(String(at(de, key)).trim(), `de: ${key}`).not.toBe('');
		}
	});

	it('keep the values a message interpolates', () => {
		for (const key of english) {
			const source = String(at(en, key));
			const target = String(at(de, key));
			expect([...placeholders(target)].sort(), `de: ${key}`).toEqual([...placeholders(source)].sort());
		}
	});
});
