// Reading the metadata of one token from the nodes of the JSON reader: the fields the schema of its standard defines,
// the attributes and the URIs of its media. Every field is read with the line and column of its key or value. A field
// that is missing, empty or of the wrong type is a finding of its own, and its value is left out of the checks of the
// whole collection; nothing that was not read is taken for a value that is fine. A value that src/secrets.js marked as a
// seed or a key is left out as if it were not there.

import { isArray, isNumber, isObject, isString } from './json.js';
import { Reader, cut, describe, sameLetters, where } from './fields.js';
import { ATTRIBUTE_KEYS, FILE_KEYS, METADATA_KEYS } from './standards.js';

export const METADATA_LIMITS = { maxAttributes: 1000, maxFiles: 1000 };

// How a message names the schema of each standard.
export const SCHEMA_NAMES = { 'ERC-721': 'the ERC721 Metadata JSON Schema', 'ERC-1155': 'the metadata schema of ERC-1155', Metaplex: 'the JSON standard of Metaplex Token Metadata' };

const WHOLE = /^(?:0|[1-9][0-9]{0,8})$/;

// The kind of the value of an attribute as the reports name it.
export const valueKind = (node) => (isString(node) ? 'text' : isNumber(node) ? 'number' : null);

// Reads one metadata file: { token, findings }. label names the token in a message, such as "Token 7" or "The
// collection metadata"; subject is the id the findings carry.
export function readMetadata(root, { file, standard, label, subject = null, limits = METADATA_LIMITS }) {
  const reader = new Reader(file);
  const add = (id, at, message) => reader.add(id, at, message, subject);
  const token = { name: null, nameEntry: null, description: null, image: null, uris: [], attributes: null, attributesEntry: null };
  if (!isObject(root)) {
    add('file-unreadable', where(root), `The top level of the file is ${describe(root)}, not an object with the name, the description and the image of a token, so nothing in it was checked.`);
    return { token: null, findings: reader.findings };
  }
  const schema = SCHEMA_NAMES[standard];
  const metaplex = standard === 'Metaplex';
  const misspelt = (of, known) => (e) => {
    const near = sameLetters(e.key, known);
    if (near) add('field-unknown', where(e), `The key "${cut(e.key, 60)}" of ${of} differs from ${near} only in case or separators; the standard spells it ${near}, so its value was left out of every check.`);
  };
  const m = reader.fields(root, METADATA_KEYS, misspelt(label === 'The collection metadata' ? 'the collection metadata' : `the metadata of ${label.toLowerCase()}`, METADATA_KEYS));
  const typeIs = (e, kind) => (kind === 'text' ? isString(e.value) : kind === 'object' ? isObject(e.value) : isArray(e.value));
  const wrongType = (e, what) => add('field-type', where(e), `The ${e.key} of ${label.toLowerCase()} is ${describe(e.value)}; ${schema} defines it as ${what}.`);

  // name, image and description: text that is not empty.
  for (const [key, id, what] of [['name', 'metadata-field-missing', 'the name of the asset'], ['image', 'metadata-field-missing', 'a URI of an image of the asset'], ['description', 'description-missing', 'a description of the asset']]) {
    const e = m.get(key);
    if (e && e.value.secret) continue;
    if (!e) {
      add(id, where(root), `${label} has no ${key}; ${schema} defines ${key} as ${what}, as text.`);
      continue;
    }
    if (!isString(e.value)) {
      wrongType(e, 'text');
      continue;
    }
    if (e.value.value.trim() === '') {
      add(id, where(e), `The ${key} of ${label.toLowerCase()} is empty; ${schema} defines ${key} as ${what}, as text.`);
      continue;
    }
    token[key] = e.value.value;
    if (key === 'name') token.nameEntry = e;
    if (key === 'image') token.uris.push({ field: 'image', value: e.value.value, node: e.value });
  }

  // animation_url and external_url: text in Metaplex; animation_url is a URI of the media in every standard.
  for (const key of ['animation_url', 'external_url']) {
    const e = m.get(key);
    if (!e || e.value.secret) continue;
    if (!isString(e.value)) {
      if (metaplex) wrongType(e, 'a URI, as text');
      continue;
    }
    if (key === 'animation_url' && e.value.value.trim() !== '') token.uris.push({ field: 'animation_url', value: e.value.value, node: e.value });
  }

  // ERC-1155: decimals, a whole number.
  const dec = m.get('decimals');
  if (standard === 'ERC-1155' && dec && !dec.value.secret && !(isNumber(dec.value) && WHOLE.test(dec.value.raw))) wrongType(dec, 'a whole number of decimal places, written as a number');

  // properties: an object in ERC-1155 and Metaplex; in Metaplex with a category and a list of files.
  const props = m.get('properties');
  if (props && !props.value.secret) {
    if (!isObject(props.value)) {
      if (standard !== 'ERC-721') wrongType(props, 'an object');
    } else {
      const pm = reader.fields(props.value, ['files', 'category']);
      const cat = pm.get('category');
      if (metaplex && cat && !cat.value.secret && !isString(cat.value)) add('field-type', where(cat), `The category of the properties of ${label.toLowerCase()} is ${describe(cat.value)}; ${schema} defines it as text, such as image or video.`);
      const files = pm.get('files');
      if (files && !files.value.secret) {
        if (!isArray(files.value)) {
          if (metaplex) add('field-type', where(files), `The files of the properties of ${label.toLowerCase()} are ${describe(files.value)}; ${schema} defines them as a list of objects, each with a uri and a type.`);
        } else {
          for (const item of files.value.items.slice(0, limits.maxFiles)) {
            if (item.secret) continue;
            if (!isObject(item)) {
              if (metaplex) add('field-type', where(item), `A file of the properties of ${label.toLowerCase()} is ${describe(item)}; ${schema} defines each file as an object with a uri and a type.`);
              continue;
            }
            const fm = reader.fields(item, FILE_KEYS, misspelt(`a file of ${label.toLowerCase()}`, FILE_KEYS));
            for (const key of ['uri', 'type']) {
              const fe = fm.get(key);
              if (fe && fe.value.secret) continue;
              if (!fe || !isString(fe.value)) {
                if (metaplex) add('field-type', where(fe ?? item), `A file of the properties of ${label.toLowerCase()} has ${fe ? `a ${key} that is ${describe(fe.value)}` : `no ${key}`}; ${schema} defines each file with a uri and a type, as text.`);
                continue;
              }
              if (key === 'uri' && fe.value.value.trim() !== '') token.uris.push({ field: 'properties.files uri', value: fe.value.value, node: fe.value });
            }
          }
        }
      }
    }
  }

  // attributes: a list of objects with a trait_type as text and a value as text or a number. In Metaplex the form is the
  // standard's (field-type); in ERC-721 and ERC-1155 it is the form marketplaces read (attributes-invalid).
  const attrs = m.get('attributes');
  if (attrs && !attrs.value.secret) {
    const id = metaplex ? 'field-type' : 'attributes-invalid';
    const by = metaplex ? `${schema} defines` : 'the tool reads';
    if (!isArray(attrs.value)) add(id, where(attrs), `The attributes of ${label.toLowerCase()} are ${describe(attrs.value)}; ${by} attributes as a list of objects, each with a trait_type and a value.`);
    else {
      token.attributes = [];
      token.attributesEntry = attrs;
      for (const item of attrs.value.items.slice(0, limits.maxAttributes)) {
        if (item.secret) continue;
        if (!isObject(item)) {
          add(id, where(item), `An attribute of ${label.toLowerCase()} is ${describe(item)}; ${by} each attribute as an object with a trait_type and a value.`);
          continue;
        }
        const am = reader.fields(item, ATTRIBUTE_KEYS, misspelt(`an attribute of ${label.toLowerCase()}`, ATTRIBUTE_KEYS));
        const t = am.get('trait_type');
        const v = am.get('value');
        if ((t && t.value.secret) || (v && v.value.secret)) continue;
        const problems = [];
        if (!t) problems.push('no trait_type');
        else if (!isString(t.value)) problems.push(`a trait_type that is ${describe(t.value)}`);
        if (!v) problems.push('no value');
        else if (valueKind(v.value) === null) problems.push(`a value that is ${describe(v.value)}`);
        if (problems.length) {
          add(id, where(t ?? item), `An attribute of ${label.toLowerCase()} has ${problems.join(' and ')}; ${by} each attribute with a trait_type as text and a value as text${metaplex ? '' : ' or a number'}.`);
          continue;
        }
        const trait = t.value.value;
        const empty = trait.trim() === '' ? 'trait_type' : isString(v.value) && v.value.value.trim() === '' ? 'value' : null;
        if (empty) {
          add('attribute-value-empty', where(empty === 'value' ? v : t), `An attribute of ${label.toLowerCase()} has ${empty === 'value' ? `the trait_type "${cut(trait, 60)}" with an empty value` : 'an empty trait_type'}.`);
          continue;
        }
        token.attributes.push({ trait, traitEntry: t, value: v.value, kind: valueKind(v.value) });
      }
    }
  }
  return { token, findings: reader.findings };
}
