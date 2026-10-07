# nft-metadata-check

NFT metadata check. Give it the metadata folder of an NFT collection before it is minted: one JSON file for each token,
named for its id, as an upload tool or a contract with a base URI expects them. Give it as well, when you have one, a
collection config as JSON: the standard (ERC-721, ERC-1155 or Metaplex Token Metadata), the range of token ids, the base
URI and the media folder. It reads the files and lists what breaks marketplaces and wallets: a token with no name, image
or description, a field of the wrong type, attributes that are not a list of `trait_type` and `value`, an ERC-1155 file
name or placeholder that is not in the lowercase 64 hex form of `{id}`, ids missing from the range, outside it, written
twice or with gaps, an image on a web address, a local path or a scheme no wallet reads, a very large `data:` URI, media
that is not in the media folder, names and sets of attributes written twice, empty attributes, traits written two ways
across the collection, files that are not UTF-8 or not JSON, and keys or seeds left in a file. Every finding has its id,
level, message and file and line, and the run exits with a code a pipeline can act on.

**It is an input to a review before the collection is minted: not a marketplace review, not a check of what is on IPFS
or a chain and not a guarantee that a wallet or a marketplace will show the tokens.** It reads files only: it contacts no
IPFS node, chain or web server, fetches nothing, runs nothing, needs no key and reads no clock, so it does not know
whether an uploaded file is there, what a gateway serves, or what the contract returns for a token URI; the checks are a
heuristic. A clean run means only that none of the problems of its checks were found in the files, and the team still has
to upload the media and the metadata, set the base URI on the contract and look at a token on a test network before the
mint.

The metadata of a token is what a wallet and a marketplace show: ERC-721 points each token at a JSON file with a name, a
description and an image; ERC-1155 adds decimals and properties and asks clients to put the id of a token in place of
`{id}` as 64 lowercase hex digits; the Token Metadata standard of Metaplex gives a Solana NFT a name, a description, an
image, attributes and a list of files. A collection of thousands of files is written by a script and uploaded once. A
file named `1.json` where a client asks for `0000...0001.json`, a base URI with `{ID}`, an image left on the laptop that
built it as `C:\art\7.png`, a trait written `Background` in one token and `background` in another, two tokens with the
same attributes, or a gap in the ids is easy to miss in a review and costly once the tokens are minted. This tool reads
the folder on every change and points at the line.

- **One check per problem.** Twenty-five checks, each with what it looks at, what it cannot see, the public pages it
  rests on and what to change. Each check is either documented (in ERC-721, ERC-1155 or the Token Metadata standard of
  Metaplex) or a best practice of this tool, and its message says which.
- **The standard of the collection.** The fields, their types and the form of a file name are read by the standard the
  config or `--standard` names; `--explain` shows the point of that standard's page behind a finding.
- **Ids as numbers.** Ids are read from the file names as whole numbers with BigInt, never through a floating point
  number, so an id of 78 digits is read exactly, and the range of the config is never walked id by id.
- **No network.** A relative path is looked for in the media folder on disk, with its case; an `ipfs://`, `ar://` or
  `https://` address is checked for its form only.
- **Never a secret.** The tool needs no private key, no seed and no API key. A key named for a private key or a seed,
  and a value shaped like a mnemonic, an extended private key, a private key in hex or a key in WIF, is an error, and the
  value is never shown in any report. Metadata is public once it is uploaded.
- **Strict reader of its own.** The JSON reader keeps the line and column of every value, so a finding points at the
  field, and refuses a key written twice. What the files do not say is listed as a finding, never taken for a value that
  is fine.
- Reports as text, markdown, JSON and SARIF, with an exit code for a pipeline: `0` no finding at or above the
  `--fail-on` level, `1` a finding at or above it, `2` usage or input error.
- Plain JavaScript, no dependencies, no clock and no network.

```
npm test
```

```
tests 129
pass 127
fail 0
skipped 2
```

These are the summary lines that `npm test` prints at the end on Windows. The skipped tests are the ones that need a
symbolic link or a device (a link as the metadata folder and inside it, and `/dev/null` named as the config); they are
guarded with `process.platform`, run on Linux and macOS, and none of them asserts a line. `npm run test:coverage` runs
the same tests with coverage; their time limits are four times wider when coverage is on.

