// The checks of the whole collection, after each file was read: the names of the files and the ids they stand for, the
// range of ids of the config, the URIs of the media against the media folder, the base URI, names and sets of
// attributes written twice, and the traits across the tokens. Every list is kept in a Map or a Set, so the work grows
// with the number of files, and the range of ids is never walked id by id.

import { cut, looseName } from './fields.js';
import { UINT256_MAX, compareIds, hex64, missingRuns, plainName } from './ids.js';
import { grouped, listText, plural } from './size.js';
import { URI_LIMITS, decodedPath, mediaPath, placeholders, uriKind } from './uris.js';

export const ANALYZE_LIMITS = { maxRuns: 100, maxTraits: 200 };

const idText = (id) => id.toString();
const run = ([a, b]) => (a === b ? `Id ${idText(a)}` : `Ids ${idText(a)} to ${idText(b)}`);
const count = ([a, b]) => b - a + 1n;

// The findings of the URIs of one token.
function checkUris(t, standard, media, add) {
  for (const u of t.token.uris) {
    let value = u.value;
    const at = { line: u.node.line, column: u.node.column };
    const marks = placeholders(value);
    if (standard === 'ERC-1155') {
      const odd = [...new Set(marks.filter((p) => p !== '{id}'))];
      if (odd.length) add('uri-id-substitution', at, `The ${u.field} of ${t.label.toLowerCase()} holds ${listText(odd.map((p) => `"${cut(p, 44)}"`))}; an ERC-1155 client replaces only the exact text {id}, so the placeholder reaches the wallet as it is written.`);
      if (marks.includes('{id}') && t.id !== null) value = value.split('{id}').join(hex64(t.id));
    }
    const k = uriKind(value);
    if (k.kind === 'data') {
      if (value.length > URI_LIMITS.maxDataLength) add('uri-data-large', at, `The ${u.field} of ${t.label.toLowerCase()} is a data: URI of ${grouped(value.length)} characters, above the limit of ${grouped(URI_LIMITS.maxDataLength)} of the tool; a wallet or a marketplace may cut or refuse it.`);
    } else if (k.kind === 'web') {
      add('uri-mutable', at, `The ${u.field} of ${t.label.toLowerCase()} is on ${k.scheme}:, a web address whose server can change or remove the file after the mint${k.scheme === 'http' ? ', and that is not encrypted' : ''}.`);
    } else if (k.kind === 'local') {
      add('uri-local-path', at, `The ${u.field} of ${t.label.toLowerCase()}, "${cut(value, 80)}", ${k.why}: a path on the machine that built the files, which no wallet can reach.`);
    } else if (k.kind === 'unknown') {
      add('uri-scheme-unknown', at, `The ${u.field} of ${t.label.toLowerCase()} uses the scheme ${cut(k.scheme, 30)}:, which is not one the tool knows (ipfs:, ar:, https:, http:, data:).`);
    } else if (k.kind === 'relative') {
      const path = mediaPath(value);
      const decoded = decodedPath(path);
      if (media.files.has(path) || (decoded !== null && media.files.has(decoded))) continue;
      const near = media.lower.get(path.toLowerCase()) ?? (decoded === null ? undefined : media.lower.get(decoded.toLowerCase()));
      const hint = near ? ` The folder holds ${cut(near, 80)}, which differs only in case; a server of the uploaded files may tell the two apart.` : marks.includes('{id}') && standard !== 'ERC-1155' ? ' Only ERC-1155 clients replace {id}.' : '';
      add('media-missing', at, `The ${u.field} of ${t.label.toLowerCase()} is the relative path "${cut(u.value, 80)}", and the media folder ${media.shown} holds no file ${cut(path, 80)}.${hint}`);
    }
  }
}

// The findings of the base URI of the config.
function checkBaseUri(config, standard, add) {
  const base = config.baseUri;
  const e = config.baseUriEntry;
  const at = { line: e.value.line, column: e.value.column };
  const marks = placeholders(base);
  if (standard === 'ERC-1155') {
    const odd = [...new Set(marks.filter((p) => p !== '{id}'))];
    if (odd.length) add('uri-id-substitution', at, `The baseUri of the collection config holds ${listText(odd.map((p) => `"${cut(p, 44)}"`))}; an ERC-1155 client replaces only the exact text {id}.`);
    else if (!marks.includes('{id}')) add('uri-id-substitution', at, `The baseUri of the collection config, "${cut(base, 80)}", has no {id}; an ERC-1155 client finds the metadata of a token by putting its id in place of {id}, so every token would read the same URI.`);
  } else if (standard === 'ERC-721' && !marks.includes('{id}') && !base.endsWith('/')) {
    add('base-uri-no-slash', at, `The baseUri of the collection config, "${cut(base, 80)}", does not end in /, so a contract that joins it and the id asks for ${cut(base, 80)}1 for token 1.`);
  }
  const k = uriKind(base);
  if (k.kind === 'web') add('uri-mutable', at, `The baseUri of the collection config is on ${k.scheme}:, a web address whose server can change or remove the metadata after the mint${k.scheme === 'http' ? ', and that is not encrypted' : ''}.`);
  else if (k.kind === 'local') add('uri-local-path', at, `The baseUri of the collection config, "${cut(base, 80)}", ${k.why}: a path on the machine that built the files, which no wallet can reach.`);
  else if (k.kind === 'unknown') add('uri-scheme-unknown', at, `The baseUri of the collection config uses the scheme ${cut(k.scheme, 30)}:, which is not one the tool knows (ipfs:, ar:, https:, http:).`);
  else if (k.kind === 'relative' || k.kind === 'data') add('uri-scheme-unknown', at, `The baseUri of the collection config, "${cut(base, 80)}", ${k.kind === 'data' ? 'is a data: URI, which cannot be joined to an id' : 'has no scheme, so a wallet cannot fetch it'}.`);
}

