# Browser QA inventory

The page is intentionally scrollable. The first view must expose the query, read-only scope, example choices and source status. A source-labelled result, not a successful HTTP request, is the critical flow.

| Claim / control                                    | Functional check                                                                      | Visual state / evidence                                       |
| -------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| No wallet, account or transaction submission       | Query existing mainnet data; inspect requests for read methods only                   | Initial desktop and 390 px mobile views                       |
| Recorded examples remain distinguishable           | Select ERC-20, native and multiple examples; return to ERC-20                         | Recorded source strip and independent expected amounts        |
| Real mainnet inspection                            | Enter a known hash and click Read from mainnet                                        | Live source strip, movement amount, gas and timestamp         |
| Failure does not imply success                     | Malformed hash; offline/HTTP failure; incorrect chain; unavailable receipt            | Error, pending, missing and reverted states; no stale success |
| Evidence is inspectable                            | Open a movement identity; follow each evidence link; open raw logs and full source    | Expanded raw system and ERC-20 evidence                       |
| Duplicate event streams are not duplicate payments | ERC-20 example has one movement, two evidence records and 1.5 USDC                    | Comparison shows 3 vs 1.5 USDC                                |
| Native-only indexing is explained                  | Native example has one system movement                                                | Comparison shows 0 vs 100.42007099937 USDC                    |
| Multiple movements and sender differences          | Select multi-movement example                                                         | Four movements, transaction-local flows and sender diagnostic |
| Export preserves exact data                        | Download JSON and parse it; compare raw and normalized amounts and source             | Export notice; downloaded JSON                                |
| Reversible inspection                              | Open/close details; change samples; reset while live lookup is outstanding            | Selected sample and source stay consistent                    |
| External references / reuse                        | Inspect explorer, rules, source and example links                                     | Links point to the displayed hash or documented source        |
| Responsive and accessible reading                  | Keyboard navigation, automated WCAG AA scan, horizontal fit at 390/1440 px, text zoom | Desktop, mobile and 200% text screenshots                     |

Exploratory cases: interrupt an in-flight lookup by selecting a sample; paste invalid and very long hashes; inspect all logs in the densest example. Network stubs prove UI states only. Real mainnet calls are recorded separately.

No claim of complete account balances, account-abstraction fee attribution, cryptographic receipt verification, official eligibility or award selection is tested or made.
