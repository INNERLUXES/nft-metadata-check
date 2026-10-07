import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG_KEYS, RANGE_KEYS, UINT256_MAX, parseConfig, readConfig, readJson } from '../src/index.js';
import { CONFIG, check, lineOf, ofCheck, text, tokens } from './helpers.js';

const read = (obj) => readConfig(readJson(text(obj)), 'collection.json');

test('readConfig: the standard, the range of ids, the base URI and the media folder, every field optional', () => {
  const r = read(CONFIG);
  assert.deepEqual(r.findings, []);
  assert.equal(r.config.standard, 'ERC-721');
  assert.deepEqual(r.config.range, { first: 1n, last: 3n });
  assert.equal(r.config.baseUri, 'ipfs://bafyexamplecollection/');
  assert.equal(r.config.media, 'media');
  const empty = read({});
  assert.deepEqual(empty.findings, []);
  assert.deepEqual([empty.config.standard, empty.config.range, empty.config.baseUri, empty.config.media], [null, null, null, null]);
  assert.deepEqual(CONFIG_KEYS, ['standard', 'tokenIds', 'baseUri', 'media', 'notes']);
  assert.deepEqual(RANGE_KEYS, ['first', 'last']);
});

test('readConfig: ids written as text, up to the largest uint256, and a range of one id', () => {
  assert.deepEqual(read({ tokenIds: { first: '0', last: UINT256_MAX.toString() } }).config.range, { first: 0n, last: UINT256_MAX });
  assert.deepEqual(read({ tokenIds: { first: 5, last: 5 } }).config.range, { first: 5n, last: 5n });
});

test('field-invalid: an unknown standard, ids that are not whole numbers, a range turned round, and fields of the wrong type', () => {
  const cases = [
    [{ standard: 'ERC-20' }, /The standard of the collection config is "ERC-20", which is not a standard the tool reads; it must be one of ERC-721, ERC-1155, Metaplex\./],
    [{ standard: 721 }, /The standard of the collection config is the number 721; it must be text/],
    [{ standard: ' ' }, /The standard of the collection config is empty/],
    [{ tokenIds: [1, 10] }, /The tokenIds of the collection config are a list; they must be an object with the first and the last id/],
    [{ tokenIds: { first: 1.5, last: 10 } }, /The first of the tokenIds is the number 1\.5; it must be a whole number from 0 to the largest uint256/],
    [{ tokenIds: { first: -1, last: 10 } }, /The first of the tokenIds is the number -1/],
    [{ tokenIds: { first: '01', last: 10 } }, /The first of the tokenIds is "01"/],
    [{ tokenIds: { first: 1, last: (UINT256_MAX + 1n).toString() } }, /The last of the tokenIds is "1157/],
    [{ tokenIds: { first: 10, last: 1 } }, /The tokenIds of the collection config run from 10 to 1; the first id must not be above the last\./],
    [{ tokenIds: { first: 1 } }, /The tokenIds of the collection config have no last id/],
    [{ tokenIds: {} }, /have no first and no last id/],
    [{ baseUri: ['ipfs://x/'] }, /The baseUri of the collection config is a list; it must be text/],
    [{ media: 'https://example.com/media' }, /The media of the collection config is an address; it must be the path of a local folder/],
    [{ media: true }, /The media of the collection config is true; it must be text/]
  ];
  for (const [cfg, pattern] of cases) {
    const r = read(cfg);
    assert.equal(r.findings.length, 1, JSON.stringify(cfg));
    assert.equal(r.findings[0].id, 'field-invalid', JSON.stringify(cfg));
    assert.match(r.findings[0].message, pattern);
  }
  assert.equal(read({ tokenIds: { first: 10, last: 1 } }).config.range, null, 'a range that was not read is not used');
});

test('field-unknown: a misspelt key of the config and of the tokenIds, with the key it is probably meant to be', () => {
  const cfg = { standard: 'ERC-721', baseURI: 'ipfs://x/', tokenIds: { first: 1, Last: 3 }, royalties: 5 };
  const f = read(cfg).findings;
  assert.deepEqual(f.map((x) => x.id), ['field-unknown', 'field-unknown', 'field-unknown', 'field-invalid']);
  assert.match(f[0].message, /The key "baseURI" of the collection config is not one the tool reads, so its value was left out of every check\. Did you mean "baseUri"\?/);
  assert.match(f[1].message, /^The key "royalties" of the collection config is not one the tool reads/);
  assert.doesNotMatch(f[1].message, /Did you mean/);
  assert.match(f[2].message, /The key "Last" of the tokenIds .* Did you mean "last"\?/);
  assert.match(f[3].message, /have no last id/);
  assert.equal(f[0].line, lineOf(text(cfg), '"baseURI"'));
});

test('file-unreadable: a config that is not JSON, or not an object, is a finding with its line, and the metadata is still checked', () => {
  const broken = check({ config: '{\n  "standard": "ERC-721",\n}\n' });
  assert.deepEqual(broken.findings.map((f) => [f.id, f.file, f.line]), [['file-unreadable', 'collection.json', 3]]);
  assert.match(broken.findings[0].message, /^The collection config is not JSON the reader can follow: expected a key in double quotes and found "\}" at line 3, column 1\. Nothing in the file was checked\.$/);
  assert.ok(broken.notes.some((n) => /the collection config was not checked/.test(n)));
  const list = parseConfig('[1, 2]', 'c.json');
  assert.deepEqual(list.findings.map((f) => f.id), ['file-unreadable']);
  assert.match(list.findings[0].message, /The top level of the collection config is a list/);
  assert.equal(list.config, null);
});

test('the standard: the config, then --standard in its place with a note, and ERC-721 with a note when neither gives one', () => {
  assert.deepEqual(check({ config: { standard: 'Metaplex' } }).standard, { name: 'Metaplex', from: 'config' });
  const both = check({ config: { standard: 'Metaplex' }, standard: 'ERC-721' });
  assert.deepEqual(both.standard, { name: 'ERC-721', from: 'option' });
  assert.ok(both.notes.includes('the collection was read as ERC-721, the standard of --standard, and not as Metaplex, the standard of the config'));
  const none = check({});
  assert.deepEqual(none.standard, { name: 'ERC-721', from: 'default' });
  assert.ok(none.notes.some((n) => /no standard was given/.test(n)));
  assert.ok(!check({ config: { standard: 'ERC-721' }, standard: 'ERC-721' }).notes.some((n) => /read as/.test(n)));
});

test('a config whose range covers the files gives no finding, and its keys are read only once', () => {
  assert.deepEqual(check({ config: CONFIG, files: tokens(1, 3) }).findings, []);
  assert.deepEqual(ofCheck({ config: { ...CONFIG, notes: { any: 'thing' } } }, 'field-unknown'), []);
});
