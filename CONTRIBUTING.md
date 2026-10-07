# Contributing

Every change goes through a pull request and is reviewed before it is merged. The pipeline runs the tests on Linux,
Windows and macOS with Node 22 and 24, the tests with coverage, the repository checks, CodeQL, and a secure
development check of the repository itself.

Commit messages in this repository follow Conventional Commits: `feat:`, `fix:`, `docs:`, `test:`, `ci:`, `chore:`,
with `!` for a breaking change.

This tool reads the metadata folder of an NFT collection, its config and its media folder, and runs nothing; its result
is an input to a review before the collection is minted: not a marketplace review, not a check of what is on IPFS or a
chain and not a guarantee that a wallet or a marketplace will show the tokens. A change must keep it that way: a check
reports what the files hold, and the tool never contacts an IPFS node, a gateway, a chain or a server, and never
fetches, runs or evaluates what it reads.

## Never a secret, never a real collection

The tool never asks for a private key, a seed or an API key, and never looks up an address. Do not add an option, a
field or a test that gives it one: the checks are about the files as written. A test of the search for secrets builds
its values from repeated characters (see test/secrets.test.js), so that no file of the repository holds anything that
could be a real key or seed. Never paste the unreleased metadata or art of a real collection, a key or a seed into an
issue, a pull request or an example.

## Changing a check

1. Describe the change in docs/method.md first: what the check looks at and what it can and cannot see, and add what it
   cannot see to docs/limits.md. Where the tool makes its own choice, say so in `own` in src/rules.js and in the
   message, and say why; a check is `documented` only when one of the saved pages says the rule.
2. Keep the checks to what is written. A finding must point at something a reader can check in a file: a file, a line
   and a column. Never add a check that needs the network, a gateway, a chain, a key or the clock.
3. A check says what to change, in `fix` in src/rules.js, and names the points of the public pages it rests on in
   `basis`; a new page goes into src/data.js and research/sources.md, is saved as text under research/sources, and
   docs/rules-and-sources.md lists it. Fetch and read a page before it is listed, and never write a rule you could not
   read in the pages as if it were one.
4. A run must never pass because something could not be read: a file that is not strict JSON is an error finding, and a
   field that is missing, spelt another way or of the wrong type is a finding that names it.
5. Add a test with the files written inline (`meta()`, `file()`, `tokens()`, `hex()`, `check()`, `findingsOf()`,
   `idsOf()`, `ofCheck()`, `run()` and `cli()` in test/helpers.js), small enough to work out by hand, with a near miss on
   each side: the files that are reported and the ones next to them that are not.
6. A check id, once released, keeps its meaning: pipelines and other tools read it from the JSON, SARIF and markdown
   output.

## Changing a standard

The fields of each standard are read by src/metadata.js and the names of its files by src/ids.js. A field is read for a
standard only when its saved page defines it; a convention of marketplaces that no page defines is a best practice check
of its own and says so. Update docs/inputs.md with the change.

## Changing the reader

1. The JSON reader (src/json.js) keeps its limits (`JSON_LIMITS`) and works with a stack of its own; it has no
   recursion, and neither has the search for secrets (src/secrets.js) nor the walk of the media folder (src/files.js).
   src/secrets.js and src/json.js are kept as they are in the sibling tools. The files keep `FILE_LIMITS`, the metadata
   `METADATA_LIMITS`, the ids `ID_LIMITS` and the collection checks `ANALYZE_LIMITS`.
2. An id is read from the name of a file into a BigInt; it never goes through a floating point number, and a range of
   ids is never walked id by id.
3. A value marked as a secret is left out as if it were not there; no message may name it.
4. A field that is read is listed in docs/inputs.md; a part a file does not give is a finding, so that it never goes by
   unnoticed.
5. No pattern is built from a file or an argument. A test fails when `new RegExp` appears in src outside src/text.js.
6. A time check in a test widens under coverage: read `process.env.NODE_V8_COVERAGE`, which the test runner sets only
   when coverage is on, and allow four times the time (`allowed()` in test/helpers.js). Run `npm run test:coverage`
   before you open the pull request.
7. A file written with LF, CRLF or CR line ends, as UTF-8 with or without a byte order mark or as UTF-16 with one, must
   give the same findings.

## Changing a source

1. Every point the reports show is in src/data.js, written in this project's own words, with the page it comes from. A
   short phrase of a page may be named; a long quotation may not.
2. research/sources.md lists every page with a note on what it says and the lines its copy leaves out,
   research/sources holds a text copy of each page, and docs/rules-and-sources.md lists every check with its points and
   what to change. A test checks them against each other. Leave out a line of a page that holds a date or a number that
   reads like a year, and the contact details of people, and never write a publication date or the date a page was last
   changed.

## The examples

The files under `examples/` are made-up input for the tool: an ERC-1155 collection whose config and metadata hold a
finding of nearly every check, and an ERC-721 collection that passes at error, warning and info level, with made-up
names, made-up addresses, media files of one line of placeholder text, and no key and no seed. A change to them goes with
the real output that `npm run example` writes to `examples/output`.

## Tests that depend on the system

A test that depends on the operating system (a symbolic link, a device) is guarded with `process.platform` and says why
in its `skip`. A test never asserts a line number written by hand: a line is worked out with `lineOf()` of
test/helpers.js or from the text itself. Every other test builds its paths with `resolve()` from names with forward
slashes, and a test never writes a backslash into a file name. A test does not rely on two file names that differ only
in case, which some systems treat as one.

A test never reads the clock, the time zone of the machine or the locale.

## Rules for the code

- No runtime dependencies and no development dependencies. Node 22 or newer and nothing else; the tests use `node:test`.
- The tool reads the folders and files it is given and writes only to standard output and standard error. It opens no
  network connection, contacts no IPFS node, chain or server, runs no program and evaluates nothing it reads.
- Text from the input, file names, token names, traits and URIs included, goes through `safeText` before it reaches the
  output or an error message.
- Source files stay ASCII; write any other character as a Unicode escape, or build it from its code point.
- No file carries a date, and no file holds a number that reads like a year. Version numbers (Node 22, 1.0.0), ids and
  the number of a standard (ERC-721, ERC-1155, SARIF 2.1.0, NIST SP 800-218) are fine (decision 1).
- Examples and tests use made-up people, collections and addresses.
- Plain words in the documents: `npm run check` fails on a short list of words that say little.

## Before you open the pull request

```
npm test
npm run test:coverage
npm run check
npm run example
```
