import { expect, test } from '@playwright/test';
import vkQr from '@vkontakte/vk-qr';
import { headers, recorded, simulateElectrumX } from './electrumx.js';

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem('namesOnChain.locale', 'en'));
});

test('the scan dialog keeps the focus, closes with Esc and takes a pasted address', async ({
	page
}) => {
	await simulateElectrumX(page);
	await page.goto('/');
	await expect(page.getByRole('status')).toContainText(`block ${headers.tip.height}`);

	const scanButton = page.getByRole('button', { name: 'Scan the QR code of an address' });
	const dialog = page.getByRole('dialog', { name: 'Scan a QR code' });

	// without a camera the dialog says so instead of showing an empty frame
	await scanButton.click();
	await expect(dialog).toBeVisible();
	await expect(dialog.getByRole('alert')).toBeVisible();

	// Esc closes it and gives the focus back
	await page.keyboard.press('Escape');
	await expect(dialog).toBeHidden();
	await expect(scanButton).toBeFocused();

	// a click next to the dialog closes it too
	await scanButton.click();
	await expect(dialog).toBeVisible();
	await page.mouse.click(5, 5);
	await expect(dialog).toBeHidden();

	// a pasted doichain: URI becomes the bare address, and its coins are looked up
	await scanButton.click();
	await dialog
		.getByLabel('Or paste the address here')
		.fill(`doichain:${recorded.fundedAddress}?amount=1`);
	await dialog.getByRole('button', { name: 'Use' }).click();
	await expect(dialog).toBeHidden();
	await expect(page.getByLabel('Doichain registration address')).toHaveValue(
		recorded.fundedAddress
	);
	await expect(page.locator('#address-status')).toContainText(/Balance: [\d.]+ DOI/);
});

test('the address waits until a server on the valid chain answers', async ({ page }) => {
	await simulateElectrumX(page, { checkpointHex: headers.blockBeforeSplit.hex });
	await page.goto('/');
	await expect(page.getByRole('status')).toContainText('does not follow the valid Doichain chain');
	await expect(page.getByLabel('Doichain registration address')).toBeDisabled();
	await expect(page.getByRole('button', { name: 'Scan the QR code of an address' })).toBeDisabled();
});

/**
 * Gives the page a camera that always shows the same QR code, drawn by the
 * browser itself. Without `useBarcodeDetector` the page falls back to jsQR.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} text
 * @param {{useBarcodeDetector?: boolean}} [options]
 */
async function cameraShowing(page, text, { useBarcodeDetector = true } = {}) {
	const svg = vkQr.createQR(text, { qrSize: 512, isShowLogo: false });
	await page.addInitScript(
		({ code, keepDetector }) => {
			if (!keepDetector) delete (/** @type {any} */ (window).BarcodeDetector);
			const canvas = document.createElement('canvas');
			canvas.width = 640;
			canvas.height = 640;
			const context = canvas.getContext('2d');
			const image = new Image();
			const loaded = new Promise((resolve) => (image.onload = resolve));
			image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(code);
			const draw = () => {
				context.fillStyle = '#ffffff';
				context.fillRect(0, 0, canvas.width, canvas.height);
				context.drawImage(image, 64, 64, 512, 512);
			};
			Object.defineProperty(navigator, 'mediaDevices', {
				configurable: true,
				value: {
					getUserMedia: async () => {
						await loaded;
						draw();
						setInterval(draw, 100);
						return canvas.captureStream(10);
					}
				}
			});
		},
		{ code: svg, keepDetector: useBarcodeDetector }
	);
}

for (const decoder of ['the browser decoder', 'jsQR']) {
	test(`reads an address from the camera picture with ${decoder}`, async ({ page }) => {
		await cameraShowing(page, `doichain:${recorded.fundedAddress}`, {
			useBarcodeDetector: decoder !== 'jsQR'
		});
		await simulateElectrumX(page);
		await page.goto('/');
		await page.getByRole('button', { name: 'Scan the QR code of an address' }).click();

		await expect(page.getByLabel('Doichain registration address')).toHaveValue(
			recorded.fundedAddress,
			{ timeout: 15000 }
		);
		await expect(page.getByRole('dialog', { name: 'Scan a QR code' })).toBeHidden();
	});
}
