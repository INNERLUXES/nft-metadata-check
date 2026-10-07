## What changes

<!-- One or two sentences. -->

## Checks

- [ ] `npm test`, `npm run test:coverage`, `npm run check` and `npm run example` pass, and the files under `examples/output` are the ones `npm run example` wrote
- [ ] A change to a check is described in docs/method.md, says what it can and cannot see, and has a test with the files written inline and a near miss on each side
- [ ] A change to what the tool cannot see is in docs/limits.md
- [ ] A change to a field that is read, or to the names of the files, is in docs/inputs.md and docs/method.md, and in the README
- [ ] A change to a point of a public page is in src/data.js, research/sources.md and docs/rules-and-sources.md, in this project's own words, with no long quotation, and the page is saved as text under research/sources
- [ ] A check that is a best practice and not a rule of the pages it cites says so in its message and in its `own` text
- [ ] Nothing in the change, the README or the output reads as a marketplace review or a guarantee that a wallet or a marketplace will show the tokens; the tool reads files and runs nothing
- [ ] The tool still never reads or asks for a private key, a seed or an API key, a value that looks like one is still a `secret-in-file` finding, and no report or error message shows such a value
- [ ] A field a file does not give, or gives in the wrong form, is still a finding with its line, and a check never takes a value it did not read for one that is fine
- [ ] Ids are still read from the names of the files with BigInt, never through a floating point number, and a range of ids is never walked id by id
- [ ] A media path is still compared with the listing of the media folder and never opened, and no link is followed
- [ ] The JSON reader still stops at its limits with the place and does not recurse, and the limits of the files, the media folder, the metadata and the collection still hold
- [ ] No pattern is built from a file or from an argument
- [ ] Text from the input goes through `safeText` before it reaches the output or an error message, and the markdown format escapes what markdown gives a meaning to
- [ ] The tool still reads no clock and no locale, contacts no IPFS node, gateway, chain or server, opens no network connection, runs nothing it reads, evaluates nothing and writes nothing to disk
- [ ] Work stays bounded: the limits of docs/limits.md hold, and a hostile test has a time check that widens under coverage through `NODE_V8_COVERAGE`
- [ ] A test that depends on the operating system (a link, a device) is guarded with `process.platform`, asserts no line of its own, and builds its paths with `resolve()` from forward-slash names
- [ ] The examples stay made up and minimal: no real person, collection or art, made-up addresses, media of one line of placeholder text, no key, no seed and no number that reads like a year
- [ ] The commit messages of this pull request follow Conventional Commits
