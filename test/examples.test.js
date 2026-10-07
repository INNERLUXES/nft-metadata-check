import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RULES } from '../src/index.js';
import { BAD, EXPECTED, GOOD, GOOD_EXPECTED, UNWANTED, run } from '../tools/example.mjs';
import { hex } from './helpers.js';

const root = resolve(fileURLToPath(import.meta.url), '..', '..');
const saved = (name) => readFile(resolve(root, 'examples/output', name), 'utf8');
const filesOf = async (dir) => (await readdir(resolve(root, dir), { recursive: true, withFileTypes: true })).filter((e) => e.isFile()).map((e) => `${resolve(e.parentPath ?? e.path, e.name).slice(resolve(root).length + 1).split('\\').join('/')}`).sort();

test('examples: the bad collection fails with the report that is saved in examples/output', async () => {
  const r = await run(BAD);
  assert.equal(r.code, 1);
  assert.equal(r.err, '');
  assert.equal(r.out, await saved('bad.txt'));
  for (const e of EXPECTED) assert.ok(r.out.includes(e), e);
  for (const u of UNWANTED) assert.ok(!r.out.includes(u), u);
});

test('examples: the good collection passes at error, warning and info level with the report that is saved', async () => {
  const r = await run(GOOD);
  assert.equal(r.code, 0);
  assert.equal(r.out, await saved('good.txt'));
  for (const e of GOOD_EXPECTED) assert.ok(r.out.includes(e), e);
  assert.equal((await run([...GOOD, '--fail-on', 'warning'])).code, 0);
  assert.equal((await run([...GOOD, '--fail-on', 'info'])).code, 0);
  assert.doesNotMatch(r.out, /ERROR {4}|WARNING {2}/);
});

test('examples: every output saved in examples/output is the real output, in all four formats for both collections', async () => {
  const outputs = {
    'bad-explain.txt': [...BAD, '--explain'],
    'bad.md': [...BAD, '--format', 'markdown'],
    'bad-explain.md': [...BAD, '--format', 'markdown', '--explain'],
    'bad.json': [...BAD, '--json', '--explain'],
    'bad.sarif': [...BAD, '--format', 'sarif'],
    'good.md': [...GOOD, '--format', 'markdown'],
    'good.json': [...GOOD, '--json'],
    'good.sarif': [...GOOD, '--format', 'sarif'],
    'checks.txt': ['--list-checks'],
    'checks.json': ['--list-checks', '--format', 'json']
  };
  for (const [name, args] of Object.entries(outputs)) assert.equal((await run(args)).out, await saved(name), name);
});

test('examples: every check but three fires on the bad collection, each at the file and line built for it', async () => {
  const report = JSON.parse((await run([...BAD, '--json'])).out);
  const M = 'examples/bad/metadata';
  const C = 'examples/bad/collection.json';
  const lines = async (file) => (await readFile(resolve(root, file), 'utf8')).split('\n');
  const at = async (file, needle) => {
    const ls = await lines(file);
    const i = ls.findIndex((l) => l.includes(needle));
    if (i < 0) throw new Error(`${needle} in ${file}`);
    return `${file}:${i + 1}`;
  };
  const tok = (n) => `${M}/${hex(n)}.json`;
  const of = (id) => report.findings.filter((f) => f.id === id).map((f) => f.at).sort();
  const sorted = (...a) => a.sort();
  assert.deepEqual(of('file-unreadable'), [await at(tok(13), ',,')]);
  assert.deepEqual(of('field-unknown'), sorted(await at(C, '"mediaFolder"'), await at(tok(6), '"Image"')));
  assert.deepEqual(of('field-invalid'), [await at(C, '"media"')]);
  assert.deepEqual(of('secret-in-file'), [await at(tok(9), '"mnemonic"')]);
  assert.deepEqual(of('metadata-field-missing'), sorted(`${tok(4)}:1`, `${tok(6)}:1`));
  assert.deepEqual(of('description-missing'), [await at(tok(4), '"description"')]);
  assert.deepEqual(of('field-type'), sorted(await at(tok(5), '"name"'), await at(tok(5), '"decimals"'), await at(tok(9), '"properties"')));
  assert.deepEqual(of('id-hex-form'), sorted(`${M}/0x0C.json:1`, `${M}/11.json:1`));
  assert.deepEqual(of('uri-id-substitution'), sorted(await at(C, '"baseUri"'), await at(`${M}/11.json`, '"image"')));
  assert.deepEqual(of('attributes-invalid'), [await at(tok(7), '"attributes"')]);
  assert.deepEqual(of('file-name-unexpected'), [`${M}/token-sheet.json:1`]);
  assert.deepEqual(of('id-out-of-range'), [`${tok(15)}:1`]);
  assert.deepEqual(of('id-missing'), [await at(C, '"tokenIds"'), await at(C, '"tokenIds"')]);
  assert.deepEqual(of('id-duplicate'), [`${tok(1)}:1`]);
  assert.deepEqual(of('uri-mutable'), sorted(await at(C, '"baseUri"'), await at(tok(5), '"image"')));
  assert.deepEqual(of('uri-local-path'), [await at(tok(7), '"image"')]);
  assert.deepEqual(of('uri-scheme-unknown'), [await at(tok(9), '"image"')]);
  assert.deepEqual(of('media-missing'), [await at(tok(3), '"image"')]);
  assert.deepEqual(of('name-duplicate'), [await at(tok(8), '"name"')]);
  assert.deepEqual(of('attributes-duplicate'), [await at(tok(8), '"attributes"')]);
  assert.deepEqual(of('attribute-value-empty'), [await at(tok(4), '"value": ""')]);
  assert.deepEqual(of('trait-type-inconsistent'), sorted(await at(tok(5), '"value": "5"'), await at(tok(6), '"background"')));
  // The bad collection has a range of ids, so id-gap cannot fire next to id-missing; it is ERC-1155, so base-uri-no-slash
  // of ERC-721 cannot fire; and no file holds a data: URI of 65,536 characters. test/rules.test.js covers those.
  assert.deepEqual(report.rules.filter((r) => r.findings === 0).map((r) => r.id), ['id-gap', 'base-uri-no-slash', 'uri-data-large']);
  assert.equal(report.rules.length, RULES.length);
});

