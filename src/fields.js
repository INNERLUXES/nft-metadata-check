// Reading fields from the nodes of the JSON reader. Every field is read with the line and column of its key, so a finding
// can point at it. Keys of a file are only compared with the names the tool reads; no object is built with a key from a
// file. A value that src/secrets.js marked as a seed or a key is left out as if it were not there, and never shown.

export const where = (e) => ({ line: e.line, column: e.column });

// A text from a file as a message names it: cut at a length, so that a long value does not fill a report.
export const cut = (text, max = 120) => (text.length > max ? `${text.slice(0, max - 3)}...` : text);

// A name with its case and every character that is not a letter or a digit left out, for comparing spellings.
export const looseName = (key) => key.toLowerCase().replace(/[^a-z0-9]/g, '');

// The known key that an unknown one differs from only in case or separators, or null.
export function sameLetters(key, known) {
  const k = looseName(key);
  if (k === '') return null;
  return known.find((n) => n !== key && looseName(n) === k) ?? null;
}

// A known key that an unknown one of the config is probably meant to be: the same letters in another case or with other
// separators, or one that starts with the other.
export function suggestKey(key, known) {
  const k = looseName(key);
  if (k.length < 3) return null;
  return known.find((n) => looseName(n) === k) ?? known.find((n) => looseName(n).startsWith(k) || k.startsWith(looseName(n))) ?? null;
}

export const describe = (node) => (node.secret ? 'a value that is not shown' : node.kind === 'object' ? 'an object' : node.kind === 'array' ? 'a list' : node.kind === 'null' ? 'null' : node.kind === 'boolean' ? `${node.value}` : node.kind === 'number' ? `the number ${node.raw.length > 40 ? `${node.raw.slice(0, 37)}...` : node.raw}` : 'text');

// The findings of one file, which is named by the path the report shows.
export class Reader {
  constructor(file) {
    this.file = file;
    this.findings = [];
  }

  add(id, at, message, subject = null) {
    this.findings.push({ id, file: this.file, line: at.line, column: at.column, message, subject });
  }

  // The entries of an object, with the first entry of each key in a map. A key that names a seed or a key was reported
  // by src/secrets.js and is passed over. unknown(e) is called for each key that is not in known.
  fields(obj, known, unknown = () => {}) {
    const map = new Map();
    for (const e of obj.entries) {
      if (e.secret) continue;
      if (known.includes(e.key)) {
        if (!map.has(e.key)) map.set(e.key, e);
      } else unknown(e);
    }
    return map;
  }
}
