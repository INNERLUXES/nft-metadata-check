# Sources

The public pages the documented checks of this tool are based on, each with a short note in this project's own words on
what the page says and which checks lean on it. Nothing here is a copy of a page: read the page itself for its exact
wording. A plain text copy of each page, taken when it was read, is kept in [research/sources](sources) so that a point
can be checked against the page it came from, and the copies are the pages' own words, not this project's. src/data.js
holds the pages and the points the reports show, and test/data.test.js checks that every page in src/data.js is listed
here and has its copy, that no point quotes its page at length and that the pages say what the documented checks rest
on.

The tool reads the metadata folder of a collection, its config and its media folder, and runs nothing; its result is an
input to a review before the collection is minted: not a marketplace review, not a check of what is on IPFS or a chain
and not a guarantee that a wallet or a marketplace will show the tokens. These notes say what the pages say so a reader
can follow a finding back to its source. The pages were chosen with web addresses that hold no number that reads like a
year, and each was read with a plain HTTP client, with no browser, in a form its site serves as text: the markdown source
of the two ERC pages in the repository ethereum/ERCs, from which eips.ethereum.org builds them, and the HTML of the
Metaplex page as the site serves it.

Where a check rests on a statement the pages do not make, it is a best practice of this tool, its message says so, and
the note for the check in [docs/rules-and-sources.md](../docs/rules-and-sources.md) names the choice. No page gives a
rule that a file is named for the plain id of the base URI, that the ids of a folder fall in a range or have no gaps or
repeats, that a base URI ends in /, that media should sit on a content address rather than a web address, that a path on
the machine that built the files or a scheme outside a list is a mistake, that a data: URI should stay below a size, that
a relative path names a file of the media folder, that names and sets of attributes differ between tokens, that an
attribute has a value, or that a trait is written one way and with one type; those checks are best practices of this
tool. Neither EIP defines attributes; the form the tool reads for ERC-721 and ERC-1155 is the one the Metaplex page
writes, and that check is a best practice too.

## How the facts were checked, and what could not be read

- ERC-721 is checked against its final text. Its metadata extension points each token at a JSON file of the "ERC721
  Metadata JSON Schema", whose properties are name, description and image, each a string, the image a URI of a resource
  of the mime type image/*. The schema has no list of required fields; the tool reads name and image as needed and
  description as expected, and docs/limits.md says that this reading is the tool's. The text also says that callers must
  not assume any pattern in the ids, which is why a gap in the ids with no range in the config is a warning.
- ERC-1155 is checked against its final text. Its metadata schema follows the one of ERC-721 and adds decimals, an
  integer, and properties, an object. Its rules on the substitution of {id} are the ones `id-hex-form` and
  `uri-id-substitution` rest on: a client replaces {id} in a URI, and in any value of the JSON, with the id in hex, in
  lowercase with the digits 0-9 and a-f, with no 0x, and padded with zeros to 64 characters.
- The Metaplex page is the "Token Standard" page of the documentation of the Token Metadata program on
  developers.metaplex.com. It gives a table of the JSON fields of each kind of token: name, symbol, description and image
  for the Fungible standard, and name, description, image, animation_url, external_url, attributes (a list with a
  trait_type and a value) and properties (with files, each with a uri and a type, and a category) for the Fungible
  Asset, Non-Fungible and Programmable Non-Fungible standards. The tool reads a Metaplex collection by the table of the
  Non-Fungible standard, so it does not ask a token for a symbol, which that table does not list. The page writes the
  value of an attribute as a string; the tool takes a number too, and docs/limits.md says so. The page also says that
  Token Metadata is a legacy program and points new projects at Core; the JSON it describes is the one the tool reads.
- The code samples under each "Example" heading of the Metaplex page are filled in by a script of the site and were empty
  in the page as it was served, so the copy keeps only the headings.

## What the copies leave out

Each copy is the text of the page as it was read, with a two-line header that names its address and how it was read,
and with these lines left out, so that no copy holds a date, a number that reads like a year, a word this project keeps
out of every file or personal contact details, and every copy is plain ASCII (decision 1 in docs/decisions):

- ERC-721: the line `author:` of the front matter, which names the authors with their handles and email addresses; the
  line `created:`, which holds the day the page was created; the sentence on a second event held at a conference, which
  names the year it was held; the line that opens the list of example implementations, which names the month and year
  of the list; and the reference to that conference, which holds its year. The list itself is kept.
- ERC-1155: the line `author:` of the front matter, which names the authors with their email addresses, and the line
  `created:`, which holds the day the page was created.
- Metaplex: the menus of the site around the article, the footer, which holds a year and the name of the company, the
  links to the previous and the next page, the list "On this page", and three lines of the article that are buttons of the
  site and not text of the page: the word above the title that names the section, the button that offers to ask a
  question of the documentation, and the note that a file for automated readers is available. The tables are kept with
  their cells separated by " | ", and the lists as lines that start with "- ".
- Every copy: curly quotes and dashes are written as ASCII quotes and hyphens, a letter with an accent is written without
  it (in a sample of ERC-1155 in Spanish), and the letter D with a stroke in ERC-721 is written as D.

## Token standards

### ERC-721: Non-Fungible Token Standard

https://eips.ethereum.org/EIPS/eip-721

Copy: research/sources/eip-721-non-fungible-token.txt

The final standard for non-fungible tokens on an EVM chain: each token is a uint256 id of a contract, with an owner,
transfers, approvals and an optional metadata extension whose tokenURI points at a JSON file of the ERC721 Metadata JSON
Schema with a name, a description and an image. `metadata-field-missing`, `description-missing` and `field-type` lean on
its schema for an ERC-721 collection, and `id-out-of-range` and `id-gap` on what it says of ids.

### ERC-1155: Multi Token Standard

https://eips.ethereum.org/EIPS/eip-1155

Copy: research/sources/eip-1155-multi-token.txt

The final standard for a contract of many token types, fungible and non-fungible: each type is an id, and the uri of an
id points at a JSON file of the ERC-1155 Metadata URI JSON Schema, with the name, description and image of ERC-721 and
decimals and properties, and with the substitution of {id} by clients in a URI and in the values of the JSON.
`metadata-field-missing`, `description-missing` and `field-type` lean on its schema for an ERC-1155 collection, and
`id-hex-form` and `uri-id-substitution` on its rules of substitution.

## Solana

### Metaplex Developer Hub: Token Metadata, Token Standard

https://developers.metaplex.com/token-metadata/token-standard

Copy: research/sources/metaplex-token-standard.txt

The page of the Token Metadata program of Metaplex on the Token Standard field of a token and the JSON standard of each
kind of token: fungible, fungible asset, non-fungible and programmable non-fungible, each with a table of its fields.
`metadata-field-missing`, `description-missing` and `field-type` lean on its table for a Metaplex collection, and
`attributes-invalid` names its form of attributes as the form the tool reads for ERC-721 and ERC-1155.
