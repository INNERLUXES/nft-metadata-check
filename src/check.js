// A run: list the metadata folder and the media folder, read each metadata file and the collection config as JSON, look
// for keys and seeds in each, read the fields, run the checks of the collection and build the report object that the
// formats write.

import { dirname, resolve } from 'node:path';
import { analyze } from './analyze.js';
import { readConfig } from './config.js';
import { LEVELS, NOTICE, POINTS, pointPage } from './data.js';
import { FILE_LIMITS, InputError, displayPath, listFolder, listMedia, locateFolder, locateInput, readInputText } from './files.js';
import { idOfName, isMetadataName } from './ids.js';
import { JsonError, readJson } from './json.js';
import { readMetadata } from './metadata.js';
import { RULES, decide, ruleById } from './rules.js';
import { findSecrets } from './secrets.js';
import { SCHEMA_SOURCE } from './standards.js';
import { listText, plural } from './size.js';
import { safeText } from './text.js';

export const LIMITS = { ...FILE_LIMITS };

export { InputError };

export const DEFAULT_STANDARD = 'ERC-721';

const clean = (t, max = 900) => safeText(t, max);

const ORDER = { error: 0, warning: 1, info: 2 };

// The basis of a rule for a run: the points with their pages. A rule that rests on the schema of more than one standard
// shows only the point of the standard of the collection.
function basisOf(rule, standard) {
  const schemas = new Set(Object.values(SCHEMA_SOURCE));
  const own = rule.basis.filter((id) => schemas.has(POINTS[id].source));
  const ids = own.length > 1 ? rule.basis.filter((id) => !schemas.has(POINTS[id].source) || POINTS[id].source === SCHEMA_SOURCE[standard]) : rule.basis;
  return ids.map((id) => {
    const page = pointPage(id);
    return { text: POINTS[id].text, source: page.title, url: page.url };
  });
}

// The search for keys and seeds is the one of the sibling tools, kept unchanged in src/secrets.js; its finding is named
// for a configuration there and for any file here.
const asFile = (f, file) => ({ ...f, id: 'secret-in-file', file, subject: null, message: f.message.replace(/^The configuration holds/, 'The file holds') });

// The root node of one JSON text with its findings: { root, findings }. root is null when the text is not JSON the reader
// can follow, and findings then holds one file-unreadable finding with its line.
export function parseText(text, file, what) {
  let root;
  try {
    root = readJson(text);
  } catch (error) {
    if (!(error instanceof JsonError)) throw error;
    return { root: null, findings: [{ id: 'file-unreadable', file, line: error.line, column: error.column, message: `The ${what} is not JSON the reader can follow: ${error.message}. Nothing in the file was checked.`, subject: null }] };
  }
  return { root, findings: findSecrets(root).map((f) => asFile(f, file)) };
}

// The collection config read from its text: { config, findings, notes }.
export function parseConfig(text, file) {
  const parsed = parseText(text, file, 'collection config');
  if (!parsed.root) return { config: null, findings: parsed.findings, notes: ['the collection config was not checked, because it is not JSON the reader can follow'] };
  const r = readConfig(parsed.root, file);
  return { config: r.config, findings: [...parsed.findings, ...r.findings], notes: r.notes };
}

