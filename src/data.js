// The public pages the checks rest on, and the points of each that the reports show, written in this project's own
// words. A page is named by its address; a copy of its text, read before it was listed, is kept under research/sources.
// research/sources.md lists every page with a note, docs/rules-and-sources.md lists every rule with its points, and
// test/data.test.js checks the three against each other.

export const LEVELS = ['info', 'warning', 'error'];

export const NOT_A = 'not a marketplace review, not a check of what is on IPFS or a chain and not a guarantee that a wallet or a marketplace will show the tokens';

export const NOTICE = `This report is an input to a review before the collection is minted: ${NOT_A}.`;

export const SOURCES = [
  { id: 'eip-721', title: 'ERC-721: Non-Fungible Token Standard', url: 'https://eips.ethereum.org/EIPS/eip-721', file: 'research/sources/eip-721-non-fungible-token.txt' },
  { id: 'eip-1155', title: 'ERC-1155: Multi Token Standard', url: 'https://eips.ethereum.org/EIPS/eip-1155', file: 'research/sources/eip-1155-multi-token.txt' },
  { id: 'metaplex-token-standard', title: 'Metaplex Developer Hub: Token Metadata, Token Standard', url: 'https://developers.metaplex.com/token-metadata/token-standard', file: 'research/sources/metaplex-token-standard.txt' }
];

// Points: id -> { source, text }.
export const POINTS = {
  'erc721-metadata-schema': { source: 'eip-721', text: 'The metadata extension of ERC-721 points each token at a JSON file of the ERC721 Metadata JSON Schema, which defines three fields, each a string: the name and the description of the asset, and image, a URI of a resource with a mime type of image/*.' },
  'erc721-id-pattern': { source: 'eip-721', text: 'An ERC-721 token is named by a uint256 id. A contract may start at 0 and count up by one, but a caller is told not to read any pattern into the ids, and a token may also be destroyed.' },
  'erc1155-metadata-schema': { source: 'eip-1155', text: 'The metadata schema of ERC-1155 follows the one of ERC-721, with name, description and image as strings, and adds decimals, a whole number of places for showing an amount, and properties, an object whose values may be of any kind.' },
  'erc1155-id-substitution': { source: 'eip-1155', text: 'When the text {id} is in a URI or in a value of the metadata of an ERC-1155 token, a client puts the id of the token in its place, written in hex with the digits 0-9 and a-f in small letters, with no 0x, and filled with zeros on the left to 64 characters.' },
  'metaplex-nft-json': { source: 'metaplex-token-standard', text: 'The Token Metadata standard of Metaplex gives the JSON of a non-fungible token a name, a description and an image as strings, animation_url and external_url as URIs, attributes as a list of objects with a trait_type and a value, and properties with a category and a list of files, each with a uri and a type.' }
};

export const source = (id) => SOURCES.find((s) => s.id === id);
export const pointPage = (id) => source(POINTS[id].source);
