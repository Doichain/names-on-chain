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

/**
 * The footer's "Source code" leads to this workshop's repository: that is what
 * a reader looks for in a footer. The wallet sentence names the stores only, so
 * no footer link leads to the DoiWallet repository.
 *
 * @param {import('@playwright/test').Page} page
 * @param {typeof import('@playwright/test').expect} expect
 */
export async function expectFooterSource(page, expect) {
	const footer = page.locator('footer');
	await expect(footer.getByRole('link', { name: /^(Source code|Quellcode)$/ })).toHaveAttribute(
		'href',
		'https://github.com/Doichain/names-on-chain'
	);
	await expect(footer.locator('a[href^="https://github.com/Doichain/DoiWallet"]')).toHaveCount(0);
}

/**
 * The page QR (Le-Space page-QR convention): it must encode exactly the address
 * bar — hash included — and sit on white even in the dark theme, because a
 * camera reads it, not the theme. The test does not trust the text under the
 * code: it decodes the code itself with jsQR, the library the scan dialog uses.
 *
 * @param {import('@playwright/test').Page} page
 * @param {typeof import('@playwright/test').expect} expect
 */
export async function expectPageQr(page, expect) {
	const { createRequire } = await import('node:module');
	const jsqr = createRequire(import.meta.url).resolve('jsqr/dist/jsQR.js');

	await page.getByTestId('page-qr').click();
	const dialog = page.getByTestId('page-qr-dialog');
	await expect(dialog).toBeVisible();
	await expect(page.getByTestId('page-qr-url')).toHaveText(page.url());

	const plaque = page.getByTestId('page-qr-plaque');
	expect(
		await plaque.evaluate((el) => getComputedStyle(el).backgroundColor),
		'white in every theme'
	).toBe('rgb(255, 255, 255)');

	await page.addScriptTag({ path: jsqr });
	const decoded = await plaque.evaluate(async (el) => {
		// XMLSerializer, not outerHTML: an inline SVG's outerHTML carries no xmlns,
		// and without it the markup is not a valid image on its own
		const svg = new XMLSerializer().serializeToString(el.querySelector('svg'));
		const img = new Image();
		img.src = `data:image/svg+xml;base64,${btoa(svg)}`;
		await img.decode();
		const canvas = document.createElement('canvas');
		canvas.width = canvas.height = 600;
		const ctx = canvas.getContext('2d');
		ctx.drawImage(img, 0, 0, 600, 600);
		const data = ctx.getImageData(0, 0, 600, 600);
		// @ts-ignore — injected above
		return window.jsQR(data.data, 600, 600)?.data ?? null;
	});
	expect(decoded, 'the code itself says this address').toBe(page.url());

	await page.keyboard.press('Escape');
	await expect(dialog).toBeHidden();
}
