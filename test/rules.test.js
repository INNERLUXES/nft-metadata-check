import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ANALYZE_LIMITS, UINT256_MAX, URI_LIMITS, analyze, decide, atOrAbove, ruleById } from '../src/index.js';
import { CONFIG, check, file, hex, idsOf, lineOf, meta, ofCheck, text, tokens } from './helpers.js';

const at = (findings) => findings.map((f) => [f.file, f.line]);

test('id-hex-form: an ERC-1155 name in decimal, with 0x, in capitals or short; and 64 small hex digits pass', () => {
  const files = [file('1.json', meta(1)), file('0x2.json', meta(2)), file(`${hex(171).toUpperCase()}.json`, meta(171)), file(`${hex(4)}.json`, meta(4)), file(hex(5), meta(5))];
  const f = ofCheck({ files, standard: 'ERC-1155' }, 'id-hex-form');
  assert.deepEqual(at(f), [['m/1.json', 1], ['m/0x2.json', 1], [`m/${hex(171).toUpperCase()}.json`, 1]]);
  assert.match(f[0].message, new RegExp(`so for token 1 it asks for ${hex(1)}\\.json\\.$`));
  assert.deepEqual(f.map((x) => x.subject), ['1', '2', '171']);
  assert.deepEqual(ofCheck({ files: tokens(1, 3), standard: 'ERC-721' }, 'id-hex-form'), [], 'only ERC-1155 names ids in hex');
});

test('uri-id-substitution: an ERC-1155 base URI without {id} or with another placeholder, and a placeholder in a value', () => {
  const run = (baseUri, image) => ofCheck({ files: [file(`${hex(1)}.json`, meta(1, { image }))], config: { standard: 'ERC-1155', baseUri } }, 'uri-id-substitution');
  assert.deepEqual(run('ipfs://bafyexample/{id}.json', 'ipfs://bafyexample/{id}.png'), []);
  assert.match(run('ipfs://bafyexample/', 'ipfs://bafyexample/1.png')[0].message, /has no \{id\}; an ERC-1155 client finds the metadata/);
  assert.match(run('ipfs://bafyexample/{ID}.json', 'ipfs://bafyexample/1.png')[0].message, /holds "\{ID\}"; an ERC-1155 client replaces only the exact text \{id\}/);
  assert.match(run('ipfs://bafyexample/{ id }.json', 'ipfs://bafyexample/1.png')[0].message, /"\{ id \}"/);
  const v = run('ipfs://bafyexample/{id}.json', 'ipfs://bafyexample/{tokenId}-{Id}.png');
  assert.equal(v.length, 1);
  assert.match(v[0].message, /^The image of token 1 holds "\{tokenId\}" and "\{Id\}"/);
  assert.deepEqual(ofCheck({ files: tokens(1, 1, 'ERC-721', () => ({ image: 'ipfs://x/{tokenId}.png' })), config: { standard: 'ERC-721', baseUri: 'ipfs://x/' } }, 'uri-id-substitution'), [], 'only ERC-1155 defines the substitution');
});

test('file-name-unexpected: zeros in front, 64 hex digits in ERC-721, .JSON in capitals and a name that is no id; a plain id passes', () => {
  const files = [file('01.json', meta(1)), file(`${hex(2)}.json`, meta(2)), file('3.JSON', meta(3)), file('lantern.json', meta(9)), file('4', meta(4)), file('5.json', meta(5))];
  const f = ofCheck({ files }, 'file-name-unexpected');
  assert.deepEqual(f.map((x) => x.file), ['m/01.json', `m/${hex(2)}.json`, 'm/3.JSON', 'm/lantern.json']);
  assert.match(f[0].message, /^The file name "01\.json" has zeros in front of the id; a base URI joined to id 1 leads to 1\.json\.$/);
  assert.match(f[3].message, /is not an id, so no token id leads to it; it was checked for its fields but not counted as a token/);
  assert.equal(ofCheck({ files: [file('sword.json', meta(1))], standard: 'ERC-1155' }, 'file-name-unexpected').length, 1);
});

