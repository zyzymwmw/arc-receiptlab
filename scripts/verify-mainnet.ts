import { writeFile } from "node:fs/promises";
import { analyzeReceipt } from "@receiptlab/core";
import { readArcReceipt } from "@receiptlab/core/rpc";
import native from "../fixtures/mainnet/native.json";
import erc20 from "../fixtures/mainnet/erc20.json";
import multiple from "../fixtures/mainnet/multiple.json";

const verification = [];
for (const [name, fixture] of [
  ["native", native],
  ["erc20", erc20],
  ["multiple", multiple],
] as const) {
  const envelope = await readArcReceipt(fixture.transactionHash);
  const result = analyzeReceipt(envelope);
  if (
    result.status !== "confirmed" ||
    result.source.kind !== "live" ||
    result.coverage !== "complete"
  )
    throw new Error(`${name}: incomplete mainnet verification`);
  if (
    JSON.stringify(
      result.movements.map((movement) => movement.amountAtomic18),
    ) !== JSON.stringify(fixture.expected.systemAmountsAtomic18)
  )
    throw new Error(
      `${name}: amounts differ from independently checked expectations`,
    );
  verification.push({
    name,
    transactionHash: result.transactionHash,
    source: result.source,
    status: result.status,
    coverage: result.coverage,
    movements: result.movements,
    fee: result.fee,
  });
  console.log(
    `${name}: LIVE MAINNET, ${result.movements.length} movements, ${result.movementVolumeUsdc} USDC movement volume`,
  );
}
await writeFile(
  new URL("../docs/mainnet-verification.json", import.meta.url),
  JSON.stringify(
    {
      verifiedAt: new Date().toISOString(),
      chainId: 5042,
      parserVersion: "0.1.0",
      verification,
    },
    null,
    2,
  ) + "\n",
);
