# G0: official references and read-only mainnet evidence

Checked on 2026-10-04. No wallet, signature, paid API, or new transaction was used.

## What was verified

- Circle's primary RPC answered standard Node `fetch` requests with chain ID `0x13b2` (5042). A request containing `Origin: http://localhost:4173` returned HTTP 200 and an allow-origin response for that origin. Python `urllib` received HTTP 403; that earlier result does not establish a network outage. A real Chromium browser then successfully queried all three cases; the recorded method list contains only chain, transaction and receipt reads. See [browser evidence](evidence/browser-mainnet.json).
- The official system emitter is `0xfffffffffffffffffffffffffffffffffffffffe`; its standard Transfer events use 18 decimals. ERC-20 USDC at `0x3600000000000000000000000000000000000000` adds 6-decimal events. Mainnet has used the system events from genesis. Mint/burn involve the zero address. Zero-value and self transfers do not emit system movements. Gas is derived separately from receipt fields.
- Three existing mainnet transactions were retrieved and preserved unmodified inside their fixture envelopes. They are public third-party activity, not ReceiptLab transactions or user adoption.

| Case     | Transaction                                                                                                  | Independently checked result                                                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Native   | [0x7b7b…10a3](https://explorer.arc.io/tx/0x7b7b918be44fa4ec8ce4368d2cef5316b974e517a09fee60960d6221f74410a3) | One system movement: 100.42007099937 USDC; no ERC-20 USDC log.                                                                               |
| ERC-20   | [0xdb34…8643](https://explorer.arc.io/tx/0xdb3408e5ed4965c0e402718ee9e81589e17688b485dd29b2f81cb78996418643) | One 1.5 USDC movement represented by a system log and an ERC-20 log; another token's Transfer is excluded.                                   |
| Multiple | [0x5030…34cd](https://explorer.arc.io/tx/0x503073365a676a9008a146edeb15e684a5c47f25ca60e6a391d0d800702d34cd) | Four system movements: 0.000027, 0.002716, 0.000013 and 0.002703 USDC, each with an ERC-20 counterpart; unrelated token events are excluded. |

Fixture metadata contains the chain, transaction, block, retrieval time, endpoint, raw receipt/transaction, parser version, and manually checked expectations. Expectations were read from address topics and integer units before implementation. A log's index identifies it; equal sender/recipient/amount tuples do not establish duplicate events.

## Interpretation boundaries

The indexing tutorial distinguishes the outer sender from the event's token sender, including relayed calls. This tool will use event senders for movements and label the outer sender separately. Movement volume may include intermediary hops and is not a customer's payment amount. Transaction-local address totals are not historical wallet balances or an audit. Outer receipt gas does not cover all application-level reimbursements.

The EVM-differences page describes dividing a native raw amount by 10^12 while discussing display. This is the raw-unit conversion to six-decimal units, not the conversion to a human-readable USDC value. The explicit interface tables and event reference specify 18 native decimals; the implementation formats native raw amounts by 10^18 and ERC-20 values by 10^6.

## Rules and unresolved gates

The program requests an already working mainnet project, a live link, public source, a short Arc-use explanation and a builder profile. The latest official deadline is October 14, 2026, 23:59 ET; the organizer may change dates and counts. Mainnet-only, functional evidence matters; registration is not submission or an award.

Personal payout eligibility and acceptance of a read-only tool without a new contract are not confirmed by the public wording. Architects general terms support responsible AI use, but program-specific documents control additional requirements. Implementation evidence does not imply eligibility approval. No organizer consultation or developer feedback has been fabricated.

## Primary sources

- [USDC system events](https://docs.arc.io/arc/references/usdc-system-events)
- [Index Arc events](https://docs.arc.io/integrate/infrastructure/indexing-events)
- [Stablecoin native model](https://docs.arc.io/arc/concepts/stablecoin-native-model)
- [RPC endpoints](https://docs.arc.io/arc/references/rpc-endpoints)
- [EVM differences](https://docs.arc.io/arc/references/evm-differences)
- [Microgrants rules](https://community.arc.io/public/events/arc-microgrants-f8tijfjhyq)
- [Architects general terms](https://community.arc.io/public/resources/architects-terms-and-conditions)
