/**
 * How the footer writes the moment a build was made.
 *
 * In the reader's own terms — their locale's date format, their clock, and the
 * zone named so nobody has to guess whose midnight it was — and in UTC on hover.
 * The instant itself comes from the commit (see ../build-info.js); only the
 * formatting happens in the browser, so the build stays reproducible.
 *
 * One definition for the component and for the test that checks it.
 */
export const STAMP_FORMAT = /** @type {const} */ ({
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
	hour: '2-digit',
	minute: '2-digit',
	timeZoneName: 'short'
});

/**
 * @param {Date} date
 * @param {string} [locale] the reader's, when left out
 * @param {string} [timeZone] the reader's, when left out
 */
export function localStamp(date, locale, timeZone) {
	return new Intl.DateTimeFormat(locale, { ...STAMP_FORMAT, timeZone }).format(date);
}

/** @param {Date} date */
export function utcStamp(date) {
	return `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}
