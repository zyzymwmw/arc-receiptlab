import { analyzeReceipt } from "@receiptlab/core";
import { readArcReceipt } from "@receiptlab/core/rpc";
import fixture from "../../fixtures/mainnet/erc20.json";

// The pure parser also accepts a recorded receipt. This runs without a network.
const recorded = analyzeReceipt(fixture);
console.log(
  JSON.stringify(
    {
      source: recorded.source,
      movements: recorded.movements,
      fee: recorded.fee,
    },
    null,
    2,
  ),
);

// Opt in to reading the same transaction from Arc mainnet. No wallet or keys.
if (process.argv.includes("--live")) {
  const live = analyzeReceipt(await readArcReceipt(fixture.transactionHash));
  console.log(JSON.stringify(live, null, 2));
}
