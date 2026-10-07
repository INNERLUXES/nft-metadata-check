# Threat model

The tool is an input to a review before the collection is minted: not a marketplace review, not a check of what is on
IPFS or a chain and not a guarantee that a wallet or a marketplace will show the tokens. This document is about the tool
itself: what it touches, what a hostile or careless folder can try, and what stops it.

## What the tool touches

- It lists the metadata folder and the media folder named on the command line or in the config, and reads the metadata
  files and the config. Nothing else is opened, and no address, URI or path written in a file is looked up or followed;
  a relative media path is only compared with the names of the listing.
- It writes the report to standard output and its errors to standard error. It writes nothing to disk.
- It opens no network connection, fetches no URL, contacts no IPFS node, gateway, chain or server, follows no symbolic
  link, runs nothing it reads, evaluates nothing and reads no clock and no locale.

## What the input may hold

A metadata folder is written by a script, edited by a person, or uploaded, and in a pipeline that checks every pull
request it may be written by whoever opened the pull request. Through it, a person can try to, or a careless change can:

- put a private key, a seed or a mnemonic in a metadata file or the config, so that the tool copies it into a pipeline
  log, a pull request comment or a code scanning upload;
- make the tool read outside the folders: a link in the metadata folder or the media folder, a link named as the folder,
  a media path with `..`, an absolute path or a `file:` URI, an address given as the path;
- make the tool reach a server: an `ipfs://`, `ar://` or `https://` address in a file, a gateway named in the config;
- exhaust the memory, the stack or the time: a hundred thousand metadata files, a file of many megabytes, arrays and
  objects nested very deep, very long strings, thousands of attributes, a file name of thousands of digits, a range of
  ids as wide as every uint256, a media folder of many files or many levels, a link that loops;
- move the result: a key written twice so that two readers see two values, a field of the wrong type that might be taken
  as fine, a key spelt `Image` that hides the image, two files for one id;
- slip in something that is not text: a binary file named `.json`, bytes that are not valid UTF-8 or UTF-16;
- rewrite the terminal or break the output: control characters, escape sequences, direction controls and line separators
  in a file name, a token name, a trait or a URI;
- hide markup in the markdown report: a link, a table separator or a tag in a name or a trait;
- change how objects behave: a key, a trait type or a name such as `__proto__`, `constructor` or `toString`.

## What could go wrong, and what stops it

| Risk | Control |
| --- | --- |
| A secret in a file is copied into the output | Before a file is read, every key and value is looked at for a key or a seed; each one found is a `secret-in-file` error, the value is marked, the readers leave it out as if it were not there, and no message names it. Tests put each shape under several fields, in an attribute and in the config, and check every format for the value |
| A link makes the tool read a file it was not given | A folder named on the command line or in the config is checked with `lstat` and a link is refused; the metadata folder is listed and a link in it is a `file-unreadable` finding, never opened; a file is opened with `O_NOFOLLOW` where the system has it, and its type and size are taken from the open handle; the walk of the media folder follows no link. Tests put links in the folders |
| A media path leaves the media folder | A media path is never opened: it is compared with the names the walk of the media folder found. A path with `..`, an absolute path, a drive letter or a `file:` URI is a `uri-local-path` finding |
| The tool reaches a server, fetches, connects or runs something | No module of the network or of child processes is imported, nothing is evaluated, a URI is only text that is checked for its form, and a path that looks like an address is refused. A test checks the imports of src |
| The memory, the stack or the time is exhausted | Each file has a size limit checked on the open handle before it is read, and the run has limits of files and bytes; the JSON reader keeps limits of nesting, values and string length and works with a stack of its own, and so do the search for secrets and the walk of the media folder, which has limits of depth and files; attributes and files of the properties have limits; ids are kept in a Map and sorted once, and the missing ids of a range are worked out from the sorted ids, never by walking the range; names, sets of attributes and traits are kept in Maps. Tests check the time, with limits that widen under coverage only |
| A key written twice hides a value | A key written twice in one JSON object is a `file-unreadable` finding |
| A misspelt or missing field passes for one that is fine | A key of a metadata file that differs from a field of the standard only in case or separators is a `field-unknown` finding; a missing name or image is `metadata-field-missing`; a value of the wrong type is `field-type`; a key of the config the tool does not read is `field-unknown` with the key it is probably meant to be |
| Two files for one id give two answers | The second file of an id is `id-duplicate` and is left out of the checks across the tokens |
| A binary file or bytes in another encoding are read as text | A null byte in UTF-8, an odd number of bytes in UTF-16 and bytes that are not valid make a metadata file a `file-unreadable` finding, and the config an input error with exit code `2` |
| Text from a file rewrites the terminal | Every text from the input goes through `safeText`, which replaces control, line separator and direction characters and caps the length. A test puts escapes and direction controls in a name, a trait and a file name, in every format |
| Markup in a name changes the markdown report | The markdown report escapes the characters markdown gives a meaning to. A test writes a link into a name |
| `__proto__` changes how objects behave | Objects of a file are lists of entries compared with the names the tool reads, and no object is built with a key from a file; names, traits and ids are kept in Maps and Sets. A test uses `__proto__`, `constructor` and `toString` as keys, traits and names |
| A device or a pipe hangs the tool | A config that is not a regular file is refused before it is read, and a metadata file that is not a regular file is not read |
| The tool leaves files behind | Nothing is written to disk; there is no cache, no temporary file and no log. A test checks that a run leaves the folder as it was |

## Out of scope

Whether the media and the metadata were uploaded and what a server or a gateway serves, what the contract returns, the
forms and secrets docs/limits.md says the tool does not see, who may change or upload the files, and where your pipeline
keeps the output.
