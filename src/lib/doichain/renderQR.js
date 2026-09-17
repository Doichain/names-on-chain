// import { UR, UREncoder } from '@ngraveio/bc-ur'
import {
	// CryptoHDKey,
	// CryptoKeypath,
	// CryptoOutput,
	// PathComponent,
	// ScriptExpressions,
	CryptoPSBT
	// CryptoAccount,
	// Bytes,
} from '@keystonehq/bc-ur-registry/dist';
import vkQr from '@vkontakte/vk-qr';
import { Psbt } from '@doichain/doichainjs-lib';

function base64ToHex(base64) {
	const binaryString = atob(base64);
	const bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}
	return Array.from(bytes)
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('');
}
/**
 * Splits a PSBT into BC-UR fragments and draws one QR code per fragment.
 * @param {string} qrData - the PSBT in base64
 * @returns {Promise<string[] | undefined>} one SVG per fragment
 */
export const renderBCUR = async (qrData) => {
	if (!qrData) {
		console.error('No QR data provided');
		return;
	}
	// bytes per animated frame: 50 made a registration with 25 coins 161 frames long;
	// 120 still gives QR codes that phone cameras read from a laptop screen
	const maxFragmentLength = 120;
	// not account. lets try psbt
	const parts = [];
	try {
		const qrDataHex = base64ToHex(qrData);
		Psbt.fromHex(qrDataHex); // will throw if not PSBT hex
		const data = Buffer.from(qrDataHex, 'hex');
		const cryptoPSBT = new CryptoPSBT(data);
		const encoder = cryptoPSBT.toUREncoder(maxFragmentLength);

		for (let c = 1; c <= encoder.fragmentsLength; c++) {
			const ur = encoder.nextPart();
			parts.push(ur);
		}
	} catch (_) {
		console.log('an error', _);
	}

	const qrSvgs = parts.map((part) => {
		const qrSvg = vkQr.createQR(part, {
			qrSize: 256,
			isShowLogo: false,
			isShowBackground: true, // dark modules on white, whatever lies behind
			backgroundColor: '#ffffff',
			foregroundColor: '#000000'
		});
		// console.log("qrSvg", qrSvg);
		return qrSvg;
	});
	console.log(` generated ${qrSvgs.length} qrcode svgs `);
	return qrSvgs;

	// Returns SVG code of generated 256x256 QR code with VK logo
	// const qrSvg = vkQr.createQR(part, {
	// 	qrSize: 256,
	// 	isShowLogo: true
	// });

	// console.log("qrSvg",qrSvg)
	// const encodedSvg = encodeURIComponent(qrSvg);
	// console.log("encodedSvg", encodedSvg);
	// return qrSvg
	// convert to data URL for display
	// const base64String = btoa(qrSvg);
	// const imgDataUrl = `data:image/svg+xml;base64,${base64String}`;
	// console.log("imgDataUrl",imgDataUrl)
	// return imgDataUrl;
};
