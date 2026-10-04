import { describe, expect, it } from "vitest";
import native from "../../../fixtures/mainnet/native.json";
import erc20 from "../../../fixtures/mainnet/erc20.json";
import multiple from "../../../fixtures/mainnet/multiple.json";
import { analyzeReceipt } from "../src/index.js";

describe("Arc mainnet receipt analysis", () => {
  it("classifies a burn without making the zero address a receiving account", () => {
    const log = native.receipt.logs[0]!;
    const result = analyzeReceipt({
      ...native,
      source: { kind: "synthetic" },
      receipt: {
        ...native.receipt,
        logs: [
          {
            ...log,
            topics: [log.topics[0], log.topics[1], "0x" + "0".repeat(64)],
          },
        ],
      },
    });
    expect(result.movements[0]?.kind).toBe("burn");
    expect(result.addressFlows).toHaveLength(1);
    expect(result.addressFlows[0]?.incomingAtomic18).toBe("0");
    expect(result.addressFlows[0]?.outgoingAtomic18).toBe(
      "100420070999370000000",
    );
  });

  it("keeps zero and self-transfer ERC-20 signals as evidence without inventing balance movements", () => {
    const token = erc20.receipt.logs.find(
      (log) => log.address === "0x3600000000000000000000000000000000000000",
    )!;
    for (const override of [
      { data: "0x" + "0".repeat(64) },
      { topics: [token.topics[0], token.topics[1], token.topics[1]] },
    ]) {
      const result = analyzeReceipt({
        ...erc20,
        source: { kind: "synthetic" },
        receipt: { ...erc20.receipt, logs: [{ ...token, ...override }] },
      });
      expect(result.movements).toEqual([]);
      expect(result.coverage).toBe("complete");
      expect(result.diagnostics.map((item) => item.code)).toContain(
        "ERC20_NO_MOVEMENT",
      );
    }
  });

  it("marks an impossible zero-value system log as inconsistent evidence", () => {
    const log = native.receipt.logs[0]!;
    const result = analyzeReceipt({
      ...native,
      source: { kind: "synthetic" },
      receipt: {
        ...native.receipt,
        logs: [{ ...log, data: "0x" + "0".repeat(64) }],
      },
    });
    expect(result.coverage).toBe("partial");
    expect(result.movements).toEqual([]);
    expect(result.diagnostics.map((item) => item.code)).toContain(
      "INVALID_SYSTEM_TRANSFER",
    );
  });
  it("recognizes a native transfer from the recorded mainnet system log, without requiring an ERC-20 log", () => {
    const result = analyzeReceipt(native);
    expect(result.status).toBe("confirmed");
    expect(result.movements.map((movement) => movement.amountUsdc)).toEqual([
      "100.42007099937",
    ]);
  });

  it("keeps both ERC-20 and native evidence but counts the real 1.5 USDC transfer once", () => {
    const result = analyzeReceipt(erc20);
    expect(result.movements.map((movement) => movement.amountUsdc)).toEqual([
      "1.5",
    ]);
    expect(result.movements[0]?.evidence).toHaveLength(2);
    expect(result.rawLogs).toHaveLength(4);
    expect(
      result.diagnostics.some(
        (diagnostic) => diagnostic.code === "DUAL_STREAM",
      ),
    ).toBe(true);
  });

  it("rejects a testnet receipt instead of presenting it as mainnet evidence", () => {
    expect(() => analyzeReceipt({ ...native, chainId: 5042002 })).toThrow(
      "Arc mainnet",
    );
  });

  it("derives outer gas independently from transfers and reports the outer sender separately", () => {
    const result = analyzeReceipt(erc20);
    expect(result.fee?.amountUsdc).toBe("0.00312918156459");
    expect(result.outerSender).toBe(
      "0x89c9c1253149a5109cf7760fe3e192e4bba80745",
    );
    expect(result.movements[0]?.amountUsdc).toBe("1.5");
  });

  it("does not claim any settled transfer on a reverted transaction, while keeping the outer gas cost", () => {
    const result = analyzeReceipt({
      ...erc20,
      receipt: { ...erc20.receipt, status: "0x0" },
    });
    expect(result.status).toBe("reverted");
    expect(result.movements).toEqual([]);
    expect(result.fee?.amountUsdc).toBe("0.00312918156459");
  });

  it("distinguishes a known pending transaction from not found when neither has a receipt", () => {
    const pending = analyzeReceipt({
      ...native,
      receipt: null,
      transaction: {
        ...native.transaction,
        blockNumber: null,
        blockHash: null,
      },
    });
    const missing = analyzeReceipt({
      ...native,
      receipt: null,
      transaction: null,
    });
    expect(pending.status).toBe("pending");
    expect(missing.status).toBe("not-found");
    expect(pending.movements).toEqual([]);
    expect(pending.fee).toBeNull();
  });

  it("carries recorded provenance and exact transaction identity instead of claiming a live lookup", () => {
    const result = analyzeReceipt(native);
    expect(result.source.kind).toBe("mainnet-recorded");
    expect(result.source.retrievedAt).toBe(native.retrievedAt);
    expect(result.transactionHash).toBe(native.transactionHash);
    expect(result.parserVersion).toBe("0.1.0");
  });

  it("preserves the four real movements and exposes transaction-local address totals without mixing gas into transfer volume", () => {
    const result = analyzeReceipt(multiple);
    expect(result.movements.map((movement) => movement.amountUsdc)).toEqual([
      "0.000027",
      "0.002716",
      "0.000013",
      "0.002703",
    ]);
    expect(result.movementVolumeUsdc).toBe("0.005459");
    const sender = result.addressFlows.find(
      (flow) => flow.address === "0x8366a39cc670b4001a1121b8f6a443a643e40951",
    );
    expect(sender?.outgoingUsdc).toBe("0.002743");
    expect(sender?.incomingUsdc).toBe("0");
    expect(
      result.diagnostics.some(
        (diagnostic) => diagnostic.code === "OUTER_SENDER_DIFFERS",
      ),
    ).toBe(true);
  });

  it("does not treat an ERC-20 event without canonical system evidence as a complete movement record", () => {
    const result = analyzeReceipt({
      ...erc20,
      source: { kind: "synthetic" },
      receipt: {
        ...erc20.receipt,
        logs: erc20.receipt.logs.filter(
          (log) => log.address !== "0xfffffffffffffffffffffffffffffffffffffffe",
        ),
      },
    });
    expect(result.movements).toEqual([]);
    expect(result.coverage).toBe("partial");
    expect(
      result.diagnostics.some(
        (diagnostic) => diagnostic.code === "UNPAIRED_ERC20",
      ),
    ).toBe(true);
  });

  it("rejects a receipt from a different transaction instead of attaching it to the requested hash", () => {
    expect(() =>
      analyzeReceipt({ ...native, transactionHash: erc20.transactionHash }),
    ).toThrow("transaction");
  });

  it("classifies a protocol mint separately from a payment, without making the zero address a payer", () => {
    const log = native.receipt.logs[0]!;
    const result = analyzeReceipt({
      ...native,
      source: { kind: "synthetic" },
      receipt: {
        ...native.receipt,
        logs: [
          {
            ...log,
            topics: [log.topics[0], "0x" + "0".repeat(64), log.topics[2]],
          },
        ],
      },
    });
    expect(result.movements[0]?.kind).toBe("mint");
    expect(
      result.addressFlows.some(
        (flow) => flow.address === "0x0000000000000000000000000000000000000000",
      ),
    ).toBe(false);
    expect(
      result.diagnostics.some(
        (diagnostic) => diagnostic.code === "MINT_OR_BURN",
      ),
    ).toBe(true);
  });

  it("flags an impossible self-transfer system event instead of inventing a money movement", () => {
    const log = native.receipt.logs[0]!;
    const result = analyzeReceipt({
      ...native,
      source: { kind: "synthetic" },
      receipt: {
        ...native.receipt,
        logs: [
          { ...log, topics: [log.topics[0], log.topics[1], log.topics[1]] },
        ],
      },
    });
    expect(result.movements).toEqual([]);
    expect(result.coverage).toBe("partial");
    expect(
      result.diagnostics.some(
        (diagnostic) => diagnostic.code === "INVALID_SYSTEM_TRANSFER",
      ),
    ).toBe(true);
  });

  it("counts two equal real transfers with different event identities, while never matching both to one ERC-20 counterpart", () => {
    const system = erc20.receipt.logs.find(
      (log) => log.address === "0xfffffffffffffffffffffffffffffffffffffffe",
    )!;
    const token = erc20.receipt.logs.find(
      (log) => log.address === "0x3600000000000000000000000000000000000000",
    )!;
    const result = analyzeReceipt({
      ...erc20,
      source: { kind: "synthetic" },
      receipt: {
        ...erc20.receipt,
        logs: [
          system,
          token,
          { ...system, logIndex: "0x40" },
          { ...token, logIndex: "0x41" },
        ],
      },
    });
    expect(result.movements.map((movement) => movement.amountUsdc)).toEqual([
      "1.5",
      "1.5",
    ]);
    expect(
      new Set(result.movements.map((movement) => movement.eventId)).size,
    ).toBe(2);
    expect(
      result.movements.map((movement) => movement.evidence.length),
    ).toEqual([2, 2]);
    expect(result.movementVolumeUsdc).toBe("3");
  });

  it("does not interpret another token or an NFT with the same Transfer topic as USDC", () => {
    const log = native.receipt.logs[0]!;
    const result = analyzeReceipt({
      ...native,
      source: { kind: "synthetic" },
      receipt: {
        ...native.receipt,
        logs: [
          {
            ...log,
            address: "0x1111111111111111111111111111111111111111",
            data: "0x",
            topics: [...log.topics, "0x" + "0".repeat(63) + "1"],
          },
        ],
      },
    });
    expect(result.movements).toEqual([]);
    expect(result.rawLogs[0]?.stream).toBe("other");
  });

  it("retains one-atomic-unit precision and produces JSON-safe strings for large uint256 amounts", () => {
    const log = native.receipt.logs[0]!;
    const tiny = analyzeReceipt({
      ...native,
      source: { kind: "synthetic" },
      receipt: {
        ...native.receipt,
        logs: [{ ...log, data: "0x" + "0".repeat(63) + "1" }],
      },
    });
    const huge = analyzeReceipt({
      ...native,
      source: { kind: "synthetic" },
      receipt: {
        ...native.receipt,
        logs: [{ ...log, data: "0x" + "f".repeat(64) }],
      },
    });
    expect(tiny.movements[0]?.amountUsdc).toBe("0.000000000000000001");
    expect(huge.movements[0]?.amountAtomic18).toBe(
      "115792089237316195423570985008687907853269984665640564039457584007913129639935",
    );
    expect(() => JSON.stringify(huge)).not.toThrow();
  });

  it("produces identical results on repeated analysis and does not mutate the raw fixture", () => {
    const before = JSON.stringify(erc20);
    expect(analyzeReceipt(erc20)).toEqual(analyzeReceipt(erc20));
    expect(JSON.stringify(erc20)).toBe(before);
  });

  it("rejects an unknown receipt status rather than labelling it reverted or paid", () => {
    expect(() =>
      analyzeReceipt({
        ...native,
        receipt: { ...native.receipt, status: "0x2" },
      }),
    ).toThrow("status");
  });

  it("rejects conflicting logs with the same event identity instead of summing untrustworthy evidence", () => {
    const log = native.receipt.logs[0]!;
    expect(() =>
      analyzeReceipt({
        ...native,
        source: { kind: "synthetic" },
        receipt: {
          ...native.receipt,
          logs: [log, { ...log, data: "0x" + "0".repeat(63) + "1" }],
        },
      }),
    ).toThrow("Duplicate");
  });

  it("identifies a mined transaction with temporarily missing receipt as unavailable, without calling it pending", () => {
    const result = analyzeReceipt({ ...native, receipt: null });
    expect(result.status).toBe("receipt-unavailable");
    expect(result.movementVolumeUsdc).toBeNull();
  });

  it("uses the parsed receipt status rather than case-sensitive hex text", () => {
    expect(
      analyzeReceipt({
        ...native,
        receipt: { ...native.receipt, status: "0X1" },
      }).status,
    ).toBe("confirmed");
  });

  it("rejects removed logs and block identity mismatches before attributing a movement", () => {
    const log = native.receipt.logs[0]!;
    const withLog = (override: object) => ({
      ...native,
      source: { kind: "synthetic" },
      receipt: { ...native.receipt, logs: [{ ...log, ...override }] },
    });
    expect(() => analyzeReceipt(withLog({ removed: true }))).toThrow("removed");
    expect(() =>
      analyzeReceipt(withLog({ blockHash: "0x" + "a".repeat(64) })),
    ).toThrow("block");
    expect(() => analyzeReceipt(withLog({ blockNumber: "0x1" }))).toThrow(
      "block",
    );
    expect(() =>
      analyzeReceipt({
        ...native,
        transaction: {
          ...native.transaction,
          blockHash: "0x" + "a".repeat(64),
        },
      }),
    ).toThrow("block");
  });

  it("rejects non-zero padding in indexed addresses rather than silently truncating the evidence", () => {
    const log = native.receipt.logs[0]!;
    expect(() =>
      analyzeReceipt({
        ...native,
        receipt: {
          ...native.receipt,
          logs: [
            {
              ...log,
              topics: [
                log.topics[0],
                "0x" + "f".repeat(24) + log.topics[1]!.slice(-40),
                log.topics[2],
              ],
            },
          ],
        },
      }),
    ).toThrow("address");
  });

  it("marks logs on a reverted receipt as inconsistent and never describes them as settled dual-stream movements", () => {
    const result = analyzeReceipt({
      ...erc20,
      source: { kind: "synthetic" },
      receipt: { ...erc20.receipt, status: "0x0" },
    });
    expect(result.coverage).toBe("partial");
    expect(
      result.diagnostics.some((item) => item.code === "REVERTED_WITH_LOGS"),
    ).toBe(true);
    expect(result.diagnostics.some((item) => item.code === "DUAL_STREAM")).toBe(
      false,
    );
    expect(result.rawLogs).toHaveLength(4);
  });

  it("does not infer a different outer sender when the transaction is unavailable", () => {
    const result = analyzeReceipt({ ...native, transaction: null });
    expect(result.coverage).toBe("partial");
    expect(result.outerSender).toBeNull();
    expect(
      result.diagnostics.some(
        (item) => item.code === "TRANSACTION_UNAVAILABLE",
      ),
    ).toBe(true);
    expect(
      result.diagnostics.some((item) => item.code === "OUTER_SENDER_DIFFERS"),
    ).toBe(false);
  });
});
