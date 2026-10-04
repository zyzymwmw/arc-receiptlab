# Arc ReceiptLab

A read-only USDC receipt debugger and reusable TypeScript parser for developers integrating Arc payments. Inspect what moved, trace it back to the logs, and keep transfer volume separate from gas.

**Mainnet example:** [one 1.5 USDC transfer](https://explorer.arc.io/tx/0xdb3408e5ed4965c0e402718ee9e81589e17688b485dd29b2f81cb78996418643), represented by an 18-decimal system event and a 6-decimal ERC-20 event. Adding both streams would incorrectly report 3 USDC. ReceiptLab retains both evidence records and counts the system movement once.

Arc-specific rules matter here: native USDC movements use a system emitter, ERC-20 activity adds a second event stream, and outer gas uses USDC units. A generic ERC-20 event counter can double-count ERC-20 activity or miss native movements.

## Verify it yourself

Node 22.12+ and npm are required. The lockfile pins dependencies.

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:4173`. The initial example is **recorded mainnet data**. Click **Read from mainnet** to query the public endpoint. A live response has its own source label and retrieval time. Lookups never connect a wallet or submit a transaction.

```sh
npm test                 # deterministic parser and network-boundary tests
npm run typecheck
npm run test:e2e          # desktop/mobile UI, stubbed error states, accessibility
npm run verify:mainnet    # real RPC reads; compares three recorded expectations
npm run example          # minimal integration, offline
npm run example -- --live
npm run verify:package    # install packed library in a separate project
npm run build
```

For browser tests, run `npx playwright install chromium` once. Stubbed network tests prove UI behavior; they are not mainnet evidence. Real retrieval records and browser evidence are in [docs/evidence](docs/evidence) and [mainnet verification](docs/mainnet-verification.json).

## Three inspectable mainnet cases

| Example                                                                                                             | Canonical result                     | What it demonstrates                                                   |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------- |
| [Native transfer](https://explorer.arc.io/tx/0x7b7b918be44fa4ec8ce4368d2cef5316b974e517a09fee60960d6221f74410a3)    | 100.42007099937 USDC, one movement   | No ERC-20 USDC log is required                                         |
| [ERC-20 transfer](https://explorer.arc.io/tx/0xdb3408e5ed4965c0e402718ee9e81589e17688b485dd29b2f81cb78996418643)    | 1.5 USDC, one movement               | Two event streams are one movement; unrelated tokens are excluded      |
| [Multiple movements](https://explorer.arc.io/tx/0x503073365a676a9008a146edeb15e684a5c47f25ca60e6a391d0d800702d34cd) | Four movements; volume 0.005459 USDC | Contract senders differ from the outer sender; volume can include hops |

These are existing public third-party transactions, not transactions sent by this project, customers or adoption claims. Each [fixture](fixtures/mainnet) retains the raw transaction and receipt, chain, block, retrieval time, endpoint, parser version and independently read expectations. Synthetic boundary cases are explicitly labelled in the tests.

## Interpretation and limits

- Canonical events come from `0xfffffffffffffffffffffffffffffffffffffffe` at 18 decimals. ERC-20 evidence comes from `0x3600000000000000000000000000000000000000` at 6 decimals. Other emitters are retained but excluded from USDC amounts.
- Event identity is chain + transaction hash + log index. Equal from/to/amount tuples at distinct indices remain distinct movements. Conflicting identities and block mismatches are rejected.
- A matched ERC-20 event is evidence, not another movement. Missing counterparts, impossible system events and incomplete transaction data generate diagnostics and partial coverage.
- Mint/burn movements are classified separately. The zero address is not a customer account. Zero-value and self-transfer ERC-20 signals are not system balance movements.
- All amounts use integer arithmetic and JSON decimal strings. Gas is `gasUsed × effectiveGasPrice`, formatted at 18 decimals and never added to movement volume.
- A successful receipt is not proof of an invoice being paid. Address flows cover this receipt only. The tool does not reconstruct balances, perform a financial audit or attribute all account-abstraction reimbursements.
- RPC responses are not independently cryptographically verified. The mainnet check prevents an accidental testnet endpoint; it does not authenticate a malicious RPC. Availability and browser access depend on the public provider.
- Pending, not-found, mined-but-missing receipt and RPC failure remain distinct. Failed live reads do not silently fall back to a fixture. There is no background polling, paid indexer or automatic transaction retry.

## Reuse the parser

The package is built from this repository; it is not published to the npm registry.

```sh
npm run build:core
npm pack --workspace @receiptlab/core
# In your own project:
npm install /absolute/path/to/receiptlab-core-0.1.0.tgz
```

```ts
import { analyzeReceipt } from "@receiptlab/core";
import { readArcReceipt } from "@receiptlab/core/rpc";

const input = await readArcReceipt(transactionHash);
const analysis = analyzeReceipt(input);

if (analysis.status === "confirmed" && analysis.coverage === "complete") {
  console.log(analysis.movements);
}
```

The [package API](packages/receipt-core/README.md) and [minimal example](examples/receipt-check/index.ts) use the same exports as the webpage. Parsing is deterministic and independent of data retrieval.

## Architecture

```text
apps/web/                    React + Vite, one read-only page
packages/receipt-core/        parser, exact amounts, types; separate RPC entry
examples/receipt-check/       minimal integration
fixtures/mainnet/             provenance-labelled raw receipts
scripts/                     read-only verification and package smoke check
tests/                       desktop/mobile browser checks
docs/                        evidence, QA and demonstration material
```

No accounts, database, wallet credentials or secrets are required. The only optional web build variable is `VITE_SOURCE_URL`, a public source-code link. The browser sends entered hashes to the Arc RPC and opens explorer links only when requested. There is no analytics or application server storing queries.

## Sources, license and development

The code is [MIT licensed](LICENSE). React, Vite, viem, Vitest, Playwright, axe and TypeScript retain their respective upstream licenses. Documentation rules are implemented and tested rather than copied as a complete product. See [primary references and evidence](docs/g0-evidence.md) for links and the verification date.

AI tools assisted implementation, test development and documentation. The checked source, tests, raw fixtures and live verification evidence are provided for review. This is an independent tool; it is not an official Circle/Arc product, audited financial system or confirmed grant recipient.
