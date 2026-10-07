# 3. Check the folder on disk, and contact no IPFS node, chain or server

## Status

Accepted

## Context

Many facts about a collection live elsewhere: the uploaded media on IPFS or Arweave, the metadata behind a gateway, the
base URI set on the contract, the token URI it returns, the on-chain account of a Metaplex token. A check could fetch
every image through a gateway, call the contract for every token URI and read the account of every mint. That would need
the network and often a key or an API token, would make the result depend on a gateway at the moment of the run, would
take hours for a large collection, and would let a file in a pull request make the pipeline reach any address it names.

What a team needs first, before the folder is uploaded and the base URI is set, is a list of what is wrong in the files
and where: a token with no image, a file under the wrong name, a trait spelt two ways, an image left as a path on the
machine that built it. The folder can be checked as files, reviewed like code and checked the same way on every run.

## Decision

1. The tool reads the folders and the files it is given, and nothing else. It contacts no IPFS node, gateway, Arweave
   node, chain or server, fetches nothing, needs no key, runs no program and sends no data anywhere.
2. A URI in a file is text: its scheme and its form are read, and a relative path is compared with the names of the
   media folder, found by a walk of the folder on disk with no link followed. A path is never opened from what a file
   says.
3. The base URI and the range of ids the contract will use are read from the config, never from a chain.
4. The rules the checks apply are listed in docs/method.md, and the public pages each documented check rests on are
   named in src/data.js and research/sources.md, each fetched and read before it was listed, with a copy of its text
   under research/sources.
5. The tool lists what to look at and what to change; it changes nothing and uploads nothing.

## Consequences

- The result depends only on the files, and a run needs no network access, no secret and no node.
- An upload that failed, a gateway that does not serve a file, or a base URI on the chain that differs from the config is
  not seen, and docs/secure-defaults.md says to run the tool on the exact folder that is uploaded and to look at a token
  on a test network before the mint.
- A content address is checked for its scheme only; whether it names the right file is not seen.
