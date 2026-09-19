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

/**
 * The footer says what is deployed. `buildInfo()` falls back to 'dev' when git is
 * not there, and a deployed page that says 'dev' tells nobody anything — so the
 * stamp has to be a real commit with a real date.
 */
export async function expectBuildStamp(page, expect) {
	const footer = page.locator('footer');
	await expect(footer).toContainText(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/);
	const link = footer.locator('a[href*="/commit/"]');
	await expect(link).toHaveCount(1);
	const sha = (await link.innerText()).trim();
	expect(sha, 'the footer shows the commit, not the "dev" fallback').toMatch(/^[0-9a-f]{7,}$/);
}
