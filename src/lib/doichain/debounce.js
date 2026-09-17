/**
 * Returns a function that waits until calls have paused for `wait` milliseconds
 * and then runs `fn` once, with the arguments of the last call.
 *
 * The name check uses it so that typing "doichain" asks the server once, not
 * eight times.
 *
 * @param {(...args: any[]) => void} fn
 * @param {number} wait
 * @returns {(...args: any[]) => void}
 */
export function debounce(fn, wait) {
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let timer;
	return (...args) => {
		clearTimeout(timer);
		timer = setTimeout(() => fn(...args), wait);
	};
}
