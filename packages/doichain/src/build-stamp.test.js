import { describe, expect, it } from 'vitest';
import { localStamp, utcStamp } from './build-stamp.js';

// The merge of #20: 2026-09-20T00:48:25+02:00, a minute that falls on two dates.
const merge = new Date('2026-09-20T00:48:25+02:00');
const plain = (text) => text.replace(/[\s\u202f\u00a0]+/g, ' ');

describe('the build stamp', () => {
	it("is shown in the reader's own locale, clock and zone", () => {
		expect(plain(localStamp(merge, 'de-DE', 'Europe/Berlin'))).toBe('20.09.2026, 00:48 MESZ');
		expect(plain(localStamp(merge, 'en-US', 'America/New_York'))).toBe('09/19/2026, 06:48 PM EDT');
	});

	it('says the same instant in UTC for the tooltip, on the date UTC has', () => {
		expect(utcStamp(merge)).toBe('2026-09-19 22:48 UTC');
	});
});
