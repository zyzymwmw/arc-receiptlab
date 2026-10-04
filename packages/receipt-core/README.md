# @receiptlab/core

Deterministic Arc mainnet USDC receipt parsing with exact amounts, source metadata and event-level evidence. Version 0.1.0 is distributed from source or as a locally packed npm tarball, not through the npm registry.

## Build and install

From the repository root:

```sh
npm ci
npm run build:core
npm pack --workspace @receiptlab/core
```

Install the resulting `receiptlab-core-0.1.0.tgz` into another Node/TypeScript project. ESM and Node 22.12+ are supported; types are included. The pure parser can also be bundled in a browser. The RPC adapter requires standard `fetch`.

## Public exports

```ts
import {
  analyzeReceipt,
  formatAtomic,
  ReceiptValidationError,
} from "@receiptlab/core";
import { readArcReceipt, ArcRpcError } from "@receiptlab/core/rpc";

const envelope = await readArcReceipt(hash, { timeoutMs: 12000, signal });
const result = analyzeReceipt(envelope);
```

`readArcReceipt` checks chain 5042, then reads the transaction and receipt. Only `eth_chainId`, `eth_getTransactionByHash` and `eth_getTransactionReceipt` are used. Options accept an endpoint, timeout, AbortSignal and injectable fetch for network-boundary tests. Endpoint selection does not bypass chain validation. The returned source is `live`; no offline fallback is made.

`analyzeReceipt(input: unknown)` validates and interprets this envelope:

```ts
{
  schemaVersion: 1,
  chainId: 5042,
  transactionHash: '0x…',          // 32 bytes
  retrievedAt: '2026-10-04T00:00:00Z',
  source: { kind: 'mainnet-recorded', endpoint: 'https://rpc.mainnet.arc.io' },
  transaction: rawRpcTransaction, // object or null
  receipt: rawRpcReceipt,         // object or null
}
```

Allowed source kinds are `live`, `mainnet-recorded` and `synthetic`. For a custom provider or recorded input, the caller is responsible for truthful provenance. A source label is not cryptographic verification.

The result contains status, coverage, block identity, raw logs, canonical movements, diagnostics, transaction-local address flows, outer sender and a separately computed gas fee. Types are exported as `ReceiptAnalysis`, `Movement`, `RawLog`, `DataSource`, `Diagnostic` and `AddressFlow`.

- Status: `confirmed`, `reverted`, `pending`, `not-found`, `receipt-unavailable`.
- Coverage: `complete`, `partial`, `unavailable`; complete is only within the explicit receipt scope.
- Identity: `5042:<transactionHash>:<decimalLogIndex>`.
- Amounts: base-10 integer strings such as `amountAtomic18`, and exact display strings such as `amountUsdc`. No float conversion or JSON bigint values.
- Raw logs retain emitter, index, topics and data, including other contracts excluded from USDC accounting.
- `formatAtomic(value, decimals = 18)` accepts bigint or an integer decimal string, supports signed amounts and precision 0–255, and removes trailing fractional zeros without rounding.

Malformed quantities, wrong chain, conflicting transaction/block identities, removed logs, duplicate log IDs and malformed Transfer words throw `ReceiptValidationError`. RPC failures throw `ArcRpcError` or propagate transport/input errors. Handle errors as unavailable data, not payment success.

## Accounting boundary

The 18-decimal system stream is canonical. A one-to-one matching 6-decimal ERC-20 event is attached as evidence; it is not summed again. Equal amounts at different event indices remain separate. Unpaired ERC-20 events and inconsistent system events cause partial coverage. Mint/burn are distinct movement kinds; the zero address is excluded from address totals.

Gas uses receipt `gasUsed × effectiveGasPrice`. The outer sender is not automatically the movement sender or final application-level fee payer. No account balances, invoice settlement, internal trace accounting, cross-chain flows or independently authenticated receipts are claimed.

The [repository](https://github.com/zyzymwmw/arc-receiptlab) includes mainnet fixtures, tests and an integration example. MIT license.