test('collection.json in a Metaplex folder is the metadata of the collection: its fields are checked and it is no token', () => {
  const r = check({ files: [file('0.json', meta(0)), file('1.json', meta(1)), file('collection.json', meta(9, { image: undefined }))], standard: 'Metaplex', config: { tokenIds: { first: 0, last: 1 } } });
  assert.deepEqual(r.findings.map((f) => [f.id, f.file]), [['metadata-field-missing', 'm/collection.json']]);
  assert.match(r.findings[0].message, /^The collection metadata has no image/);
  assert.equal(r.analysis.summary.tokens, 2);
  assert.ok(r.notes.some((n) => /collection\.json was read as the metadata of the collection itself/.test(n)));
});

test('id-out-of-range: below and above the range of the config, and above the largest uint256 with no config; the edges pass', () => {
  const files = [file('0.json', meta(0)), file('1.json', meta(1)), file('3.json', meta(3)), file('4.json', meta(4))];
  const f = ofCheck({ files, config: { tokenIds: { first: 1, last: 3 } } }, 'id-out-of-range');
  assert.deepEqual(f.map((x) => x.file), ['m/0.json', 'm/4.json']);
  assert.match(f[1].message, /^The file 4\.json is for id 4, outside the tokenIds of the collection config, 1 to 3\.$/);
  const big = (UINT256_MAX + 1n).toString();
  const over = ofCheck({ files: [file(`${big}.json`, meta(1)), file(`${UINT256_MAX}.json`, meta(2))] }, 'id-out-of-range');
  assert.equal(over.length, 1);
  assert.match(over[0].message, /above the largest uint256/);
});

test('id-missing: runs of ids in the range with no file, at the line of tokenIds; a full range passes', () => {
  const cfg = { standard: 'ERC-721', tokenIds: { first: 1, last: 10 } };
  const files = [file('2.json', meta(2)), file('3.json', meta(3)), file('7.json', meta(7))];
  const f = ofCheck({ files, config: cfg }, 'id-missing');
  assert.deepEqual(f.map((x) => x.message), ['Id 1 of the tokenIds (1 to 10) has no metadata file.', 'Ids 4 to 6 of the tokenIds (1 to 10) have no metadata file (3 ids).', 'Ids 8 to 10 of the tokenIds (1 to 10) have no metadata file (3 ids).']);
  assert.deepEqual(at(f), Array(3).fill(['collection.json', lineOf(text(cfg), '"tokenIds"')]));
  assert.deepEqual(ofCheck({ files: tokens(1, 10), config: cfg }, 'id-missing'), []);
  const huge = ofCheck({ files: tokens(1, 1), config: { tokenIds: { first: 1, last: UINT256_MAX.toString() } } }, 'id-missing');
  assert.equal(huge.length, 1, 'a range of every uint256 is one run, never walked id by id');
});

test('id-gap: with no range, the ids missing between the lowest and the highest, at the file after the gap; no gap with a range', () => {
  const files = [file('1.json', meta(1)), file('2.json', meta(2)), file('5.json', meta(5)), file('7.json', meta(7))];
  const f = ofCheck({ files }, 'id-gap');
  assert.deepEqual(f.map((x) => [x.file, x.subject]), [['m/5.json', '5'], ['m/7.json', '7']]);
  assert.match(f[0].message, /^Ids 3 to 4 are missing between token 2 \(2\.json\) and token 5 \(5\.json\)/);
  assert.match(f[1].message, /^Id 6 is missing between token 5/);
  assert.deepEqual(ofCheck({ files: tokens(1, 4) }, 'id-gap'), []);
  assert.deepEqual(ofCheck({ files, config: { tokenIds: { first: 1, last: 7 } } }, 'id-gap'), [], 'a range of the config is reported as id-missing instead');
});

