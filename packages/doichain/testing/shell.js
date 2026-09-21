/**
 * The shared components live in packages/doichain, so their classes only survive
 * the build when Tailwind's `content` in the app names that path. When it does
 * not, every page still renders and every other test still passes — the page is
 * simply unstyled, with a status icon the size of the viewport.
 *
 * So this asserts the two classes that can only come from the shared component:
 * `h-4 w-4` on the status icon and `text-3xl` on the heading.
 */
export async function expectSharedStylesCompiled(page, expect) {
	const icon = page.locator('h1 ~ * svg, svg.h-4').first();
	await expect(icon).toBeAttached();
	const box = await icon.evaluate((el) => {
		const r = el.getBoundingClientRect();
		return { w: Math.round(r.width), h: Math.round(r.height) };
	});
	expect(
		box,
		'the status icon carries h-4 w-4 (16px); a huge one means Tailwind never saw the shared component'
	).toEqual({ w: 16, h: 16 });

	const size = await page
		.locator('h1')
		.first()
		.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
	expect(
		size,
		'the heading carries text-3xl (30px) from the shared component'
	).toBeGreaterThanOrEqual(28);
}

import { localStamp, utcStamp } from '../src/build-stamp.js';

/** whitespace as the reader sees it: ICU may use narrow no-break spaces */
const plain = (text) => text.replace(/[\s\u202f\u00a0]+/g, ' ').trim();

/**
 * The footer says what is deployed. `buildInfo()` falls back to 'dev' when git is
 * not there, and a deployed page that says 'dev' tells nobody anything — so the
 * stamp has to be a real commit with a real instant.
 *
 * The instant is shown in the reader's locale and zone, and in UTC on hover. The
 * browser context decides locale and zone, so the test states both and expects
 * exactly what the shared formatter makes of them.
 *
 * @param {import('@playwright/test').Page} page
 * @param {typeof import('@playwright/test').expect} expect
 * @param {{locale: string, timeZone: string}} reader
 */
export async function expectBuildStamp(page, expect, { locale, timeZone }) {
	const footer = page.locator('footer');
	const time = footer.locator('time[datetime]');
	await expect(time).toHaveCount(1);

	const datetime = await time.getAttribute('datetime');
	expect(datetime, 'machine-readable instant, in UTC').toMatch(
		/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
	);
	const instant = new Date(datetime);

	expect(await time.getAttribute('title'), 'hovering shows UTC').toBe(utcStamp(instant));
	expect(plain(await time.innerText()), `the reader's clock in ${locale}, ${timeZone}`).toBe(
		plain(localStamp(instant, locale, timeZone))
	);

	const link = footer.locator('a[href*="/commit/"]');
	await expect(link).toHaveCount(1);
	const sha = (await link.innerText()).trim();
	expect(sha, 'the footer shows the commit, not the "dev" fallback').toMatch(/^[0-9a-f]{7,}$/);
}
