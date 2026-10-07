// Command line: nft-metadata-check <metadata-folder> [--config <file>] [--standard <name>] [--media <folder>] [options]

import { readFileSync } from 'node:fs';
import { InputError, LIMITS, checkFolder } from './check.js';
import { LEVELS } from './data.js';
import { listChecksJson, listChecksMarkdown, listChecksText, toJson, toMarkdown, toSarif, toText } from './report.js';
import { RULES } from './rules.js';
import { STANDARDS, standardOf } from './standards.js';
import { safeText } from './text.js';

export const VERSION = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;

const FORMATS = { text: toText, markdown: toMarkdown, json: toJson, sarif: toSarif };
const LISTS = { text: listChecksText, markdown: listChecksMarkdown, json: listChecksJson };

export const USAGE = `Usage: nft-metadata-check <metadata-folder> [--config <file>] [--standard <name>] [--media <folder>] [options]

Reads the metadata folder of an NFT collection before it is minted (one JSON file for each token, named for its id),
and optionally a collection config (JSON: the standard, ERC-721, ERC-1155 or Metaplex, the range of token ids, the base
URI and the media folder), and lists what breaks marketplaces and wallets: a token with no name, image or description,
a field of the wrong type, attributes that are not a list of trait_type and value, an ERC-1155 file name or placeholder
not in the form of {id}, ids missing, written twice or outside the range, a gap in the ids, an image on a web address,
a local path or an unknown scheme, a large data: URI, media that is not in the media folder, names and sets of
attributes written twice, empty attributes and traits written two ways across the collection. A private key or a seed
in a file is an error whose value is never shown. It reads files only: it contacts no IPFS node, chain or web server,
fetches nothing, runs nothing, reads no clock and writes nothing to disk.

Options:
  --config <file>          the collection config, JSON
  --standard <name>        ${STANDARDS.join(', ')}; in place of the standard of the config (default: ERC-721)
  --media <folder>         the folder that relative media paths are looked for in (default: the media of the config,
                           or else the metadata folder)
  --format <name>          text, markdown, json or sarif (default: text)
  --json                   the same as --format json
  --min-severity <level>   the lowest level of a finding that is shown: ${LEVELS.join(', ')} (default: info)
  --fail-on <level>        the lowest level of a finding that fails the run: ${LEVELS.join(', ')} (default: error)
  --explain                show the points of the pages behind each finding (text, markdown and JSON)
  --list-checks            list the checks with their level and kind, and exit
  --help                   show this text
  --version                show the version

Checks: ${RULES.map((r) => r.id).join(', ')}.

Exit codes: 0 no finding at or above the fail-on level, 1 a finding at or above it, 2 usage or input error.
`;

const isUrl = (f) => /^[a-z][a-z0-9+.-]*:\/\//i.test(f);

export function parseArgs(argv) {
  const o = { paths: [], config: null, standard: null, media: null, format: null, json: false, minSeverity: null, failOn: null, explain: false, listChecks: false, help: false, version: false };
  const once = (name, current, value) => {
    if (current !== null) throw new Error(`${name} was given twice`);
    return value;
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const next = () => {
      const v = argv[i + 1];
      if (v === undefined || (v.startsWith('--') && v.length > 2)) throw new Error(`${a} needs a value`);
      if (v === '-') throw new Error('reading from standard input is not supported; give a file or a folder');
      i += 1;
      return v;
    };
    if (a === '--help' || a === '-h') o.help = true;
    else if (a === '--version' || a === '-v') o.version = true;
    else if (a === '--explain') o.explain = true;
    else if (a === '--json') o.json = true;
    else if (a === '--list-checks') o.listChecks = true;
    else if (a === '--config') o.config = once(a, o.config, next());
    else if (a === '--standard') o.standard = once(a, o.standard, next());
    else if (a === '--media') o.media = once(a, o.media, next());
    else if (a === '--format') o.format = once(a, o.format, next());
    else if (a === '--min-severity') o.minSeverity = once(a, o.minSeverity, next());
    else if (a === '--fail-on') o.failOn = once(a, o.failOn, next());
    else if (a === '-') throw new Error('reading from standard input is not supported; give a file or a folder');
    else if (a.startsWith('-')) throw new Error(`unknown argument ${a}`);
    else {
      if (o.paths.length === 1) throw new Error('give one metadata folder; the config and the media folder go after --config and --media');
      o.paths.push(a);
    }
  }
  if (o.json) {
    if (o.format !== null && o.format !== 'json') throw new Error(`--json and --format ${o.format} ask for two formats; give one`);
    o.format = 'json';
  }
  if (o.format === null) o.format = 'text';
  if (!Object.hasOwn(FORMATS, o.format)) throw new Error(`unknown format ${o.format} (text, markdown, json or sarif)`);
  for (const [flag, v] of [['--min-severity', o.minSeverity], ['--fail-on', o.failOn]]) if (v !== null && !LEVELS.includes(v)) throw new Error(`${flag}: unknown level ${v} (${LEVELS.join(', ')})`);
  if (o.standard !== null) {
    const std = standardOf(o.standard);
    if (!std) throw new Error(`--standard: unknown standard ${o.standard} (${STANDARDS.join(', ')})`);
    o.standard = std;
  }
  if (o.listChecks && o.format === 'sarif') throw new Error('--list-checks has no SARIF form; use text, markdown or json');
  if (!o.help && !o.version && !o.listChecks) {
    if (o.paths.length !== 1) throw new Error('give the metadata folder, such as nft-metadata-check metadata');
    if ([...o.paths, o.config, o.media].some((p) => p !== null && isUrl(p))) throw new Error('give a local path; the tool never fetches a URL');
    if (o.explain && o.format === 'sarif') throw new Error('--explain adds the points of the pages to the text, markdown and JSON reports; the sarif format has no place for them');
  }
  return o;
}

const clean = (text) => safeText(text, 1500);

// Exit code: 0 no finding at or above the fail-on level, 1 a finding at or above it, 2 usage or input error.
export async function main(argv, io = { out: (t) => process.stdout.write(t), err: (t) => process.stderr.write(t) }, limits = undefined, base = process.cwd()) {
  let o;
  try {
    o = parseArgs(argv);
  } catch (error) {
    io.err(`nft-metadata-check: ${clean(error.message)}\n\n${USAGE}`);
    return 2;
  }
  if (o.help) {
    io.out(USAGE);
    return 0;
  }
  if (o.version) {
    io.out(`${VERSION}\n`);
    return 0;
  }
  if (o.listChecks) {
    io.out(LISTS[o.format]());
    return 0;
  }
  let report;
  try {
    report = await checkFolder({ folder: o.paths[0], config: o.config, media: o.media, standard: o.standard, minSeverity: o.minSeverity ?? 'info', failOn: o.failOn ?? 'error', version: VERSION, limits: { ...LIMITS, ...(limits ?? {}) }, base });
  } catch (error) {
    if (error instanceof InputError) io.err(`nft-metadata-check: no result, the input has ${error.problems.length === 1 ? 'a problem' : 'problems'}:\n${error.problems.map((p) => `  ${clean(p)}`).join('\n')}\n`);
    else io.err(`nft-metadata-check: ${clean(error.message)}\n`);
    return 2;
  }
  io.out(FORMATS[o.format](report, { explain: o.explain }));
  return report.result.pass ? 0 : 1;
}
