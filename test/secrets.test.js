import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SECRET_KEYS, findSecrets, isSecretKey, readJson, secretShape } from '../src/index.js';
import { ARGS, GOOD, check, file, lineOf, meta, run, text, tokens } from './helpers.js';

// Shapes built from repeated characters, so that no file of the repository holds anything that could be a real seed or
// key.
const MNEMONIC = Array.from({ length: 12 }, () => 'lantern').join(' ');
const MNEMONIC_24 = Array.from({ length: 24 }, (_, i) => (i % 2 ? 'harbor' : 'lantern')).join(' ');
const XPRV = `x${'prv'}${'9'.repeat(107)}`;
const HEX = `0x${'ab'.repeat(32)}`;
const WIF = `5${'H'.repeat(50)}`;

test('secretShape: a mnemonic of 12 to 24 words, an extended private key, a key in hex and a key in WIF', () => {
  assert.equal(secretShape(MNEMONIC), 'a mnemonic');
  assert.equal(secretShape(MNEMONIC_24), 'a mnemonic');
  assert.equal(secretShape(`  ${MNEMONIC}  `), 'a mnemonic');
  assert.equal(secretShape(XPRV), 'an extended private key');
  assert.equal(secretShape(HEX), 'a private key in hex');
  assert.equal(secretShape(HEX.slice(2)), 'a private key in hex');
  assert.equal(secretShape(WIF), 'a private key in WIF');
});

test('secretShape: URIs, names, traits and other near misses are not secrets', () => {
  for (const ok of ['ipfs://bafyexamplelanterns/1.png', 'Example Lantern 1', 'a made-up lantern for the tests', `0x${'ab'.repeat(31)}`, Array.from({ length: 11 }, () => 'lantern').join(' '), `x${'pub'}${'9'.repeat(107)}`, 'Background', '']) assert.equal(secretShape(ok), null, ok);
});

test('isSecretKey: names of keys and seeds in any case and with any separator, and near misses', () => {
  for (const k of ['privateKey', 'private_key', 'PRIVATE-KEY', 'mnemonic', 'seedPhrase', 'xprv', 'wif', 'secret', 'passphrase']) assert.ok(isSecretKey(k), k);
  for (const k of ['name', 'image', 'attributes', 'trait_type', 'value', 'external_url', 'publicKey']) assert.ok(!isSecretKey(k), k);
  assert.ok(SECRET_KEYS.includes('privatekey'));
});

test('secret-in-file: a key named for a seed in a metadata file, at its line, reported once and never shown in any format', async () => {
  const obj = { ...meta(2), seedPhrase: MNEMONIC };
  const f = check({ files: [...tokens(1, 1), file('2.json', obj)] }).findings.filter((x) => x.id === 'secret-in-file');
  assert.equal(f.length, 1);
  assert.match(f[0].message, /^The file holds the key "seedPhrase", which names a seed, a mnemonic or a private key\. The tool never reads one, and the value is not shown\.$/);
  assert.equal(f[0].line, lineOf(text(obj), '"seedPhrase"'));
  assert.equal(f[0].file, 'm/2.json');
  for (const format of ['text', 'markdown', 'json', 'sarif']) {
    const r = await run({ ...GOOD, 'metadata/2.json': text(obj) }, [...ARGS, '--format', format]);
    assert.equal(r.code, 1, format);
    assert.ok(!r.out.includes('lantern lantern'), format);
  }
  assert.ok(!findSecrets(readJson(text(meta()))).length, 'clean metadata has none');
});

test('secret-in-file: a value shaped like a key under any field, the field left out of the checks and never echoed', async () => {
  for (const [shape, value] of [['a mnemonic', MNEMONIC], ['an extended private key', XPRV], ['a private key in hex', HEX], ['a private key in WIF', WIF]]) {
    const r = check({ files: [file('1.json', meta(1, { image: value, description: value }))] });
    const secrets = r.findings.filter((f) => f.id === 'secret-in-file');
    assert.equal(secrets.length, 2, shape);
    assert.match(secrets[1].message, new RegExp(`^The value of "image" is shaped like ${shape}\\. The tool never reads a seed or a key, and the value is not shown\\.$`));
    assert.ok(!r.findings.some((f) => f.message.includes(value)), shape);
    assert.ok(!r.findings.some((f) => f.id === 'metadata-field-missing' || f.id === 'description-missing'), `${shape}: the field is there, but not read`);
    assert.ok(!r.findings.some((f) => f.id === 'media-missing'), `${shape}: the value is not looked for as a path`);
    const out = await run({ ...GOOD, 'metadata/1.json': text(meta(1, { image: value })) }, [...ARGS, '--json', '--explain']);
    assert.ok(!out.out.includes(value), shape);
  }
});

test('secret-in-file: in the config, in an attribute and as a key shaped like a mnemonic, each reported once and not shown', () => {
  const r = check({ config: { standard: 'ERC-721', privateKey: { nested: XPRV } }, files: [file('1.json', { ...meta(1, { attributes: [{ trait_type: 'Seed', value: HEX }] }), [MNEMONIC]: 1 })] });
  const secrets = r.findings.filter((f) => f.id === 'secret-in-file');
  assert.equal(secrets.length, 3);
  assert.ok(secrets.some((f) => f.file === 'collection.json' && /the key "privateKey"/.test(f.message)));
  assert.ok(secrets.some((f) => /a key shaped like a mnemonic/.test(f.message)));
  assert.ok(secrets.some((f) => /^The value of "value" is shaped like a private key in hex/.test(f.message)));
  assert.ok(!r.findings.some((f) => f.message.includes('lantern') || f.message.includes(HEX) || f.message.includes(XPRV)));
  assert.ok(!r.findings.some((f) => f.id === 'field-unknown'), 'the secret key is reported once, as a secret');
  assert.deepEqual(r.analysis.traits, [], 'the attribute with a secret value is left out');
});
