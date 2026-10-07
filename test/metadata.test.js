import { test } from 'node:test';
import assert from 'node:assert/strict';
import { METADATA_LIMITS, SCHEMA_NAMES, readJson, readMetadata, valueKind } from '../src/index.js';
import { check, file, hex, lineOf, meta, ofCheck, text } from './helpers.js';

const one = (obj, standard = 'ERC-721') => check({ files: [file(standard === 'ERC-1155' ? `${hex(1)}.json` : '1.json', obj)], standard });
const ids = (obj, standard) => one(obj, standard).findings.map((f) => f.id);

test('clean metadata of each standard has no finding', () => {
  assert.deepEqual(ids(meta(1)), []);
  assert.deepEqual(ids(meta(1, { decimals: 0, properties: { rarity: 'high' } }), 'ERC-1155'), []);
  assert.deepEqual(ids(meta(1, { animation_url: 'ipfs://bafyexample/1.mp4', external_url: 'https://example.com/1', properties: { category: 'image', files: [{ uri: 'ipfs://bafyexample/1.png', type: 'image/png' }] } }), 'Metaplex'), []);
});

test('metadata-field-missing: no name or no image, or an empty one, in every standard, at the line of the key or of the object', () => {
  for (const standard of ['ERC-721', 'ERC-1155', 'Metaplex']) {
    for (const key of ['name', 'image']) {
      const missing = one(meta(1, { [key]: undefined }), standard).findings;
      assert.deepEqual(missing.map((f) => [f.id, f.line]), [['metadata-field-missing', 1]], `${standard} ${key}`);
      assert.match(missing[0].message, new RegExp(`^Token 1 has no ${key}; ${SCHEMA_NAMES[standard]} defines ${key} as`));
      const obj = meta(1, { [key]: '  ' });
      const empty = one(obj, standard).findings;
      assert.deepEqual(empty.map((f) => [f.id, f.line]), [['metadata-field-missing', lineOf(text(obj), `"${key}"`)]], `${standard} empty ${key}`);
      assert.match(empty[0].message, new RegExp(`^The ${key} of token 1 is empty`));
    }
  }
  assert.equal(one(meta(1, { image: 'ipfs://bafyexample/1.png ' })).findings.length, 0, 'an image with a space after it is there');
});

test('description-missing: a warning for no description or an empty one, and none for a description of one character', () => {
  assert.deepEqual(ids(meta(1, { description: undefined })), ['description-missing']);
  assert.deepEqual(ids(meta(1, { description: '' }), 'Metaplex'), ['description-missing']);
  assert.deepEqual(ids(meta(1, { description: '.' })), []);
});

test('field-type: name, description and image that are not text, in every standard, and not reported as missing too', () => {
  for (const standard of ['ERC-721', 'ERC-1155', 'Metaplex']) {
    const f = one(meta(1, { name: 7, description: ['a'], image: { uri: 'x' } }), standard).findings;
    assert.deepEqual(f.map((x) => x.id), ['field-type', 'field-type', 'field-type'], standard);
    assert.match(f[0].message, new RegExp(`^The name of token 1 is the number 7; ${SCHEMA_NAMES[standard]} defines it as text\\.$`));
    assert.match(f[1].message, /image of token 1 is an object/);
    assert.match(f[2].message, /description of token 1 is a list/);
  }
});

test('field-type: ERC-1155 decimals is a whole number and properties an object; ERC-721 reads neither', () => {
  for (const bad of [1.5, -1, '2', null]) assert.deepEqual(ids(meta(1, { decimals: bad }), 'ERC-1155'), ['field-type'], String(bad));
  const exp = check({ files: [file(`${hex(1)}.json`, text(meta(1, { decimals: 7 })).replace('"decimals": 7', '"decimals": 1e3'))], standard: 'ERC-1155' });
  assert.deepEqual(exp.findings.map((f) => f.id), ['field-type'], 'a number with an exponent');
  for (const ok of [0, 18]) assert.deepEqual(ids(meta(1, { decimals: ok }), 'ERC-1155'), [], String(ok));
  assert.deepEqual(ids(meta(1, { properties: 'rare' }), 'ERC-1155'), ['field-type']);
  assert.deepEqual(ids(meta(1, { properties: ['rare'] }), 'Metaplex'), ['field-type']);
  assert.deepEqual(ids(meta(1, { decimals: 1.5, properties: 'rare' }), 'ERC-721'), [], 'ERC-721 defines neither field');
});

test('field-type: Metaplex animation_url, external_url, category and the files of the properties', () => {
  assert.deepEqual(ids(meta(1, { animation_url: 5, external_url: false }), 'Metaplex'), ['field-type', 'field-type']);
  assert.deepEqual(ids(meta(1, { animation_url: 5, external_url: false })), [], 'ERC-721 does not define them');
  assert.deepEqual(ids(meta(1, { properties: { category: 3 } }), 'Metaplex'), ['field-type']);
  assert.deepEqual(ids(meta(1, { properties: { files: 'x.png' } }), 'Metaplex'), ['field-type']);
  const f = one(meta(1, { properties: { files: ['x.png', { uri: 'ipfs://bafyexample/1.png' }, { uri: 3, type: 'image/png' }, { uri: 'ipfs://bafyexample/1.png', type: 'image/png' }] } }), 'Metaplex').findings;
  assert.deepEqual(f.map((x) => x.id), ['field-type', 'field-type', 'field-type']);
  assert.match(f[0].message, /A file of the properties of token 1 is text/);
  assert.match(f[1].message, /has no type/);
  assert.match(f[2].message, /has a uri that is the number 3/);
  assert.deepEqual(ids(meta(1, { properties: { files: ['x.png'] } })), [], 'ERC-721 does not define the files');
});

