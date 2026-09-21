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