## Quick start

Requires Node 22 or newer. There is nothing to install.

```
git clone https://github.com/INNERLUXES/nft-metadata-check.git
cd nft-metadata-check
node bin/nft-metadata-check.js examples/bad/metadata --config examples/bad/collection.json
```

Or without a clone, in your own project:

```
npx --yes github:INNERLUXES/nft-metadata-check metadata --config collection.json
```

`examples/` holds two made-up collections. Every name in them is made up, every address is a made-up one on
example.com or a made-up content address, every media file is one line of placeholder text, and none holds a real key
or seed. The bad collection, in `examples/bad`, is an ERC-1155 collection with a finding of nearly every check: in its
config, a base URI on `https://` with `{ID}` for `{id}`, a media folder written as a number, a misspelt key and a range
of ids from 1 to 14; in its metadata folder, a token with an image on `{id}.png` that is not in the folder, a token with
no image, an empty description and an empty trait value, a token whose name is a number, whose decimals are 1.5, whose
image is on `http://` and whose level is text where the others are numbers, a token with `Image` for `image` and a trait
`background` for `Background`, a token with attributes written as an object and an image on a drive letter, a token with
the name and the attributes of token 1, a token with a mnemonic, an image on `ftp://` and properties written as text, a
file that is not JSON, files named `11.json` and `0x0C.json`, id 1 written twice, id 15 outside the range, ids 10 and 14
with no file, and a file that is no id at all. The good collection, in `examples/good`, passes at error, warning and info
level: an ERC-721 collection of six tokens with a base URI on `ipfs://` that ends in `/`, a media folder that holds every
relative image and animation, four traits written one way, and names and sets of attributes of their own.

## Usage

```
nft-metadata-check <metadata-folder> [--config <file>] [--standard <name>] [--media <folder>] [options]
```

```
--config <file>          the collection config, JSON
--standard <name>        ERC-721, ERC-1155, Metaplex; in place of the standard of the config (default: ERC-721)
--media <folder>         the folder that relative media paths are looked for in (default: the media of the config,
                         or else the metadata folder)
--format <name>          text, markdown, json or sarif (default: text)
--json                   the same as --format json
--min-severity <level>   the lowest level of a finding that is shown: info, warning, error (default: info)
--fail-on <level>        the lowest level of a finding that fails the run: info, warning, error (default: error)
--explain                show the points of the pages behind each finding (text, markdown and JSON)
--list-checks            list the checks with their level and kind, and exit
--help                   show the usage
--version                show the version
```

Name the metadata folder, and the config and the media folder after their options. [docs/inputs.md](docs/inputs.md)
lists every field. The path in the report is relative to the folder you run the command in, with forward slashes on
every system, followed by the line.

A config looks like this:

```json
{
  "standard": "ERC-721",
  "tokenIds": { "first": 1, "last": 6 },
  "baseUri": "ipfs://bafyexamplegoodmeadowcollection/",
  "media": "media"
}
```

and a metadata file, `metadata/1.json`, like this:

```json
{
  "name": "Example Lantern 1",
  "description": "A made-up lantern.",
  "image": "1.png",
  "attributes": [
    { "trait_type": "Background", "value": "Meadow" },
    { "trait_type": "Glow", "value": 10, "display_type": "number" }
  ]
}
```

The report of the bad example starts with what was read, the findings in one line, and the checks with the number of
findings of each; then the findings, errors first, each with what to change:

```
nft-metadata-check: examples/bad/metadata
files: 15 metadata files (JSON, 5,631 bytes); 1 other file not read as metadata
config: examples/bad/collection.json (JSON, 11 lines, 293 bytes)
media: the metadata folder (16 files)
standard: ERC-1155, from the config
tokens: 13 ids, from 1 to 15; the config expects 1 to 14
findings: 31 (19 error, 12 warning)

Checks (25)

  check                    level    kind           findings
  file-unreadable          error    input          1
  field-unknown            warning  input          2
  field-invalid            error    input          1
  secret-in-file           error    input          1
  metadata-field-missing   error    documented     2
  description-missing      warning  documented     1
  field-type               error    documented     3
  id-hex-form              error    documented     2
  uri-id-substitution      error    documented     2
  attributes-invalid       error    best practice  1
  file-name-unexpected     warning  best practice  1
  id-out-of-range          error    best practice  1
  id-missing               error    best practice  2
  id-gap                   warning  best practice  0
  id-duplicate             error    best practice  1
  base-uri-no-slash        warning  best practice  0
  uri-mutable              warning  best practice  2
  uri-local-path           error    best practice  1
  uri-scheme-unknown       warning  best practice  1
  uri-data-large           warning  best practice  0
  media-missing            error    best practice  1
  name-duplicate           warning  best practice  1
  attributes-duplicate     warning  best practice  1
  attribute-value-empty    warning  best practice  1
  trait-type-inconsistent  warning  best practice  2

```

