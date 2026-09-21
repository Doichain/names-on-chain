import { expect, test } from '@playwright/test';
import { simulateElectrumX } from '@names-on-chain/doichain/testing';
import {
	expectBuildStamp,
	expectSharedStylesCompiled
} from '@names-on-chain/doichain/testing/shell';

test('the styles of the shared components survive the build', async ({ page }) => {
	await simulateElectrumX(page);
	await page.goto('/');
	await expectSharedStylesCompiled(page, expect);
});

// Two readers on two continents: each sees the commit in their own terms.
for (const reader of [
	{ locale: 'de-DE', timeZone: 'Europe/Berlin' },
	{ locale: 'en-US', timeZone: 'America/New_York' }
]) {
	test.describe(`a reader in ${reader.timeZone}`, () => {
		test.use({ locale: reader.locale, timezoneId: reader.timeZone });

		test('sees when the page was built, in their own clock and zone', async ({ page }) => {
			await simulateElectrumX(page);
			await page.goto('/');
			await expectBuildStamp(page, expect, reader);
		});
	});
}

test('the theme toggle switches, and the choice survives a reload', async ({ browser }) => {
	const context = await browser.newContext({ colorScheme: 'light' });
	const page = await context.newPage();
	await simulateElectrumX(page);
	await page.goto('/');
	const html = page.locator('html');
	const toggle = page.getByTestId('theme-toggle');

	await expect(html).not.toHaveClass(/\bdark\b/);
	await expect(toggle).toHaveAttribute('aria-pressed', 'false');
	await toggle.click();
	await expect(html).toHaveClass(/\bdark\b/);
	await expect(toggle).toHaveAttribute('aria-pressed', 'true');

	// a stored choice beats the system setting on the next visit
	await page.reload();
	await expect(html).toHaveClass(/\bdark\b/);
	await context.close();
});
