import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RULES, USAGE, VERSION, buildReport, listChecksJson, listChecksMarkdown, listChecksText, parseArgs, toJson, toMarkdown, toSarif, toText } from '../src/index.js';
import { ARGS, BAD, CONFIG, GOOD, check, cli, file, meta, run, text, tokens } from './helpers.js';

const ch = (...codes) => String.fromCharCode(...codes);
// A set with an error and a warning: a token with no image, and one with no description.
const MIXED = { ...BAD, 'metadata/3.json': text(meta(3, { description: undefined })) };
const inputs = { folder: 'm', files: 3, bytes: 10, other: 0, config: null, media: { folder: 'media', files: 0, same: false } };

test('exit codes: 0 for a pass, 1 for a finding at or above the fail-on level, 2 for a usage or input error', async () => {
  assert.equal((await run(GOOD, ARGS)).code, 0);
  assert.equal((await run(BAD, ARGS)).code, 1);
  assert.equal((await run(GOOD, ['metadata', '--media', 'media'])).code, 0);
  assert.equal((await run(GOOD, ['nothing'])).code, 2);
  assert.equal((await run(GOOD, [])).code, 2);
  assert.equal((await run(GOOD, ['metadata', 'media'])).code, 2);
  assert.equal((await run(GOOD, ['metadata', '--bogus'])).code, 2);
  const both = await run({}, ['a', '--config', 'b.json', '--media', 'c']);
  assert.equal(both.code, 2);
  assert.match(both.err, /the input has problems:\n {2}a: does not exist\n {2}b\.json: does not exist\n {2}c: does not exist\n/);
});

test('parseArgs: every path is local, an option is given once, the standard is one the tool knows, and SARIF has no list or explain', () => {
  assert.throws(() => parseArgs(['https://example.com/metadata']), /never fetches a URL/);
  assert.throws(() => parseArgs(['m', '--config', 'ipfs://bafyexample/c.json']), /never fetches a URL/);
  assert.throws(() => parseArgs(['m', '--media', 'a', '--media', 'b']), /given twice/);
  assert.throws(() => parseArgs(['m', '--standard', 'erc-20']), /--standard: unknown standard erc-20 \(ERC-721, ERC-1155, Metaplex\)/);
  assert.throws(() => parseArgs(['m', '--config']), /--config needs a value/);
  assert.throws(() => parseArgs(['m', '--config', '--json']), /--config needs a value/);
  assert.throws(() => parseArgs(['-']), /standard input/);
  assert.throws(() => parseArgs(['m', '--media', '-']), /standard input/);
  assert.throws(() => parseArgs(['m', '--json', '--format', 'text']), /two formats/);
  assert.throws(() => parseArgs(['m', '--format', 'xml']), /unknown format xml/);
  assert.throws(() => parseArgs(['m', '--fail-on', 'fatal']), /--fail-on: unknown level fatal/);
  assert.throws(() => parseArgs(['--list-checks', '--format', 'sarif']), /no SARIF form/);
  assert.throws(() => parseArgs(['m', '--format', 'sarif', '--explain']), /no place for them/);
  assert.equal(parseArgs(['m', '--standard', 'Metaplex']).standard, 'Metaplex');
  assert.equal(parseArgs(['m', '--standard', 'erc1155']).standard, 'ERC-1155');
  assert.deepEqual(parseArgs(['m', '--json']).format, 'json');
});

test('--fail-on and --min-severity: a warning fails the run at warning, and a hidden finding still counts for the result', async () => {
  const w = { ...GOOD, 'metadata/3.json': text(meta(3, { description: undefined })) };
  assert.equal((await run(w, ARGS)).code, 0);
  assert.equal((await run(w, [...ARGS, '--fail-on', 'warning'])).code, 1);
  assert.equal((await run(w, [...ARGS, '--fail-on', 'info'])).code, 1);
  const r = await run(MIXED, [...ARGS, '--min-severity', 'error']);
  assert.match(r.out, /findings: 1 \(1 error\); 1 below error not shown\n/);
  const hidden = await run(w, [...ARGS, '--min-severity', 'error', '--fail-on', 'warning']);
  assert.match(hidden.out, /findings: 0; 1 below error not shown/);
  assert.equal(hidden.code, 1);
});

