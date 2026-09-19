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
