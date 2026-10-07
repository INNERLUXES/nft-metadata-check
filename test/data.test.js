import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BEST, NOT_A, NOTICE, POINTS, RULES, SCHEMA_SOURCE, SOURCES, flat, grouped, listText, plural, pointPage, safeText, source } from '../src/index.js';

const root = resolve(fileURLToPath(import.meta.url), '..', '..');
const read = (rel) => readFile(resolve(root, rel), 'utf8');
const norm = (t) => t.replace(/\s+/g, ' ');

const PLACES = /^https:\/\/(?:eips\.ethereum\.org\/EIPS\/eip-(?:721|1155)|developers\.metaplex\.com\/token-metadata\/token-standard)$/;

test('every source has an official address, and no number that reads like a year', () => {
  for (const s of SOURCES) {
    assert.match(s.url, PLACES, s.id);
    assert.doesNotMatch(s.url, /(?<!(?:EIP|ERC)[- ]?)\b(?:19|20)\d{2}\b/i, s.id);
    assert.ok(s.title.length > 5);
  }
  assert.equal(new Set(SOURCES.map((s) => s.id)).size, SOURCES.length);
  assert.deepEqual(SOURCES.map((s) => s.id), ['eip-721', 'eip-1155', 'metaplex-token-standard']);
  assert.deepEqual(Object.values(SCHEMA_SOURCE), SOURCES.map((s) => s.id));
  assert.equal(NOTICE, `This report is an input to a review before the collection is minted: ${NOT_A}.`);
  assert.match(NOT_A, /^not a marketplace review/);
});

test('every source has a text copy under research/sources that starts with its address, and research/sources.md lists it', async () => {
  const notes = await read('research/sources.md');
  for (const s of SOURCES) {
    const copy = await read(s.file);
    assert.ok(copy.startsWith(`Source: ${s.url}\n`), s.file);
    assert.ok(copy.length > 1500, `${s.file} holds the page`);
    assert.ok(notes.includes(s.url), `research/sources.md lists ${s.id}`);
    assert.ok(notes.includes(s.file), `research/sources.md names ${s.file}`);
  }
});

test('every point belongs to a listed source, is written in a sentence of its own and is not a long quotation of its page', async () => {
  for (const [id, p] of Object.entries(POINTS)) {
    const page = source(p.source);
    assert.ok(page, `${id}: the source ${p.source}`);
    assert.equal(pointPage(id), page);
    assert.ok(p.text.length > 40 && p.text.length < 400, id);
    assert.match(p.text, /\.$/, id);
    const copy = norm(await read(page.file));
    // No run of 12 words of the point appears word for word in its page.
    const words = norm(p.text).split(' ');
    for (let i = 0; i + 12 <= words.length; i += 1) assert.ok(!copy.includes(words.slice(i, i + 12).join(' ')), `${id} quotes its page`);
  }
});

test('every point is used by a rule, and every basis of a rule is a point', () => {
  const used = new Set(RULES.flatMap((r) => r.basis));
  for (const id of Object.keys(POINTS)) assert.ok(used.has(id), `${id} is not used by a rule`);
  for (const id of used) assert.ok(Object.hasOwn(POINTS, id), `${id} is not a point`);
});

