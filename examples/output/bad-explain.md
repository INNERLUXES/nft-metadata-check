# nft-metadata-check: examples/bad/metadata

- Files: 15 metadata files \(JSON, 5,631 bytes\); 1 other file not read as metadata
- Config: examples/bad/collection.json \(JSON, 11 lines, 293 bytes\)
- Media: the metadata folder \(16 files\)
- Standard: ERC-1155, from the config
- Tokens: 13 ids, from 1 to 15; the config expects 1 to 14
- Findings: 31 \(19 error, 12 warning\)
- Result: **FAIL - 19 findings at or above error \(19 error, 12 warning\)**

## Findings

| Level | Check | Where | Message |
| --- | --- | --- | --- |
| error | id-missing | examples/bad/collection.json:4 | Id 10 of the tokenIds \(1 to 14\) has no metadata file. Fix: Add the missing files, or narrow the range of the config to the ids that will be minted. |
| error | id-missing | examples/bad/collection.json:4 | Id 14 of the tokenIds \(1 to 14\) has no metadata file. Fix: Add the missing files, or narrow the range of the config to the ids that will be minted. |
| error | uri-id-substitution | examples/bad/collection.json:8 | The baseUri of the collection config holds "\{ID\}"; an ERC-1155 client replaces only the exact text \{id\}. Fix: Write the placeholder as \{id\}, in small letters with no space, and put it in the base URI where the id goes. |
| error | field-invalid | examples/bad/collection.json:9 | The media of the collection config is the number 7; it must be text: the path of the media folder, relative to the folder of the config. Fix: Write the value as docs/inputs.md shows. |
| error | id-duplicate | examples/bad/metadata/0000000000000000000000000000000000000000000000000000000000000001.json:1 | The file 0000000000000000000000000000000000000000000000000000000000000001.json is for id 1, and so is 0000000000000000000000000000000000000000000000000000000000000001; which one a server gives for the token depends on the server. Fix: Keep one file for each id. |
| error | media-missing | examples/bad/metadata/0000000000000000000000000000000000000000000000000000000000000003.json:4 | The image of token 3 is the relative path "\{id\}.png", and the media folder examples/bad/metadata holds no file 0000000000000000000000000000000000000000000000000000000000000003.png. Fix: Add the file to the media folder, or correct the path, with the case of the file name. |
| error | metadata-field-missing | examples/bad/metadata/0000000000000000000000000000000000000000000000000000000000000004.json:1 | Token 4 has no image; the metadata schema of ERC-1155 defines image as a URI of an image of the asset, as text. Fix: Give every token a name and an image, as text. |
| error | field-type | examples/bad/metadata/0000000000000000000000000000000000000000000000000000000000000005.json:2 | The name of token 5 is the number 5; the metadata schema of ERC-1155 defines it as text. Fix: Write the field in the type the standard gives it \(docs/inputs.md\). |
| error | field-type | examples/bad/metadata/0000000000000000000000000000000000000000000000000000000000000005.json:5 | The decimals of token 5 is the number 1.5; the metadata schema of ERC-1155 defines it as a whole number of decimal places, written as a number. Fix: Write the field in the type the standard gives it \(docs/inputs.md\). |
| error | metadata-field-missing | examples/bad/metadata/0000000000000000000000000000000000000000000000000000000000000006.json:1 | Token 6 has no image; the metadata schema of ERC-1155 defines image as a URI of an image of the asset, as text. Fix: Give every token a name and an image, as text. |
| error | uri-local-path | examples/bad/metadata/0000000000000000000000000000000000000000000000000000000000000007.json:4 | The image of token 7, "C:\\sprites\\7.png", starts with a drive letter: a path on the machine that built the files, which no wallet can reach. Fix: Point at the uploaded file, or at a path inside the media folder that the upload tool replaces. |
| error | attributes-invalid | examples/bad/metadata/0000000000000000000000000000000000000000000000000000000000000007.json:7 | The attributes of token 7 are an object; the tool reads attributes as a list of objects, each with a trait\_type and a value. Fix: Write attributes as a list such as \[\{"trait\_type": "Background", "value": "Blue"\}\]. |
| error | field-type | examples/bad/metadata/0000000000000000000000000000000000000000000000000000000000000009.json:6 | The properties of token 9 is text; the metadata schema of ERC-1155 defines it as an object. Fix: Write the field in the type the standard gives it \(docs/inputs.md\). |
| error | secret-in-file | examples/bad/metadata/0000000000000000000000000000000000000000000000000000000000000009.json:17 | The file holds the key "mnemonic", which names a seed, a mnemonic or a private key. The tool never reads one, and the value is not shown. Fix: Remove the value from the file and from wherever the file was copied, treat it as exposed and move what it controls to a new key. Metadata is public once it is uploaded. |
| error | file-unreadable | examples/bad/metadata/000000000000000000000000000000000000000000000000000000000000000d.json:5 | The metadata file is not JSON the reader can follow: expected a key in double quotes and found "," at line 5, column 17. Nothing in the file was checked. Fix: Write each file as one JSON object in UTF-8 \(docs/inputs.md\); fix the line named. |
| error | id-out-of-range | examples/bad/metadata/000000000000000000000000000000000000000000000000000000000000000f.json:1 | The file 000000000000000000000000000000000000000000000000000000000000000f.json is for id 15, outside the tokenIds of the collection config, 1 to 14. Fix: Remove the file, or correct its name or the range of the config. |
| error | id-hex-form | examples/bad/metadata/0x0C.json:1 | The file name "0x0C.json" starts with 0x and has hex digits in capitals and has 2 hex digits, not 64; an ERC-1155 client puts the id in place of \{id\} as 64 hex digits in small letters with no 0x, so for token 12 it asks for 000000000000000000000000000000000000000000000000000000000000000c.json. Fix: Name the file for its id as 64 small hex digits, such as 0000000000000000000000000000000000000000000000000000000000000001.json for id 1. |
| error | id-hex-form | examples/bad/metadata/11.json:1 | The file name "11.json" is written in decimal, and was read as the decimal id; an ERC-1155 client puts the id in place of \{id\} as 64 hex digits in small letters with no 0x, so for token 11 it asks for 000000000000000000000000000000000000000000000000000000000000000b.json. Fix: Name the file for its id as 64 small hex digits, such as 0000000000000000000000000000000000000000000000000000000000000001.json for id 1. |
| error | uri-id-substitution | examples/bad/metadata/11.json:4 | The image of token 11 holds "\{tokenId\}"; an ERC-1155 client replaces only the exact text \{id\}, so the placeholder reaches the wallet as it is written. Fix: Write the placeholder as \{id\}, in small letters with no space, and put it in the base URI where the id goes. |
| warning | uri-mutable | examples/bad/collection.json:8 | The baseUri of the collection config is on https:, a web address whose server can change or remove the metadata after the mint. Fix: Upload the media and the metadata to a content address, such as ipfs:// or ar://, and point at that. |
| warning | field-unknown | examples/bad/collection.json:10 | The key "mediaFolder" of the collection config is not one the tool reads, so its value was left out of every check. Did you mean "media"? The keys of the collection config are standard, tokenIds, baseUri, media, notes. Fix: Write the key as the standard spells it \(docs/inputs.md\), or remove it. |
| warning | description-missing | examples/bad/metadata/0000000000000000000000000000000000000000000000000000000000000004.json:3 | The description of token 4 is empty; the metadata schema of ERC-1155 defines description as a description of the asset, as text. Fix: Give every token a description, as text. |
| warning | attribute-value-empty | examples/bad/metadata/0000000000000000000000000000000000000000000000000000000000000004.json:9 | An attribute of token 4 has the trait\_type "Background" with an empty value. Fix: Give the attribute a value, or leave it out of the token. |
| warning | uri-mutable | examples/bad/metadata/0000000000000000000000000000000000000000000000000000000000000005.json:4 | The image of token 5 is on http:, a web address whose server can change or remove the file after the mint, and that is not encrypted. Fix: Upload the media and the metadata to a content address, such as ipfs:// or ar://, and point at that. |
| warning | trait-type-inconsistent | examples/bad/metadata/0000000000000000000000000000000000000000000000000000000000000005.json:14 | The value of the trait "Level" of token 5 is text, but in 10 other attributes of the collection it is a number. Fix: Write each trait type the same way in every token, and its values as one type: text, or numbers. |
| warning | trait-type-inconsistent | examples/bad/metadata/0000000000000000000000000000000000000000000000000000000000000006.json:8 | The trait type "background" of token 6 differs only in case or separators from "Background", which 9 other attributes of the collection use; a marketplace shows them as two traits. Fix: Write each trait type the same way in every token, and its values as one type: text, or numbers. |
| warning | field-unknown | examples/bad/metadata/0000000000000000000000000000000000000000000000000000000000000006.json:16 | The key "Image" of the metadata of token 6 differs from image only in case or separators; the standard spells it image, so its value was left out of every check. Fix: Write the key as the standard spells it \(docs/inputs.md\), or remove it. |
| warning | name-duplicate | examples/bad/metadata/0000000000000000000000000000000000000000000000000000000000000008.json:2 | Token 8 has the name "Example Sprite 1", as token 1 \(0000000000000000000000000000000000000000000000000000000000000001\) does. Fix: Give every token a name of its own, such as the name of the collection and the id. |
| warning | attributes-duplicate | examples/bad/metadata/0000000000000000000000000000000000000000000000000000000000000008.json:7 | Token 8 has the same 2 attributes as token 1 \(0000000000000000000000000000000000000000000000000000000000000001\). Fix: Check the two tokens, and change or remove one when the copy is not meant. |
| warning | uri-scheme-unknown | examples/bad/metadata/0000000000000000000000000000000000000000000000000000000000000009.json:4 | The image of token 9 uses the scheme ftp:, which is not one the tool knows \(ipfs:, ar:, https:, http:, data:\). Fix: Use ipfs://, ar:// or https://, or check that the wallets and marketplaces of the collection read the scheme. |
| warning | file-name-unexpected | examples/bad/metadata/token-sheet.json:1 | The file name "token-sheet.json" is not an id, so no token id leads to it; it was checked for its fields but not counted as a token. Fix: Name each file for its id as the base URI builds it, such as 1.json or 1, with .json in small letters. |