A finding names its check, its level, the file and the line of the field and what to change. With `--explain` it also
gives the points of the pages behind it and, for a best practice check, the tool's own choice:

```
  ERROR    id-hex-form              examples/bad/metadata/11.json:1
           The file name "11.json" is written in decimal, and was read as the decimal id; an ERC-1155 client puts the id in place of {id} as 64 hex digits in small letters with no 0x, so for token 11 it asks for 000000000000000000000000000000000000000000000000000000000000000b.json.
           fix: Name the file for its id as 64 small hex digits, such as 0000000000000000000000000000000000000000000000000000000000000001.json for id 1.
           basis: When the text {id} is in a URI or in a value of the metadata of an ERC-1155 token, a client puts the id of the token in its place, written in hex with the digits 0-9 and a-f in small letters, with no 0x, and filled with zeros on the left to 64 characters. (ERC-1155: Multi Token Standard, https://eips.ethereum.org/EIPS/eip-1155)
```

After the findings come the traits: each trait type, the tokens that have it, its distinct values and the types of its
values. Two spellings of one trait, or a trait with values of two types, show up here at a glance:

```
Traits (3)

  trait type  tokens  values  types
  Background  9       7       text
  Level       11      10      text, number
  background  1       1       text

```

The end of the report holds the notes, the notice and the result:

```

note: 1 file of the metadata folder, 0000000000000000000000000000000000000000000000000000000000000002.png, is not named as metadata and was not read as metadata; the media of the tokens is looked for among them

This report is an input to a review before the collection is minted: not a marketplace review, not a check of what is on IPFS or a chain and not a guarantee that a wallet or a marketplace will show the tokens.

RESULT: FAIL - 19 findings at or above error (19 error, 12 warning)
```

The good example passes:

```
  none

Traits (4)

  trait type  tokens  values  types
  Background  6       3       text
  Glow        6       6       number
  Mood        6       2       text
  Shape       6       2       text

This report is an input to a review before the collection is minted: not a marketplace review, not a check of what is on IPFS or a chain and not a guarantee that a wallet or a marketplace will show the tokens.

RESULT: PASS - no finding at or above error
```

## How the files are read

1. Each path is resolved against the folder you run the command in. The metadata folder and the media folder must be
   folders and the config a file; a link, a device or a config over 16 MB is refused with exit code `2` and no report.
2. The metadata folder is listed, not walked: a file whose name ends in `.json`, in any case, or has no extension is a
   metadata file, and other files, hidden files and folders are left out and named in a note. A metadata file that is a
   link, larger than 16 MB, not UTF-8 (or UTF-16 with a byte order mark) or holds a null byte is a `file-unreadable`
   finding. More than 100,000 metadata files, or more than 512 MB of them, stop the run with exit code `2`.
3. Each file and the config are read as strict JSON by the reader of the sibling tools, which keeps the line and column
   of every value and refuses a key written twice. Every key and value is looked at for a private key or a seed; one
   that is found is an error at its line, and its value is left out of everything that follows and never shown.
4. The name of each file gives its id by the standard of the collection, and the fields of each file are read with
   their lines and checked against the schema of that standard.
5. The collection is checked as a whole: the ids against each other and the range of the config, each relative media
   path against the files of the media folder, the base URI of the config, and the names, the sets of attributes and the
   traits across the tokens.

[docs/method.md](docs/method.md) says what each check reads, and [docs/inputs.md](docs/inputs.md) lists the fields and
the names of the files.

## What it checks

