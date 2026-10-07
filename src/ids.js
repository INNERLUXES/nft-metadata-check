// Token ids from the names of the metadata files. An ERC-721 contract that joins a base URI and an id writes the id in
// decimal with no zeros in front, and a Metaplex upload folder names its files 0.json, 1.json and so on; an ERC-1155
// client puts the id in place of {id} as 64 hex digits in small letters. A file is named for its id, with or without
// .json. Ids are BigInt values and are never read through a floating point number.

export const UINT256_MAX = (1n << 256n) - 1n;

// The longest name of an id the tool reads as a number: 78 decimal digits hold every uint256, and a few more show that
// an id is above it.
export const ID_LIMITS = { maxDigits: 100 };

const DECIMAL = /^(?:0|[1-9][0-9]*)$/;
const DIGITS = /^[0-9]+$/;
const HEX64 = /^[0-9a-f]{64}$/;
const HEXISH = /^(?:0[xX])?[0-9a-fA-F]+$/;

// The stem and the extension of a file name: ".json" in any case, or none.
export function nameParts(name) {
  if (name.length > 5 && name.slice(-5).toLowerCase() === '.json') return { stem: name.slice(0, -5), ext: name.slice(-5) };
  return { stem: name, ext: '' };
}

// Whether a name is one the tool reads as a metadata file: it ends in .json, or it has no extension at all. A name that
// starts with a dot is a hidden file and is not read.
export function isMetadataName(name) {
  if (name.startsWith('.')) return false;
  const { ext } = nameParts(name);
  return ext !== '' || !name.includes('.');
}

// The id of an ERC-1155 token as clients write it in place of {id}.
export const hex64 = (id) => id.toString(16).padStart(64, '0');

// The id a file name stands for, and how it is written: { id, form, why, collection }. form is 'ok' when the name is the
// plain id of the standard, 'hex-form' when an ERC-1155 name is an id but not in the form of {id}, and 'unexpected'
// when the name is written another way; why says how. id is null when the name holds no id the tool can read.
export function idOfName(name, standard) {
  const { stem, ext } = nameParts(name);
  const extNote = ext !== '' && ext !== '.json' ? `ends in ${ext}, in capitals` : null;
  const result = (id, form, why) => ({ id, form: form === 'ok' && extNote ? 'unexpected' : form, why: form === 'ok' && extNote ? extNote : why, collection: false });
  if (stem.length > ID_LIMITS.maxDigits + 2) return result(null, 'unexpected', 'is not an id');
  if (standard === 'ERC-1155') {
    if (HEX64.test(stem)) return result(BigInt(`0x${stem}`), 'ok', null);
    if (DIGITS.test(stem)) return result(BigInt(stem), 'hex-form', 'is written in decimal, and was read as the decimal id');
    if (HEXISH.test(stem)) {
      const digits = stem.replace(/^0[xX]/, '');
      const how = [];
      if (/^0[xX]/.test(stem)) how.push('starts with 0x');
      if (/[A-F]/.test(digits)) how.push('has hex digits in capitals');
      if (digits.length !== 64) how.push(`has ${digits.length} hex digits, not 64`);
      return result(BigInt(`0x${digits}`), 'hex-form', how.join(' and '));
    }
    return result(null, 'unexpected', 'is not an id');
  }
  if (standard === 'Metaplex' && stem === 'collection') return { id: null, form: 'ok', why: null, collection: true };
  if (DECIMAL.test(stem)) return result(BigInt(stem), 'ok', null);
  if (DIGITS.test(stem)) return result(BigInt(stem), 'unexpected', 'has zeros in front of the id');
  if (HEX64.test(stem)) return result(BigInt(`0x${stem}`), 'unexpected', 'is written as 64 hex digits, the form of ERC-1155, and was read as a hex id');
  return result(null, 'unexpected', 'is not an id');
}

// The plain name of the file of an id, as the base URI leads to it.
export const plainName = (id, standard) => `${standard === 'ERC-1155' ? hex64(id) : id.toString()}.json`;

// Compares two BigInt ids.
export const compareIds = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// The runs of ids from first to last that are not in ids (a sorted list without repeats): [[from, to], ...], at most
// max of them, with more true when there are others. The range is never walked id by id.
export function missingRuns(ids, first, last, max) {
  const runs = [];
  let next = first;
  let more = false;
  for (const id of ids) {
    if (id < first) continue;
    if (id > last) break;
    if (id > next) {
      if (runs.length === max) {
        more = true;
        break;
      }
      runs.push([next, id - 1n]);
    }
    next = id + 1n;
  }
  if (!more && next <= last) {
    if (runs.length === max) more = true;
    else runs.push([next, last]);
  }
  return { runs, more };
}