test('the text report names the folder, the files, the config, the media, the standard, the ids, the checks, each finding, the traits, and ends with the notice and the result', async () => {
  const r = await run(BAD, ARGS);
  assert.match(r.out, /^nft-metadata-check: metadata\n/);
  assert.match(r.out, /\nfiles: 3 metadata files \(JSON, [\d,]+ bytes\)\n/);
  assert.match(r.out, /\nconfig: collection\.json \(JSON, \d+ lines, [\d,]+ bytes\)\n/);
  assert.match(r.out, /\nmedia: media \(1 file\)\n/);
  assert.match(r.out, /\nstandard: ERC-721, from the config\n/);
  assert.match(r.out, /\ntokens: 3 ids, from 1 to 3; the config expects 1 to 3\n/);
  assert.match(r.out, /\nfindings: 1 \(1 error\)\n/);
  assert.match(r.out, /ERROR {4}metadata-field-missing {3}metadata\/2\.json:1\n/);
  assert.match(r.out, /fix: Give every token a name and an image, as text\./);
  assert.match(r.out, /\nChecks \(25\)\n/);
  assert.ok(r.out.includes(['Traits (2)', '', '  trait type  tokens  values  types', '  Background  3       1       text', '  Glow        3       3       number'].join('\n')));
  assert.match(r.out, /will show the tokens\.\n\nRESULT: FAIL - 1 finding at or above error/);
  assert.ok(r.out.endsWith('\n'));
  const good = await run(GOOD, ARGS);
  assert.match(good.out, /Findings \(0\)\n\n {2}none\n/);
  const alone = await run({ 'metadata/7.json': text(meta(7, { attributes: [] })) }, ['metadata', '--standard', 'metaplex']);
  assert.match(alone.out, /\nconfig: not given\nmedia: the metadata folder \(1 file\)\nstandard: Metaplex, from --standard\ntokens: 1 id, 7; no range of ids in the config\n/);
  assert.doesNotMatch(alone.out, /Traits \(/);
});

test('--explain adds the points of the page of the standard to text, markdown and JSON, and the tool\'s own choice to a best practice check', async () => {
  const set = { ...MIXED, 'metadata/1.json': text(meta(1, { image: 'https://example.com/1.png' })) };
  const r = await run(set, [...ARGS, '--explain']);
  assert.match(r.out, /basis: The metadata extension of ERC-721 points each token at a JSON file .* \(ERC-721: Non-Fungible Token Standard, https:\/\/eips\.ethereum\.org\/EIPS\/eip-721\)/);
  assert.doesNotMatch(r.out, /basis: .*eip-1155\)/, 'only the schema of the standard of the collection');
  assert.match(r.out, /the tool's own choice: preferring a content address to a web address is a best practice of this tool/);
  const md = (await run(set, [...ARGS, '--format', 'markdown', '--explain'])).out;
  assert.match(md, /## Basis\n\n### metadata-field-missing\n\n- The metadata extension of ERC-721/);
  const json = JSON.parse((await run(set, [...ARGS, '--json', '--explain'])).out);
  assert.equal(json.findings[0].basis[0].url, 'https://eips.ethereum.org/EIPS/eip-721');
  const plain = JSON.parse((await run(set, [...ARGS, '--json'])).out);
  assert.equal(plain.findings[0].basis, undefined);
  const metaplex = JSON.parse((await run({ ...set, 'collection.json': text({ ...CONFIG, standard: 'Metaplex' }) }, [...ARGS, '--json', '--explain'])).out);
  assert.deepEqual(metaplex.findings.find((f) => f.id === 'metadata-field-missing').basis.map((b) => b.url), ['https://developers.metaplex.com/token-metadata/token-standard']);
});

test('the JSON report: the tool, the inputs, the standard, the summary, totals by level, the rules, the findings, the traits and the result', async () => {
  const r = JSON.parse((await run(BAD, [...ARGS, '--json'])).out);
  assert.equal(r.tool, 'nft-metadata-check');
  assert.equal(r.version, VERSION);
  assert.deepEqual(Object.keys(r.inputs), ['folder', 'files', 'bytes', 'other', 'config', 'media']);
  assert.deepEqual(r.inputs.media, { folder: 'media', files: 1, same: false });
  assert.deepEqual(r.standard, { name: 'ERC-721', from: 'config' });
  assert.deepEqual(r.summary, { files: 3, tokens: 3, lowest: '1', highest: '3', range: { first: '1', last: '3' } });
  assert.deepEqual(r.totals, { findings: 1, byLevel: { error: 1, warning: 0, info: 0 }, hidden: 0 });
  assert.equal(r.rules.length, RULES.length);
  const f = r.findings[0];
  assert.deepEqual(Object.keys(f), ['id', 'severity', 'message', 'file', 'line', 'column', 'at', 'subject', 'fix', 'kind']);
  assert.deepEqual([f.id, f.file, f.line, f.at, f.subject], ['metadata-field-missing', 'metadata/2.json', 1, 'metadata/2.json:1', '2']);
  assert.deepEqual(r.result, { pass: false, failOn: 'error', text: 'FAIL - 1 finding at or above error (1 error)' });
  assert.deepEqual(r.traits.map((t) => t.trait), ['Background', 'Glow']);
});

test('the SARIF report: version 2.1.0, every check as a rule, the files with a finding as artifacts and a result with its file, line and column', async () => {
  const s = JSON.parse((await run({ ...MIXED, 'collection.json': text({ ...CONFIG, baseUri: 'https://example.com/m/' }) }, [...ARGS, '--format', 'sarif'])).out);
  assert.equal(s.version, '2.1.0');
  const runOf = s.runs[0];
  assert.equal(runOf.tool.driver.name, 'nft-metadata-check');
  assert.equal(runOf.tool.driver.rules.length, RULES.length);
  assert.deepEqual(runOf.artifacts.map((a) => a.location.uri), ['metadata/2.json', 'collection.json', 'metadata/3.json']);
  assert.deepEqual(runOf.results.map((x) => [x.ruleId, x.level, x.locations[0].physicalLocation.artifactLocation.index]), [['metadata-field-missing', 'error', 0], ['uri-mutable', 'warning', 1], ['description-missing', 'warning', 2]]);
  assert.ok(runOf.results[1].locations[0].physicalLocation.region.startLine > 1);
  assert.equal(runOf.results[0].ruleIndex, RULES.findIndex((x) => x.id === 'metadata-field-missing'));
  assert.equal(runOf.properties.sources.length, 3);
  assert.equal(runOf.properties.standard, 'ERC-721');
});

test('the markdown report escapes what markdown gives a meaning to, and every format replaces control and direction characters', async () => {
  const name = `Example [link](https://x.example) | ${ch(0x1b)}[31m red ${ch(0x202e)}rtl ${ch(7)}`;
  const set = { ...GOOD, 'metadata/2.json': text(meta(2, { name, image: undefined, attributes: [{ trait_type: `T|${ch(0x2028)}x`, value: 1 }] })) };
  for (const format of ['text', 'markdown', 'json', 'sarif']) {
    const out = (await run(set, [...ARGS, '--format', format])).out;
    assert.ok(![...out].some((c) => [0x1b, 0x202e, 0x2028, 7].includes(c.charCodeAt(0))), format);
  }
  const md = (await run(set, [...ARGS, '--format', 'markdown'])).out;
  assert.match(md, /\| T\\\| x \| 1 \| 1 \| number \|/);
  assert.doesNotMatch(md, /\]\(https/);
  const fileName = `${ch(0x1b)}[2J.json`;
  const r = check({ files: [{ name: fileName, path: `m/${fileName}`, text: text(meta(1)) }] });
  assert.ok(!toText(buildReport({ inputs, checked: r, version: '0' })).includes(ch(0x1b)));
});

test('the markdown report: the summary, the findings table, the traits and the notice; a clean run says None', async () => {
  const md = (await run(MIXED, [...ARGS, '--format', 'markdown'])).out;
  assert.match(md, /^# nft-metadata-check: metadata\n\n- Files: 3 metadata files/);
  assert.ok(md.includes('\n- Result: **FAIL - 1 finding at or above error \\(1 error, 1 warning\\)**\n'));
  assert.match(md, /\| error \| metadata-field-missing \| metadata\/2\.json:1 \| Token 2 has no image;/);
  assert.match(md, /## Traits \(2\)\n\n\| Trait type \| Tokens \| Values \| Types \|/);
  assert.match((await run(GOOD, [...ARGS, '--format', 'markdown'])).out, /## Findings\n\nNone\.\n/);
});

test('--list-checks in text, markdown and JSON lists every check with its level and kind', async () => {
  const t = listChecksText();
  for (const r of RULES) assert.ok(t.includes(`  ${r.id}`), r.id);
  assert.match(t, /A documented check rests on ERC-721, ERC-1155 and the Token Metadata standard of Metaplex/);
  assert.equal(listChecksMarkdown().split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('| Check') && !l.startsWith('| ---')).length, RULES.length);
  const j = JSON.parse(listChecksJson());
  assert.deepEqual(j.map((x) => x.id), RULES.map((x) => x.id));
  assert.deepEqual(Object.keys(j[0]), ['id', 'severity', 'kind', 'summary', 'fix', 'basis', 'own']);
  const r = await cli(['--list-checks', '--format', 'markdown'], process.cwd());
  assert.equal(r.code, 0);
  assert.equal(r.out, listChecksMarkdown());
});

test('--help, --version and the usage on an error name every option and every check', async () => {
  const help = await cli(['--help'], process.cwd());
  assert.equal(help.code, 0);
  assert.equal(help.out, USAGE);
  for (const option of ['--config', '--standard', '--media', '--format', '--json', '--min-severity', '--fail-on', '--explain', '--list-checks', '--help', '--version']) assert.ok(USAGE.includes(option), option);
  for (const r of RULES) assert.ok(USAGE.includes(r.id), r.id);
  assert.equal((await cli(['--version'], process.cwd())).out, `${VERSION}\n`);
  const bad = await cli(['--nope'], process.cwd());
  assert.match(bad.err, /^nft-metadata-check: unknown argument --nope\n\nUsage: /);
});

test('the report functions on a report built in memory: the findings are sorted by level, the config first, then file and line', () => {
  const r = check({ files: [...tokens(1, 2, 'ERC-721', (n) => (n === 2 ? { description: undefined } : {})), file('3.json', meta(3, { image: undefined }))], config: { ...CONFIG, baseUri: 'https://example.com/m/' } });
  const rep = buildReport({ inputs: { ...inputs, config: { file: 'collection.json', bytes: 1, lines: 1 } }, checked: r, version: '9.9.9' });
  assert.deepEqual(rep.findings.map((f) => [f.severity, f.file]), [['error', 'm/3.json'], ['warning', 'collection.json'], ['warning', 'm/2.json']]);
  assert.match(toText(rep), /^nft-metadata-check: m\n/);
  assert.match(toMarkdown(rep), /^# nft-metadata-check: m\n/);
  assert.equal(JSON.parse(toJson(rep)).version, '9.9.9');
  assert.equal(JSON.parse(toSarif(rep)).runs[0].results.length, 3);
});
