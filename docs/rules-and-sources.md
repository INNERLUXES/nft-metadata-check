# Rules and sources

Every check of the tool, with what it looks at, the points of the public pages it rests on, what it cannot see, and what to change. The points are in this project's own words and are the ones the reports show with `--explain`; each page was fetched and read before it was listed, and a copy of its text is kept under [research/sources](../research/sources) so that a point can be checked against the page it came from. [../research/sources.md](../research/sources.md) has a note on each page.

The tool is an input to a review before the collection is minted: not a marketplace review, not a check of what is on IPFS or a chain and not a guarantee that a wallet or a marketplace will show the tokens. A check that is a best practice of this tool says so in its message; it is not a rule in the pages it cites. A check that rests on the schema of more than one standard lists the point of each, and a report shows only the point of the standard of the collection.

## The pages

- ERC-721: Non-Fungible Token Standard: https://eips.ethereum.org/EIPS/eip-721 (copy: `research/sources/eip-721-non-fungible-token.txt`)
- ERC-1155: Multi Token Standard: https://eips.ethereum.org/EIPS/eip-1155 (copy: `research/sources/eip-1155-multi-token.txt`)
- Metaplex Developer Hub: Token Metadata, Token Standard: https://developers.metaplex.com/token-metadata/token-standard (copy: `research/sources/metaplex-token-standard.txt`)

## file-unreadable

- Level: error
- Kind: a problem with one of the files itself; it has no setting to lower
- Looks at: a metadata file or the collection config is not text the tool can read (not UTF-8, a null byte, too large, a link) or not strict JSON, or its top level is not an object, so nothing in it was checked.
- Cannot see: It stops at the first place that is not strict JSON, or at a top level that is not an object, so nothing in that file is checked; a file that is not text, a link or a file over the size limit is not read at all. JSON with comments, JSON5 and YAML are not read.
- What to change: Write each file as one JSON object in UTF-8 (docs/inputs.md); fix the line named.
- Points of the pages: none; this check is about one of the files itself.

## field-unknown

- Level: warning
- Kind: a problem with one of the files itself; it has no setting to lower
- Looks at: a key of the config the tool does not read, or a key of a metadata file or an attribute that differs from a field of the standard only in case or separators, such as Image or traitType; its value was left out of every check.
- Cannot see: In the config it cannot tell what a misspelt key was meant to say; it names a known key when one differs only in case or separators or starts the same. In a metadata file it reports only a key that differs from a field of the standard in case or separators, because every other key, such as dna or edition, is the collection's own.
- What to change: Write the key as the standard spells it (docs/inputs.md), or remove it.
- Points of the pages: none; this check is about one of the files itself.

## field-invalid

- Level: error
- Kind: a problem with one of the files itself; it has no setting to lower
- Looks at: a value of the config of the wrong type or form: a standard the tool does not know, token ids that are not whole numbers from first to last, a base URI or a media folder that is not text.
- Cannot see: It reads the form of a value of the config, not whether it is right: a range of ids or a media folder that does not match the collection is read as given.
- What to change: Write the value as docs/inputs.md shows.
- Points of the pages: none; this check is about one of the files itself.

## secret-in-file

- Level: error
- Kind: a problem with one of the files itself; it has no setting to lower
- Looks at: a file holds a private key, a seed or a mnemonic, under a key named for one or as a value shaped like one; the tool never reads it and never shows it.
- Cannot see: It knows a secret by the name of its key and by the shape of its value; a secret split over fields, encoded another way or under another name is not caught, and an attribute value of 64 hex digits, such as a hash, is reported as a key in hex.
- What to change: Remove the value from the file and from wherever the file was copied, treat it as exposed and move what it controls to a new key. Metadata is public once it is uploaded.
- Points of the pages: none; this check is about one of the files itself.

## metadata-field-missing

