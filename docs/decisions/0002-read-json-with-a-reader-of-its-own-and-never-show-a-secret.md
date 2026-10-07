# 2. Read JSON with a reader of its own, and never show a secret

## Status

Accepted

## Context

The metadata of a token and the config of a collection are JSON. `JSON.parse` would read them, but it keeps no line and
column of a value, so a finding could not point at the field of a token; it takes the last of two values written under
one key without a word, so a file with two `image` keys would be checked for one image and served with the other by a
looser reader; it builds objects whose keys come from the file, so a key such as `__proto__` can change how an object
behaves; and it turns every number into a floating point number, so an id of 78 digits loses its last digits.

A collection is minted from wallets with keys, and the script that builds a folder of metadata often holds them close by.
A careless file can hold a secret: the seed of the minting wallet pasted into a note, a private key left in a field of
the config. A tool that reads such a file and echoes its values in a report would copy the secret into a pipeline log, a
pull request comment or a SARIF upload, and the file itself would be public once it is uploaded.

A file that is not complete (a token with no image, a key spelt `Image`) would also be read as if it were, and a check
could take a value it never saw for one that is fine.

## Decision

1. Every file is read by src/json.js, the reader of the sibling tools for strict JSON, with the line and column of every
   value, a key written twice as an error, and limits of nesting, values and string length. It does not recurse. Every
   number keeps the characters it was written with, and the objects of a file are lists of entries, never objects with
   keys from the file.
2. Ids are read from the names of the files as whole numbers with BigInt, never through a floating point number; a name
   of more digits than the limit is not read as an id.
3. The tool never asks for a private key, a seed or an API key: it checks the files as written. Before a file is read,
   src/secrets.js, kept unchanged from the sibling tools, walks every key and value of it. A key named for a key or a
   seed, and a value shaped like a mnemonic, an extended private key, a private key in hex or a key in WIF, is a
   `secret-in-file` error at its line. The value is marked, the readers leave it out as if it were not there, and no
   report and no error message shows it, in any format.
4. Every field the checks need and a file does not give, every key spelt another way and every value of the wrong type
   is returned with its line and shown as a finding. A check never takes a value it did not read for one that is fine.
5. The checks are a heuristic over the files as written, and every report says so; docs/method.md says what each check
   reads and docs/limits.md what it cannot see. The result is an input to a review before the collection is minted: not
   a marketplace review, not a check of what is on IPFS or a chain and not a guarantee that a wallet or a marketplace
   will show the tokens.

## Consequences

- The tool needs no install and no network, and the same folder gives the same report on Linux, Windows and macOS.
- A finding points at the line of the field, the attribute or the file of the token.
- A secret in a file fails the run and is never copied into the output. The shapes are loose, so a value that only looks
  like a secret, such as a hash of 64 hex digits kept in an attribute, is reported too; that is the safe side.
- JSON with comments, JSON5 and YAML are not read (docs/limits.md).
