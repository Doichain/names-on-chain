import { expect, test } from '@playwright/test';
import { simulateElectrumX } from '@names-on-chain/doichain/testing';
import { expectSharedStylesCompiled } from '@names-on-chain/doichain/testing/styles';

test('the styles of the shared components survive the build', async ({ page }) => {
	await simulateElectrumX(page);
	await page.goto('/');
	await expectSharedStylesCompiled(page, expect);
});