| Check | Level | Kind | What it reports |
| --- | --- | --- | --- |
| `metadata-field-missing` | error | documented | a token with no name or no image, or an empty one |
| `description-missing` | warning | documented | a token with no description, or an empty one |
| `field-type` | error | documented | a field of the schema of the standard with the wrong type |
| `id-hex-form` | error | documented | an ERC-1155 file name that is not 64 lowercase hex digits |
| `uri-id-substitution` | error | documented | an ERC-1155 base URI with no `{id}`, or a placeholder other than `{id}` |
| `attributes-invalid` | error | best practice | ERC-721 or ERC-1155 attributes that are not a list of `trait_type` and `value` |
| `file-name-unexpected` | warning | best practice | a file name that is not the plain id the base URI leads to |
| `id-out-of-range` | error | best practice | an id outside the range of the config, or above the largest uint256 |
| `id-missing` | error | best practice | an id of the range of the config with no file |
| `id-gap` | warning | best practice | with no range, ids missing between the lowest and the highest |
| `id-duplicate` | error | best practice | two files for one id |
| `base-uri-no-slash` | warning | best practice | an ERC-721 base URI that does not end in `/` |
| `uri-mutable` | warning | best practice | media or a base URI on `http:` or `https:` |
| `uri-local-path` | error | best practice | media or a base URI that is a path on the machine that built the files |
| `uri-scheme-unknown` | warning | best practice | media or a base URI with a scheme the tool does not know |
| `uri-data-large` | warning | best practice | a `data:` URI longer than 65,536 characters |
| `media-missing` | error | best practice | a relative media path with no file in the media folder |
| `name-duplicate` | warning | best practice | two tokens of one name |
| `attributes-duplicate` | warning | best practice | two tokens with the same set of attributes |
| `attribute-value-empty` | warning | best practice | an attribute with an empty trait type or value |
| `trait-type-inconsistent` | warning | best practice | a trait with values of two types, or written two ways |
| `secret-in-file` | error | input | a key or a seed; its value is never shown |
| `field-invalid` | error | input | a value of the config of the wrong type or form |
| `field-unknown` | warning | input | a key of the config the tool does not read, or a key of a token spelt another way |
| `file-unreadable` | error | input | a file that is not text, not strict JSON, or holds no object |

A documented check rests on ERC-721, ERC-1155 or the Token Metadata standard of Metaplex. A best practice check is this
tool's own choice, and its message says "a best practice of this tool, not a rule in the pages it cites". `--list-checks`
shows the kind of each check. Some of the levels are worth a word:

- `description-missing` is a warning and `metadata-field-missing` an error: a token with no image or name shows as a
  blank tile, one with no description still shows.
- The schemas of the pages list their fields and do not mark any as required; the tool reads name and image as needed
  by every token, as wallets and marketplaces do (docs/limits.md).
- `attributes-invalid` is a best practice: neither EIP defines attributes, and the form the tool reads is the one the
  Metaplex page writes and marketplaces read; in a Metaplex collection the same problem is `field-type`.
- `id-gap` is a warning: ERC-721 tells callers not to read a pattern into the ids, so a gap may be meant; give the range
  in the config, and a missing id becomes `id-missing`, an error.
- `uri-mutable` is a warning: a web address is allowed by every page, but what it serves can change after the mint.
- `media-missing` compares names with their case, as the servers of most uploads do, and names a file that differs only
  in case.

## What is not checked

[docs/limits.md](docs/limits.md) lists what the tool cannot see. Among them: whether the media and the metadata were
uploaded and what a gateway serves; whether an `ipfs://` address is a valid content address of the file; what the
contract returns as a token URI and whether the base URI on the chain matches the config; whether an image is really an
image of the size the pages suggest; the on-chain data of a Metaplex token, such as its symbol, creators and royalties;
the rarity of the traits; files in folders below the metadata folder; and secrets in a shape the search does not know.

## Formats

`--format text` (the default) is for a terminal. `--format markdown` is a report for a job summary or a pull request,
with a table of findings and the table of traits. `--format json` writes every finding with its `id`, `severity`,
`message`, `file`, `line`, `column`, `subject` (the token id) and `fix`, the inputs, the standard, the summary of the
ids, the table of traits, and with `--explain` the points of the pages. `--format sarif` writes SARIF 2.1.0, with the
checks as rules, the files with a finding as the artifacts and a result for each finding with its file, line and column,
for code scanning; the table of traits has no place in it. The saved output of the examples is in
[examples/output](examples/output).

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | no finding at or above the `--fail-on` level (default `error`) |
| `1` | a finding at or above it |
| `2` | a usage error, such as an unknown `--standard`, or an input error such as a folder that does not exist, a link, a config that is not text or is too large, or a folder with no metadata file; there is no report |

