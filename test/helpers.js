// Shared test helpers: metadata files and configs built inline, checked in memory or written into a temporary folder that
// is removed after the test. Paths are built with resolve() from forward-slash names, so the same test runs on Linux,
// macOS and Windows. The line a test expects is found with lineOf(), which counts lines the way the reader does, so a
// test never holds a line number worked out by hand for one system only. No test reads the clock, the time zone or the
// locale. Every name is made up, and every URI points at a made-up address.

import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { checkTexts, main } from '../src/index.js';

export async function withFiles(files, fn) {
  const dir = await mkdtemp(resolve(tmpdir(), 'nft-metadata-check-'));
  try {
    for (const [rel, content] of Object.entries(files)) {
      await mkdir(dirname(resolve(dir, rel)), { recursive: true });
      await writeFile(resolve(dir, rel), content);
    }
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// The line (from 1) of the n-th place where needle starts in text.
export function lineOf(text, needle, n = 1) {
  let at = -1;
  for (let i = 0; i < n; i += 1) {
    at = text.indexOf(needle, at + 1);
    if (at < 0) throw new Error(`${needle} is not in the text ${n} times`);
  }
  return text.slice(0, at).split('\n').length;
}

export const text = (obj) => `${JSON.stringify(obj, null, 2)}\n`;

const drop = (out) => {
  for (const [k, v] of Object.entries(out)) if (v === undefined) delete out[k];
  return out;
};

// The id of an ERC-1155 token as a file name stem.
export const hex = (n) => BigInt(n).toString(16).padStart(64, '0');

// The metadata of token n that passes every check: a name and a set of attributes of its own, an image on a content
// address. over replaces fields, and a field set to undefined is left out.
export const meta = (n = 1, over = {}) => drop({ name: `Example Lantern ${n}`, description: 'A made-up lantern for the tests.', image: `ipfs://bafyexamplelanterns/${n}.png`, attributes: [{ trait_type: 'Background', value: 'Blue' }, { trait_type: 'Glow', value: Number(n) }], ...over });

// A metadata file in memory: { name, path, text }, under the folder m.
export const file = (name, obj) => ({ name, path: `m/${name}`, text: typeof obj === 'string' ? obj : text(obj) });

// The files of tokens first to last, each passing every check, named for the standard.
export function tokens(first = 1, last = 3, standard = 'ERC-721', over = () => ({})) {
  const out = [];
  for (let n = first; n <= last; n += 1) out.push(file(standard === 'ERC-1155' ? `${hex(n)}.json` : `${n}.json`, meta(n, over(n))));
  return out;
}

// A run in memory. config is an object (written as JSON) or a text, or null; media is a list of paths of the media
// folder.
export function check({ files = tokens(), config = null, standard = null, media = [] } = {}) {
  const cfg = config === null ? null : { path: 'collection.json', text: typeof config === 'string' ? config : text(config) };
  return checkTexts({ files, config: cfg, standard, media: { shown: 'media', files: media } });
}

export const findingsOf = (parts = {}) => check(parts).findings;
export const idsOf = (parts = {}) => findingsOf(parts).map((f) => f.id);
export const ofCheck = (parts, id) => findingsOf(parts).filter((f) => f.id === id);

// Runs the command line with exactly these arguments, in a folder.
export async function cli(argv, base) {
  let out = '';
  let err = '';
  const code = await main(argv, { out: (t) => { out += t; }, err: (t) => { err += t; } }, undefined, base);
  return { code, out, err };
}

// Writes the files and runs the command line in the folder.
export async function run(files, args) {
  return withFiles(files, (dir) => cli(args, dir));
}

// A clean collection of three tokens with its config and its media folder, and one whose second token has no image, for
// the command line tests.
export const CONFIG = { standard: 'ERC-721', tokenIds: { first: 1, last: 3 }, baseUri: 'ipfs://bafyexamplecollection/', media: 'media' };
export const GOOD = {
  'collection.json': text(CONFIG),
  'metadata/1.json': text(meta(1, { image: '1.png' })),
  'metadata/2.json': text(meta(2)),
  'metadata/3.json': text(meta(3)),
  'media/1.png': 'placeholder\n'
};
export const BAD = { ...GOOD, 'metadata/2.json': text(meta(2, { image: undefined })) };
export const ARGS = ['metadata', '--config', 'collection.json'];

// The time a hostile test may take: four times as long when the runner collects coverage, which sets NODE_V8_COVERAGE.
export const allowed = (ms) => (process.env.NODE_V8_COVERAGE ? ms * 4 : ms);