// The findings of the texts, with no file system. files is a list of { name, path, text } in the order of their names,
// or { name, path, problem } for a file that could not be read; config is { path, text } or null; standard is the
// standard of --standard or null; media is { shown, files } with the paths of the media folder. Returns { standard,
// files, config, analysis, findings, notes }.
export function checkTexts({ files, config = null, standard = null, media = { shown: 'the media folder', files: [] } }) {
  const findings = [];
  const notes = [];
  const cfg = config ? config.read ?? parseConfig(config.text, config.path) : null;
  if (cfg) {
    findings.push(...cfg.findings);
    notes.push(...cfg.notes);
  }
  const fromConfig = cfg?.config?.standard ?? null;
  let std;
  if (standard) {
    std = { name: standard, from: 'option' };
    if (fromConfig && fromConfig !== standard) notes.push(`the collection was read as ${standard}, the standard of --standard, and not as ${fromConfig}, the standard of the config`);
  } else if (fromConfig) std = { name: fromConfig, from: 'config' };
  else {
    std = { name: DEFAULT_STANDARD, from: 'default' };
    notes.push(`no standard was given in the config or with --standard, so the collection was read as ${DEFAULT_STANDARD}`);
  }

  const lower = new Map();
  for (const f of media.files) if (!lower.has(f.toLowerCase())) lower.set(f.toLowerCase(), f);
  const mediaSet = { shown: media.shown, files: new Set(media.files), lower };

  const read = [];
  for (const f of files) {
    const name = clean(f.name, 200);
    const parts = idOfName(f.name, std.name);
    const label = parts.collection ? 'The collection metadata' : parts.id !== null ? `Token ${parts.id}` : 'The file';
    const entry = { path: f.path, name, id: parts.id, form: parts.form, why: parts.why, collection: parts.collection, label, token: null };
    read.push(entry);
    if (f.problem) {
      findings.push({ id: 'file-unreadable', file: f.path, line: 1, column: 1, message: `The file ${f.problem}, so nothing in it was checked.`, subject: parts.id === null ? null : parts.id.toString() });
      continue;
    }
    const parsed = parseText(f.text, f.path, 'metadata file');
    findings.push(...parsed.findings);
    if (!parsed.root) continue;
    const m = readMetadata(parsed.root, { file: f.path, standard: std.name, label, subject: parts.id === null ? null : parts.id.toString() });
    findings.push(...m.findings);
    entry.token = m.token;
  }
  if (read.some((f) => f.collection)) notes.push('collection.json was read as the metadata of the collection itself, as Metaplex upload folders keep it, and not as a token');
  const analysis = analyze({ files: read, standard: std.name, config: cfg?.config ?? null, configFile: config?.path ?? null, media: mediaSet });
  return { standard: std, files: read, config: cfg?.config ?? null, analysis, findings: [...findings, ...analysis.findings], notes: [...notes, ...analysis.notes] };
}

const lineCount = (text) => {
  const parts = text === '' ? [] : text.split(/\r\n|\r|\n/);
  return parts.length > 0 && parts.at(-1) === '' ? parts.length - 1 : parts.length;
};

const byPath = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// The report object for the findings. inputs is { folder, files, bytes, other, config: { file, bytes, lines } | null,
// media: { folder, files, same } }.
export function buildReport({ inputs, checked, version, minSeverity = 'info', failOn = 'error' }) {
  const std = checked.standard.name;
  const all = checked.findings.map((f) => {
    const rule = ruleById(f.id);
    const file = clean(f.file, 400);
    return {
      id: f.id,
      severity: rule.severity,
      message: clean(f.message),
      file,
      line: f.line,
      column: f.column,
      at: `${file}:${f.line}`,
      subject: f.subject == null ? null : clean(f.subject, 120),
      fix: rule.fix,
      kind: rule.kind,
      basis: basisOf(rule, std),
      own: rule.own ?? null
    };
  });
  const configFile = inputs.config?.file ?? null;
  all.sort((a, b) => ORDER[a.severity] - ORDER[b.severity] || Number(b.file === configFile) - Number(a.file === configFile) || byPath(a.file, b.file) || a.line - b.line || a.column - b.column || byPath(a.id, b.id));
  const shown = all.filter((f) => LEVELS.indexOf(f.severity) >= LEVELS.indexOf(minSeverity));
  const byLevel = { error: 0, warning: 0, info: 0 };
  for (const f of shown) byLevel[f.severity] += 1;
  const allByLevel = { error: 0, warning: 0, info: 0 };
  for (const f of all) allByLevel[f.severity] += 1;
  const s = checked.analysis.summary;
  return {
    tool: 'nft-metadata-check',
    version,
    inputs,
    standard: checked.standard,
    summary: { files: inputs.files, tokens: s.tokens, lowest: s.lowest, highest: s.highest, range: s.range },
    totals: { findings: shown.length, byLevel, hidden: all.length - shown.length },
    rules: RULES.map((r) => ({ id: r.id, level: r.severity, kind: r.kind, findings: shown.filter((f) => f.id === r.id).length })),
    config: { minSeverity, failOn },
    findings: shown,
    traits: checked.analysis.traits.map((t) => ({ ...t, trait: clean(t.trait, 80) })),
    notes: checked.notes.map((n) => clean(n)),
    notice: NOTICE,
    result: decide(allByLevel, failOn)
  };
}

