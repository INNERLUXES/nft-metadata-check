# nft-metadata-check: examples/good/metadata

- Files: 6 metadata files \(JSON, 3,245 bytes\)
- Config: examples/good/collection.json \(JSON, 10 lines, 273 bytes\)
- Media: examples/good/media \(6 files\)
- Standard: ERC-721, from the config
- Tokens: 6 ids, from 1 to 6; the config expects 1 to 6
- Findings: 0
- Result: **PASS - no finding at or above error**

## Findings

None.

## Traits (4)

| Trait type | Tokens | Values | Types |
| --- | ---: | ---: | --- |
| Background | 6 | 3 | text |
| Glow | 6 | 6 | number |
| Mood | 6 | 2 | text |
| Shape | 6 | 2 | text |

This report is an input to a review before the collection is minted: not a marketplace review, not a check of what is on IPFS or a chain and not a guarantee that a wallet or a marketplace will show the tokens.
