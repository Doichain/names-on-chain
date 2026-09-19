import { expect, test } from '@playwright/test';
import { recorded, simulateElectrumX } from '@names-on-chain/doichain/testing';

/**
 * Takes the pictures the lesson texts show, and checks on the way that what is
 * in the picture is really the state it claims to be. A screenshot that can no
 * longer be reached fails here instead of ageing quietly in docs/.
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

	await page.getByLabel('Name to register').fill(recorded.name);
	await page.getByRole('button', { name: 'Check name' }).click();
	await expect(page.locator('#name-status')).toContainText(recorded.owner);

	await shoot(page, 'lesson01.png');
});