// The message of an input error without the path it starts with.
const problemOf = (error, shown) => error.problems.map((p) => (p.startsWith(`${shown}: `) ? p.slice(shown.length + 2) : p)).join('; ');

// Lists the folders, reads the files and builds the report. folder is the metadata folder; config, media and standard
// are the values of the options or null.
export async function checkFolder({ folder, config = null, media = null, standard = null, minSeverity = 'info', failOn = 'error', version, limits = LIMITS, base = process.cwd() }) {
  const problems = [];
  const attempt = async (fn) => {
    try {
      return await fn();
    } catch (error) {
      if (!(error instanceof InputError)) throw error;
      problems.push(...error.problems);
      return null;
    }
  };
  const folderAbs = await attempt(() => locateFolder(folder, base, 'metadata folder'));
  let cfg = null;
  let cfgInput = null;
  const cfgAbs = config === null ? null : await attempt(() => locateInput(config, base));
  if (cfgAbs) {
    const r = await attempt(() => readInputText(cfgAbs, base, limits));
    if (r) {
      const path = displayPath(cfgAbs, base);
      cfg = { path, text: r.text, read: parseConfig(r.text, path) };
      cfgInput = { file: path, bytes: r.bytes, lines: lineCount(r.text) };
    }
  }
  let mediaAbs = null;
  if (media !== null) mediaAbs = await attempt(() => locateFolder(media, base, 'media folder'));
  else if (cfg?.read.config?.media) {
    const given = resolve(dirname(cfgAbs), cfg.read.config.media);
    mediaAbs = await attempt(() => locateFolder(given, base, 'media folder of the config'));
  } else mediaAbs = folderAbs;
  if (problems.length) throw new InputError(problems);

  const folderShown = displayPath(folderAbs, base);
  const entries = await listFolder(folderAbs);
  const files = [];
  const other = [];
  const notes = [];
  let folders = 0;
  let total = 0;
  for (const e of entries) {
    const abs = resolve(folderAbs, e.name);
    if (abs === cfgAbs) continue;
    if (e.kind === 'folder') {
      folders += 1;
      continue;
    }
    if (!isMetadataName(e.name) || e.kind === 'other') {
      other.push(e.name);
      continue;
    }
    if (files.length === limits.maxFiles) throw new InputError([`${folderShown}: holds more than ${limits.maxFiles} metadata files, the limit of the tool`]);
    const path = `${folderShown}/${safeText(e.name, 200)}`;
    if (e.kind === 'link') {
      files.push({ name: e.name, path, problem: 'is a symbolic link, and the tool follows none' });
      continue;
    }
    try {
      const r = await readInputText(abs, base, limits);
      total += r.bytes;
      if (total > limits.maxTotalBytes) throw new InputError([`${folderShown}: its metadata files hold more than ${limits.maxTotalBytes} bytes, the limit of the tool`]);
      files.push({ name: e.name, path, text: r.text });
    } catch (error) {
      if (!(error instanceof InputError) || error.problems[0].startsWith(`${folderShown}:`)) throw error;
      files.push({ name: e.name, path, problem: problemOf(error, displayPath(abs, base)) });
    }
  }
  if (files.length === 0) throw new InputError([`${folderShown}: holds no metadata file; a metadata file ends in .json or is named for a token id`]);
  if (folders) notes.push(`${plural(folders, 'folder')} inside the metadata folder ${folders === 1 ? 'was' : 'were'} not read; the tool reads the files of the folder itself`);
  const same = mediaAbs === folderAbs;
  if (other.length) notes.push(`${plural(other.length, 'file')} of the metadata folder, ${other.length === 1 ? '' : 'such as '}${listText(other.map((n) => safeText(n, 80)), 3)}, ${other.length === 1 ? 'is' : 'are'} not named as metadata and ${other.length === 1 ? 'was' : 'were'} not read as metadata${same ? '; the media of the tokens is looked for among them' : ''}`);
  const listed = await listMedia(mediaAbs, limits);
  const mediaShown = displayPath(mediaAbs, base);
  const checked = checkTexts({ files, config: cfg, standard, media: { shown: mediaShown, files: listed.files } });
  checked.notes.unshift(...notes, ...listed.notes);
  const inputs = { folder: folderShown, files: files.length, bytes: total, other: other.length, config: cfgInput, media: { folder: mediaShown, files: listed.files.length, same } };
  return buildReport({ inputs, checked, version, minSeverity, failOn });
}
