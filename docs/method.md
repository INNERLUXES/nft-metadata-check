# Method

This document says how the tool reads the metadata folder of an NFT collection and what each check looks at. The tool
is an input to a review before the collection is minted: not a marketplace review, not a check of what is on IPFS or a
chain and not a guarantee that a wallet or a marketplace will show the tokens. A clean run means only that none of the
problems below were found in the files.

## Why the files

The metadata of a token is what a wallet and a marketplace show for it: its name, its image, its description and its
traits. ERC-721 points each token at a JSON file through its token URI, ERC-1155 through a URI in which clients put the
id in place of `{id}`, and a Metaplex token through the URI of its metadata account. The files of a collection are
written by a script, often thousands at a time, uploaded once, and then read for as long as the tokens exist. A mistake
in them shows up only when the tokens are minted and a wallet shows a blank tile, a marketplace splits a trait in two or
a client asks for a file that is not there.

All of this is visible in the folder before anything is uploaded. The tool reads the folder as it is, so the same check
runs on every change, in a pipeline or by hand, and every finding points at a line.

## Reading the files

1. Each path is resolved against the folder the command runs in. The metadata folder and the media folder must be
   folders, never links; the config must be a regular file of up to 16 MB. Otherwise the run stops with exit code `2`
   and no report.
2. The metadata folder is listed. A file whose name ends in `.json` or has no extension is a metadata file; the rest are
   named in a note. A metadata file that is a link, larger than 16 MB, not UTF-8 or UTF-16 with a byte order mark, or
   holds a null byte, is `file-unreadable`.
3. Each file and the config go to the JSON reader of the sibling tools (`src/json.js`), which keeps the line and column
   of every value: a comment, a trailing comma, a key written twice in one object or text after the value is
   `file-unreadable`, and so is a top level that is not an object.
4. Every key and value of each file is looked at for a key or a seed (`src/secrets.js`, kept unchanged from the sibling
   tools). A key named for a private key, a seed or a mnemonic, and a value shaped like a mnemonic, an extended private
   key, a private key in hex or a key in WIF, is `secret-in-file`. The value is marked and left out of everything that
   follows, and no report shows it.
5. The config is read (`src/config.js`): a key the tool does not read is `field-unknown`, and a value of the wrong type
   or form is `field-invalid`. The standard is taken from `--standard`, the config or the default, ERC-721.
6. The name of each file gives its id by the standard (`src/ids.js`), and its fields are read (`src/metadata.js`) by the
   schema of the standard, as docs/inputs.md lists them.
7. The collection is checked as a whole (`src/analyze.js`).

## The checks of each file

- The fields of the schema: no name or no image, or an empty one (`metadata-field-missing`); no description or an
  empty one (`description-missing`); a field of the wrong type (`field-type`): a name, a description or an image that is
  not text in every standard, an ERC-1155 `decimals` that is not a whole number or `properties` that are not an object,
  and in Metaplex an `animation_url`, an `external_url` or a `category` that is not text, `properties.files` that are not
  a list of objects with a `uri` and a `type`, and attributes that are not a list of objects with a `trait_type` and a
  `value`.
- The attributes of ERC-721 and ERC-1155: not a list of objects with a `trait_type` as text and a `value` as text or a
  number (`attributes-invalid`). Neither EIP defines attributes; the tool reads the form the Metaplex page writes and
  marketplaces read.
- An attribute whose `trait_type` or `value` is empty or only spaces (`attribute-value-empty`); it is left out of the
  checks of the traits.
- A key that differs from a field of the standard only in case or separators, such as `Image` or `traitType`
  (`field-unknown`); its value is left out, so a token with only `Image` is also `metadata-field-missing`.

## The checks of the names and the ids

- In ERC-1155, a file name that is an id but not 64 hex digits in small letters with no 0x (`id-hex-form`). A name of
  decimal digits is read as the decimal id, and a name in another hex form as the hex id, so the checks of the ids still
  count it.
- A file name that is not the plain id the base URI leads to (`file-name-unexpected`): zeros in front of a decimal id,
  64 hex digits in an ERC-721 or Metaplex collection, `.JSON` in capitals, or a name that is no id at all. A file with no
  id is checked for its fields but not counted as a token.
- Two files for one id, such as `1` and `1.json` (`id-duplicate`): the second is reported and left out of the checks of
  names, attributes and traits.
- An id above the largest uint256, or outside the `tokenIds` of the config (`id-out-of-range`).
- An id of the `tokenIds` with no file (`id-missing`), reported as runs of ids at the line of `tokenIds`, worked out from
  the sorted ids and never by walking the range.
- With no `tokenIds`, ids missing between the lowest and the highest id of the files (`id-gap`), each gap at the file
  after it.

## The checks of the URIs

- In ERC-1155, a base URI with no `{id}`, or a base URI or a URI of the media with a placeholder in braces other than
  the exact `{id}`, such as `{ID}` or `{tokenId}` (`uri-id-substitution`).
- In ERC-721, a base URI with no `{id}` that does not end in `/` (`base-uri-no-slash`).
- An image, an animation, a file of the properties or a base URI on `http:` or `https:` (`uri-mutable`); a path on the
  machine that built the files (`uri-local-path`); a scheme other than `ipfs:`, `ar:`, `https:`, `http:` and `data:`, or
  a base URI with no scheme (`uri-scheme-unknown`); a `data:` URI longer than 65,536 characters (`uri-data-large`).
- A relative path with no file of that name in the media folder (`media-missing`). The name is compared with its case,
  after `./` in front, a query and a fragment are left out, and with its percent escapes read; a file that differs only
  in case is named in the message. In ERC-1155, `{id}` is first replaced by the 64 hex digits of the id.

## The checks across the tokens

- Two tokens of one name, compared without case and outer spaces (`name-duplicate`).
- Two tokens with the same set of attributes, in any order, with the type of each value counted (`attributes-duplicate`).
- A trait whose values are of two types, such as `5` and `"5"`, reported for each token whose type is not the most common
  one; and trait types that differ only in case or separators, such as `Background` and `background`, reported for each
  attribute whose spelling is not the most common one (`trait-type-inconsistent`).

## The checks of the config and the files themselves

- `file-unreadable`, `field-unknown`, `field-invalid` and `secret-in-file`, as above. Each is about a file itself, and
  its level never gets lower.

## The table of traits

After the findings, the report lists each trait type with the number of tokens that have it, its number of distinct
values and the types of its values, sorted by name, for the first 200 trait types. It is a view of the files, not a
rarity score.

## Levels

An error is a problem that makes a wallet or a marketplace show the token wrong, or not at all, or a client ask for a
file that is not there; a warning is a problem that is often a mistake but may be meant, such as a web address, a gap
in the ids or two tokens of one name. `--fail-on warning` makes the warnings fail the run too.
