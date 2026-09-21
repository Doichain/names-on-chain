import { expect, test } from '@playwright/test';

// The overview at doichain.github.io/names-on-chain/ is site/index.html, copied by
// pages.yml. It is not an app, so it has no suite of its own; it lives next to the
// first lesson. It had no test at all until a script error in it broke both the
// language and the theme buttons without anything turning red.
const OVERVIEW = new URL('../../../site/index.html', import.meta.url).href;

for (const system of /** @type {const} */ (['light', 'dark'])) {
	test(`the overview starts from a ${system} system and remembers what you choose`, async ({
		browser
	}) => {
		const context = await browser.newContext({ colorScheme: system, locale: 'de-DE' });
		const page = await context.newPage();
		const errors = [];
		page.on('pageerror', (error) => errors.push(error.message));
		await page.goto(OVERVIEW);

		const html = page.locator('html');
		const theme = page.locator('#theme');
		const startsDark = system === 'dark';
		await expect(html).toHaveClass(startsDark ? /\bdark\b/ : /^(?!.*\bdark\b)/);

		await theme.click();
		await expect(theme).toHaveAttribute('aria-pressed', String(!startsDark));
		await expect(theme).toHaveAttribute(
			'aria-label',
			startsDark ? 'Dunkles Design einschalten' : 'Helles Design einschalten'
		);

		// switching the language relabels the theme button too
		await page.locator('button[data-lang="en"]').click();
		await expect(html).toHaveAttribute('lang', 'en');
		await expect(theme).toHaveAttribute(
			'aria-label',
			startsDark ? 'Switch to dark mode' : 'Switch to light mode'
		);

		await page.reload();
		await expect(theme).toHaveAttribute('aria-pressed', String(!startsDark));
		expect(errors).toEqual([]);
		await context.close();
	});
}
