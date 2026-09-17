import { expect, test } from '@playwright/test';
import { headers, recorded, simulateElectrumX } from './electrumx.js';

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem('namesOnChain.locale', 'en'));
});

test('the scan dialog keeps the focus, closes with Esc and takes a pasted address', async ({
	page
}) => {
	await simulateElectrumX(page);
	await page.goto('/');
	await expect(page.getByRole('status')).toContainText(`block ${headers.tip.height}`);

	const scanButton = page.getByRole('button', { name: 'Scan the QR code of an address' });
	const dialog = page.getByRole('dialog', { name: 'Scan a QR code' });

	// without a camera the dialog says so instead of showing an empty frame
	await scanButton.click();
	await expect(dialog).toBeVisible();
	await expect(dialog.getByRole('alert')).toBeVisible();

	// Esc closes it and gives the focus back
	await page.keyboard.press('Escape');
	await expect(dialog).toBeHidden();
	await expect(scanButton).toBeFocused();

	// a click next to the dialog closes it too
	await scanButton.click();
	await expect(dialog).toBeVisible();
	await page.mouse.click(5, 5);
	await expect(dialog).toBeHidden();

	// a pasted doichain: URI becomes the bare address, and its coins are looked up
	await scanButton.click();
	await dialog
		.getByLabel('Or paste the address here')
		.fill(`doichain:${recorded.fundedAddress}?amount=1`);
	await dialog.getByRole('button', { name: 'Use' }).click();
	await expect(dialog).toBeHidden();
	await expect(page.getByLabel('Doichain registration address')).toHaveValue(
		recorded.fundedAddress
	);
	await expect(page.locator('#address-status')).toContainText(/Balance: [\d.]+ DOI/);
});

test('the address waits until a server on the valid chain answers', async ({ page }) => {
	await simulateElectrumX(page, { checkpointHex: headers.blockBeforeSplit.hex });
	await page.goto('/');
	await expect(page.getByRole('status')).toContainText('does not follow the valid Doichain chain');
	await expect(page.getByLabel('Doichain registration address')).toBeDisabled();
	await expect(page.getByRole('button', { name: 'Scan the QR code of an address' })).toBeDisabled();
});
