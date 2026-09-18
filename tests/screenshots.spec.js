import { expect, test } from '@playwright/test';
import { recorded, simulateElectrumX } from './electrumx.js';

/**
 * Takes the pictures the lesson texts show, and checks on the way that what is
 * in the picture is really the state it claims to be. A screenshot that can no
 * longer be reached fails here instead of ageing quietly in docs/.
 *
 * Each lesson's picture is taken on the branch where that lesson is the whole
 * app: as soon as the next lesson has put something on the page, the test skips,
 * so a later branch does not overwrite an earlier lesson's picture with its own,
 * fuller page. The files land in docs/img/ and are committed; after a visible
 * change run `pnpm exec playwright test screenshots` and commit what it wrote.
 */
test.use({ viewport: { width: 1100, height: 900 } });

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem('namesOnChain.locale', 'en'));
	await simulateElectrumX(page);
});

test('lesson 1: a name, and who holds it', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('status')).toContainText('Connected');
	// lesson 2 adds the address field
	test.skip(
		(await page.getByLabel('Doichain registration address').count()) > 0,
		'a later lesson has more on the page'
	);

	await page.getByLabel('Name to register').fill(recorded.name);
	await page.getByRole('button', { name: 'Check name' }).click();
	await expect(page.locator('#name-status')).toContainText(recorded.owner);

	await page.screenshot({ path: 'docs/img/lesson01.png', fullPage: true });
});

test('lesson 2: an address, its coins and its names', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('status')).toContainText('Connected');
	// lesson 3 adds the cost box
	test.skip(
		(await page.getByText('Locked amount:').count()) > 0,
		'a later lesson has more on the page'
	);

	await page.getByLabel('Doichain registration address').fill(recorded.owner);
	await expect(page.locator('#address-status')).toContainText(/Balance: [\d.]+ DOI/);
	await expect(page.locator('#address-status')).toContainText('Names registered to this address:');

	await page.screenshot({ path: 'docs/img/lesson02.png', fullPage: true });
});
