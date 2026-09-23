import { expect, test } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { localStamp, utcStamp } from '@names-on-chain/doichain/build-stamp.js';
import { expectFooterSource } from '@names-on-chain/doichain/testing/shell';

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

test("the overview has the lessons' footer: the wallet, who made it, and no stamp without a commit", async ({
	page
}) => {
	await page.goto(OVERVIEW);
	const footer = page.locator('footer');
	await expect(footer).toContainText('DoiWallet');
	await expect(footer.locator('a[href="https://le-space.de"]')).toContainText('Le Space');
	await expectFooterSource(page, expect);
	// straight from the repository the placeholders are still there: no invented date
	await expect(page.locator('#stamp')).toBeHidden();
});

test("the overview stamp shows the commit's instant in the reader's clock, UTC on hover", async ({
	browser
}, testInfo) => {
	// what pages.yml does when it copies the page
	const commit = '1d9d6e0';
	const date = '2026-09-20T00:48:25+02:00';
	const stamped = testInfo.outputPath('overview-stamped.html');
	writeFileSync(
		stamped,
		readFileSync(new URL(OVERVIEW), 'utf8')
			.replaceAll('__BUILD_COMMIT__', commit)
			.replaceAll('__BUILD_DATE__', date)
	);

	const reader = { locale: 'de-DE', timeZone: 'Europe/Berlin' };
	const context = await browser.newContext({ locale: reader.locale, timezoneId: reader.timeZone });
	const page = await context.newPage();
	await page.goto(pathToFileURL(stamped).href);

	const time = page.locator('#stamp time');
	await expect(page.locator('#stamp')).toBeVisible();
	const plain = (text) => text.replace(/[\s\u202f\u00a0]+/g, ' ').trim();
	expect(plain(await time.innerText())).toBe(
		plain(localStamp(new Date(date), reader.locale, reader.timeZone))
	);
	await expect(time).toHaveAttribute('title', utcStamp(new Date(date)));
	await expect(page.locator('#stamp a')).toHaveAttribute(
		'href',
		`https://github.com/Doichain/names-on-chain/commit/${commit}`
	);
	await context.close();
});
