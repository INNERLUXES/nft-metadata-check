// Reading the input: the metadata folder, the media folder and the collection config. A folder is listed without
// following a link, and the media folder is walked with a stack of its own to a bounded depth and number of files. A file
// is a regular file of bounded size, opened without following a link where the system allows, decoded as UTF-8 or as
// UTF-16 by its byte order mark, and refused when it holds a null byte. Nothing else is opened, and nothing is written.

import { constants } from 'node:fs';
import { lstat, open, readdir } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { safeText } from './text.js';

export const FILE_LIMITS = { maxBytes: 16 * 1024 * 1024, maxFiles: 100000, maxTotalBytes: 512 * 1024 * 1024, maxMediaFiles: 200000, maxMediaDepth: 32 };

export class InputError extends Error {
  constructor(problems) {
    super(problems.join('; '));
    this.name = 'InputError';
    this.problems = problems;
  }
}

// The path as the report shows it: relative to the folder the command runs in, with forward slashes; a path outside that
// folder is shown whole.
export function displayPath(absolute, base) {
  const rel = relative(base, absolute);
  const shown = rel === '' || rel.startsWith('..') || isAbsolute(rel) ? absolute : rel;
  return safeText(shown.split(sep).join('/'), 400);
}

// The file to read for a path given on the command line: a regular file, never a link, a folder or a device.
export async function locateInput(given, base) {
  const absolute = resolve(base, given);
  const shown = displayPath(absolute, base);
  let s;
  try {
    s = await lstat(absolute);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') throw new InputError([`${shown}: does not exist`]);
    throw new InputError([`${shown}: ${error.code ?? 'cannot be read'}`]);
  }
  if (s.isSymbolicLink()) throw new InputError([`${shown}: is a symbolic link; give the file it points to`]);
  if (s.isDirectory()) throw new InputError([`${shown}: is a folder; give the file`]);
  if (!s.isFile()) throw new InputError([`${shown}: is not a regular file`]);
  return absolute;
}

// The text of bytes: UTF-8 (a byte order mark is dropped) or UTF-16 with a byte order mark.
export function decode(buffer) {
  const bytes = buffer;
  if (bytes.length >= 2 && ((bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes[0] === 0xfe && bytes[1] === 0xff))) {
    if ((bytes.length - 2) % 2 !== 0) throw new Error('has an odd number of bytes for UTF-16');
    const body = Buffer.from(bytes.subarray(2));
    if (bytes[0] === 0xfe) body.swap16();
    try {
      return new TextDecoder('utf-16le', { fatal: true }).decode(body);
    } catch {
      throw new Error('is not valid UTF-16');
    }
  }
  if (bytes.includes(0)) throw new Error('holds a null byte; it is not a text file');
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error('is not valid UTF-8');
  }
}

// The text of a file, read through one open handle whose type and size are checked before the read.
export async function readInputText(absolute, base, limits = FILE_LIMITS) {
  const shown = displayPath(absolute, base);
  let handle;
  try {
    handle = await open(absolute, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    const s = await handle.stat();
    if (!s.isFile()) throw new InputError([`${shown}: is not a regular file`]);
    if (s.size > limits.maxBytes) throw new InputError([`${shown}: is larger than ${limits.maxBytes} bytes`]);
    const buffer = await handle.readFile();
    if (buffer.length > limits.maxBytes) throw new InputError([`${shown}: is larger than ${limits.maxBytes} bytes`]);
    try {
      return { text: decode(buffer), bytes: buffer.length };
    } catch (error) {
      throw new InputError([`${shown}: ${error.message}`]);
    }
  } catch (error) {
    if (error instanceof InputError) throw error;
    throw new InputError([`${shown}: ${error.code === 'ELOOP' ? 'is a symbolic link; give the file it points to' : (error.code ?? 'cannot be read')}`]);
  } finally {
    await handle?.close();
  }
}

// The folder to read for a path given on the command line: a folder, never a link or a file.
export async function locateFolder(given, base, what = 'folder') {
  const absolute = resolve(base, given);
  const shown = displayPath(absolute, base);
  let s;
  try {
    s = await lstat(absolute);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') throw new InputError([`${shown}: does not exist`]);
    throw new InputError([`${shown}: ${error.code ?? 'cannot be read'}`]);
  }
  if (s.isSymbolicLink()) throw new InputError([`${shown}: is a symbolic link; give the ${what} it points to`]);
  if (!s.isDirectory()) throw new InputError([`${shown}: is not a folder; give the ${what}`]);
  return absolute;
}

// The entries of one folder, sorted by name in the order of their code units: { name, kind } with kind 'file', 'folder',
// 'link' or 'other'. No link is followed.
export async function listFolder(absolute) {
  const entries = await readdir(absolute, { withFileTypes: true });
  const kindOf = (e) => (e.isSymbolicLink() ? 'link' : e.isFile() ? 'file' : e.isDirectory() ? 'folder' : 'other');
  return entries.map((e) => ({ name: e.name, kind: kindOf(e) })).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

// The regular files below the media folder, as paths relative to it with forward slashes, walked with a stack of its own
// and no link followed: { files, notes }. The walk stops at the limits of depth and of files, and a note says so.
export async function listMedia(absolute, limits = FILE_LIMITS) {
  const files = [];
  const notes = [];
  const stack = [{ dir: absolute, rel: '', depth: 0 }];
  let deep = false;
  while (stack.length > 0) {
    const { dir, rel, depth } = stack.pop();
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      notes.push(rel === '' ? 'the media folder could not be listed' : `the folder ${safeText(rel, 200)} of the media folder could not be listed`);
      continue;
    }
    for (const e of entries) {
      const path = rel === '' ? e.name : `${rel}/${e.name}`;
      if (e.isFile()) {
        if (files.length === limits.maxMediaFiles) {
          notes.push(`the media folder holds more than ${limits.maxMediaFiles} files; the tool listed the first ${limits.maxMediaFiles}`);
          return { files, notes };
        }
        files.push(path);
      } else if (e.isDirectory() && !e.isSymbolicLink()) {
        if (depth + 1 > limits.maxMediaDepth) deep = true;
        else stack.push({ dir: resolve(dir, e.name), rel: path, depth: depth + 1 });
      }
    }
  }
  if (deep) notes.push(`folders of the media folder deeper than ${limits.maxMediaDepth} levels were not listed`);
  return { files, notes };
}
