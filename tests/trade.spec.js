import { expect, test } from '@playwright/test';
import { headers, recorded, simulateElectrumX } from './electrumx.js';

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem('namesOnChain.locale', 'en'));
});

test('builds a purchase for a name somebody else holds', async ({ page }) => {
	const errors = [];
	page.on('pageerror', (error) => errors.push(error.message));
	await simulateElectrumX(page);
	await page.goto('/');
	await expect(page.getByRole('status')).toContainText(`block ${headers.tip.height}`);

	// a name that is taken opens the purchase form
	await page.getByLabel('Name to register').fill(recorded.name);
	await page.getByRole('button', { name: 'Check name' }).click();
	await expect(page.locator('#name-status')).toContainText(recorded.owner);
	await expect(page.getByRole('heading', { name: 'Buy this name' })).toBeVisible();

	await page
		.getByLabel('Your Doichain address: it pays for the name and receives it')
		.fill(recorded.fundedAddress);
	await page.getByLabel('Price').fill('1.5');

	// the summary names both halves of the trade
	await expect(page.getByText(new RegExp(`You pay 1.5 DOI to ${recorded.owner}`))).toBeVisible();
	await expect(
		page.getByText(new RegExp(`The name moves to ${recorded.fundedAddress}`))
	).toBeVisible();
	expect(errors).toEqual([]);
});
