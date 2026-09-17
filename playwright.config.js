/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
	webServer: {
		// A port of its own, and never an already running server: a preview of
		// another project or branch on the default port must not answer these tests.
		command: 'npm run build && npx vite preview --port 4180 --strictPort',
		port: 4180,
		reuseExistingServer: false
	},
	use: {
		baseURL: 'http://localhost:4180',
		// a Chromium of your own, if Playwright's download is not installed
		launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
	},
	testDir: 'tests',
	testMatch: /(.+\.)?(test|spec)\.[jt]s/
};

export default config;
