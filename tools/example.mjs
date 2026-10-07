// Runs the README examples, checks that they report what the README shows, and writes the reports of the two made-up
// collections to examples/output. CI runs it and then fails if those files changed, so the example output in the
// repository is always the real output.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { main } from '../src/index.js';

const root = resolve(fileURLToPath(import.meta.url), '..', '..');

// The arguments of the examples; every path is relative to the root of the repository.
export const BAD = ['examples/bad/metadata', '--config', 'examples/bad/collection.json'];
export const GOOD = ['examples/good/metadata', '--config', 'examples/good/collection.json'];

// Runs the tool on files of the repository; the paths shown in the report are relative to the root of the repository.
export async function run(argv, base = root) {
  let out = '';
  let err = '';
  const code = await main(argv, { out: (t) => { out += t; }, err: (t) => { err += t; } }, undefined, base);
  return { code, out, err };
}

const HEX = (n) => n.toString(16).padStart(64, '0');

// What the README says of the bad collection: the counts, a finding of nearly every check, and the result.
export const EXPECTED = [
  'files: 15 metadata files (JSON, 5,631 bytes); 1 other file not read as metadata',
  'config: examples/bad/collection.json (JSON, 11 lines, 293 bytes)',
  'media: the metadata folder (16 files)',
  'standard: ERC-1155, from the config',
  'tokens: 13 ids, from 1 to 15; the config expects 1 to 14',
  'findings: 31 (19 error, 12 warning)',
  'Id 10 of the tokenIds (1 to 14) has no metadata file.',
  'Id 14 of the tokenIds (1 to 14) has no metadata file.',
  'The baseUri of the collection config holds "{ID}"; an ERC-1155 client replaces only the exact text {id}.',
  'The media of the collection config is the number 7; it must be text',
  `The file ${HEX(1)}.json is for id 1, and so is ${HEX(1)};`,
  `The image of token 3 is the relative path "{id}.png", and the media folder examples/bad/metadata holds no file ${HEX(3)}.png.`,
  'Token 4 has no image; the metadata schema of ERC-1155 defines image',
  'The name of token 5 is the number 5; the metadata schema of ERC-1155 defines it as text.',
  'The decimals of token 5 is the number 1.5',
  'Token 6 has no image',
  'The image of token 7, "C:\\sprites\\7.png", starts with a drive letter',
  'The attributes of token 7 are an object; the tool reads attributes as a list of objects',
  'The properties of token 9 is text; the metadata schema of ERC-1155 defines it as an object.',
  'The file holds the key "mnemonic", which names a seed, a mnemonic or a private key.',
  'The metadata file is not JSON the reader can follow: expected a key in double quotes and found "," at line 5',
  'is for id 15, outside the tokenIds of the collection config, 1 to 14.',
  'The file name "0x0C.json" starts with 0x and has hex digits in capitals and has 2 hex digits, not 64',
  `The file name "11.json" is written in decimal, and was read as the decimal id; an ERC-1155 client puts the id in place of {id} as 64 hex digits in small letters with no 0x, so for token 11 it asks for ${HEX(11)}.json.`,
  'The image of token 11 holds "{tokenId}"; an ERC-1155 client replaces only the exact text {id}',
  'The baseUri of the collection config is on https:',
  'The key "mediaFolder" of the collection config is not one the tool reads',
  'The description of token 4 is empty',
  'An attribute of token 4 has the trait_type "Background" with an empty value.',
  'The image of token 5 is on http:, a web address whose server can change or remove the file after the mint, and that is not encrypted.',
  'The value of the trait "Level" of token 5 is text, but in 10 other attributes of the collection it is a number.',
  'The trait type "background" of token 6 differs only in case or separators from "Background"',
  'The key "Image" of the metadata of token 6 differs from image only in case or separators',
  `Token 8 has the name "Example Sprite 1", as token 1 (${HEX(1)}) does.`,
  `Token 8 has the same 2 attributes as token 1 (${HEX(1)}).`,
  'The image of token 9 uses the scheme ftp:',
  'The file name "token-sheet.json" is not an id, so no token id leads to it',
  'not a marketplace review, not a check of what is on IPFS or a chain and not a guarantee that a wallet or a marketplace will show the tokens',
  'RESULT: FAIL - 19 findings at or above error (19 error, 12 warning)'
];
// What must not be reported: the checks the bad collection does not hold, the seed, and a pass.
export const UNWANTED = ['WARNING  id-gap', 'WARNING  base-uri-no-slash', 'WARNING  uri-data-large', 'lantern', 'RESULT: PASS'];

// What the README says of the good collection: no finding.
export const GOOD_EXPECTED = [
  'files: 6 metadata files (JSON, 3,245 bytes)',
  'media: examples/good/media (6 files)',
  'standard: ERC-721, from the config',
  'tokens: 6 ids, from 1 to 6; the config expects 1 to 6',
  'findings: 0',
  'RESULT: PASS - no finding at or above error'
];