// The checks of the collection: { findings, notes, summary, traits }. files is a list of { path, name, id, form, why,
// collection, label, token } in the order of their names; config is the read config or null.
export function analyze({ files, standard, config, configFile, media, limits = ANALYZE_LIMITS }) {
  const findings = [];
  const notes = [];
  const adder = (file, subject) => (id, at, message) => findings.push({ id, file, line: at.line, column: at.column, message, subject });
  const first = { line: 1, column: 1 };

  // The names of the files.
  for (const f of files) {
    const add = adder(f.path, f.id === null ? null : idText(f.id));
    const shown = `"${cut(f.name, 80)}"`;
    if (f.form === 'hex-form') add('id-hex-form', first, `The file name ${shown} ${f.why}; an ERC-1155 client puts the id in place of {id} as 64 hex digits in small letters with no 0x, so for token ${idText(f.id)} it asks for ${plainName(f.id, standard)}.`);
    else if (f.form === 'unexpected') add('file-name-unexpected', first, f.id === null ? `The file name ${shown} ${f.why}, so no token id leads to it; it was checked for its fields but not counted as a token.` : `The file name ${shown} ${f.why}; a base URI joined to id ${idText(f.id)} leads to ${plainName(f.id, standard)}.`);
  }

  // The ids: above uint256, written twice, outside the range.
  const range = config?.range ?? null;
  const byId = new Map();
  for (const f of files) {
    if (f.id === null) continue;
    const add = adder(f.path, idText(f.id));
    if (f.id > UINT256_MAX) {
      add('id-out-of-range', first, `The file ${cut(f.name, 80)} is for an id above the largest uint256, the type of a token id, so no token can have it.`);
      continue;
    }
    const before = byId.get(f.id);
    if (before) {
      add('id-duplicate', first, `The file ${cut(f.name, 80)} is for id ${idText(f.id)}, and so is ${cut(before.name, 80)}; which one a server gives for the token depends on the server.`);
      continue;
    }
    byId.set(f.id, f);
    if (range && (f.id < range.first || f.id > range.last)) add('id-out-of-range', first, `The file ${cut(f.name, 80)} is for id ${idText(f.id)}, outside the tokenIds of the collection config, ${idText(range.first)} to ${idText(range.last)}.`);
  }
  const ids = [...byId.keys()].sort(compareIds);

  // Ids with no file: inside the range of the config, or between the lowest and the highest id.
  if (range) {
    const { runs, more } = missingRuns(ids, range.first, range.last, limits.maxRuns);
    const at = { line: config.rangeEntry.line, column: config.rangeEntry.column };
    const add = adder(configFile, null);
    for (const r of runs) add('id-missing', at, `${run(r)} of the tokenIds (${idText(range.first)} to ${idText(range.last)}) ${r[0] === r[1] ? 'has' : 'have'} no metadata file${r[0] === r[1] ? '' : ` (${grouped(count(r))} ids)`}.`);
    if (more) notes.push(`the ids with no file were reported for the first ${limits.maxRuns} runs; there are more`);
  } else {
    let gaps = 0;
    for (let i = 1; i < ids.length; i += 1) {
      if (ids[i] - ids[i - 1] === 1n) continue;
      if (gaps === limits.maxRuns) {
        notes.push(`the gaps in the ids were reported for the first ${limits.maxRuns}; there are more`);
        break;
      }
      gaps += 1;
      const r = [ids[i - 1] + 1n, ids[i] - 1n];
      const f = byId.get(ids[i]);
      adder(f.path, idText(ids[i]))('id-gap', first, `${run(r)} ${r[0] === r[1] ? 'is' : 'are'} missing between token ${idText(ids[i - 1])} (${cut(byId.get(ids[i - 1]).name, 80)}) and token ${idText(ids[i])} (${cut(f.name, 80)}); give the range of ids in the config when the gap is meant.`);
    }
  }

  // The URIs of the media, and the base URI of the config.
  for (const f of files) if (f.token) checkUris(f, standard, media, adder(f.path, f.id === null ? null : idText(f.id)));
  if (config?.baseUri) checkBaseUri(config, standard, adder(configFile, null));

  // Names and sets of attributes written twice, among the files of a token.
  // The first file of each id is the token; a second file of an id was reported as id-duplicate.
  const tokens = files.filter((f) => f.token && f.id !== null && !f.collection && byId.get(f.id) === f);
  const names = new Map();
  const sets = new Map();
  for (const f of tokens) {
    const add = adder(f.path, idText(f.id));
    if (f.token.name !== null) {
      const key = f.token.name.trim().replace(/\s+/g, ' ').toLowerCase();
      const before = names.get(key);
      if (before) add('name-duplicate', where(f.token.nameEntry.value), `Token ${idText(f.id)} has the name "${cut(f.token.name.trim(), 80)}", as token ${idText(before.id)} (${cut(before.name, 80)}) does.`);
      else names.set(key, f);
    }
    if (f.token.attributes && f.token.attributes.length > 0) {
      const key = f.token.attributes.map((a) => `${a.trait}\u0000${a.kind}\u0000${a.kind === 'number' ? a.value.raw : a.value.value}`).sort().join('\u0001');
      const before = sets.get(key);
      if (before) add('attributes-duplicate', where(f.token.attributesEntry), `Token ${idText(f.id)} has the same ${plural(f.token.attributes.length, 'attribute')} as token ${idText(before.id)} (${cut(before.name, 80)}).`);
      else sets.set(key, f);
    }
  }

  // The traits across the tokens: the types of the values of each trait, and spellings of one trait.
  const traits = new Map();
  const spellings = new Map();
  for (const f of tokens) {
    for (const a of f.token.attributes ?? []) {
      let t = traits.get(a.trait);
      if (!t) {
        t = { trait: a.trait, tokens: new Set(), values: new Set(), kinds: new Map(), uses: [] };
        traits.set(a.trait, t);
      }
      t.tokens.add(f);
      t.values.add(`${a.kind}\u0000${a.kind === 'number' ? a.value.raw : a.value.value}`);
      t.kinds.set(a.kind, (t.kinds.get(a.kind) ?? 0) + 1);
      t.uses.push({ f, a });
      const loose = looseName(a.trait);
      let s = spellings.get(loose);
      if (!s) {
        s = new Map();
        spellings.set(loose, s);
      }
      s.set(a.trait, (s.get(a.trait) ?? 0) + 1);
    }
  }
  const most = (m) => [...m.entries()].reduce((best, e) => (e[1] > best[1] ? e : best))[0];
  for (const t of traits.values()) {
    if (t.kinds.size < 2) continue;
    const main = most(t.kinds);
    const seen = new Set();
    for (const { f, a } of t.uses) {
      if (a.kind === main || seen.has(f)) continue;
      seen.add(f);
      adder(f.path, idText(f.id))('trait-type-inconsistent', where(a.value), `The value of the trait "${cut(a.trait, 60)}" of token ${idText(f.id)} is ${a.kind === 'text' ? 'text' : 'a number'}, but in ${plural(t.kinds.get(main), 'other attribute')} of the collection it is ${main === 'text' ? 'text' : 'a number'}.`);
    }
  }
  for (const s of spellings.values()) {
    if (s.size < 2) continue;
    const main = most(s);
    for (const [spelling] of s) {
      if (spelling === main) continue;
      for (const { f, a } of traits.get(spelling).uses) adder(f.path, idText(f.id))('trait-type-inconsistent', where(a.traitEntry), `The trait type "${cut(spelling, 60)}" of token ${idText(f.id)} differs only in case or separators from "${cut(main, 60)}", which ${plural(s.get(main), 'other attribute')} of the collection use${s.get(main) === 1 ? 's' : ''}; a marketplace shows them as two traits.`);
    }
  }
  const rows = [...traits.values()].sort((a, b) => (a.trait < b.trait ? -1 : a.trait > b.trait ? 1 : 0));
  if (rows.length > limits.maxTraits) notes.push(`the table of traits shows the first ${limits.maxTraits} of ${grouped(rows.length)} trait types`);
  const traitRows = rows.slice(0, limits.maxTraits).map((t) => ({ trait: t.trait, tokens: t.tokens.size, values: t.values.size, types: ['text', 'number'].filter((k) => t.kinds.has(k)) }));

  const summary = { tokens: ids.length, lowest: ids.length ? idText(ids[0]) : null, highest: ids.length ? idText(ids.at(-1)) : null, range: range ? { first: idText(range.first), last: idText(range.last) } : null };
  return { findings, notes, summary, traits: traitRows };
}

function where(node) {
  return { line: node.line, column: node.column };
}