- Level: error
- Kind: documented in the pages below
- Looks at: a token has no name or no image, or one that is empty, though the metadata schema of its standard defines both.
- Cannot see: The schemas of the pages list their fields and do not mark any as required; the tool reads a name and an image as needed by every token, as wallets and marketplaces show them. It does not know whether the image is an image, what size it is or whether it was uploaded. An image_data field in place of image is not read.
- What to change: Give every token a name and an image, as text.
- Points of the pages:
  - The metadata extension of ERC-721 points each token at a JSON file of the ERC721 Metadata JSON Schema, which defines three fields, each a string: the name and the description of the asset, and image, a URI of a resource with a mime type of image/*. (ERC-721: Non-Fungible Token Standard, https://eips.ethereum.org/EIPS/eip-721)
  - The metadata schema of ERC-1155 follows the one of ERC-721, with name, description and image as strings, and adds decimals, a whole number of places for showing an amount, and properties, an object whose values may be of any kind. (ERC-1155: Multi Token Standard, https://eips.ethereum.org/EIPS/eip-1155)
  - The Token Metadata standard of Metaplex gives the JSON of a non-fungible token a name, a description and an image as strings, animation_url and external_url as URIs, attributes as a list of objects with a trait_type and a value, and properties with a category and a list of files, each with a uri and a type. (Metaplex Developer Hub: Token Metadata, Token Standard, https://developers.metaplex.com/token-metadata/token-standard)

## description-missing

- Level: warning
- Kind: documented in the pages below
- Looks at: a token has no description, or one that is empty, though the metadata schema of its standard defines it.
- Cannot see: It reads whether a description is there, not what it says; a description shared by every token passes.
- What to change: Give every token a description, as text.
- Points of the pages:
  - The metadata extension of ERC-721 points each token at a JSON file of the ERC721 Metadata JSON Schema, which defines three fields, each a string: the name and the description of the asset, and image, a URI of a resource with a mime type of image/*. (ERC-721: Non-Fungible Token Standard, https://eips.ethereum.org/EIPS/eip-721)
  - The metadata schema of ERC-1155 follows the one of ERC-721, with name, description and image as strings, and adds decimals, a whole number of places for showing an amount, and properties, an object whose values may be of any kind. (ERC-1155: Multi Token Standard, https://eips.ethereum.org/EIPS/eip-1155)
  - The Token Metadata standard of Metaplex gives the JSON of a non-fungible token a name, a description and an image as strings, animation_url and external_url as URIs, attributes as a list of objects with a trait_type and a value, and properties with a category and a list of files, each with a uri and a type. (Metaplex Developer Hub: Token Metadata, Token Standard, https://developers.metaplex.com/token-metadata/token-standard)

## field-type

- Level: error
- Kind: documented in the pages below
- Looks at: a field the schema of the standard defines has the wrong type: a name, description or image that is not text, an ERC-1155 decimals that is not a whole number or properties that are not an object, or in Metaplex attributes that are not a list of objects with a trait_type and a value, properties.files that are not a list of objects with a uri and a type, or an animation_url, external_url or category that is not text.
- Cannot see: It reads the type of each field the schema of the standard defines and leaves other fields alone. In Metaplex it takes a number as the value of an attribute too, though the page writes the value as text, because marketplaces read both; the symbol of the Fungible standard is not asked of a non-fungible token. A localization object of ERC-1155 is not read.
- What to change: Write the field in the type the standard gives it (docs/inputs.md).
- Points of the pages:
  - The metadata extension of ERC-721 points each token at a JSON file of the ERC721 Metadata JSON Schema, which defines three fields, each a string: the name and the description of the asset, and image, a URI of a resource with a mime type of image/*. (ERC-721: Non-Fungible Token Standard, https://eips.ethereum.org/EIPS/eip-721)
  - The metadata schema of ERC-1155 follows the one of ERC-721, with name, description and image as strings, and adds decimals, a whole number of places for showing an amount, and properties, an object whose values may be of any kind. (ERC-1155: Multi Token Standard, https://eips.ethereum.org/EIPS/eip-1155)
  - The Token Metadata standard of Metaplex gives the JSON of a non-fungible token a name, a description and an image as strings, animation_url and external_url as URIs, attributes as a list of objects with a trait_type and a value, and properties with a category and a list of files, each with a uri and a type. (Metaplex Developer Hub: Token Metadata, Token Standard, https://developers.metaplex.com/token-metadata/token-standard)

## id-hex-form

- Level: error
- Kind: documented in the pages below
- Looks at: in an ERC-1155 collection, a file name that is an id but not in the form clients put in place of {id}: 64 hex digits in small letters with no 0x, filled with zeros on the left.
- Cannot see: It reads the name of each file; it does not know the URI the contract returns, and a file served under another name by a server that rewrites addresses is not seen. A name in decimal is read as the decimal id, which may not be what was meant.
- What to change: Name the file for its id as 64 small hex digits, such as 0000000000000000000000000000000000000000000000000000000000000001.json for id 1.
- Points of the pages:
  - When the text {id} is in a URI or in a value of the metadata of an ERC-1155 token, a client puts the id of the token in its place, written in hex with the digits 0-9 and a-f in small letters, with no 0x, and filled with zeros on the left to 64 characters. (ERC-1155: Multi Token Standard, https://eips.ethereum.org/EIPS/eip-1155)

## uri-id-substitution

- Level: error
- Kind: documented in the pages below
- Looks at: in an ERC-1155 collection, a base URI with no {id}, or a URI with a placeholder in braces other than the exact {id}, such as {ID} or {tokenId}, which no client replaces.
- Cannot see: It reads the text of the base URI and of the URIs of the media of each token; a placeholder in another value, such as the description, is not read. It does not know the URI the contract returns.
- What to change: Write the placeholder as {id}, in small letters with no space, and put it in the base URI where the id goes.
- Points of the pages:
  - When the text {id} is in a URI or in a value of the metadata of an ERC-1155 token, a client puts the id of the token in its place, written in hex with the digits 0-9 and a-f in small letters, with no 0x, and filled with zeros on the left to 64 characters. (ERC-1155: Multi Token Standard, https://eips.ethereum.org/EIPS/eip-1155)

## attributes-invalid

- Level: error
- Kind: a best practice of this tool, not a rule in the pages it cites
- Looks at: in an ERC-721 or ERC-1155 collection, attributes that are not a list of objects, each with a trait_type as text and a value as text or a number.
- Cannot see: It reads the form of the list; whether a marketplace shows a trait, its display_type or its max_value is not checked.
- What to change: Write attributes as a list such as [{"trait_type": "Background", "value": "Blue"}].
- Points of the pages:
  - The Token Metadata standard of Metaplex gives the JSON of a non-fungible token a name, a description and an image as strings, animation_url and external_url as URIs, attributes as a list of objects with a trait_type and a value, and properties with a category and a list of files, each with a uri and a type. (Metaplex Developer Hub: Token Metadata, Token Standard, https://developers.metaplex.com/token-metadata/token-standard)
- The tool's own choice: reading the attributes of an ERC-721 or ERC-1155 token as a list of objects with a trait_type and a value is a best practice of this tool, not a rule in the pages it cites; neither EIP defines attributes, and the form is the one the Metaplex page writes and marketplaces read.

## file-name-unexpected

- Level: warning
- Kind: a best practice of this tool, not a rule in the pages it cites
- Looks at: a metadata file whose name is not the plain id the base URI leads to: zeros in front of a decimal id, 64 hex digits in an ERC-721 or Metaplex collection, an extension in capitals, or a name that is no id at all.
- Cannot see: It reads the name of each file as a contract that joins a base URI and the id builds it; a contract that builds its URIs another way, or a server that rewrites addresses, is not seen.
- What to change: Name each file for its id as the base URI builds it, such as 1.json or 1, with .json in small letters.
- Points of the pages: none; no page sets this rule.
- The tool's own choice: asking for file names that are the plain id is a best practice of this tool, not a rule in the pages it cites; a contract that joins a base URI and an id writes the id in decimal with no zeros in front (in hex for ERC-1155), and a file under another name is not reached.

## id-out-of-range

- Level: error
- Kind: a best practice of this tool, not a rule in the pages it cites
- Looks at: a token id outside the range tokenIds of the config, or above the largest uint256.
- Cannot see: It knows the range of ids only from the config, and the largest uint256 from the type of a token id; how many tokens the contract will mint is not seen.
- What to change: Remove the file, or correct its name or the range of the config.
- Points of the pages:
  - An ERC-721 token is named by a uint256 id. A contract may start at 0 and count up by one, but a caller is told not to read any pattern into the ids, and a token may also be destroyed. (ERC-721: Non-Fungible Token Standard, https://eips.ethereum.org/EIPS/eip-721)
- The tool's own choice: holding the files to the range of ids of the config is a best practice of this tool, not a rule in the pages it cites; the range is the collection's own, and the EIPs only make an id a uint256.

## id-missing

- Level: error
- Kind: a best practice of this tool, not a rule in the pages it cites
- Looks at: an id inside the range tokenIds of the config has no metadata file, so the token minted with it has no metadata.
- Cannot see: It knows the range of ids only from the config. A token that is minted later, or burnt, is not seen; a run of missing ids is one finding at the line of tokenIds, and past 100 runs a note says there are more.
- What to change: Add the missing files, or narrow the range of the config to the ids that will be minted.
- Points of the pages: none; no page sets this rule.
- The tool's own choice: asking for a file for every id of the range of the config is a best practice of this tool, not a rule in the pages it cites; the range is the collection's own.

## id-gap

- Level: warning
- Kind: a best practice of this tool, not a rule in the pages it cites
- Looks at: with no range in the config, ids missing between the lowest and the highest id of the files.
- Cannot see: With no range in the config it cannot tell a gap that is meant from a file that is missing, and it cannot see ids missing below the lowest or above the highest file. Past 100 gaps a note says there are more.
- What to change: Add the missing files, or give the range of ids in the config (tokenIds) when the gap is meant.
- Points of the pages:
  - An ERC-721 token is named by a uint256 id. A contract may start at 0 and count up by one, but a caller is told not to read any pattern into the ids, and a token may also be destroyed. (ERC-721: Non-Fungible Token Standard, https://eips.ethereum.org/EIPS/eip-721)
- The tool's own choice: reporting a gap in the ids is a best practice of this tool, not a rule in the pages it cites; ERC-721 tells callers not to read a pattern into the ids, so a gap may be meant, and it is a warning.

## id-duplicate

- Level: error
- Kind: a best practice of this tool, not a rule in the pages it cites
- Looks at: two files are for the same id, such as 1.json and 01.json, or 1 and 1.json, so which one is served depends on the server.
- Cannot see: It reads the id each name stands for; two files with the same content under two ids are not duplicates of an id (attributes-duplicate and name-duplicate look at the content).
- What to change: Keep one file for each id.
- Points of the pages: none; no page sets this rule.
- The tool's own choice: asking for one file for each id is a best practice of this tool, not a rule in the pages it cites; no cited page sets a rule for the files of a folder.

## base-uri-no-slash

- Level: warning
- Kind: a best practice of this tool, not a rule in the pages it cites
- Looks at: in an ERC-721 collection, a base URI with no {id} that does not end in /, so the base URI and the id run together, as in ipfs://cid1 for ipfs://cid/1.
- Cannot see: It reads the base URI of the config as an ERC-721 contract that joins a base URI and the id would; a contract that adds the / itself, or builds its URIs another way, is not seen.
- What to change: End the base URI with /.
- Points of the pages: none; no page sets this rule.
- The tool's own choice: asking for a / at the end of a base URI is a best practice of this tool, not a rule in the pages it cites; a contract that builds a token URI by joining a base URI and the id adds no / of its own.

## uri-mutable

- Level: warning
- Kind: a best practice of this tool, not a rule in the pages it cites
- Looks at: an image, animation_url, file uri or base URI on http: or https:, which whoever runs the server can change or take down after the mint; http: is also not encrypted.
- Cannot see: It reads the scheme of the address; who runs the server, whether it pins its files or whether the address serves the file at all is not seen. external_url is a web page about the token and is not checked.
- What to change: Upload the media and the metadata to a content address, such as ipfs:// or ar://, and point at that.
- Points of the pages: none; no page sets this rule.
- The tool's own choice: preferring a content address to a web address is a best practice of this tool, not a rule in the pages it cites; the pages allow any URI, and a web address is not wrong, but what it serves can change after the mint.

## uri-local-path

- Level: error
- Kind: a best practice of this tool, not a rule in the pages it cites
- Looks at: an image, animation_url, file uri or base URI that is a path on the machine that built the files: a file: URI, an absolute path, a drive letter, a backslash, a ~ or a .. that leaves the media folder.
- Cannot see: It reads the form of the text: a file: URI, an absolute path, a drive letter, a backslash, a ~ or a .. segment. A path on another machine written as a relative path is a media-missing finding instead, when the file is not in the media folder.
- What to change: Point at the uploaded file, or at a path inside the media folder that the upload tool replaces.
- Points of the pages: none; no page sets this rule.
- The tool's own choice: reporting a local path is a best practice of this tool, not a rule in the pages it cites; no wallet or marketplace can reach a path on the machine that built the files.

## uri-scheme-unknown

- Level: warning
- Kind: a best practice of this tool, not a rule in the pages it cites
- Looks at: an image, animation_url, file uri or base URI with a scheme the tool does not know (it knows ipfs:, ar:, https:, http: and data:), or a base URI with no scheme.
- Cannot see: It knows the schemes ipfs:, ar:, https:, http: and data:; a wallet that reads another scheme is not known to the tool.
- What to change: Use ipfs://, ar:// or https://, or check that the wallets and marketplaces of the collection read the scheme.
- Points of the pages: none; no page sets this rule.
- The tool's own choice: the list of schemes is a best practice of this tool, not a rule in the pages it cites; the pages say a URI, and a wallet reads only the schemes it knows.

## uri-data-large

- Level: warning
- Kind: a best practice of this tool, not a rule in the pages it cites
- Looks at: a data: URI longer than 65,536 characters in an image, animation_url or file uri.
- Cannot see: It counts the characters of the URI; the media type, the encoding and whether a wallet shows the data are not read.
- What to change: Upload the media and point at it, or make the data smaller.
- Points of the pages: none; no page sets this rule.
- The tool's own choice: the limit of 65,536 characters is a best practice of this tool, not a rule in the pages it cites; a wallet or a marketplace may cut, refuse or slowly load a long data: URI, and a data: URI makes the metadata the media.

## media-missing

- Level: error
- Kind: a best practice of this tool, not a rule in the pages it cites
- Looks at: an image, animation_url or file uri that is a relative path with no file of that name in the media folder (names are compared with their case).
- Cannot see: It looks for the file by its name in the listing of the media folder, with its case, after it reads percent escapes and leaves out ./ in front and a query or fragment after; it does not open the file, so a file of the right name with the wrong content passes. In ERC-1155 it puts the 64 hex digits of the id in place of {id} first. A content address is not looked up.
- What to change: Add the file to the media folder, or correct the path, with the case of the file name.
- Points of the pages: none; no page sets this rule.
- The tool's own choice: checking relative paths against the media folder is a best practice of this tool, not a rule in the pages it cites; a relative path is a convention of upload tools that replace it with the uploaded address, and a file that is not there is not uploaded.

## name-duplicate

- Level: warning
- Kind: a best practice of this tool, not a rule in the pages it cites
- Looks at: two tokens share a name (compared without case and outer spaces), so a buyer cannot tell them apart by name.
- Cannot see: It compares names without case and outer spaces; names that differ only in a character that looks the same, or editions of one item that share a name on purpose, are not told apart.
- What to change: Give every token a name of its own, such as the name of the collection and the id.
- Points of the pages: none; no page sets this rule.
- The tool's own choice: asking for a name of its own for each token is a best practice of this tool, not a rule in the pages it cites; the pages give a token a name and set no rule that names differ, and an edition of one item may share a name on purpose.

## attributes-duplicate

- Level: warning
- Kind: a best practice of this tool, not a rule in the pages it cites
- Looks at: two tokens have the same set of attributes, which often means one token was made twice.
- Cannot see: It compares the sets of trait types and values, in any order; two tokens whose images are the same but whose attributes differ, or two tokens that differ only in an attribute the tool did not read, are not found.
- What to change: Check the two tokens, and change or remove one when the copy is not meant.
- Points of the pages: none; no page sets this rule.
- The tool's own choice: reporting two tokens with the same attributes is a best practice of this tool, not a rule in the pages it cites; the pages set no rule that tokens differ.

## attribute-value-empty

- Level: warning
- Kind: a best practice of this tool, not a rule in the pages it cites
- Looks at: an attribute with a trait_type or a value that is empty or only spaces.
- Cannot see: It reads the text of the trait type and the value; a value such as "none" or "-" that stands for no value is not empty to the tool.
- What to change: Give the attribute a value, or leave it out of the token.
- Points of the pages: none; no page sets this rule.
- The tool's own choice: reporting an empty trait or value is a best practice of this tool, not a rule in the pages it cites; marketplaces show an empty trait as a filter of its own.

## trait-type-inconsistent

- Level: warning
- Kind: a best practice of this tool, not a rule in the pages it cites
- Looks at: across the collection, a trait whose values are of more than one type, such as 5 and "5", or trait types that differ only in case or separators, such as Background and background.
- Cannot see: It compares the trait types of the tokens and the types of their values with the most common one; it does not know which spelling or type is meant, and values of one type that are spelt two ways, such as Blue and blue, are not reported.
- What to change: Write each trait type the same way in every token, and its values as one type: text, or numbers.
- Points of the pages: none; no page sets this rule.
- The tool's own choice: asking for one spelling and one type for each trait is a best practice of this tool, not a rule in the pages it cites; marketplaces sort and filter a trait by its values and treat two spellings as two traits.
