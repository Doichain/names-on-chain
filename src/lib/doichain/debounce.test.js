import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { debounce } from './debounce.js';

describe('debounce', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it('runs once, with the arguments of the last call, after the calls pause', () => {
		const fn = vi.fn();
		const typed = debounce(fn, 300);
		typed('d');
		typed('do');
		vi.advanceTimersByTime(299);
		typed('doi');
		vi.advanceTimersByTime(299);
		expect(fn).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(fn).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledWith('doi');
	});

	it('keeps two debounced functions apart', () => {
		const names = vi.fn();
		const addresses = vi.fn();
		const checkName = debounce(names, 300);
		const checkAddress = debounce(addresses, 300);
		checkName('doichain');
		checkAddress('MyAddress');
		vi.advanceTimersByTime(300);
		expect(names).toHaveBeenCalledWith('doichain');
		expect(addresses).toHaveBeenCalledWith('MyAddress');
	});
});
