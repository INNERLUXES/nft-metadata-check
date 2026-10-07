import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONTENT_SCHEMES, ID_LIMITS, STANDARDS, UINT256_MAX, URI_LIMITS, WEB_SCHEMES, compareIds, decodedPath, hex64, idOfName, isMetadataName, mediaPath, missingRuns, nameParts, placeholders, plainName, standardOf, uriKind } from '../src/index.js';
import { hex } from './helpers.js';

test('standardOf: the names of the three standards in any case and with any separator, and near misses', () => {
  for (const [name, std] of [['ERC-721', 'ERC-721'], ['erc721', 'ERC-721'], ['EIP 721', 'ERC-721'], ['erc_1155', 'ERC-1155'], ['ERC-1155', 'ERC-1155'], ['Metaplex', 'Metaplex'], ['metaplex-token-metadata', 'Metaplex'], ['Token Metadata', 'Metaplex']]) assert.equal(standardOf(name), std, name);
  for (const name of ['ERC-20', 'erc-1150', 'solana', '', 'toString', '__proto__']) assert.equal(standardOf(name), null, name);
  assert.deepEqual(STANDARDS, ['ERC-721', 'ERC-1155', 'Metaplex']);
});

test('nameParts and isMetadataName: .json in any case or no extension is metadata; media, hidden files and other names are not', () => {
  assert.deepEqual(nameParts('1.json'), { stem: '1', ext: '.json' });
  assert.deepEqual(nameParts('1.JSON'), { stem: '1', ext: '.JSON' });
  assert.deepEqual(nameParts('1'), { stem: '1', ext: '' });
  assert.deepEqual(nameParts('.json'), { stem: '.json', ext: '' });
  for (const n of ['1.json', '1', hex(1), 'collection.json', 'token-1.json', 'A.Json']) assert.ok(isMetadataName(n), n);
  for (const n of ['1.png', '1.json.bak', '.DS_Store', '.json', 'notes.md', 'image.svg']) assert.ok(!isMetadataName(n), n);
});

test('idOfName: ERC-721 and Metaplex read a plain decimal id, and say how another name is written', () => {
  assert.deepEqual(idOfName('7.json', 'ERC-721'), { id: 7n, form: 'ok', why: null, collection: false });
  assert.deepEqual(idOfName('0', 'Metaplex'), { id: 0n, form: 'ok', why: null, collection: false });
  assert.deepEqual(idOfName('007.json', 'ERC-721'), { id: 7n, form: 'unexpected', why: 'has zeros in front of the id', collection: false });
  assert.equal(idOfName(`${hex(10)}.json`, 'ERC-721').id, 10n);
  assert.match(idOfName(`${hex(10)}.json`, 'ERC-721').why, /the form of ERC-1155/);
  assert.deepEqual(idOfName('7.JSON', 'ERC-721'), { id: 7n, form: 'unexpected', why: 'ends in .JSON, in capitals', collection: false });
  assert.deepEqual(idOfName('token-7.json', 'ERC-721'), { id: null, form: 'unexpected', why: 'is not an id', collection: false });
  assert.deepEqual(idOfName('collection.json', 'Metaplex'), { id: null, form: 'ok', why: null, collection: true });
  assert.equal(idOfName('collection.json', 'ERC-721').form, 'unexpected', 'only Metaplex keeps a collection.json');
  assert.equal(idOfName('0x1f.json', 'ERC-721').id, null, 'a hex id with 0x is no id of ERC-721');
});

test('idOfName: ERC-1155 reads 64 small hex digits, and reads a decimal or another hex form as an id with the way it is written', () => {
  assert.deepEqual(idOfName(`${hex(255)}.json`, 'ERC-1155'), { id: 255n, form: 'ok', why: null, collection: false });
  assert.deepEqual(idOfName(hex(255), 'ERC-1155'), { id: 255n, form: 'ok', why: null, collection: false });
  assert.deepEqual(idOfName('255.json', 'ERC-1155'), { id: 255n, form: 'hex-form', why: 'is written in decimal, and was read as the decimal id', collection: false });
  assert.deepEqual(idOfName('0xFF.json', 'ERC-1155'), { id: 255n, form: 'hex-form', why: 'starts with 0x and has hex digits in capitals and has 2 hex digits, not 64', collection: false });
  assert.deepEqual(idOfName(`${hex(255).toUpperCase()}.json`, 'ERC-1155'), { id: 255n, form: 'hex-form', why: 'has hex digits in capitals', collection: false });
  assert.deepEqual(idOfName('ff.json', 'ERC-1155'), { id: 255n, form: 'hex-form', why: 'has 2 hex digits, not 64', collection: false });
  assert.equal(idOfName(`${hex(255)}.JSON`, 'ERC-1155').form, 'unexpected');
  assert.deepEqual(idOfName('sword.json', 'ERC-1155'), { id: null, form: 'unexpected', why: 'is not an id', collection: false });
  assert.equal(idOfName(`${'1'.repeat(ID_LIMITS.maxDigits + 3)}.json`, 'ERC-721').id, null, 'a name past the limit is not read as a number');
});

