/** @type {import('tailwindcss').Config} */
module.exports = {
	// Tailwind only keeps the classes it can see. The shared components live in
	// packages/doichain, and a later lesson uses components of an earlier one, so
	// those paths belong here too — otherwise their classes are silently dropped.
	content: [
		'./src/**/*.{html,js,svelte,ts}',
		'../../packages/doichain/src/**/*.{html,js,svelte,ts}'
	],
	theme: {
		screens: {
			sm: '480px',
			md: '768px',
			lg: '976px',
			xl: '1440px'
		},
		// colors: {
		//   'blue': '#1fb6ff',
		//   'purple': '#7e5bef',
		//   'pink': '#ff49db',
		//   'orange': '#fb923c',
		//   'green': '#13ce66',
		//   'yellow': '#ffc82c',
		//   'gray-dark': '#273444',
		//   'gray': '#8492a6',
		//   'gray-light': '#d3dce6',
		// },
		// fontFamily: {
		//   sans: ['Graphik', 'sans-serif'],
		//   serif: ['Merriweather', 'serif'],
		// },
		extend: {
			// spacing: {
			//   '128': '32rem',
			//   '144': '36rem',
			// },
			// borderRadius: {
			//   '4xl': '2rem',
			// }
		}
	}
};