test('field-type in Metaplex and attributes-invalid in ERC-721 and ERC-1155: attributes that are not a list of trait_type and value', () => {
  const bad = [
    [{ Background: 'Blue' }, /The attributes of token 1 are an object/],
    [['Blue'], /An attribute of token 1 is text/],
    [[{ value: 'Blue' }], /An attribute of token 1 has no trait_type/],
    [[{ trait_type: 'Background' }], /has no value/],
    [[{ trait_type: 3, value: null }], /has a trait_type that is the number 3 and a value that is null/],
    [[{ trait_type: 'Background', value: ['Blue'] }], /a value that is a list/],
    [[{ trait_type: 'Background', value: true }], /a value that is true/]
  ];
  for (const [attributes, pattern] of bad) {
    for (const [standard, id] of [['ERC-721', 'attributes-invalid'], ['ERC-1155', 'attributes-invalid'], ['Metaplex', 'field-type']]) {
      const f = one(meta(1, { attributes }), standard).findings;
      assert.deepEqual(f.map((x) => x.id), [id], `${standard} ${JSON.stringify(attributes)}`);
      assert.match(f[0].message, pattern);
      assert.match(f[0].message, standard === 'Metaplex' ? /the JSON standard of Metaplex Token Metadata defines/ : /the tool reads/);
    }
  }
  assert.deepEqual(ids(meta(1, { attributes: [] })), [], 'an empty list is a list');
  assert.deepEqual(ids(meta(1, { attributes: [{ trait_type: 'Glow', value: 5, display_type: 'number', max_value: 10 }] }), 'Metaplex'), [], 'a number is read as a value in Metaplex too');
});

test('attribute-value-empty: an empty trait_type or value, the attribute left out of the traits, and a value of 0 is not empty', () => {
  const r = one(meta(1, { attributes: [{ trait_type: 'Background', value: ' ' }, { trait_type: '', value: 'Blue' }, { trait_type: 'Glow', value: 0 }] }));
  assert.deepEqual(r.findings.map((f) => f.id), ['attribute-value-empty', 'attribute-value-empty']);
  assert.match(r.findings[0].message, /^An attribute of token 1 has the trait_type "Background" with an empty value\.$/);
  assert.match(r.findings[1].message, /an empty trait_type/);
  assert.deepEqual(r.analysis.traits.map((t) => t.trait), ['Glow']);
});

test('field-unknown: a key of the metadata, an attribute or a file that differs from a known one only in case or separators', () => {
  const obj = { ...meta(1), Name: 'x', animationUrl: 'ipfs://bafyexample/1.mp4', attributes: [{ traitType: 'Background', value: 'Blue' }], properties: { files: [{ URI: 'x', uri: 'ipfs://bafyexample/1.png', type: 'image/png' }] } };
  const f = one(obj, 'Metaplex').findings;
  assert.deepEqual(f.map((x) => x.id), ['field-unknown', 'field-unknown', 'field-unknown', 'field-unknown', 'field-type']);
  assert.match(f[0].message, /^The key "Name" of the metadata of token 1 differs from name only in case or separators; the standard spells it name, so its value was left out of every check\.$/);
  assert.match(f[1].message, /"animationUrl" .* differs from animation_url/);
  assert.match(f[2].message, /"URI" of a file of token 1 differs from uri/);
  assert.match(f[3].message, /"traitType" of an attribute of token 1 differs from trait_type/);
  assert.match(f[4].message, /has no trait_type/);
  assert.deepEqual(ids({ ...meta(1), dna: 'abc', edition: 3, compiler: 'x', creator: 'y' }), [], 'other keys of a collection are its own');
});

test('file-unreadable: a metadata file that is not JSON or whose top level is not an object, at its line, and the other files still read', () => {
  const r = check({ files: [file('1.json', '{\n  "name": "a",\n  "image": "b",\n}'), file('2.json', '[]'), file('3.json', meta(3))] });
  assert.deepEqual(r.findings.map((f) => [f.id, f.file, f.line]), [['file-unreadable', 'm/1.json', 4], ['file-unreadable', 'm/2.json', 1]]);
  assert.match(r.findings[1].message, /^The top level of the file is a list, not an object/);
  assert.equal(r.analysis.summary.tokens, 3, 'a file that could not be read still stands for its id');
});

test('readMetadata: the token fields, the URIs of its media and the kinds of the attribute values', () => {
  const root = readJson(text(meta(4, { animation_url: '4.mp4', properties: { files: [{ uri: '4.glb', type: 'model/gltf-binary' }] } })));
  const { token, findings } = readMetadata(root, { file: 'x.json', standard: 'Metaplex', label: 'Token 4', subject: '4' });
  assert.deepEqual(findings, []);
  assert.equal(token.name, 'Example Lantern 4');
  assert.deepEqual(token.uris.map((u) => [u.field, u.value]), [['image', 'ipfs://bafyexamplelanterns/4.png'], ['animation_url', '4.mp4'], ['properties.files uri', '4.glb']]);
  assert.deepEqual(token.attributes.map((a) => [a.trait, a.kind]), [['Background', 'text'], ['Glow', 'number']]);
  assert.equal(valueKind({ kind: 'boolean' }), null);
  assert.ok(METADATA_LIMITS.maxAttributes >= 100);
});
