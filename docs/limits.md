# Limits

The tool is not a marketplace and not a wallet. It reads the metadata folder of a collection and, when they are given,
its config and its media folder, and its result is an input to a review before the collection is minted: not a
marketplace review, not a check of what is on IPFS or a chain and not a guarantee that a wallet or a marketplace will
show the tokens. A clean run means only that none of the problems in [method.md](method.md) were found in the files.

## What it cannot see

- **The uploads.** It contacts no IPFS node, gateway, Arweave node or web server, so it cannot tell whether the media and
  the metadata were uploaded, whether an `ipfs://` address is a valid content address of the right file, whether a
  gateway serves it, or whether a web server still holds it.
- **The contract and the chain.** It does not know what the contract returns as a token URI, whether the base URI set on
  the chain matches the config, how many tokens will be minted, or which ids are burnt. For a Metaplex token, the name,
  symbol, creators, royalties and collection of the on-chain metadata account are not read; only the JSON is.
- **What the schemas require.** The schemas of ERC-721 and ERC-1155 and the tables of the Metaplex page list their fields
  and do not mark any as required. The tool reads a name and an image as needed by every token, and a description as
  expected, because wallets and marketplaces show them; that reading is the tool's, and docs/rules-and-sources.md says
  so for each check.
- **Attributes in ERC-721 and ERC-1155.** Neither EIP defines attributes. The tool reads them in the form the Metaplex
  page writes and marketplaces read, a list of objects with a `trait_type` and a `value`, and does not know the
  conventions of a given marketplace, such as `display_type` or `max_value`, beyond allowing them.
- **The value of a Metaplex attribute.** The Metaplex page writes the value as text; the tool takes a number too, as
  marketplaces read both, so a number there is not a finding.
- **The symbol.** The Metaplex page lists a symbol in the JSON of the Fungible standard only; the tool does not ask a
  non-fungible token for one, and the symbol of the on-chain account is not read.
- **The media itself.** A relative path is checked against the names of the media folder; the file is not opened, so an
  image of the wrong type, size or content passes. The size and the aspect ratio the EIPs suggest for an image are not
  checked. A content address is not looked up.
- **Folders below the metadata folder.** Only the files directly in the metadata folder are read; a folder inside it is
  named in a note and not read.
- **How the URIs are built.** A file name is read as a contract that joins a base URI and the id builds it: decimal with
  no zeros in front for ERC-721 and Metaplex, 64 lowercase hex digits for ERC-1155. A contract that builds its URIs
  another way, or a server that rewrites addresses, is not seen.
- **Gaps that are meant.** With no range of ids in the config, a gap between the ids of the files is a warning, because
  ERC-721 tells callers not to read a pattern into the ids; give the range, and the check becomes exact.
- **Rarity and art.** The table of traits is a view of the files, not a rarity score; two tokens whose images are the same
  but whose attributes differ are not found.
- **Localization.** The `localization` object of ERC-1155 and the files it points at are not read.
- **Every secret.** The search for keys and seeds knows them by the name of their key and by their shape: a mnemonic of
  12 to 24 lowercase English words, an extended private key, 64 hex digits or a key in WIF. A secret split over fields,
  encoded another way or written under another name is not caught, and a value of 64 hex digits, such as a hash kept in
  an attribute, is reported as a key in hex, the safe side. API keys and passwords are not looked for by their shape. A
  clean run does not say that the files hold no secret.

## What the reader does not read

[inputs.md](inputs.md) lists the fields. A file that is not strict JSON is one `file-unreadable` finding, and nothing
else in it is checked. A value that is missing, of the wrong type or a secret is a finding, and the checks that need it
leave it out: a clean run says nothing about that part. JSON with comments, JSON5, YAML and CSV are not read.

## Size limits

| Limit | Value |
| --- | --- |
| a file (a metadata file or the config) | 16 MB |
| metadata files in one run | 100,000 |
| the metadata files together | 512 MB |
| files listed in the media folder | 200,000 |
| folders of the media folder | 32 levels |
| JSON nesting of objects and arrays | 1,000 levels |
| JSON values (nodes) in a file | 2,000,000 |
| a JSON string | 1,000,000 characters |
| attributes of a token | 1,000; the rest are not read |
| files of the properties of a token | 1,000; the rest are not read |
| an id in a file name | 100 digits; a longer name is not read as an id |
| a token id | the largest uint256 |
| a `data:` URI before `uri-data-large` | 65,536 characters |
| runs of missing ids and gaps reported | 100 of each; a note says there are more |
| trait types in the table | 200; a note says there are more |
| a text the search for keys looks at | 4,000 characters |

A metadata file past a limit is a `file-unreadable` finding; too many files, or too many bytes of them, stop the run with
exit code `2`. The tool never passes a run because something could not be read.

## What a run does not do

It never reads or asks for a private key, a seed or an API key, contacts no IPFS node, chain or server, fetches nothing
and connects to nothing, runs no program, evaluates nothing it reads, reads no clock and no locale, follows no symbolic
link and writes nothing to disk. [threat-model.md](threat-model.md) lists the risks of reading files from a pull request
or an upload and their controls.