test('examples: the good collection holds no finding, and the table of traits is the one of its files', async () => {
  const report = JSON.parse((await run([...GOOD, '--json'])).out);
  assert.deepEqual(report.findings, []);
  assert.deepEqual(report.traits.map((r) => r.trait), ['Background', 'Glow', 'Mood', 'Shape']);
  assert.deepEqual(report.summary, { files: 6, tokens: 6, lowest: '1', highest: '6', range: { first: '1', last: '6' } });
  assert.deepEqual(report.standard, { name: 'ERC-721', from: 'config' });
  assert.deepEqual(report.inputs.media, { folder: 'examples/good/media', files: 6, same: false });
});

test('examples: the same files written with CRLF line ends and as UTF-16 give the same findings', async () => {
  const dir = await mkdtemp(resolve(tmpdir(), 'nft-metadata-check-crlf-'));
  try {
    await cp(resolve(root, 'examples'), resolve(dir, 'examples'), { recursive: true });
    for (const [args, files] of [[BAD, ['examples/bad/collection.json', `examples/bad/metadata/${hex(5)}.json`, `examples/bad/metadata/${hex(13)}.json`]], [GOOD, ['examples/good/collection.json', 'examples/good/metadata/3.json']]]) {
      const ids = async () => JSON.parse((await run([...args, '--json'], dir)).out).findings.map((f) => `${f.id}:${f.at}:${f.column}`);
      const base = await ids();
      for (const file of files) {
        const text = await readFile(resolve(root, file), 'utf8');
        await writeFile(resolve(dir, file), text.split('\n').join('\r\n'));
        assert.deepEqual(await ids(), base, `${file} with CRLF`);
        await writeFile(resolve(dir, file), Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, 'utf16le')]));
        assert.deepEqual(await ids(), base, `${file} as UTF-16`);
        await writeFile(resolve(dir, file), text);
      }
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('examples: the files are plain ASCII with LF line ends, made up, hold no real key, and the media are one line of placeholder text', async () => {
  const files = [...(await filesOf('examples/bad')), ...(await filesOf('examples/good'))];
  assert.ok(files.length > 20);
  for (const f of files) {
    const text = await readFile(resolve(root, f), 'utf8');
    assert.ok([...text].every((c) => c.charCodeAt(0) < 128), f);
    assert.ok(!text.includes('\r'), f);
    assert.doesNotMatch(text, /\b(?:19|20)\d{2}\b/, f);
    assert.match(text, /[Mm]ade-up .* for the examples of nft-metadata-check/, f);
    if (!f.endsWith('.json') && /\.\w+$/.test(f)) assert.equal(text, 'made-up placeholder for the examples of nft-metadata-check\n', f);
    for (const m of text.matchAll(/\b[a-z]+:\/\/[^\s"]+/g)) assert.match(m[0], /^(?:ipfs:\/\/bafyexample|https?:\/\/example\.com\/|ftp:\/\/example\.com\/)/, m[0]);
  }
  for (const o of ['bad.txt', 'bad.json', 'bad.md', 'bad.sarif', 'bad-explain.txt', 'bad-explain.md']) assert.ok(!(await saved(o)).includes('lantern'), `${o} does not show the seed`);
});

test('examples: the sample output of the bad collection is the one the README shows', async () => {
  const readme = (await readFile(resolve(root, 'README.md'), 'utf8')).split('\r\n').join('\n');
  const bad = (await saved('bad.txt')).split('\n');
  assert.ok(readme.includes(bad.slice(0, bad.findIndex((l) => l.startsWith('Findings ('))).join('\n')));
  assert.ok(readme.includes(bad.slice(-7).join('\n')));
});
