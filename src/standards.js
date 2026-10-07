// The three standards the tool reads a collection by, the names a config or the command line may give each by, and the
// page of each standard that the checks of the metadata schema cite.

export const STANDARDS = ['ERC-721', 'ERC-1155', 'Metaplex'];

// Names compared in small letters with spaces, hyphens and underscores left out.
const NAMES = {
  erc721: 'ERC-721',
  eip721: 'ERC-721',
  erc1155: 'ERC-1155',
  eip1155: 'ERC-1155',
  metaplex: 'Metaplex',
  metaplextokenmetadata: 'Metaplex',
  tokenmetadata: 'Metaplex'
};

// The standard a name stands for, or null.
export function standardOf(text) {
  const key = String(text).toLowerCase().replace(/[\s_-]/g, '');
  return Object.hasOwn(NAMES, key) ? NAMES[key] : null;
}

// The id of the source of src/data.js whose schema each standard follows.
export const SCHEMA_SOURCE = { 'ERC-721': 'eip-721', 'ERC-1155': 'eip-1155', Metaplex: 'metaplex-token-standard' };

// The keys of a metadata file and of an attribute as the standards and the marketplaces spell them. A key that differs
// from one of these only in case or separators is reported as field-unknown; any other key is the collection's own and
// is left alone.
export const METADATA_KEYS = ['name', 'description', 'image', 'animation_url', 'external_url', 'attributes', 'properties', 'decimals', 'symbol', 'localization', 'background_color', 'youtube_url', 'image_data'];
export const ATTRIBUTE_KEYS = ['trait_type', 'value', 'display_type', 'max_value'];
export const FILE_KEYS = ['uri', 'type', 'cdn'];
