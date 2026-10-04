# Arc ReceiptLab — application text and links

Prepared on 2026-10-04. This is a draft, not a submitted application or eligibility approval. The published frontend reads Arc mainnet; it does not deploy a project-owned contract.

## Links

- Live app: https://arc-receiptlab.just-duck-9698.chatgpt.site
- Public repository: https://github.com/zyzymwmw/arc-receiptlab
- Public builder profile: https://github.com/zyzymwmw
- Captioned demonstration: https://arc-receiptlab.just-duck-9698.chatgpt.site/demo.webm
- Real mainnet case: https://explorer.arc.io/tx/0xdb3408e5ed4965c0e402718ee9e81589e17688b485dd29b2f81cb78996418643

The 110.9-second demonstration shows real queries from the published origin, raw event evidence, the teaching comparison, native and multiple movements, export and reuse. The main app passed anonymous-browser mainnet retrieval.

## Name

Arc ReceiptLab

## Tagline

Read-only USDC receipt debugging with exact amounts and event-level evidence on Arc mainnet.

## Short description

Arc ReceiptLab helps developers inspect USDC movements in Arc mainnet transactions. It normalizes native and ERC-20 event streams without double-counting, preserves distinct movements, separates gas from transfer volume, and links each result to its raw evidence. A no-login web interface, reusable TypeScript parser, integration example and sourced mainnet fixtures make the behavior independently reproducible.

## What it does

Enter an Arc mainnet transaction hash to inspect a real public receipt. The page presents source and retrieval time, execution status, system movements, ERC-20 evidence, transaction-local address flows, outer sender and separately calculated gas. Raw logs and original data remain inspectable and exportable as JSON.

Three public mainnet cases show the practical differences: a native transfer without an ERC-20 event, a 1.5 USDC ERC-20 transfer represented by two event streams, and four contract-originated movements in one transaction. The comparison of 3 USDC against the correct 1.5 USDC is an educational counterexample, not an allegation about another product.

## What uses Arc

The client reads chain 5042 through the public Arc RPC. The parser uses Arc's 18-decimal native USDC system emitter as the canonical movement stream and retains 6-decimal USDC ERC-20 logs as paired evidence. It derives outer gas directly from receipt fields in USDC units and distinguishes the outer sender from movement senders.

This is a published off-chain developer tool integrated with real Arc mainnet data. It has no project-owned smart contract and sends no transactions. Whether this satisfies the program's mainnet-deployment wording is pending organizer clarification; no contract deployment is implied.

## What is different from a tutorial

ReceiptLab turns the event rules into an inspectable diagnostic workflow and a reusable parser with stable event identities, exact JSON amounts, coverage diagnostics, explicit provenance and mainnet regression fixtures. Developers can investigate a receipt in the browser, export the evidence, or install the packed library into another application. Distinct equal-value events remain distinct; unrelated tokens and inconsistent evidence are not silently treated as USDC payments.

## Verification

33 core checks, type checking, production build, 16 desktop/mobile browser checks including WCAG AA and 200% text, independent package installation, and real Node/browser retrieval of three mainnet cases passed. The public origin was separately checked in a fresh browser context without preloaded login state. See the [verification record](verification.md).

All mainnet examples are existing public third-party transactions. They are test evidence, not ReceiptLab-generated activity, customers or traction. No paid API, new transaction or wallet was needed to verify this read-only scope.

## Scope and next step

The tool covers explicit USDC movements and outer gas within one receipt. It is not a balance reconstruction, invoice-settlement proof, full account-abstraction fee attribution or cryptographic receipt verifier. Live errors never silently become fixture success.

The next useful validation is feedback from one or two developers integrating Arc, focused on whether the evidence view and exported result reduce a real debugging step. No user feedback or adoption has yet been claimed.

## Development tools, if asked

TypeScript, React, Vite and viem; Vitest, Playwright and axe for verification. AI tools assisted implementation, testing and documentation. The code, fixture provenance and recorded verification results are available for inspection.

## Submission boundary

The public [program rules](https://community.arc.io/public/events/arc-microgrants-f8tijfjhyq) list a working mainnet project link, public source, a short Arc-use explanation and a builder profile. The [DoraHacks event page](https://dorahacks.io/hackathon/arc-microgrants/detail) also identifies a source-repository link as required. The login-gated final form was not fully inspected; extra personal fields and declarations must be checked before submission. No form was submitted, terms accepted on behalf of the applicant or payout information supplied.
