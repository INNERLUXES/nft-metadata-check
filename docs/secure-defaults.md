# Secure defaults

The default run is the safe run. Nothing in the first section needs a flag, and none of it can be switched off. The rest
of the document is about what the tool cannot do for you: which files you give it, where the output goes, and who may
change the files it reads. A clean result is not a marketplace review, not a check of what is on IPFS or a chain and not
a guarantee that a wallet or a marketplace will show the tokens; it is a folder with none of the problems the checks look
for, not a finding that the collection is ready to mint.

## How the tool behaves by default

- **Never a secret.** The tool needs no private key, no seed, no API key and no address of a node or a gateway, and has
  no option to take one. A key named for a key or a seed, and a value shaped like one, anywhere in a metadata file or
  the config, is a `secret-in-file` error that fails the run; the value is left out of every check and never written to
  a report or an error message, in any format. Metadata is public once it is uploaded, so a secret in it is exposed to
  everyone.
- **Reads, never sends.** The tool reads the folders and the files it is given. It follows no symbolic link, fetches no
  URL, refuses an argument that looks like an address, contacts no IPFS node, gateway, chain or server, evaluates nothing
  and writes nothing to disk. A URI in a file is text that is checked for its form, never a place the tool goes to.
- **Every check on from the first run.** A token with no name or image, a field of the wrong type, attributes in the
  wrong form, an ERC-1155 name or placeholder not in the form of `{id}`, ids outside the range, missing or written twice,
  a local path, a missing media file and a file that cannot be read are errors; a missing description, a misspelt key, a
  file name that is not the plain id, a gap in the ids, a base URI without its `/`, a web address, an unknown scheme, a
  large `data:` URI, names and sets of attributes written twice, empty attributes and traits written two ways are
  warnings. There is no configuration file of the tool that could set a check off.
- **The standard is the collection's own.** The fields and the form of the file names come from the standard the config
  or `--standard` names; when neither does, the collection is read as ERC-721 and a note says so, so a run never passes
  because it was read by the wrong standard without a word.
- **No clock.** The tool reads no clock, no time zone and no locale; the same folder gives the same report on every day
  and every machine.
- **Fail closed on what it cannot read.** A metadata file that is not strict JSON, not text or too large is an error
  finding that fails the run at the default `--fail-on` of `error`. A missing field and a value of the wrong type are
  findings of their own, so a part of a file that was not read is never taken for one that is fine. A key spelt `Image`
  is a warning that names the field it is probably meant to be, and the token is also reported as having no image. A
  folder that does not exist or holds no metadata file, a link named as a folder, and a config that is not text or is
  too large stop the run with exit code `2` and no report.
- **Unknown arguments are errors.** An option the tool does not know, a value that looks like an option, an option given
  twice and a standard the tool does not know stop the run, so a typo such as `--fail-no` cannot leave a default in
  place.
- **No pattern from the input.** No regular expression is built from a file or from an argument.
- **Bounded work.** The run has limits of files and bytes, the reader has limits of size, nesting, values and string
  length and works with a stack of its own, the walk of the media folder has limits of depth and files, and the range of
  ids is never walked id by id (docs/limits.md), so a large folder, a deep file or a wide range cannot exhaust the stack,
  the memory or the time.
- **No prototype tricks.** Keys from a file are kept in lists and compared with the names the tool reads, never set as
  properties of an object, so `__proto__` is only a name.
- **Clean output.** Text from the input, file names, token names, traits and URIs included, has control characters, line
  separators and direction controls replaced and its length capped before it reaches a report or an error message; the
  markdown report also escapes what markdown gives a meaning to.
- **The same input gives the same output.** No clock, no zone, no locale and no random number, and the files are read in
  the order of their names by their code units
  ([decision 1](decisions/0001-read-no-clock-and-keep-dates-out-of-the-repository.md)).
- **No dependencies.** Node 22 or newer and nothing else.

## Settings that make the check stricter

