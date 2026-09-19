import { expect, test } from '@playwright/test';
import { headers, recorded, simulateElectrumX } from '@names-on-chain/doichain/testing';

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

	// the page numbers the steps and says which one is next
	await expect(page.getByRole('heading', { name: /Check a name/ })).toBeVisible();
	await expect(page.getByText('next', { exact: true })).toBeVisible();

	// the name reaches a server only on demand
	await page.getByLabel('Name to register').fill(recorded.name);
	await expect(page.locator('#name-status')).toContainText('Not checked yet');
	await page.getByRole('button', { name: 'Check name' }).click();
	await expect(page.locator('#name-status')).toContainText(recorded.owner);
	// the step is answered now
	await expect(page.getByText('done', { exact: true })).toBeVisible();
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
	await simulateElectrumX(page, { checkpointHex: headers.oldChain.hex });
	await page.goto('/');

	await expect(page.getByRole('status')).toContainText('does not follow the valid Doichain chain');
	await expect(page.getByLabel('Name to register')).toHaveCount(0);
});

test('says what a shared link should look like', async ({ page }) => {
	await simulateElectrumX(page);
	await page.goto('/');

	// a crawler reads the static head, so the tags must be there without the app running
	const content = (selector) => page.locator(selector).getAttribute('content');
	expect(await content('meta[property="og:title"]')).toBe('Names-on-Chain');
	expect(await content('meta[property="og:url"]')).toBe(
		'https://doichain.github.io/names-on-chain/'
	);
	expect(await content('meta[name="twitter:card"]')).toBe('summary_large_image');

	// the picture has to be reachable, and absolute: a relative one is not resolved everywhere
	const image = await content('meta[property="og:image"]');
	expect(image).toMatch(/^https:\/\/doichain\.github\.io\/names-on-chain\/og-image\.png$/);
	const response = await page.request.get('/og-image.png');
	expect(response.status()).toBe(200);
	expect(response.headers()['content-type']).toContain('image/png');
});
