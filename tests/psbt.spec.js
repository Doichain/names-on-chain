import { expect, test } from '@playwright/test';
import { headers, recorded, simulateElectrumX } from './electrumx.js';

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem('namesOnChain.locale', 'en'));
});

/** A free name and an address with coins: everything a registration needs. */
async function prepare(page) {
	await simulateElectrumX(page);
	await page.goto('/');
	await expect(page.getByRole('status')).toContainText(`block ${headers.tip.height}`);

	await page.getByLabel('Name to register').fill('a-free-name');
	await page.getByRole('button', { name: 'Check name' }).click();
	await expect(page.locator('#name-status')).toContainText('is available');

	await page.getByLabel('Doichain registration address').fill(recorded.fundedAddress);
	await expect(page.locator('#address-status')).toContainText(/Balance: [\d.]+ DOI/);
}

test('builds the registration transaction and says what it costs', async ({ page }) => {
	const errors = [];
	page.on('pageerror', (error) => errors.push(error.message));
	await prepare(page);

	// the fee box fills in: 0.01 DOI locked in the name, a fee by size, the rest as change
	await expect(page.getByText('Locked amount:')).toBeVisible();
	await expect(page.getByText(/0\.01 DOI stay locked in the name output/)).toBeVisible();
	await expect(
		page.getByText(/swartz per vbyte for about \d+ vbytes, using 1 of 1 coins/)
	).toBeVisible();
	expect(errors).toEqual([]);
});

test('waits for a checked name before it builds anything', async ({ page }) => {
	await simulateElectrumX(page);
	await page.goto('/');
	await expect(page.getByRole('status')).toContainText(`block ${headers.tip.height}`);

	await page.getByLabel('Doichain registration address').fill(recorded.fundedAddress);
	await page.getByLabel('Name to register').fill('a-free-name');
	await expect(page.locator('#name-status')).toContainText('Not checked yet');
	await expect(page.getByText(/DOI stay locked in the name output/)).toHaveCount(0);
});

test('hands the PSBT to the wallet as an animated QR code', async ({ page }) => {
	const errors = [];
	page.on('pageerror', (error) => errors.push(error.message));
	await prepare(page);

	await page.getByRole('button', { name: 'Create PSBT' }).click();
	await expect(page.locator('.qr svg')).toBeVisible();
	await expect(page.getByText(/QR code frame \d+ of \d+/)).toBeVisible();
	// a PSBT in Base64 starts with the magic bytes psbt\xff
	await expect(page.getByLabel('PSBT (Base64)')).toHaveValue(/^cHNidP/);

	await page.getByRole('button', { name: 'Pause' }).click();
	await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
	expect(errors).toEqual([]);
});
