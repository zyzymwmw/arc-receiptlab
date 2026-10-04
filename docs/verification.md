# Verification record

Date: 2026-10-04. These checks establish implementation behavior and real read-only Arc integration; they do not establish official eligibility, user adoption, a formal submission or an award.

## Local checks

- 33 deterministic core checks passed: native/ERC-20 pairing, distinct equal transfers, unrelated emitters/NFTs, exact small/large amounts, gas separation, different senders, mint/burn semantics, zero/self signals, impossible system transfers, missing/pending/reverted states, provenance, duplicate identity, block mismatch, removed logs, ABI address padding and RPC timeout/failure boundaries.
- Type checking passed.
- 16 desktop/mobile browser checks passed again against the independent source checkout, including WCAG AA checks and 200% text viewport checks. Production build and types also passed in that checkout.
- The packed library was installed in a separate temporary Node project and imported through its actual exports. A recorded 1.5 USDC receipt parsed to one movement with two evidence records. No workspace path alias was available there.
- Dependency installation reported zero known audit vulnerabilities at that time. This is not a security audit or a guarantee about future advisories.

## Real mainnet checks

The [Node retrieval record](mainnet-verification.json) and [real browser record](evidence/browser-mainnet.json) independently re-read three existing public transactions. Recorded expectations were transcribed from raw event data before implementing the parser. All three returned chain 5042 and matched the expected movement amounts. The browser made only `eth_chainId`, `eth_getTransactionByHash` and `eth_getTransactionReceipt` requests.

Real browser checks used normal input and buttons. Network stubs in the automated suite exercise error and race states only, and are not used as mainnet proof. No paid API, signature, gas spend or new transaction was needed.

## Visual and exploratory checks

Reviewed the initial desktop and 390 px mobile views, the live result, the 3 vs 1.5 teaching comparison, all four movements in the densest case, address flows, expanded system/ERC-20 logs, raw source, and integration snippet. Desktop/mobile WCAG AA automated checks run in the suite. Text size 200% exposed an overflowing export button; wrapping was added and a regression check retained.

Exploration covered invalid hash input, repeated sample switching, raw-log opening/closing, and selecting a sample during a held lookup. Evidence links now open their exact log. Observed clipping and insufficient text contrast were repaired. No page-wide horizontal scroll was observed at normal desktop/mobile size after repair; address-flow tables intentionally scroll within their own container.

The [110.9-second demo](demo-script.md) records real published-origin reads of the same three transactions. It has English captions and no voice track. Local browser playback and media metadata checks reported 1440×1000 and approximately 111 seconds. The live amounts, comparison, raw evidence, multiple movements and integration chapters were visually reviewed, including the compressed delivery file. Recording annotations are separate from the product UI.

## Remaining distinctions

Public publication succeeded at https://arc-receiptlab.just-duck-9698.chatgpt.site. A fresh Chromium context with no preloaded login state then queried all three mainnet cases and downloaded the exact raw/analysis JSON. See [online evidence](evidence/online-mainnet.json), [export](evidence/online-export.json) and the [online screenshot](evidence/online-live.png). Public source is https://github.com/zyzymwmw/arc-receiptlab. This separate published-origin check does not imply contract deployment. Mainland-resident payout eligibility and whether this read-only tool satisfies the program's deployment wording require organizer clarification. No consultation or developer feedback has yet been received. Final application submission remains a human action.
