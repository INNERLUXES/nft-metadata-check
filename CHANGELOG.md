# Changes

## 1.0.0

First release.

- Reads the metadata folder of an NFT collection before it is minted, one JSON file for each token named for its id,
  and when they are given a collection config and a media folder, and lists with file and line what breaks marketplaces
  and wallets, as an input to a review: not a marketplace review, not a check of what is on IPFS or a chain and not a
  guarantee that a wallet or a marketplace will show the tokens. It reads the files, contacts no IPFS node, chain or
  server, fetches nothing, runs nothing, needs no key, follows no symbolic link and reads no clock.
- Reads a collection by one of three standards, from `--standard`, the config or the default ERC-721: ERC-721, ERC-1155
  and the Token Metadata standard of Metaplex. The name of each file gives its id, in decimal or as the 64 hex digits of
  ERC-1155, read as a whole number with BigInt; the fields of each file are read by the schema of the standard.
- Reads the config with the standard, the range of token ids, the base URI and the media folder, each optional.
- The strict JSON reader of the sibling tools, with no dependency and no recursion, with the line and column of every
  value, a key written twice as a finding, and limits of size, nesting, values and string length; limits of files and
  bytes for a run and of depth and files for the walk of the media folder.
- A search for keys and seeds in every file before anything else is read, kept unchanged from the sibling tools: each
  one found is an error whose value is left out of every check and never shown.
- Twenty-five checks in two levels, each documented or a best practice of the tool and saying which: a token with no
  name or image (`metadata-field-missing`) or no description (`description-missing`); a field of the wrong type
  (`field-type`); an ERC-1155 file name that is not 64 lowercase hex digits (`id-hex-form`) and a base URI or placeholder
  not in the form of `{id}` (`uri-id-substitution`); ERC-721 and ERC-1155 attributes that are not a list of `trait_type`
  and `value` (`attributes-invalid`); a file name that is not the plain id (`file-name-unexpected`); ids outside the range
  (`id-out-of-range`), missing from it (`id-missing`), with gaps (`id-gap`) or written twice (`id-duplicate`); an ERC-721
  base URI with no `/` at its end (`base-uri-no-slash`); media on a web address (`uri-mutable`), a local path
  (`uri-local-path`), an unknown scheme (`uri-scheme-unknown`) or a large `data:` URI (`uri-data-large`); a relative path
  with no file in the media folder (`media-missing`); names (`name-duplicate`) and sets of attributes
  (`attributes-duplicate`) written twice; empty attributes (`attribute-value-empty`); traits written two ways or with
  values of two types (`trait-type-inconsistent`); and four checks about the input (`file-unreadable`, `field-unknown`,
  `field-invalid`, `secret-in-file`).
- A table of the traits, with the tokens, the distinct values and the types of each, in every format but SARIF.
- Reports as text, markdown, JSON and SARIF 2.1.0; every finding has its id, severity, message, file, line, column and
  subject; `--config`, `--standard`, `--media`, `--min-severity`, `--fail-on`, `--explain` with the points of the page of
  the standard behind each finding, and `--list-checks`. Exit code `0` when no finding is at or above the fail-on level,
  `1` when one is, `2` for a usage or input error, with no result.
- Plain text copies of the public pages the documented checks rest on, under research/sources, with a note on each:
  ERC-721, ERC-1155 and the Token Standard page of Metaplex Token Metadata.
- Release packages come with a CycloneDX SBOM, SHA-256 checksums and a build provenance attestation, after the SSDF gate
  of the repository.
