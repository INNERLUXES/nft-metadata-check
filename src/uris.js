// What a URI in the metadata or the config is, from its text alone. Nothing is fetched, resolved or looked up: the tool
// reads the scheme and the form of the text. A content address (ipfs:, ar:) names the bytes it serves; a web address
// (http:, https:) names a server; a data: URI holds the media itself; a path on the machine that built the files reaches
// nothing once the files are uploaded; a relative path is a file of the media folder that an upload tool replaces.

export const URI_LIMITS = { maxDataLength: 65536 };

export const CONTENT_SCHEMES = ['ipfs', 'ar'];
export const WEB_SCHEMES = ['https', 'http'];

const SCHEME = /^([a-zA-Z][a-zA-Z0-9+.-]*):/;
const DRIVE = /^[a-zA-Z]:[\\/]/;
const PLACEHOLDER = /\{[^{}]{0,40}\}/g;

// { kind, scheme, why } with kind 'empty', 'content', 'web', 'data', 'local', 'relative' or 'unknown'.
export function uriKind(text) {
  const t = text.trim();
  if (t === '') return { kind: 'empty', scheme: null, why: null };
  if (DRIVE.test(t)) return { kind: 'local', scheme: null, why: 'starts with a drive letter' };
  const m = SCHEME.exec(t);
  if (m) {
    const scheme = m[1].toLowerCase();
    if (CONTENT_SCHEMES.includes(scheme)) return { kind: 'content', scheme, why: null };
    if (WEB_SCHEMES.includes(scheme)) return { kind: 'web', scheme, why: null };
    if (scheme === 'data') return { kind: 'data', scheme, why: null };
    if (scheme === 'file') return { kind: 'local', scheme, why: 'is a file: URI' };
    return { kind: 'unknown', scheme, why: null };
  }
  if (t.startsWith('/')) return { kind: 'local', scheme: null, why: 'is an absolute path' };
  if (t.includes('\\')) return { kind: 'local', scheme: null, why: 'holds a backslash, the separator of a Windows path' };
  if (t.startsWith('~')) return { kind: 'local', scheme: null, why: 'starts with ~, the home folder of a user' };
  if (t.split('/').includes('..')) return { kind: 'local', scheme: null, why: 'holds .., which leaves the media folder' };
  return { kind: 'relative', scheme: null, why: null };
}

// The placeholders in braces in a text, such as {id} or {ID}, each at most 40 characters.
export const placeholders = (text) => text.match(PLACEHOLDER) ?? [];

// The path of a relative URI inside the media folder: a ./ in front left out, and a query or a fragment left out.
export function mediaPath(text) {
  let t = text.trim();
  while (t.startsWith('./')) t = t.slice(2);
  const cut = t.search(/[?#]/);
  return cut < 0 ? t : t.slice(0, cut);
}

// The path with percent escapes read, or null when they are not valid.
export function decodedPath(path) {
  if (!path.includes('%')) return null;
  try {
    return decodeURIComponent(path);
  } catch {
    return null;
  }
}
