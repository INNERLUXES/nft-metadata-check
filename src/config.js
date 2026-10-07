// Reading the collection config from the nodes of the JSON reader: the standard, the range of token ids, the base URI and
// the media folder. Every field is optional, and every field is read with the line and column of its key. A key the
// tool does not read is field-unknown, and a value of the wrong type or form is field-invalid; such a value is left out
// of the checks that need it, and nothing that was not read is taken for a value that is fine.

import { isObject, isString } from './json.js';
import { Reader, cut, describe, suggestKey, where } from './fields.js';
import { UINT256_MAX } from './ids.js';
import { STANDARDS, standardOf } from './standards.js';

export const CONFIG_KEYS = ['standard', 'tokenIds', 'baseUri', 'media', 'notes'];
export const RANGE_KEYS = ['first', 'last'];

const WHOLE = /^(?:0|[1-9][0-9]{0,77})$/;
const URL = /^[a-z][a-z0-9+.-]*:\/\//i;

// A token id of the range: a whole number as a JSON number or as text, from 0 to the largest uint256.
function readId(reader, e, of) {
  const node = e.value;
  const raw = node.kind === 'number' ? node.raw : isString(node) ? node.value.trim() : null;
  if (raw !== null && WHOLE.test(raw) && BigInt(raw) <= UINT256_MAX) return BigInt(raw);
  reader.add('field-invalid', where(e), `The ${e.key} of ${of} is ${isString(node) ? `"${cut(node.value, 40)}"` : describe(node)}; it must be a whole number from 0 to the largest uint256, written as a number or as text in decimal.`);
  return null;
}

// Reads the config from the root node: { config, findings, notes }. config is null when the top level is not an object.
export function readConfig(root, file) {
  const reader = new Reader(file);
  if (!isObject(root)) {
    reader.add('file-unreadable', where(root), `The top level of the collection config is ${describe(root)}, not an object with the standard, the token ids, the base URI and the media folder, so nothing in it was checked.`);
    return { config: null, findings: reader.findings, notes: ['the collection config was not checked, because it holds no object at its top level'] };
  }
  const unknown = (label, known) => (e) => {
    const near = suggestKey(e.key, known);
    reader.add('field-unknown', where(e), `The key "${cut(e.key)}" of ${label} is not one the tool reads, so its value was left out of every check.${near ? ` Did you mean "${near}"?` : ''} The keys of ${label} are ${known.join(', ')}.`);
  };
  const m = reader.fields(root, CONFIG_KEYS, unknown('the collection config', CONFIG_KEYS));
  const config = { standard: null, standardEntry: null, range: null, rangeEntry: null, baseUri: null, baseUriEntry: null, media: null, mediaEntry: null };
  const text = (key, what) => {
    const e = m.get(key);
    if (!e || e.value.secret) return null;
    if (!isString(e.value) || e.value.value.trim() === '') {
      reader.add('field-invalid', where(e), `The ${key} of the collection config is ${isString(e.value) ? 'empty' : describe(e.value)}; it must be text: ${what}.`);
      return null;
    }
    return e;
  };

  const s = text('standard', `one of ${STANDARDS.join(', ')}`);
  if (s) {
    const std = standardOf(s.value.value);
    if (std) {
      config.standard = std;
      config.standardEntry = s;
    } else reader.add('field-invalid', where(s), `The standard of the collection config is "${cut(s.value.value, 40)}", which is not a standard the tool reads; it must be one of ${STANDARDS.join(', ')}.`);
  }

  const r = m.get('tokenIds');
  if (r && !r.value.secret) {
    if (!isObject(r.value)) reader.add('field-invalid', where(r), `The tokenIds of the collection config are ${describe(r.value)}; they must be an object with the first and the last id, such as {"first": 1, "last": 100}.`);
    else {
      const rm = reader.fields(r.value, RANGE_KEYS, unknown('the tokenIds', RANGE_KEYS));
      const first = rm.get('first');
      const last = rm.get('last');
      const a = first && !first.value.secret ? readId(reader, first, 'the tokenIds') : null;
      const b = last && !last.value.secret ? readId(reader, last, 'the tokenIds') : null;
      if (!first || !last) reader.add('field-invalid', where(r), `The tokenIds of the collection config have no ${!first && !last ? 'first and no last' : !first ? 'first' : 'last'} id; they must give both, such as {"first": 1, "last": 100}.`);
      else if (a !== null && b !== null) {
        if (a > b) reader.add('field-invalid', where(r), `The tokenIds of the collection config run from ${a} to ${b}; the first id must not be above the last.`);
        else {
          config.range = { first: a, last: b };
          config.rangeEntry = r;
        }
      }
    }
  }

  const u = text('baseUri', 'the URI the token ids are joined to');
  if (u) {
    config.baseUri = u.value.value.trim();
    config.baseUriEntry = u;
  }

  const md = text('media', 'the path of the media folder, relative to the folder of the config');
  if (md) {
    if (URL.test(md.value.value.trim())) reader.add('field-invalid', where(md), 'The media of the collection config is an address; it must be the path of a local folder, because the tool fetches nothing.');
    else {
      config.media = md.value.value.trim();
      config.mediaEntry = md;
    }
  }
  return { config, findings: reader.findings, notes: [] };
}