const problems = [];
function expect(name, result, code, expected, unwanted, stream = 'out') {
  const text = result[stream];
  const missing = expected.filter((e) => !text.includes(e));
  const wrong = unwanted.filter((e) => text.includes(e));
  if (result.code !== code || missing.length || wrong.length) {
    problems.push(`${name}: unexpected report (exit code ${result.code}, expected ${code}; missing: ${missing.join(' / ') || 'none'}; should not appear: ${wrong.join(' / ') || 'none'})${result.err ? `\n${result.err}` : ''}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const bad = await run(BAD);
  process.stdout.write(bad.out);
  expect('bad collection', bad, 1, EXPECTED, UNWANTED);

  const good = await run(GOOD);
  expect('good collection', good, 0, GOOD_EXPECTED, ['ERROR    ', 'WARNING  ', 'RESULT: FAIL']);
  // The good collection also passes when warnings and notes fail the run.
  expect('good, fail on warning', await run([...GOOD, '--fail-on', 'warning']), 0, ['RESULT: PASS - no finding at or above warning'], []);
  expect('good, fail on info', await run([...GOOD, '--fail-on', 'info']), 0, ['RESULT: PASS - no finding at or above info'], []);
  // The metadata alone, with the standard and the media folder as options and no config, passes too.
  expect('good metadata alone', await run(['examples/good/metadata', '--standard', 'erc-721', '--media', 'examples/good/media', '--fail-on', 'warning']), 0, ['config: not given', 'standard: ERC-721, from --standard', 'no range of ids in the config', 'RESULT: PASS'], []);
  // The bad collection with only the errors shown still counts the rest.
  expect('bad, errors only', await run([...BAD, '--min-severity', 'error']), 1, ['findings: 19 (19 error); 12 below error not shown'], ['WARNING  ']);
  // A standard the tool does not know is a usage error, and a folder that is not there stops the run with no report.
  expect('unknown standard', await run([...GOOD, '--standard', 'erc-20']), 2, ['--standard: unknown standard erc-20'], [], 'err');
  expect('missing folder', await run(['examples/none/metadata']), 2, ['examples/none/metadata: does not exist'], [], 'err');

  // The README shows the head of the report of the bad collection with its table of checks, one finding with its basis,
  // the table of traits and the end of the report, and the end of the report of the good collection.
  const readme = (await readFile(resolve(root, 'README.md'), 'utf8')).split('\r\n').join('\n');
  const lines = bad.out.split('\n');
  const head = lines.slice(0, lines.findIndex((l) => l.startsWith('Findings ('))).join('\n');
  if (!readme.includes(head)) problems.push('README: the head of the sample output of the bad collection differs from a real run');
  const explained = (await run([...BAD, '--explain'])).out.split('\n');
  const at = explained.findIndex((l) => l.includes('id-hex-form') && l.includes('examples/bad/metadata/11.json:'));
  const sample = explained.slice(at, at + 4).join('\n');
  if (at < 0 || !readme.includes(sample)) problems.push('README: the sample finding of the id-hex-form check differs from a real run');
  const t = lines.findIndex((l) => l.startsWith('Traits ('));
  const table = lines.slice(t, t + 7).join('\n');
  if (t < 0 || !readme.includes(table)) problems.push('README: the table of traits of the bad collection differs from a real run');
  const tail = lines.slice(-7).join('\n');
  if (!readme.includes(tail)) problems.push('README: the tail of the sample output of the bad collection differs from a real run');
  const goodTail = good.out.split('\n').slice(-14).join('\n');
  if (!readme.includes(goodTail)) problems.push('README: the tail of the sample output of the good collection differs from a real run');

  await mkdir(resolve(root, 'examples/output'), { recursive: true });
  await writeFile(resolve(root, 'examples/output/bad.txt'), bad.out);
  await writeFile(resolve(root, 'examples/output/good.txt'), good.out);
  const outputs = [
    ['bad-explain.txt', [...BAD, '--explain'], 1],
    ['bad.md', [...BAD, '--format', 'markdown'], 1],
    ['bad-explain.md', [...BAD, '--format', 'markdown', '--explain'], 1],
    ['bad.json', [...BAD, '--json', '--explain'], 1],
    ['bad.sarif', [...BAD, '--format', 'sarif'], 1],
    ['good.md', [...GOOD, '--format', 'markdown'], 0],
    ['good.json', [...GOOD, '--json'], 0],
    ['good.sarif', [...GOOD, '--format', 'sarif'], 0],
    ['checks.txt', ['--list-checks'], 0],
    ['checks.json', ['--list-checks', '--format', 'json'], 0]
  ];
  for (const [name, args, code] of outputs) {
    const r = await run(args);
    if (r.code !== code) problems.push(`${name}: exit code ${r.code}, expected ${code}`);
    await writeFile(resolve(root, 'examples/output', name), r.out);
  }

  if (problems.length) {
    for (const p of problems) console.error(`example: ${p}`);
    process.exit(1);
  }
}
