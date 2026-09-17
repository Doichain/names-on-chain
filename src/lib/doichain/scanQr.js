/**
 * Reads QR codes from the camera picture.
 *
 * Chrome, Android and recent Safari bring a decoder with them
 * (`BarcodeDetector`), and it runs outside the page, so it costs the bundle
 * nothing. Where it is missing, jsQR reads the pixels of a single frame; it is
 * loaded only then, and only for as long as a scan dialog is open.
 *
 * @returns {Promise<(video: HTMLVideoElement) => Promise<string | undefined>>}
 *   a function that returns the text of a QR code in the current frame
 */
export async function createQrReader() {
	const Detector = /** @type {any} */ (globalThis).BarcodeDetector;
	if (Detector) {
		try {
			const formats = await Detector.getSupportedFormats();
			if (formats.includes('qr_code')) {
				const detector = new Detector({ formats: ['qr_code'] });
				return async (video) => {
					const codes = await detector.detect(video);
					return codes[0]?.rawValue;
				};
			}
		} catch {
			// no usable detector in this browser; jsQR below does the work
		}
	}

	const { default: jsQR } = await import('jsqr');
	const canvas = document.createElement('canvas');
	const context = canvas.getContext('2d', { willReadFrequently: true });
	return async (video) => {
		if (!video.videoWidth || !context) return undefined;
		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;
		context.drawImage(video, 0, 0, canvas.width, canvas.height);
		const frame = context.getImageData(0, 0, canvas.width, canvas.height);
		return jsQR(frame.data, frame.width, frame.height)?.data;
	};
}
