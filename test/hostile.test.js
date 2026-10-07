import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { FILE_LIMITS, JSON_LIMITS, METADATA_LIMITS, UINT256_MAX, checkTexts } from '../src/index.js';
import { ARGS, GOOD, allowed, check, cli, file, meta, run, text, withFiles } from './helpers.js';

// Each test builds input meant to make the tool slow or to exhaust the stack or the memory, and checks that it ends with
// an answer in good time. The time allowed is four times as long under coverage (NODE_V8_COVERAGE is set only when
// coverage is on).

function timed(fn) {
  const start = process.hrtime.bigint();
  const value = fn();
  return { value, ms: Number(process.hrtime.bigint() - start) / 1e6 };
}

test('the most metadata files a folder may hold, each with attributes, checked for names, sets, traits and media in good time', () => {
  const n = FILE_LIMITS.maxFiles;
  const files = Array.from({ length: n }, (_, i) => file(`${i + 1}.json`, text(meta(i + 1, { image: `${i + 1}.png`, attributes: [{ trait_type: 'Background', value: `B${i % 50}` }, { trait_type: 'Glow', value: i }, { trait_type: 'Mood', value: i % 7 }] }))));
  const media = Array.from({ length: n }, (_, i) => `${i + 1}.png`);
  const { value, ms } = timed(() => checkTexts({ files, config: { path: 'c.json', text: text({ standard: 'ERC-721', tokenIds: { first: 1, last: n + 10 } }) }, media: { shown: 'media', files: media } }));
  assert.equal(value.analysis.summary.tokens, n);
  assert.deepEqual(value.findings.map((f) => f.id), ['id-missing']);
  assert.deepEqual(value.analysis.traits.map((t) => [t.trait, t.values]), [['Background', 50], ['Glow', n], ['Mood', 7]]);
  assert.ok(ms < allowed(30000), `took ${ms} ms`);
});

test('a range of every uint256 with a few files, and ids of thousands of digits, end at once', () => {
  const { value, ms } = timed(() => check({ files: [file('1.json', meta(1)), file(`${UINT256_MAX}.json`, meta(2)), file(`${'9'.repeat(5000)}.json`, meta(3))], config: { tokenIds: { first: '0', last: UINT256_MAX.toString() } } }));
  assert.deepEqual(value.findings.map((f) => f.id).sort(), ['file-name-unexpected', 'id-missing', 'id-missing']);
  assert.ok(value.findings.every((f) => f.message.length < 700));
  assert.ok(ms < allowed(3000), `took ${ms} ms`);
});

test('deep nesting ends with a file-unreadable finding at the limit, never a stack overflow, and the secret scan does not recurse', () => {
  const deep = `${'['.repeat(100000)}${']'.repeat(100000)}`;
  const { value } = timed(() => check({ files: [file('1.json', deep)] }));
  assert.equal(value.findings[0].id, 'file-unreadable');
  assert.match(value.findings[0].message, new RegExp(`nested more than ${JSON_LIMITS.maxDepth} deep`));
  const nested = { ...meta(1), properties: { files: [] }, extra: JSON.parse(`${'['.repeat(JSON_LIMITS.maxDepth - 3)}1${']'.repeat(JSON_LIMITS.maxDepth - 3)}`) };
  assert.deepEqual(check({ files: [file('1.json', nested)] }).findings, []);
  const keyed = `{"privateKey": ${'{"a": '.repeat(JSON_LIMITS.maxDepth - 1)}1${'}'.repeat(JSON_LIMITS.maxDepth - 1)}}`;
  assert.equal(check({ files: [file('1.json', keyed)] }).findings.filter((f) => f.id === 'secret-in-file').length, 1);
});

test('long strings, long names, long URIs and many attributes are read in good time, and the messages stay short', () => {
  const long = meta(1, { name: 'n'.repeat(200000), description: 'd'.repeat(200000), image: `${'p'.repeat(200000)}.png`, attributes: Array.from({ length: 5000 }, (_, i) => ({ trait_type: `T${i}`, value: i })) });
  const { value, ms } = timed(() => check({ files: [file('1.json', long), file('2.json', meta(2, { name: 'n'.repeat(200000) }))] }));
  assert.ok(ms < allowed(5000), `took ${ms} ms`);
  assert.deepEqual(value.findings.map((f) => f.id).sort(), ['media-missing', 'name-duplicate']);
  assert.ok(value.findings.every((f) => f.message.length < 700));
  assert.equal(value.files[0].token.attributes.length, METADATA_LIMITS.maxAttributes, 'attributes past the limit are not read');
  const braces = timed(() => check({ files: [file('1.json', meta(1, { image: `ipfs://x/${'{'.repeat(100000)}id${'}'.repeat(100000)}` }))], standard: 'ERC-1155' }));
  assert.ok(braces.ms < allowed(3000), `took ${braces.ms} ms`);
});

test('names such as __proto__, constructor and toString are only names', () => {
  const t = text(meta(1)).replace('"name": ', '"__proto__": {"polluted": 1}, "constructor": 2, "name": ');
  const attrs = [{ trait_type: '__proto__', value: 'x' }, { trait_type: 'constructor', value: 1 }, { trait_type: 'toString', value: 'y' }];
  const { value } = timed(() => check({ files: [file('1.json', t), file('2.json', meta(2, { attributes: attrs })), file('3.json', meta(3, { name: 'hasOwnProperty' }))], config: text({ standard: 'toString', tokenIds: { first: 1, last: 3 } }).replace('"first"', '"__proto__": 1, "first"') }));
  assert.equal({}.polluted, undefined);
  assert.ok(value.findings.some((f) => f.id === 'field-invalid' && /"toString", which is not a standard/.test(f.message)));
  assert.ok(value.findings.some((f) => f.id === 'field-unknown' && /"__proto__" of the tokenIds/.test(f.message)));
  assert.deepEqual(value.analysis.traits.map((t2) => t2.trait), ['Background', 'Glow', '__proto__', 'constructor', 'toString']);
  assert.ok(!value.findings.some((f) => f.file === 'm/1.json'), 'unknown keys of a metadata file are its own');
});

test('a run leaves the folder as it was: the tool writes nothing', async () => {
  await withFiles(GOOD, async (dir) => {
    const before = (await readdir(dir, { recursive: true })).sort();
    await cli([...ARGS, '--format', 'sarif'], dir);
    await cli([...ARGS, '--json', '--explain'], dir);
    assert.deepEqual((await readdir(dir, { recursive: true })).sort(), before);
  });
  assert.equal((await run(GOOD, ARGS)).code, 0);
});
