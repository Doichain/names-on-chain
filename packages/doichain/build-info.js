/**
 * What is actually deployed, for the footer.
 *
 * The commit, not the clock: a build of the same commit must produce the same
 * bytes, or every rebuild would publish a new IPFS CID for an unchanged site.
 * So the date here is the commit date, and rebuilding an old commit says what
 * that commit said.
 *
 * Runs at build time, in the vite config — never in the browser.
 */
import { execSync } from 'node:child_process';

/** @returns {{commit: string, date: string}} short sha and the commit's ISO date, or 'dev' */
export function buildInfo() {
	const git = (args) =>
		execSync(`git ${args}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
	try {
		return { commit: git('log -1 --format=%h'), date: git('log -1 --format=%cI') };
	} catch {
		// a tarball, or a checkout without git: say so instead of inventing a date
		return { commit: 'dev', date: '' };
	}
}
