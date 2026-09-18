import { expect, test } from '@playwright/test';
import { recorded, simulateElectrumX } from './electrumx.js';

/**
 * Takes the pictures the lesson texts show, and checks on the way that what is
 * in the picture is really the state it claims to be. A screenshot that can no
 * longer be reached fails here instead of ageing quietly in docs/.
 *
 * The files land in docs/img/ and are committed; run `pnpm exec playwright test
 * screenshots` after a visible change and commit what it wrote.
 */
test.use({ viewport: { width: 1100, height: 900 } });

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem('namesOnChain.locale', 'en'));
	await simulateElectrumX(page);
});

test('lesson 1: a name, and who holds it', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('status')).toContainText('Connected');

	await page.getByLabel('Name to register').fill(recorded.name);
	await page.getByRole('button', { name: 'Check name' }).click();
	await expect(page.locator('#name-status')).toContainText(recorded.owner);

	await page.screenshot({ path: 'docs/img/lesson01.png', fullPage: true });
});
