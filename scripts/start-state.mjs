#!/usr/bin/env node
/**
 * Turns a finished lesson app into its start state.
 *
 * A lesson marks the code it teaches with a pair of comments:
 *
 *     export function feeFor(vsize, rate) {
 *         // --8<-- fee · work out what this transaction costs at this rate
 *         return Math.ceil(vsize * rate);
 *         // -->8--
 *     }
 *
 * `pnpm start-state lesson03` replaces every marked region with a TODO and a
 * throw, so the app still builds and type-checks but stops exactly where the
 * exercise begins. The finished code is never duplicated — it stays in git:
 *
 *     git checkout apps/lesson03      # the solution is back
 *
 * With --check it changes nothing and only reports whether the markers are
 * sound; CI runs it that way.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OPEN = /^(\s*)(?:\/\/|<!--)\s*--8<--\s*([\w-]+)\s*·\s*(.+?)\s*(?:-->)?$/;
const CLOSE = /^\s*(?:\/\/|<!--)\s*-->8--\s*(?:-->)?$/;

function walk(dir, out = []) {
	for (const entry of readdirSync(dir)) {
		if (entry === 'node_modules' || entry === '.svelte-kit' || entry === 'public') continue;
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) walk(full, out);
		else if (/\.(js|svelte)$/.test(full)) out.push(full);
	}
	return out;
}

function lessons() {
	return readdirSync(join(ROOT, 'apps'))
		.filter((name) => /^lesson\d\d$/.test(name))
		.sort();
}

/** @returns {{file: string, regions: {id: string, hint: string, from: number, to: number, indent: string}[]}[]} */
function scan(lesson) {
	const found = [];
	for (const file of walk(join(ROOT, 'apps', lesson, 'src'))) {
		const lines = readFileSync(file, 'utf8').split('\n');
		const regions = [];
		let open = null;
		lines.forEach((line, i) => {
			const m = OPEN.exec(line);
			if (m) {
				if (open) throw new Error(`${relative(ROOT, file)}:${i + 1}: region "${m[2]}" starts inside "${open.id}"`);
				open = { indent: m[1], id: m[2], hint: m[3], from: i };
				return;
			}
			if (CLOSE.test(line)) {
				if (!open) throw new Error(`${relative(ROOT, file)}:${i + 1}: a region ends that never started`);
				regions.push({ ...open, to: i });
				open = null;
			}
		});
		if (open) throw new Error(`${relative(ROOT, file)}: region "${open.id}" is never closed`);
		if (regions.length) found.push({ file, regions });
	}
	return found;
}

function blank(lesson) {
	let files = 0;
	let regions = 0;
	for (const { file, regions: rs } of scan(lesson)) {
		const lines = readFileSync(file, 'utf8').split('\n');
		// back to front, so earlier line numbers stay valid
		for (const r of [...rs].reverse()) {
			const where = relative(ROOT, file);
			lines.splice(
				r.from,
				r.to - r.from + 1,
				`${r.indent}// TODO ${lesson} · ${r.hint}`,
				`${r.indent}throw new Error('TODO ${lesson}: ${r.hint}');`
			);
			regions++;
			console.log(`  ${where}: ${r.id}`);
		}
		writeFileSync(file, lines.join('\n'));
		files++;
	}
	return { files, regions };
}

const args = process.argv.slice(2);

if (args.includes('--check')) {
	let total = 0;
	const empty = [];
	for (const lesson of lessons()) {
		const found = scan(lesson);
		const n = found.reduce((sum, f) => sum + f.regions.length, 0);
		total += n;
		if (n === 0) empty.push(lesson);
		console.log(`${lesson}: ${n} region${n === 1 ? '' : 's'} in ${found.length} file${found.length === 1 ? '' : 's'}`);
		for (const { file, regions } of found)
			for (const r of regions) console.log(`    ${relative(ROOT, file)}  ${r.id} — ${r.hint}`);
	}
	if (empty.length) {
		console.error(`\nNo start state for: ${empty.join(', ')}`);
		console.error('Every lesson marks the code it teaches, see docs/maintainers.md.');
		process.exit(1);
	}
	console.log(`\n${total} regions, all closed.`);
	process.exit(0);
}

const wanted = args.filter((a) => !a.startsWith('--'));
const targets = args.includes('--all') ? lessons() : wanted;

if (!targets.length) {
	console.error('Usage: node scripts/start-state.mjs <lesson03 …|--all|--check>');
	process.exit(2);
}

for (const lesson of targets) {
	if (!lessons().includes(lesson)) {
		console.error(`No such lesson: ${lesson}`);
		process.exit(2);
	}
	console.log(`${lesson}:`);
	const { files, regions } = blank(lesson);
	console.log(`  ${regions} region${regions === 1 ? '' : 's'} in ${files} file${files === 1 ? '' : 's'} are yours to write now.`);
}
console.log(`\nThe solution is one command away:  git checkout ${targets.map((l) => `apps/${l}`).join(' ')}`);
