import { expect, test } from '@playwright/test';
import { headers, recorded, simulateElectrumX } from '@names-on-chain/doichain/testing';

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem('namesOnChain.locale', 'en'));
});

test('says when the connection is gone, and comes back on its own', async ({ page }) => {
	const server = await simulateElectrumX(page);
	await page.goto('/');
	await expect(page.getByRole('status')).toContainText(`block ${headers.tip.height}`);

	server.drop();

	// the form closes while no server answers, and the page says why
	await expect(page.getByRole('status')).toContainText('lost, reconnecting');
	await expect(page.getByLabel('Name to register')).toHaveCount(0);
	await expect(page.getByText('The form opens as soon as a Doichain server')).toBeVisible();

	// the app replaces the connection without being asked
	await expect(page.getByRole('status')).toContainText(`block ${headers.tip.height}`, {
		timeout: 20000
	});
	await expect(page.getByLabel('Name to register')).toBeVisible();
});

test('an answer for a name typed earlier does not land on the new one', async ({ page }) => {
	// the check of the first name is still on its way when the second is typed
	await simulateElectrumX(page, { delay: { 'blockchain.scripthash.get_history': 1500 } });
	await page.goto('/');
	await expect(page.getByRole('status')).toContainText(`block ${headers.tip.height}`);

	const name = page.getByLabel('Name to register');
	await name.fill(recorded.name);
	await page.getByRole('button', { name: 'Check name' }).click();
	await expect(page.locator('#name-status')).toContainText('Checking');

	await name.fill('a-name-typed-later');
	await expect(page.locator('#name-status')).toContainText('Not checked yet');

	// the late answer belongs to the first name and must stay away
	await page.waitForTimeout(2500);
	await expect(page.locator('#name-status')).toContainText('Not checked yet');
	await expect(page.locator('#name-status')).not.toContainText(recorded.owner);
});

test('an expired name is free again, and the page says since when', async ({ page }) => {
	// 36,000 blocks after its last name operation a name belongs to nobody
	const expiresAt = 431320 + 36000;
	await simulateElectrumX(page, { tipHeight: expiresAt + 100 });
	await page.goto('/');
	await expect(page.getByRole('status')).toContainText(`block ${expiresAt + 100}`);

	await page.getByLabel('Name to register').fill(recorded.name);
	await page.getByRole('button', { name: 'Check name' }).click();

	await expect(page.locator('#name-status')).toContainText('is available');
	await expect(page.locator('#name-status')).toContainText(`expired at block ${expiresAt}`);
});
