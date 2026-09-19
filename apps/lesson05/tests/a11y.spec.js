import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { headers, simulateElectrumX } from '@names-on-chain/doichain/testing';

/** the rules of WCAG 2.1 A and AA, the level public bodies are held to */
const STANDARD = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

test('the page breaks no accessibility rule of WCAG 2.1 AA', async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem('namesOnChain.locale', 'en'));
	await simulateElectrumX(page);
	await page.goto('/');
	await expect(page.getByRole('status')).toContainText(`block ${headers.tip.height}`);

	const { violations } = await new AxeBuilder({ page }).withTags(STANDARD).analyze();
	expect(violations.map((v) => `${v.id}: ${v.nodes.length}× ${v.help}`)).toEqual([]);
});