Findings below `--min-severity` are not shown, and still count for the result.

## Limits

The tool reads the files it is given; it contacts no IPFS node, chain or server and connects to nothing. A run reports
the problems of docs/method.md that the files hold. [docs/limits.md](docs/limits.md) lists what it cannot see, with the
size limits: 16 MB for each file, 100,000 metadata files and 512 MB of them in one run, 200,000 media files listed 32
folders deep, 1,000 attributes and 1,000 files of the properties for each token, JSON nested up to 1,000 deep, and ids of
up to 100 digits in a file name. [docs/threat-model.md](docs/threat-model.md) lists the risks of reading files from a
pull request or an upload and their controls, and [docs/secure-defaults.md](docs/secure-defaults.md) the defaults and how
to run the tool in a pipeline.

## Architecture

Plain ES modules in `src/`, with no dependencies.

| File | Job |
| --- | --- |
| `src/cli.js` | the command line, the usage and the exit codes |
| `src/check.js` | lists the folders, reads each file as JSON, looks for keys and seeds, reads the fields, runs the checks and builds the report of the run |
| `src/files.js` | the bounded reading of a file by its byte order mark, the listing of the metadata folder and the walk of the media folder, with no link followed |
| `src/json.js` | the JSON reader of the sibling tools: lines and columns, keys written twice, limits, a stack of its own |
| `src/secrets.js` | the search for keys and seeds by the name of a key and the shape of a value, kept from the sibling tools |
| `src/fields.js` | reading fields with their lines, and the spellings of a key |
| `src/standards.js` | the three standards, their names and the keys of a metadata file |
| `src/ids.js` | the id of a file name by the standard, the hex form of ERC-1155 and the runs of missing ids |
| `src/uris.js` | the kind of a URI from its text: a content address, a web address, data, a local or a relative path |
| `src/config.js` | the fields of the collection config |
| `src/metadata.js` | the fields of one metadata file by the schema of its standard, its attributes and its media |
| `src/analyze.js` | the checks of the collection: ids, ranges, media, the base URI, names, attributes and traits |
| `src/rules.js` | the checks, their levels and kinds, and the result |
| `src/report.js`, `src/text.js`, `src/size.js` | the text, markdown, JSON and SARIF output, the cleaning of text from the input and number formats |
| `src/data.js` | the public pages and the points the checks rest on, in this project's own words |
| `research/sources/` | text copies of the pages, as they were read |
| `tools/check.mjs`, `tools/example.mjs` | the repository checks, and the examples with their real output |

## Where the facts come from

The documented checks rest on three public pages, nothing else. Each was read before it was listed, a text copy of it is
kept in [research/sources](research/sources), and [research/sources.md](research/sources.md) has a note on each and lists
the lines the copies leave out. [docs/rules-and-sources.md](docs/rules-and-sources.md) lists every check with the points
of the pages it rests on, what it cannot see and what to change. Where a check is a best practice and not a rule in the
pages, it says so.

- ERC-721, Non-Fungible Token Standard, the metadata extension and the ERC721 Metadata JSON Schema: https://eips.ethereum.org/EIPS/eip-721
- ERC-1155, Multi Token Standard, the metadata, the ERC-1155 Metadata URI JSON Schema and the substitution of `{id}`: https://eips.ethereum.org/EIPS/eip-1155
- Metaplex Developer Hub, Token Metadata, Token Standard, the JSON of each kind of token: https://developers.metaplex.com/token-metadata/token-standard

## Background

The metadata of a collection is written once, uploaded once and read by every wallet and marketplace for as long as the
tokens exist. It is checked line by line when a collection is drawn and assembled by a script, when the art and the
traits change late, when a collection moves from one standard or chain to another, or when engineers are brought in to
write the contract, the minting site and the tools that build the metadata. How such work is staffed and carried out is
described on the page [NFT Development Services](https://innerluxes.dev/blockchain/nft-development).

## License

MIT