test('id-duplicate: two files of one id, the second reported and left out of the checks of names and attributes', () => {
  const files = [file('1', meta(1)), file('1.json', meta(1)), file('01.json', meta(1)), file('2.json', meta(2))];
  const r = check({ files });
  const f = r.findings.filter((x) => x.id === 'id-duplicate');
  assert.deepEqual(f.map((x) => x.file), ['m/1.json', 'm/01.json']);
  assert.match(f[0].message, /^The file 1\.json is for id 1, and so is 1; which one a server gives for the token depends on the server\.$/);
  assert.deepEqual(r.findings.filter((x) => x.id === 'name-duplicate' || x.id === 'attributes-duplicate'), []);
});

test('base-uri-no-slash: an ERC-721 base URI that does not end in /; one that does, or holds {id}, passes, and other standards are not asked', () => {
  const f = ofCheck({ config: { standard: 'ERC-721', baseUri: 'ipfs://bafyexample' } }, 'base-uri-no-slash');
  assert.equal(f.length, 1);
  assert.match(f[0].message, /asks for ipfs:\/\/bafyexample1 for token 1\.$/);
  assert.deepEqual(ofCheck({ config: { standard: 'ERC-721', baseUri: 'ipfs://bafyexample/' } }, 'base-uri-no-slash'), []);
  assert.deepEqual(ofCheck({ config: { standard: 'ERC-721', baseUri: 'ipfs://bafyexample/{id}.json' } }, 'base-uri-no-slash'), []);
  assert.deepEqual(ofCheck({ config: { standard: 'Metaplex', baseUri: 'ipfs://bafyexample' } }, 'base-uri-no-slash'), []);
});

test('uri-mutable: images, animations, files and base URIs on http: and https:; content addresses pass', () => {
  const obj = meta(1, { image: 'https://example.com/1.png', animation_url: 'http://example.com/1.mp4', external_url: 'https://example.com/1', properties: { files: [{ uri: 'https://example.com/1.png', type: 'image/png' }] } });
  const f = ofCheck({ files: [file('1.json', obj)], config: { baseUri: 'https://example.com/meta/' } }, 'uri-mutable');
  assert.deepEqual(at(f), [['m/1.json', lineOf(text(obj), '"image"')], ['m/1.json', lineOf(text(obj), '"animation_url"')], ['m/1.json', lineOf(text(obj), '"uri"')], ['collection.json', lineOf(text({ baseUri: 1 }), '"baseUri"')]]);
  assert.match(f[1].message, /on http:, .* and that is not encrypted\.$/);
  assert.doesNotMatch(f[0].message, /not encrypted/);
  assert.deepEqual(ofCheck({ files: [file('1.json', meta(1, { image: 'ar://example/1.png', animation_url: 'ipfs://bafyexample/1.mp4' }))] }, 'uri-mutable'), [], 'external_url is a web page, not media');
});

test('uri-local-path, uri-scheme-unknown and uri-data-large: what each catches, and the near misses', () => {
  const ids = (image) => idsOf({ files: [file('1.json', meta(1, { image }))], media: ['1.png', 'art/1.png'] });
  for (const p of ['file:///home/user/1.png', '/home/user/1.png', 'C:\\art\\1.png', '..\\1.png', '~/1.png', '../1.png']) assert.deepEqual(ids(p), ['uri-local-path'], p);
  for (const p of ['ftp://example.com/1.png', 'javascript:alert(1)', 'blob:x']) assert.deepEqual(ids(p), ['uri-scheme-unknown'], p);
  for (const p of ['1.png', './art/1.png', 'ipfs://bafyexample/1.png', 'data:image/svg+xml;utf8,<svg/>']) assert.deepEqual(ids(p), [], p);
  const max = URI_LIMITS.maxDataLength;
  assert.deepEqual(ids(`data:${'a'.repeat(max - 5)}`), [], 'a data: URI at the limit');
  const f = ofCheck({ files: [file('1.json', meta(1, { image: `data:${'a'.repeat(max)}` }))] }, 'uri-data-large');
  assert.equal(f.length, 1);
  assert.match(f[0].message, /is a data: URI of 65,541 characters, above the limit of 65,536 of the tool/);
  for (const [base, pattern] of [['ftp://example.com/m/', /uses the scheme ftp:/], ['metadata/', /has no scheme/], ['data:x', /is a data: URI, which cannot be joined to an id/]]) {
    const b = ofCheck({ config: { baseUri: base } }, 'uri-scheme-unknown');
    assert.equal(b.length, 1, base);
    assert.match(b[0].message, pattern);
  }
  assert.deepEqual(ofCheck({ config: { baseUri: 'C:\\meta\\' } }, 'uri-local-path').length, 1);
});

