import { expect, test } from '@playwright/test';
import { recorded, simulateElectrumX } from '@names-on-chain/doichain/testing';

/**
 * Takes the pictures the lesson texts show, and checks on the way that what is
 * in the picture is really the state it claims to be. A screenshot that can no
 * longer be reached fails here instead of ageing quietly in docs/.
 *
 * Each lesson's picture is taken on the branch where that lesson is the whole
 * app: as soon as the next lesson has put something on the page, the test skips,
 * so a later branch does not overwrite an earlier lesson's picture with its own,
 * fuller page.
 *
 * The files land in the repository's docs/img/ and are committed. Every run walks to the state
 * and checks it; only a run with SCREENSHOTS=1 writes the files, so a normal
 * test run leaves the repository clean:
 *
 *     SCREENSHOTS=1 pnpm exec playwright test screenshots
 *
 * Then commit what it wrote.
 */

/** a deliberate run writes the pictures; every run checks the state they show */
const shoot = async (page, file) => {
	if (process.env.SCREENSHOTS === '1')
		await page.screenshot({ path: `../../docs/img/${file}`, fullPage: true });
};

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

	await shoot(page, 'lesson01.png');
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

	await shoot(page, 'lesson02.png');
});
