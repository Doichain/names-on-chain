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

test('the footer names the commit it was built from', async ({ page }) => {
	await simulateElectrumX(page);
	await page.goto('/');
	await expectBuildStamp(page, expect);
});
