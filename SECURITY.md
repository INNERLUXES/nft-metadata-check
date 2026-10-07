# Security

## Reporting a problem

Write to info@innerluxes.dev with the subject line "nft-metadata-check security", or use private vulnerability
reporting on this repository. Please do not open a public issue for a vulnerability.

Include a small made-up folder that shows the problem, the command you ran, what you expected and what happened. Use
made-up names, made-up addresses and placeholder media, never the unreleased art or metadata of a real collection, and
never a real private key, seed or mnemonic, even an old one or one from a test network.

## Scope

The tool is an input to a review: not a marketplace review, not a check of what is on IPFS or a chain and not a
guarantee that a wallet or a marketplace will show the tokens. In scope:

- an input that makes the tool show a private key, a seed or a mnemonic, or any part of one, in a report or an error
  message, in any format
- a key or a seed in one of the shapes docs/limits.md names that the tool does not report
- an input that makes the tool read or list a file or a folder other than the ones it was given, open a media path,
  or follow a symbolic link
- an input that makes the tool open a network connection, fetch a URL, contact an IPFS node, a gateway, a chain or a
  server, run any other program, or evaluate anything it reads
- an input that makes the tool write a file
- an input that makes the tool hang, take very long, exhaust the stack or use unbounded memory, such as a hundred
  thousand files, very large files, arrays and objects nested deep, very long strings, a file name of thousands of digits,
  a range of ids as wide as every uint256 or a media folder of many levels
- binary or invalid input that the tool reads as if it were metadata or a config
- a key written twice whose second value is taken without a finding, a field the tool did not read that a check reports
  as fine, or a key spelt another way that is not reported
- a problem that docs/method.md says is reported (a token with no name or image, an ERC-1155 file name or placeholder not
  in the form of `{id}`, an id outside the range or missing from it, a local path, a missing media file) that the tool
  does not report
- an id that the tool reads as another number than its file name says
- a run that passes at a `--fail-on` level although the input holds a finding at that level that docs/method.md says is
  reported
- text from a file or a file name that rewrites the terminal through control or direction characters, is shown unescaped
  in the output, or puts markup into the markdown report
- a name such as `__proto__` that changes how objects behave inside the tool

Out of scope: the forms docs/limits.md says the tool does not see, whether the media and the metadata were uploaded and
what a gateway serves (a clean result is not a marketplace review), what the contract returns, secrets in shapes the
search does not claim to know, who may change or upload the files, and where your pipeline keeps the output.

Read [docs/threat-model.md](docs/threat-model.md) for the rest.