test('docs/rules-and-sources.md lists every page with its copy and every check with its level, kind and points', async () => {
  const doc = await read('docs/rules-and-sources.md');
  for (const s of SOURCES) assert.ok(doc.includes(s.url) && doc.includes(s.file), s.id);
  for (const r of RULES) {
    const section = doc.split(/^## /m).find((p) => p.startsWith(`${r.id}\n`));
    assert.ok(section, r.id);
    assert.ok(section.includes(`- Level: ${r.severity}`), r.id);
    assert.ok(section.includes('- Cannot see: '), r.id);
    for (const b of r.basis) assert.ok(section.includes(POINTS[b].text), `${r.id}: ${b}`);
    if (r.kind === 'best practice') assert.ok(norm(section).includes(BEST), r.id);
    if (r.own) assert.ok(section.includes(r.own), `${r.id}: its own choice`);
  }
});

test('the documented checks name a page, the best practice checks say what is their own choice, and the input checks rest on no page', () => {
  for (const r of RULES.filter((x) => x.kind === 'documented')) {
    assert.ok(r.basis.length > 0, r.id);
    assert.equal(r.own, undefined, r.id);
  }
  for (const r of RULES.filter((x) => x.kind === 'best practice')) assert.ok(r.own && r.own.includes(BEST), `${r.id} says what is its own choice`);
  for (const r of RULES.filter((x) => x.kind === 'input')) assert.deepEqual(r.basis, [], r.id);
});

test('the pages say what the documented checks rest on', async () => {
  const erc721 = norm(await read('research/sources/eip-721-non-fungible-token.txt'));
  for (const s of [
    'This is the "ERC721 Metadata JSON Schema" referenced above.',
    '"title": "Asset Metadata"',
    '"description": "Identifies the asset to which this NFT represents"',
    '"description": "Describes the asset to which this NFT represents"',
    'A URI pointing to a resource with mime type image/* representing the asset to which this NFT represents.',
    'callers SHALL NOT assume that ID numbers have any specific pattern to them, and MUST treat the ID as a "black box"',
    'Every NFT is identified by a unique `uint256` ID inside the ERC-721 smart contract.'
  ]) assert.ok(erc721.includes(s), s);
  assert.ok(erc721.includes('status: Final'), 'ERC-721 is final');
  const erc1155 = norm(await read('research/sources/eip-1155-multi-token.txt'));
  for (const s of [
    'If the string `{id}` exists in any URI, clients MUST replace this with the actual token ID in hexadecimal form.',
    'The string format of the substituted hexadecimal ID MUST be lowercase alphanumeric: `[0-9a-f]` with no 0x prefix.',
    'The string format of the substituted hexadecimal ID MUST be leading zero padded to 64 hex characters length if necessary.',
    'If the string `{id}` exists in any JSON value, it MUST be replaced with the actual token ID, by all client software that follows this standard.',
    '"title": "Token Metadata"',
    '"decimals": { "type": "integer",',
    '"properties": { "type": "object", "description": "Arbitrary properties. Values may be strings, numbers, object or arrays." }'
  ]) assert.ok(erc1155.includes(s), s);
  assert.ok(erc1155.includes('status: Final'), 'ERC-1155 is final');
  const metaplex = norm(await read('research/sources/metaplex-token-standard.txt'));
  for (const s of [
    '## The Non-Fungible Standard',
    'name | string | Name of the asset. |',
    'description | string | Description of the asset. |',
    "image | string | URI pointing to the asset's logo. |",
    "animation_url | string | URI pointing to the asset's animation. |",
    'attributes | array | Array of attributes defining the characteristics of the asset. - trait_type (string): The type of attribute. - value (string): The value for that attribute.',
    'properties | object | Additional properties that define the asset. - files (array): Additional files to include with the asset. - uri (string): The file\'s URI. - type (string): The file\'s type.',
    'symbol | string | Symbol of the asset. |'
  ]) assert.ok(metaplex.includes(s), s);
});

test('the copies leave out the authors, the day a page was created and every line with a year, and stay plain ASCII', async () => {
  for (const s of SOURCES) {
    const copy = await read(s.file);
    assert.doesNotMatch(copy, /^(?:author|created):/m, s.file);
    assert.doesNotMatch(copy, /(?<!(?:EIP|ERC)[- ]?)\b(?:19|20)\d{2}\b/i, s.file);
    assert.doesNotMatch(copy, /[A-Za-z0-9._-]+@[A-Za-z0-9-]+\.[a-z]{2,}/, `${s.file} holds no email address`);
    assert.ok([...copy].every((c) => c.charCodeAt(0) < 128), s.file);
  }
  for (const file of ['research/sources/eip-721-non-fungible-token.txt', 'research/sources/eip-1155-multi-token.txt']) assert.match(await read(file), /^status: Final$/m, file);
});

test('size helpers: grouped numbers, lists for a sentence and plurals', () => {
  assert.equal(grouped(12345), '12,345');
  assert.equal(grouped(10n ** 12n), '1,000,000,000,000');
  assert.equal(listText(['a']), 'a');
  assert.equal(listText(['a', 'b']), 'a and b');
  assert.equal(listText(['a', 'b', 'c']), 'a, b and c');
  assert.equal(listText(['a', 'b', 'c', 'd', 'e'], 3), 'a, b, c and 2 more');
  assert.equal(plural(1, 'file'), '1 file');
  assert.equal(plural(2, 'token'), '2 tokens');
});

test('text helpers: safeText replaces control, direction and separator characters and caps the length; flat folds white space', () => {
  const bad = ['a', String.fromCharCode(0x1b), '[31m', String.fromCharCode(0x202e), 'b', String.fromCharCode(0x2028), 'c', String.fromCharCode(7), 'd', String.fromCharCode(0x85), 'e'].join('');
  const out = safeText(bad);
  assert.ok(![...out].some((c) => c.charCodeAt(0) < 32 || [0x202e, 0x2028, 0x85].includes(c.charCodeAt(0))));
  assert.equal(safeText('x'.repeat(50), 10), 'xxxxxxx...');
  assert.equal(safeText('short', 10), 'short');
  assert.equal(flat('  a \n  b\t c '), 'a b c');
});