test('media-missing: a relative path with no file of that name, with a hint for a file that differs only in case, and {id} for ERC-1155', () => {
  const media = ['1.png', 'art/2.png', 'My Art.png', `${hex(3)}.png`];
  const ids = (image, standard = 'ERC-721', n = 1) => idsOf({ files: [file(standard === 'ERC-1155' ? `${hex(n)}.json` : `${n}.json`, meta(n, { image }))], media, standard });
  assert.deepEqual(ids('1.png'), []);
  assert.deepEqual(ids('./art/2.png'), []);
  assert.deepEqual(ids('My%20Art.png'), []);
  assert.deepEqual(ids('My Art.png?x=1'), []);
  assert.deepEqual(ids('2.png'), ['media-missing']);
  const hint = ofCheck({ files: [file('1.json', meta(1, { image: '1.PNG' }))], media }, 'media-missing');
  assert.match(hint[0].message, /^The image of token 1 is the relative path "1\.PNG", and the media folder media holds no file 1\.PNG\. The folder holds 1\.png, which differs only in case/);
  assert.deepEqual(ids('{id}.png', 'ERC-1155', 3), [], '{id} is replaced by the 64 hex digits of the id');
  const literal = ofCheck({ files: [file('3.json', meta(3, { image: '{id}.png' }))], media }, 'media-missing');
  assert.match(literal[0].message, /Only ERC-1155 clients replace \{id\}\.$/);
  const anim = ofCheck({ files: [file('1.json', meta(1, { image: '1.png', animation_url: '1.mp4', properties: { files: [{ uri: '1.glb', type: 'model/gltf-binary' }] } }))], media, standard: 'Metaplex' }, 'media-missing');
  assert.deepEqual(anim.map((f) => f.message.split(' is ')[0]), ['The animation_url of token 1', 'The properties.files uri of token 1']);
});

test('name-duplicate: names compared without case and outer spaces; names that differ pass', () => {
  const files = [file('1.json', meta(1, { name: 'Lantern' })), file('2.json', meta(2, { name: '  lantern ' })), file('3.json', meta(3, { name: 'Lantern 3' }))];
  const f = ofCheck({ files }, 'name-duplicate');
  assert.deepEqual(f.map((x) => x.file), ['m/2.json']);
  assert.match(f[0].message, /^Token 2 has the name "lantern", as token 1 \(1\.json\) does\.$/);
});

test('attributes-duplicate: the same set in another order is a copy; a set that differs in one value or one type is not', () => {
  const a = [{ trait_type: 'Background', value: 'Blue' }, { trait_type: 'Glow', value: 5 }];
  const files = [file('1.json', meta(1, { attributes: a })), file('2.json', meta(2, { attributes: [a[1], a[0]] })), file('3.json', meta(3, { attributes: [a[0], { trait_type: 'Glow', value: 6 }] })), file('4.json', meta(4, { attributes: [a[0], { trait_type: 'Glow', value: '5' }] })), file('5.json', meta(5, { attributes: [] })), file('6.json', meta(6, { attributes: [] }))];
  const f = ofCheck({ files }, 'attributes-duplicate');
  assert.deepEqual(f.map((x) => x.file), ['m/2.json']);
  assert.match(f[0].message, /^Token 2 has the same 2 attributes as token 1 \(1\.json\)\.$/);
});

