# Inputs

The tool takes the path of the metadata folder of an NFT collection, and optionally the path of a collection config and
of a media folder. There is no configuration file of the tool itself, no environment variable and no standard input; the
options are on the command line. The tool never asks for a private key, a seed, an API key or the address of a node or a
gateway, and needs none. Its result is an input to a review before the collection is minted: not a marketplace review,
not a check of what is on IPFS or a chain and not a guarantee that a wallet or a marketplace will show the tokens.

```
nft-metadata-check <metadata-folder> [--config <file>] [--standard <name>] [--media <folder>]
                   [--format text|markdown|json|sarif] [--json] [--min-severity <level>] [--fail-on <level>]
                   [--explain] [--list-checks]
```

| Option | Meaning |
| --- | --- |
| `--config <file>` | the collection config, JSON |
| `--standard <name>` | `ERC-721`, `ERC-1155` or `Metaplex`, in any case and with or without a hyphen; it takes the place of the standard of the config, and a note says so when the two differ |
| `--media <folder>` | the folder that relative media paths are looked for in; it takes the place of the media of the config |
| `--format <name>` | `text` (default), `markdown`, `json` or `sarif` |
| `--json` | the same as `--format json` |
| `--min-severity <level>` | the lowest level shown: `info` (default), `warning` or `error` |
| `--fail-on <level>` | the lowest level that fails the run: `info`, `warning` or `error` (default) |
| `--explain` | add the points of the pages behind each finding to the text, markdown and JSON reports |
| `--list-checks` | list the checks with their level and kind, in text, markdown or JSON, and exit |
| `--help`, `--version` | the usage, the version |

Every option that takes a value takes it once. A value may not start with `--`. `-` (standard input) and an address such
as `https://...` or `ipfs://...` are refused. Two metadata folders are a usage error.

## The standard

The standard says how the names of the files give the ids and which fields each file has. It is taken from
`--standard`, else from the `standard` of the config, else it is ERC-721 and a note says so.

| Standard | Names it is given by | A file name |
| --- | --- | --- |
| `ERC-721` | ERC-721, ERC721, EIP-721 | the id in decimal with no zeros in front: `1.json` or `1` |
| `ERC-1155` | ERC-1155, ERC1155, EIP-1155 | the id as 64 hex digits in small letters with no 0x, filled with zeros on the left: `000...0001.json` |
| `Metaplex` | Metaplex, Metaplex Token Metadata, Token Metadata | the id in decimal, as upload folders write it: `0.json`, `1.json`; `collection.json` is the metadata of the collection itself |

## The metadata folder

The folder is listed, not walked: only the files directly in it are read. A file whose name ends in `.json`, in any
case, or has no extension at all is a metadata file. A name that starts with a dot is a hidden file and is left out.
Other files (images, videos, notes) and folders are left out and named in a note; when the media folder is the metadata
folder itself, the media of the tokens is looked for among them. The config is never read as a token, even when it is in
the folder.

Each metadata file is UTF-8, with or without a byte order mark, or UTF-16 with a byte order mark, with LF, CRLF or CR
line ends, and holds one JSON object in strict JSON (RFC 8259): no comments, no trailing commas, no key written twice.

## The fields of a metadata file

| Field | ERC-721 | ERC-1155 | Metaplex | Read as |
| --- | --- | --- | --- | --- |
| `name` | needed | needed | needed | text that is not empty |
| `description` | expected | expected | expected | text that is not empty; a missing one is a warning |
| `image` | needed | needed | needed | text that is not empty; a URI of the media |
| `animation_url` | a URI of the media | a URI of the media | text, a URI of the media | |
| `external_url` | not read | not read | text | a web page about the token; never checked as media |
| `decimals` | not read | a whole number | not read | |
| `properties` | not read | an object | an object | |
| `properties.category` | not read | not read | text | |
| `properties.files` | a list read for its URIs | a list read for its URIs | a list of objects, each with a `uri` and a `type` as text | |
| `attributes` | a list of objects with a `trait_type` as text and a `value` as text or a number | the same | the same, with `display_type` and `max_value` allowed | |

Any other key, such as `dna`, `edition`, `background_color` or `youtube_url`, is the collection's own and is left
alone, unless it differs from one of `name`, `description`, `image`, `animation_url`, `external_url`, `attributes`,
`properties`, `decimals`, `symbol`, `localization`, `background_color`, `youtube_url` or `image_data` only in case or
separators, such as `Image` or `animationUrl`: that is `field-unknown`, and its value is left out. Keys of an attribute
(`trait_type`, `value`, `display_type`, `max_value`) and of a file (`uri`, `type`, `cdn`) are read the same way.

## The URIs of the media

The `image`, the `animation_url` and each `uri` of `properties.files` are read by their text alone:

| Written as | Read as |
| --- | --- |
| `ipfs://...`, `ar://...` | a content address; its form is not checked further |
| `https://...`, `http://...` | a web address: `uri-mutable` |
| `data:...` | the media itself: `uri-data-large` past 65,536 characters |
| `file:...`, `/...`, `C:\...`, a backslash, `~...`, a `..` segment | a path on the machine that built the files: `uri-local-path` |
| any other scheme | `uri-scheme-unknown` |
| anything else, such as `1.png` or `art/1.png` | a relative path of the media folder: `media-missing` when there is no file of that name |

In an ERC-1155 collection, `{id}` in a URI is replaced by the 64 hex digits of the id before the URI is read, and any
other placeholder in braces is `uri-id-substitution`.

## The collection config

The config is one JSON object. Every field is optional.

| Field | Meaning |
| --- | --- |
| `standard` | `ERC-721`, `ERC-1155` or `Metaplex`, as in the table above |
| `tokenIds` | `{"first": 1, "last": 100}`: the range of ids the collection mints, both ends included; each a whole number from 0 to the largest uint256, as a number or as text in decimal |
| `baseUri` | the URI the ids are joined to, such as `ipfs://cid/` for ERC-721 or `ipfs://cid/{id}.json` for ERC-1155 |
| `media` | the path of the media folder, relative to the folder of the config |
| `notes` | anything; not read |

A key the tool does not read is `field-unknown`, with the key it is probably meant to be. A value of the wrong type or
form is `field-invalid`, and the value is left out.

## The media folder

The media folder is `--media`, else the `media` of the config, relative to the folder of the config, else the metadata
folder itself. It is walked to 32 levels of folders and 200,000 files, with no link followed, and its files are compared
with the relative media paths by their names, with their case.
