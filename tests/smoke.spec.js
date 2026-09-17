import { expect, test } from '@playwright/test';
import { headers, recorded, simulateElectrumX } from './electrumx.js';

/** @param {import('@playwright/test').Page} page @param {'en' | 'de'} language */
const speak = (page, language) =>
	page.addInitScript((l) => localStorage.setItem('namesOnChain.locale', l), language);

test('names chain, block and server, then finds who holds a name', async ({ page }) => {
	const errors = [];
	page.on('pageerror', (error) => errors.push(error.message));
	page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
	await speak(page, 'en');
	await simulateElectrumX(page);
	await page.goto('/');

	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Names-On-Chain');
	await expect(page.getByRole('status')).toHaveText(
		`Connected · Mainnet · block ${headers.tip.height}`
	);
	await expect(page.getByRole('link', { name: /in the explorer/ })).toHaveAttribute(
		'href',
		`https://doi-explorer.le-space.de/block/${headers.tip.hash}`
	);

	await page.getByLabel('Name to register').fill(recorded.name);
	await expect(page.locator('#name-status')).toContainText(recorded.owner);
	expect(errors).toEqual([]);
});

test('speaks German when asked to', async ({ page }) => {
	await speak(page, 'de');
	await simulateElectrumX(page);
	await page.goto('/');
	await expect(page.getByRole('status')).toHaveText(
		`Verbunden · Mainnet · Block ${headers.tip.height}`
	);
});

test('does not use a server on the old chain', async ({ page }) => {
	await speak(page, 'en');
	await simulateElectrumX(page, { checkpointHex: headers.blockBeforeSplit.hex });
	await page.goto('/');

	await expect(page.getByRole('status')).toContainText('does not follow the valid Doichain chain');
	await expect(page.getByLabel('Name to register')).toHaveCount(0);
});
