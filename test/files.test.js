import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, symlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { FILE_LIMITS, InputError, checkFolder, decode, displayPath, listFolder, listMedia, locateFolder, locateInput, readInputText } from '../src/index.js';
import { ARGS, GOOD, cli, meta, run, text, withFiles } from './helpers.js';

test('decode: UTF-8 with and without a byte order mark, and UTF-16 in both byte orders', () => {
  assert.equal(decode(Buffer.from('{}\n')), '{}\n');
  assert.equal(decode(Buffer.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d])), '{}');
  assert.equal(decode(Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('"\u00e9"', 'utf16le')])), '"\u00e9"');
  const be = Buffer.from('{"a": 1}', 'utf16le').swap16();
  assert.equal(decode(Buffer.concat([Buffer.from([0xfe, 0xff]), be])), '{"a": 1}');
});

test('decode: a null byte, bytes that are not UTF-8, an odd number of UTF-16 bytes and a lone UTF-16 surrogate are refused', () => {
  assert.throws(() => decode(Buffer.from([0x7b, 0x00, 0x7d])), /null byte/);
  assert.throws(() => decode(Buffer.from([0xc3, 0x28])), /not valid UTF-8/);
  assert.throws(() => decode(Buffer.from([0xff, 0xfe, 0x61])), /odd number of bytes/);
  assert.throws(() => decode(Buffer.from([0xff, 0xfe, 0x00, 0xd8])), /not valid UTF-16/);
});

test('displayPath: relative with forward slashes inside the folder, and the whole path outside it', () => {
  const base = resolve('/work/project');
  assert.equal(displayPath(resolve(base, 'nft/metadata'), base), 'nft/metadata');
  const outside = resolve(base, '..', 'elsewhere', 'metadata');
  assert.ok(!displayPath(outside, base).includes('\\'));
  assert.ok(displayPath(outside, base).endsWith('elsewhere/metadata'));
});

test('locateFolder and locateInput: a folder for the metadata and the media, a file for the config, and what each refuses', async () => {
  await withFiles({ 'metadata/1.json': text(meta(1)) }, async (dir) => {
    assert.equal(await locateFolder('metadata', dir), resolve(dir, 'metadata'));
    await assert.rejects(locateFolder('metadata/1.json', dir, 'metadata folder'), /is not a folder; give the metadata folder/);
    await assert.rejects(locateFolder('none', dir), /does not exist/);
    assert.equal(await locateInput('metadata/1.json', dir), resolve(dir, 'metadata/1.json'));
    await assert.rejects(locateInput('metadata', dir), /is a folder; give the file/);
    await assert.rejects(locateInput('metadata/1.json/x', dir), /does not exist/);
  });
});

test('listFolder sorts the names by their code units, and listMedia walks the media folder with forward slashes', async () => {
  await withFiles({ 'm/b.json': '{}', 'm/C.json': '{}', 'm/a.png': 'x', 'm/sub/1.png': 'x', 'm/sub/deep/2.png': 'x' }, async (dir) => {
    const names = (await listFolder(resolve(dir, 'm'))).map((e) => `${e.name}:${e.kind}`);
    assert.deepEqual(names, ['C.json:file', 'a.png:file', 'b.json:file', 'sub:folder']);
    const media = await listMedia(resolve(dir, 'm'));
    assert.deepEqual(media.files.sort(), ['C.json', 'a.png', 'b.json', 'sub/1.png', 'sub/deep/2.png']);
    assert.deepEqual(media.notes, []);
    const shallow = await listMedia(resolve(dir, 'm'), { ...FILE_LIMITS, maxMediaDepth: 1 });
    assert.ok(!shallow.files.includes('sub/deep/2.png'));
    assert.match(shallow.notes[0], /deeper than 1 levels were not listed/);
    const few = await listMedia(resolve(dir, 'm'), { ...FILE_LIMITS, maxMediaFiles: 2 });
    assert.equal(few.files.length, 2);
    assert.match(few.notes[0], /holds more than 2 files/);
  });
});

test('the media folder: --media, then the media of the config relative to the config, then the metadata folder itself', async () => {
  const set = { 'c/collection.json': text({ standard: 'ERC-721', media: '../art' }), 'metadata/1.json': text(meta(1, { image: '1.png' })), 'art/1.png': 'x', 'other/1.png': 'x' };
  await withFiles(set, async (dir) => {
    const fromConfig = await cli(['metadata', '--config', 'c/collection.json'], dir);
    assert.equal(fromConfig.code, 0, fromConfig.err);
    assert.match(fromConfig.out, /\nmedia: art \(1 file\)\n/);
    const option = await cli(['metadata', '--config', 'c/collection.json', '--media', 'other'], dir);
    assert.match(option.out, /\nmedia: other \(1 file\)\n/);
    const own = await cli(['metadata'], dir);
    assert.equal(own.code, 1);
    assert.match(own.out, /\nmedia: the metadata folder \(1 file\)\n/);
    assert.match(own.out, /ERROR {4}media-missing/);
  });
  const missing = await run({ 'collection.json': text({ media: 'nowhere' }), 'metadata/1.json': text(meta(1)) }, ['metadata', '--config', 'collection.json']);
  assert.equal(missing.code, 2);
  assert.match(missing.err, /nowhere: does not exist/);
});