test('trait-type-inconsistent: values of two types and two spellings of a trait, against the most common; one spelling and one type pass', () => {
  const files = [1, 2, 3].map((n) => file(`${n}.json`, meta(n, { attributes: [{ trait_type: 'Background', value: 'Blue' }, { trait_type: 'Glow', value: n }] })));
  files.push(file('4.json', meta(4, { attributes: [{ trait_type: 'background', value: 'Red' }, { trait_type: 'Glow', value: '4' }] })));
  files.push(file('5.json', meta(5, { attributes: [{ trait_type: 'Back_ground', value: 'Red' }, { trait_type: 'Glow', value: 5 }] })));
  const f = ofCheck({ files }, 'trait-type-inconsistent');
  assert.deepEqual(f.map((x) => x.file), ['m/4.json', 'm/4.json', 'm/5.json']);
  assert.match(f[0].message, /^The value of the trait "Glow" of token 4 is text, but in 4 other attributes of the collection it is a number\.$/);
  assert.match(f[1].message, /^The trait type "background" of token 4 differs only in case or separators from "Background", which 3 other attributes of the collection use; a marketplace shows them as two traits\.$/);
  assert.deepEqual(ofCheck({ files: tokens(1, 5) }, 'trait-type-inconsistent'), []);
});

test('the table of traits: tokens, distinct values and types of each trait type, sorted, and capped with a note', () => {
  const r = check({ files: tokens(1, 3) });
  assert.deepEqual(r.analysis.traits, [{ trait: 'Background', tokens: 3, values: 1, types: ['text'] }, { trait: 'Glow', tokens: 3, values: 3, types: ['number'] }]);
  const many = analyze({ files: check({ files: [file('1.json', meta(1, { attributes: Array.from({ length: 5 }, (_, i) => ({ trait_type: `T${i}`, value: i })) }))] }).files, standard: 'ERC-721', config: null, configFile: null, media: { shown: 'm', files: new Set(), lower: new Map() }, limits: { ...ANALYZE_LIMITS, maxTraits: 2 } });
  assert.equal(many.traits.length, 2);
  assert.ok(many.notes.some((n) => /the table of traits shows the first 2 of 5 trait types/.test(n)));
});

test('the limit of runs: gaps and missing ids past the limit are left out with a note', () => {
  const files = Array.from({ length: 10 }, (_, i) => file(`${i * 2}.json`, meta(i * 2)));
  const base = check({ files }).files;
  const media = { shown: 'm', files: new Set(), lower: new Map() };
  const gaps = analyze({ files: base, standard: 'ERC-721', config: null, configFile: null, media, limits: { ...ANALYZE_LIMITS, maxRuns: 3 } });
  assert.equal(gaps.findings.filter((f) => f.id === 'id-gap').length, 3);
  assert.ok(gaps.notes.some((n) => /the gaps in the ids were reported for the first 3/.test(n)));
  const cfg = { range: { first: 0n, last: 30n }, rangeEntry: { line: 2, column: 3 } };
  const missing = analyze({ files: base, standard: 'ERC-721', config: cfg, configFile: 'c.json', media, limits: { ...ANALYZE_LIMITS, maxRuns: 3 } });
  assert.equal(missing.findings.filter((f) => f.id === 'id-missing').length, 3);
  assert.ok(missing.notes.some((n) => /the ids with no file were reported for the first 3 runs/.test(n)));
});

test('decide, atOrAbove and ruleById', () => {
  assert.deepEqual(decide({ error: 0, warning: 2, info: 0 }, 'error'), { pass: true, failOn: 'error', text: 'PASS - no finding at or above error (2 warning)' });
  assert.deepEqual(decide({ error: 1, warning: 2, info: 0 }, 'warning'), { pass: false, failOn: 'warning', text: 'FAIL - 3 findings at or above warning (1 error, 2 warning)' });
  assert.equal(decide({}, 'info').text, 'PASS - no finding at or above info');
  assert.ok(atOrAbove('error', 'warning'));
  assert.ok(!atOrAbove('info', 'warning'));
  assert.equal(ruleById('id-gap').severity, 'warning');
  assert.equal(ruleById('nothing'), undefined);
  assert.deepEqual(check({ files: tokens(1, 3), config: CONFIG }).findings, []);
});