## Basis

### id-missing

- The tool's own choice: asking for a file for every id of the range of the config is a best practice of this tool, not a rule in the pages it cites; the range is the collection's own

### uri-id-substitution

- When the text \{id\} is in a URI or in a value of the metadata of an ERC-1155 token, a client puts the id of the token in its place, written in hex with the digits 0-9 and a-f in small letters, with no 0x, and filled with zeros on the left to 64 characters. (ERC-1155: Multi Token Standard, <https://eips.ethereum.org/EIPS/eip-1155>)

### field-invalid

- A problem with one of the files itself; it rests on no page.

### id-duplicate

- The tool's own choice: asking for one file for each id is a best practice of this tool, not a rule in the pages it cites; no cited page sets a rule for the files of a folder

### media-missing

- The tool's own choice: checking relative paths against the media folder is a best practice of this tool, not a rule in the pages it cites; a relative path is a convention of upload tools that replace it with the uploaded address, and a file that is not there is not uploaded

### metadata-field-missing

- The metadata schema of ERC-1155 follows the one of ERC-721, with name, description and image as strings, and adds decimals, a whole number of places for showing an amount, and properties, an object whose values may be of any kind. (ERC-1155: Multi Token Standard, <https://eips.ethereum.org/EIPS/eip-1155>)

### field-type

- The metadata schema of ERC-1155 follows the one of ERC-721, with name, description and image as strings, and adds decimals, a whole number of places for showing an amount, and properties, an object whose values may be of any kind. (ERC-1155: Multi Token Standard, <https://eips.ethereum.org/EIPS/eip-1155>)

### uri-local-path

- The tool's own choice: reporting a local path is a best practice of this tool, not a rule in the pages it cites; no wallet or marketplace can reach a path on the machine that built the files

### attributes-invalid

- The Token Metadata standard of Metaplex gives the JSON of a non-fungible token a name, a description and an image as strings, animation\_url and external\_url as URIs, attributes as a list of objects with a trait\_type and a value, and properties with a category and a list of files, each with a uri and a type. (Metaplex Developer Hub: Token Metadata, Token Standard, <https://developers.metaplex.com/token-metadata/token-standard>)
- The tool's own choice: reading the attributes of an ERC-721 or ERC-1155 token as a list of objects with a trait\_type and a value is a best practice of this tool, not a rule in the pages it cites; neither EIP defines attributes, and the form is the one the Metaplex page writes and marketplaces read

### secret-in-file

- A problem with one of the files itself; it rests on no page.

### file-unreadable

- A problem with one of the files itself; it rests on no page.

### id-out-of-range

- An ERC-721 token is named by a uint256 id. A contract may start at 0 and count up by one, but a caller is told not to read any pattern into the ids, and a token may also be destroyed. (ERC-721: Non-Fungible Token Standard, <https://eips.ethereum.org/EIPS/eip-721>)
- The tool's own choice: holding the files to the range of ids of the config is a best practice of this tool, not a rule in the pages it cites; the range is the collection's own, and the EIPs only make an id a uint256

### id-hex-form

- When the text \{id\} is in a URI or in a value of the metadata of an ERC-1155 token, a client puts the id of the token in its place, written in hex with the digits 0-9 and a-f in small letters, with no 0x, and filled with zeros on the left to 64 characters. (ERC-1155: Multi Token Standard, <https://eips.ethereum.org/EIPS/eip-1155>)

### uri-mutable

- The tool's own choice: preferring a content address to a web address is a best practice of this tool, not a rule in the pages it cites; the pages allow any URI, and a web address is not wrong, but what it serves can change after the mint

### field-unknown

- A problem with one of the files itself; it rests on no page.

### description-missing

- The metadata schema of ERC-1155 follows the one of ERC-721, with name, description and image as strings, and adds decimals, a whole number of places for showing an amount, and properties, an object whose values may be of any kind. (ERC-1155: Multi Token Standard, <https://eips.ethereum.org/EIPS/eip-1155>)

### attribute-value-empty

- The tool's own choice: reporting an empty trait or value is a best practice of this tool, not a rule in the pages it cites; marketplaces show an empty trait as a filter of its own

### trait-type-inconsistent

- The tool's own choice: asking for one spelling and one type for each trait is a best practice of this tool, not a rule in the pages it cites; marketplaces sort and filter a trait by its values and treat two spellings as two traits

### name-duplicate

- The tool's own choice: asking for a name of its own for each token is a best practice of this tool, not a rule in the pages it cites; the pages give a token a name and set no rule that names differ, and an edition of one item may share a name on purpose

### attributes-duplicate

- The tool's own choice: reporting two tokens with the same attributes is a best practice of this tool, not a rule in the pages it cites; the pages set no rule that tokens differ

### uri-scheme-unknown

- The tool's own choice: the list of schemes is a best practice of this tool, not a rule in the pages it cites; the pages say a URI, and a wallet reads only the schemes it knows

### file-name-unexpected

- The tool's own choice: asking for file names that are the plain id is a best practice of this tool, not a rule in the pages it cites; a contract that joins a base URI and an id writes the id in decimal with no zeros in front \(in hex for ERC-1155\), and a file under another name is not reached

## Traits (3)

| Trait type | Tokens | Values | Types |
| --- | ---: | ---: | --- |
| Background | 9 | 7 | text |
| Level | 11 | 10 | text, number |
| background | 1 | 1 | text |

Note: 1 file of the metadata folder, 0000000000000000000000000000000000000000000000000000000000000002.png, is not named as metadata and was not read as metadata; the media of the tokens is looked for among them

This report is an input to a review before the collection is minted: not a marketplace review, not a check of what is on IPFS or a chain and not a guarantee that a wallet or a marketplace will show the tokens.