- **`--fail-on warning`.** A missing description, a web address, a gap in the ids, names and sets of attributes written
  twice and traits written two ways fail the run too. Use it on the folder that is about to be uploaded, and record in
  the review each warning the team keeps on purpose, such as editions that share a name.
- **A config.** Give the standard, the range of ids the contract will mint, the base URI and the media folder in a config
  next to the folder. With a range, a missing id is an error instead of a gap; with a base URI, its form is checked.
- **The media folder.** Keep the media in a folder of its own and name it, so that every relative path is checked
  against the files that will be uploaded.

## Running it in a pipeline

```yaml
permissions:
  contents: read
steps:
  - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
  - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
    with:
      node-version: 22
  - name: NFT metadata check
    run: npx --yes github:INNERLUXES/nft-metadata-check collection/metadata --config collection/collection.json --format markdown >> "$GITHUB_STEP_SUMMARY"
```

- Give the job read access to the contents and nothing more. The tool needs no secret, no API key and no access to a
  node or a pinning service; never give it one.
- Pin every action to a full commit, as above, and pin the tool to a release commit or a tag you have read, because
  `npx` runs what it downloads.
- Run the tool on the exact folder that is uploaded, after the last change to it, and upload that folder; a folder edited
  after the check is not what was checked.
- Keep unreleased art and metadata where your team keeps them, and the reports with the same care, because a finding
  quotes names, traits and URIs of the collection.
- Do not hide the exit code with a trailing `|| true`. To keep the report without failing, keep `--fail-on` at `error`
  and keep the SARIF or JSON report as an artifact of the job.
- Treat a report built from a folder you do not trust as untrusted data.
- If the tool ever reports `secret-in-file`, treat the key or seed as exposed: remove it from the file and from every
  place the file was copied to, and move what it controls to a new key. The tool does not show the value, but the file
  itself was readable to everyone with access to it, and would have been public after the upload.

## Protecting the collection

The metadata of a collection is read for as long as its tokens exist, and a file on a content address cannot be changed
after the mint. Build the folder with a script kept in code, review a change to it like code, keep the media on a content
address, and look at a token on a test network before the mint. Check every change of the folder with this tool in that
process: it reads the files as written, not what the contract or a gateway will serve.

## SSDF

The repository is checked against NIST SP 800-218 (SSDF) in its own pipeline and before every release, with
`ssdf-repo-check` pinned to its release commit. The evidence it looks for is in these files:

| Practice | Evidence in this repository |
| --- | --- |
| PO.1 Define security requirements | CONTRIBUTING.md, docs/secure-defaults.md |
| PO.2 Roles and responsibilities | .github/CODEOWNERS |
| PO.3 Toolchain | .github/workflows/ci.yml, codeql.yml, release.yml |
| PO.4 Criteria for security checks | CodeQL with the security-extended queries, the SSDF gate in ci.yml and release.yml |
| PO.5 Secure environments | a `permissions:` block in every workflow, actions pinned to commits |
| PS.1 Protect the code | .gitignore for keys and `.env`, `npm run check` for committed secrets |
| PS.2 Integrity of releases | SHA-256 checksums and a build provenance attestation in release.yml |
| PS.3 Archive and provenance | a CycloneDX SBOM and the CHANGELOG with every release |
| PW.1 Design for security | docs/threat-model.md |
| PW.2 Review the design | docs/decisions |
| PW.4 Reuse secure components | no runtime dependencies, a lock file, Dependabot |
| PW.5 Secure coding | CONTRIBUTING.md, `npm run check` |
| PW.6 Build settings | `npm ci` from the lock file |
| PW.7 Code review | the pull request template and CODEOWNERS |
| PW.8 Testing | `npm test` on Linux, Windows and macOS with Node 22 and 24, `npm run test:coverage`, hostile input tests |
| PW.9 Secure defaults | this document |
| RV.1 Find vulnerabilities | SECURITY.md, Dependabot |
| RV.2 Respond to vulnerabilities | SECURITY.md |