test('hex64, plainName and compareIds', () => {
  assert.equal(hex64(314592n), '000000000000000000000000000000000000000000000000000000000004cce0');
  assert.equal(hex64(UINT256_MAX), 'f'.repeat(64));
  assert.equal(plainName(12n, 'ERC-721'), '12.json');
  assert.equal(plainName(12n, 'ERC-1155'), `${hex(12)}.json`);
  assert.deepEqual([3n, 1n, 2n].sort(compareIds), [1n, 2n, 3n]);
});

test('missingRuns: the runs of a range with no id, never walking the range, and the limit of runs', () => {
  assert.deepEqual(missingRuns([1n, 2n, 3n], 1n, 3n, 10), { runs: [], more: false });
  assert.deepEqual(missingRuns([2n, 3n, 7n], 1n, 9n, 10), { runs: [[1n, 1n], [4n, 6n], [8n, 9n]], more: false });
  assert.deepEqual(missingRuns([], 0n, UINT256_MAX, 10), { runs: [[0n, UINT256_MAX]], more: false });
  assert.deepEqual(missingRuns([0n, 5n], 1n, 4n, 10), { runs: [[1n, 4n]], more: false });
  assert.deepEqual(missingRuns([2n, 4n, 6n], 1n, 7n, 2), { runs: [[1n, 1n], [3n, 3n]], more: true });
  assert.deepEqual(missingRuns([2n, 4n], 1n, 5n, 2), { runs: [[1n, 1n], [3n, 3n]], more: true });
});

test('uriKind: content and web addresses, data, local paths, relative paths and unknown schemes', () => {
  const kind = (t) => uriKind(t).kind;
  assert.equal(kind('ipfs://bafyexample/1.png'), 'content');
  assert.equal(kind('ar://example/1.png'), 'content');
  assert.equal(kind('IPFS://bafyexample/1.png'), 'content');
  assert.equal(kind('https://example.com/1.png'), 'web');
  assert.equal(uriKind('http://example.com/1.png').scheme, 'http');
  assert.equal(kind('data:image/svg+xml;base64,AAAA'), 'data');
  for (const [t, why] of [['file:///home/user/1.png', 'is a file: URI'], ['/home/user/1.png', 'is an absolute path'], ['C:\\art\\1.png', 'starts with a drive letter'], ['c:/art/1.png', 'starts with a drive letter'], ['art\\1.png', 'holds a backslash, the separator of a Windows path'], ['~/art/1.png', 'starts with ~, the home folder of a user'], ['../art/1.png', 'holds .., which leaves the media folder']]) assert.deepEqual([kind(t), uriKind(t).why], ['local', why], t);
  assert.equal(kind('1.png'), 'relative');
  assert.equal(kind('images/1.png'), 'relative');
  assert.equal(kind('ftp://example.com/1.png'), 'unknown');
  assert.equal(kind('javascript:void(0)'), 'unknown');
  assert.equal(kind('  '), 'empty');
  assert.deepEqual(CONTENT_SCHEMES, ['ipfs', 'ar']);
  assert.deepEqual(WEB_SCHEMES, ['https', 'http']);
  assert.equal(URI_LIMITS.maxDataLength, 65536);
});

test('placeholders, mediaPath and decodedPath', () => {
  assert.deepEqual(placeholders('https://x.example/{id}/{ID}.json'), ['{id}', '{ID}']);
  assert.deepEqual(placeholders('no braces'), []);
  assert.deepEqual(placeholders(`{${'a'.repeat(41)}}`), [], 'a long run in braces is not a placeholder');
  assert.equal(mediaPath('./././1.png'), '1.png');
  assert.equal(mediaPath('art/1.png?v=2#x'), 'art/1.png');
  assert.equal(decodedPath('my%20art.png'), 'my art.png');
  assert.equal(decodedPath('plain.png'), null);
  assert.equal(decodedPath('bad%zz.png'), null);
});