test('the config inside the metadata folder is not read as a token, and other files and folders are named in a note', async () => {
  const r = await run({ 'metadata/collection.json': text({ standard: 'ERC-721' }), 'metadata/1.json': text(meta(1)), 'metadata/1.png': 'x', 'metadata/.DS_Store': 'x', 'metadata/sub/2.json': text(meta(2)) }, ['metadata', '--config', 'metadata/collection.json']);
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /\nfiles: 1 metadata file \(JSON, [\d,]+ bytes\); 2 other files not read as metadata\n/);
  assert.match(r.out, /note: 1 folder inside the metadata folder was not read/);
  assert.match(r.out, /note: 2 files of the metadata folder, such as \.DS_Store and 1\.png, are not named as metadata/);
});

test('a metadata file that is not text is a file-unreadable finding; a config that is not text and a folder with no metadata are input errors', async () => {
  const bin = await run({ ...GOOD, 'metadata/2.json': Buffer.from([0x7b, 0x00, 0x7d]) }, ARGS);
  assert.equal(bin.code, 1);
  assert.match(bin.out, /ERROR {4}file-unreadable {10}metadata\/2\.json:1\n {11}The file holds a null byte; it is not a text file, so nothing in it was checked\./);
  const utf = await run({ ...GOOD, 'metadata/3.json': Buffer.from([0x7b, 0xc3, 0x28, 0x7d]) }, ARGS);
  assert.match(utf.out, /The file is not valid UTF-8, so nothing in it was checked\./);
  const cfg = await run({ ...GOOD, 'collection.json': Buffer.from([0x7b, 0x00, 0x7d]) }, ARGS);
  assert.equal(cfg.code, 2);
  assert.match(cfg.err, /collection\.json: holds a null byte/);
  const none = await run({ 'metadata/1.png': 'x' }, ['metadata']);
  assert.equal(none.code, 2);
  assert.match(none.err, /metadata: holds no metadata file; a metadata file ends in \.json or is named for a token id/);
});

test('the limits of size: a file over the limit is a finding, and the number of files and the total size stop the run', async () => {
  await withFiles(GOOD, async (dir) => {
    const small = await checkFolder({ folder: 'metadata', version: '0', base: dir, limits: { ...FILE_LIMITS, maxBytes: 200 } });
    assert.ok(small.findings.every((f) => f.id === 'file-unreadable'));
    assert.match(small.findings[0].message, /^The file is larger than 200 bytes, so nothing in it was checked\.$/);
    await assert.rejects(checkFolder({ folder: 'metadata', version: '0', base: dir, limits: { ...FILE_LIMITS, maxFiles: 2 } }), (e) => e instanceof InputError && /holds more than 2 metadata files/.test(e.message));
    await assert.rejects(checkFolder({ folder: 'metadata', version: '0', base: dir, limits: { ...FILE_LIMITS, maxTotalBytes: 300 } }), /hold more than 300 bytes/);
  });
  assert.ok(FILE_LIMITS.maxBytes >= 1024 * 1024);
});

test('an absolute path is used as it is, with resolve() and not a join', async () => {
  await withFiles(GOOD, async (dir) => {
    const r = await cli([resolve(dir, 'metadata'), '--config', resolve(dir, 'collection.json')], process.cwd());
    assert.equal(r.code, 0, r.err);
  });
});

test('readInputText reads a file through a handle and reports its size in bytes', async () => {
  await withFiles({ '1.json': '"\u00e9"\n' }, async (dir) => {
    const r = await readInputText(resolve(dir, '1.json'), dir);
    assert.equal(r.text, '"\u00e9"\n');
    assert.equal(r.bytes, 5);
  });
});

test('a symbolic link is refused as the folder, and a link in the folder is a finding, not followed', { skip: process.platform === 'win32' ? 'creating symbolic links needs a privilege on Windows' : false }, async () => {
  await withFiles({ 'real/1.json': text(meta(1)), 'metadata/2.json': text(meta(2)) }, async (dir) => {
    await symlink(resolve(dir, 'real'), resolve(dir, 'linked'));
    const r = await cli(['linked'], dir);
    assert.equal(r.code, 2);
    assert.match(r.err, /symbolic link/);
    await symlink(resolve(dir, 'real/1.json'), resolve(dir, 'metadata/1.json'));
    const inside = await cli(['metadata'], dir);
    assert.equal(inside.code, 1);
    assert.match(inside.out, /The file is a symbolic link, and the tool follows none/);
    await mkdir(resolve(dir, 'media'));
    await symlink(resolve(dir, 'real'), resolve(dir, 'media/loop'));
    const media = await cli(['metadata', '--media', 'media', '--standard', 'erc-721'], dir);
    assert.match(media.out, /media: media \(0 files\)/);
  });
});

test('a device is refused as the config', { skip: process.platform === 'win32' ? 'there is no /dev/null on Windows' : false }, async () => {
  await withFiles(GOOD, async (dir) => {
    const r = await cli(['metadata', '--config', '/dev/null'], dir);
    assert.equal(r.code, 2);
    assert.match(r.err, /not a regular file/);
  });
});
