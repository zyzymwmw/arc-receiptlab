import { decodeEventLog } from "viem";
import {
  ARC_CHAIN_ID,
  PARSER_VERSION,
  SYSTEM_EMITTER,
  USDC_ERC20,
  TRANSFER_ABI,
  TRANSFER_TOPIC,
  ZERO_ADDRESS,
} from "./constants.js";
import { formatAtomic } from "./amount.js";
import {
  address,
  hash,
  hex,
  quantity,
  record,
  ReceiptValidationError,
} from "./validation.js";
import type {
  AddressFlow,
  DataSource,
  Diagnostic,
  Movement,
  RawLog,
  ReceiptAnalysis,
} from "./types.js";

export { formatAtomic } from "./amount.js";
export * from "./constants.js";
export { ReceiptValidationError } from "./validation.js";
export type * from "./types.js";

function normalizeLog(
  value: unknown,
  transactionHash: string,
  blockHash: string,
  blockNumber: bigint,
): RawLog {
  const log = record(value, "log");
  if (hash(log.transactionHash, "log.transactionHash") !== transactionHash)
    throw new ReceiptValidationError(
      "Log belongs to a different transaction.",
      "IDENTITY_MISMATCH",
    );
  if (log.removed === true)
    throw new ReceiptValidationError(
      "A removed log is not settled receipt evidence.",
      "REMOVED_LOG",
    );
  if (
    log.blockHash != null &&
    hash(log.blockHash, "log.blockHash") !== blockHash
  )
    throw new ReceiptValidationError(
      "Log belongs to a different block.",
      "IDENTITY_MISMATCH",
    );
  if (
    log.blockNumber != null &&
    quantity(log.blockNumber, "log.blockNumber") !== blockNumber
  )
    throw new ReceiptValidationError(
      "Log belongs to a different block.",
      "IDENTITY_MISMATCH",
    );
  const emitter = address(log.address, "log.address");
  const logIndex = quantity(log.logIndex, "log.logIndex").toString();
  if (!Array.isArray(log.topics))
    throw new ReceiptValidationError("log.topics must be an array.");
  const topics = log.topics.map((topic: unknown) => hex(topic, "topic"));
  const data = hex(log.data, "log.data");
  const stream =
    emitter === SYSTEM_EMITTER
      ? "system"
      : emitter === USDC_ERC20
        ? "erc20"
        : "other";
  const raw: RawLog = {
    eventId: `${ARC_CHAIN_ID}:${transactionHash}:${logIndex}`,
    logIndex,
    emitter,
    stream,
    data,
    topics,
  };
  if (stream === "other" || topics[0]?.toLowerCase() !== TRANSFER_TOPIC)
    return raw;
  if (topics.length !== 3 || data.length !== 66)
    throw new ReceiptValidationError(
      "USDC Transfer log must have three topics and one uint256 data word.",
    );
  if (topics.slice(1).some((topic) => !/^0x0{24}[0-9a-f]{40}$/i.test(topic)))
    throw new ReceiptValidationError(
      "Indexed Transfer address must be a correctly padded ABI word.",
    );
  const first = topics[0];
  if (!first) throw new ReceiptValidationError("Transfer topic is missing.");
  const decoded = decodeEventLog({
    abi: TRANSFER_ABI,
    data,
    topics: [first, ...topics.slice(1)],
    strict: true,
  });
  const decimals = stream === "system" ? 18 : 6;
  raw.transfer = {
    from: decoded.args.from.toLowerCase(),
    to: decoded.args.to.toLowerCase(),
    amountRaw: decoded.args.value.toString(),
    decimals,
    amountUsdc: formatAtomic(decoded.args.value, decimals),
  };
  return raw;
}

function evidence(log: RawLog, decimals: 6 | 18) {
  return {
    eventId: log.eventId,
    logIndex: log.logIndex,
    emitter: log.emitter,
    decimals,
  };
}

export function analyzeReceipt(input: unknown): ReceiptAnalysis {
  const envelope = record(input, "input");
  if (envelope.chainId !== ARC_CHAIN_ID)
    throw new ReceiptValidationError(
      "Only Arc mainnet (chainId 5042) is supported.",
      "WRONG_CHAIN",
    );
  const sourceInput = record(envelope.source, "source");
  const kind = sourceInput.kind;
  if (kind !== "live" && kind !== "mainnet-recorded" && kind !== "synthetic")
    throw new ReceiptValidationError("A known data source kind is required.");
  const retrievedAt = envelope.retrievedAt;
  if (
    typeof retrievedAt !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(retrievedAt) ||
    !Number.isFinite(Date.parse(retrievedAt))
  )
    throw new ReceiptValidationError("A timestamp with timezone is required.");
  const source: DataSource = { kind, retrievedAt };
  if (typeof sourceInput.endpoint === "string")
    source.endpoint = sourceInput.endpoint;
  if (typeof sourceInput.description === "string")
    source.description = sourceInput.description;
  const requestedHash = hash(envelope.transactionHash, "transactionHash");
  const base = {
    schemaVersion: 1 as const,
    chainId: ARC_CHAIN_ID,
    parserVersion: PARSER_VERSION,
    transactionHash: requestedHash,
    source,
  };
  const transaction =
    envelope.transaction === null
      ? null
      : record(envelope.transaction, "transaction");
  if (
    transaction &&
    hash(transaction.hash, "transaction.hash") !== requestedHash
  )
    throw new ReceiptValidationError(
      "Lookup returned a different transaction.",
      "IDENTITY_MISMATCH",
    );
  const outerSender =
    transaction === null ? null : address(transaction.from, "transaction.from");
  if (envelope.receipt === null) {
    return {
      ...base,
      status:
        transaction === null
          ? "not-found"
          : transaction.blockNumber == null
            ? "pending"
            : "receipt-unavailable",
      movements: [] as Movement[],
      rawLogs: [] as RawLog[],
      diagnostics: [] as Diagnostic[],
      outerSender,
      fee: null,
      movementVolumeAtomic18: null,
      movementVolumeUsdc: null,
      addressFlows: [] as AddressFlow[],
      coverage: "unavailable",
      blockNumber: null,
      blockHash: null,
    };
  }
  const receipt = record(envelope.receipt, "receipt");
  const receiptStatus = quantity(receipt.status, "receipt.status");
  if (receiptStatus !== 0n && receiptStatus !== 1n)
    throw new ReceiptValidationError(
      "receipt.status must be 0 (reverted) or 1 (confirmed).",
    );
  if (!Array.isArray(receipt.logs))
    throw new ReceiptValidationError("receipt.logs must be an array.");
  const transactionHash = hash(
    receipt.transactionHash,
    "receipt.transactionHash",
  );
  if (transactionHash !== requestedHash)
    throw new ReceiptValidationError(
      "Receipt belongs to a different transaction.",
      "IDENTITY_MISMATCH",
    );
  const blockHash = hash(receipt.blockHash, "receipt.blockHash");
  const blockNumber = quantity(receipt.blockNumber, "receipt.blockNumber");
  if (
    transaction?.blockHash != null &&
    hash(transaction.blockHash, "transaction.blockHash") !== blockHash
  )
    throw new ReceiptValidationError(
      "Transaction and receipt refer to different blocks.",
      "IDENTITY_MISMATCH",
    );
  if (
    transaction?.blockNumber != null &&
    quantity(transaction.blockNumber, "transaction.blockNumber") !== blockNumber
  )
    throw new ReceiptValidationError(
      "Transaction and receipt refer to different blocks.",
      "IDENTITY_MISMATCH",
    );
  const rawLogs = receipt.logs.map((value: unknown) =>
    normalizeLog(value, transactionHash, blockHash, blockNumber),
  );
  const eventIds = new Set<string>();
  for (const log of rawLogs) {
    if (eventIds.has(log.eventId))
      throw new ReceiptValidationError(
        "Duplicate event identity in receipt logs.",
        "DUPLICATE_LOG_ID",
      );
    eventIds.add(log.eventId);
  }
  const diagnostics: Diagnostic[] = [];
  let coverage: ReceiptAnalysis["coverage"] = "complete";
  if (transaction === null) {
    coverage = "partial";
    diagnostics.push({
      code: "TRANSACTION_UNAVAILABLE",
      severity: "warning",
      message:
        "A receipt was returned without its transaction. The outer sender cannot be confirmed.",
      logIndices: [],
    });
  }
  if (receiptStatus === 0n && rawLogs.length > 0) {
    coverage = "partial";
    diagnostics.push({
      code: "REVERTED_WITH_LOGS",
      severity: "error",
      message:
        "A reverted receipt must not retain EVM event logs. These supplied logs are inconsistent; none are settled movements.",
      logIndices: rawLogs.map((log) => log.logIndex),
    });
  }
  const movements: Movement[] = rawLogs.flatMap((log) => {
    if (receiptStatus === 0n || log.stream !== "system" || !log.transfer)
      return [];
    if (
      log.transfer.from === log.transfer.to ||
      BigInt(log.transfer.amountRaw) === 0n
    ) {
      coverage = "partial";
      diagnostics.push({
        code: "INVALID_SYSTEM_TRANSFER",
        severity: "error",
        message:
          "Arc does not emit system movements for zero-value or self transfers. This event is inconsistent with the published rules.",
        logIndices: [log.logIndex],
      });
      return [];
    }
    return [
      {
        kind:
          log.transfer.from === ZERO_ADDRESS
            ? ("mint" as const)
            : log.transfer.to === ZERO_ADDRESS
              ? ("burn" as const)
              : ("transfer" as const),
        eventId: log.eventId,
        logIndex: log.logIndex,
        from: log.transfer.from,
        to: log.transfer.to,
        amountAtomic18: log.transfer.amountRaw,
        amountUsdc: log.transfer.amountUsdc,
        evidence: [evidence(log, 18)],
      },
    ];
  });
  const paired = new Set<string>();
  for (const log of rawLogs) {
    if (receiptStatus === 0n || log.stream !== "erc20" || !log.transfer)
      continue;
    const transfer = log.transfer;
    const match = movements.find(
      (movement) =>
        !paired.has(movement.eventId) &&
        movement.from === transfer.from &&
        movement.to === transfer.to &&
        BigInt(movement.amountAtomic18) ===
          BigInt(transfer.amountRaw) * 10n ** 12n,
    );
    if (match) {
      match.evidence.push(evidence(log, 6));
      paired.add(match.eventId);
      diagnostics.push({
        code: "DUAL_STREAM",
        severity: "info",
        message:
          "Two USDC event streams describe one movement. Count the system event once.",
        logIndices: [match.logIndex, log.logIndex],
      });
    } else if (
      BigInt(transfer.amountRaw) !== 0n &&
      transfer.from !== transfer.to
    ) {
      coverage = "partial";
      diagnostics.push({
        code: "UNPAIRED_ERC20",
        severity: "warning",
        message:
          "An ERC-20 event has no matching system movement. Do not infer complete USDC accounting from this receipt.",
        logIndices: [log.logIndex],
      });
    } else {
      diagnostics.push({
        code: "ERC20_NO_MOVEMENT",
        severity: "info",
        message:
          "A zero-value or self-transfer ERC-20 event is not a system balance movement.",
        logIndices: [log.logIndex],
      });
    }
  }
  const gasUsed = quantity(receipt.gasUsed, "receipt.gasUsed");
  const gasPrice = quantity(
    receipt.effectiveGasPrice,
    "receipt.effectiveGasPrice",
  );
  const fee = {
    amountAtomic18: (gasUsed * gasPrice).toString(),
    amountUsdc: formatAtomic(gasUsed * gasPrice),
    gasUsed: gasUsed.toString(),
    effectiveGasPriceAtomic18: gasPrice.toString(),
    outerSender,
  };
  const status = receiptStatus === 1n ? "confirmed" : "reverted";
  if (status === "reverted")
    diagnostics.push({
      code: "REVERTED",
      severity: "warning",
      message:
        "The transaction reverted. No USDC movements are settled; outer gas can still be charged.",
      logIndices: [],
    });
  const settled = status === "confirmed" ? movements : [];
  if (settled.some((movement) => movement.kind !== "transfer"))
    diagnostics.push({
      code: "MINT_OR_BURN",
      severity: "info",
      message:
        "Protocol mint/burn movements are not customer payments. The zero address is not a payer or recipient account.",
      logIndices: settled
        .filter((movement) => movement.kind !== "transfer")
        .map((movement) => movement.logIndex),
    });
  const flows = new Map<string, { incoming: bigint; outgoing: bigint }>();
  let volume = 0n;
  for (const movement of settled) {
    const amount = BigInt(movement.amountAtomic18);
    volume += amount;
    for (const [account, direction] of [
      [movement.from, "outgoing"],
      [movement.to, "incoming"],
    ] as const) {
      if (account === ZERO_ADDRESS) continue;
      const flow = flows.get(account) ?? { incoming: 0n, outgoing: 0n };
      flow[direction] += amount;
      flows.set(account, flow);
    }
  }
  const addressFlows: AddressFlow[] = [...flows]
    .map(([account, flow]) => ({
      address: account,
      incomingAtomic18: flow.incoming.toString(),
      outgoingAtomic18: flow.outgoing.toString(),
      netAtomic18: (flow.incoming - flow.outgoing).toString(),
      incomingUsdc: formatAtomic(flow.incoming),
      outgoingUsdc: formatAtomic(flow.outgoing),
      netUsdc: formatAtomic(flow.incoming - flow.outgoing),
    }))
    .sort((a, b) => a.address.localeCompare(b.address));
  if (
    outerSender !== null &&
    settled.some((movement) => movement.from !== outerSender)
  )
    diagnostics.push({
      code: "OUTER_SENDER_DIFFERS",
      severity: "info",
      message:
        "A movement originates from an address other than the outer transaction sender. Use the event sender for this movement.",
      logIndices: settled
        .filter((movement) => movement.from !== outerSender)
        .map((movement) => movement.logIndex),
    });
  return {
    ...base,
    status,
    coverage,
    blockNumber: blockNumber.toString(),
    blockHash,
    movements: settled,
    rawLogs,
    diagnostics,
    outerSender,
    fee,
    addressFlows,
    movementVolumeAtomic18: volume.toString(),
    movementVolumeUsdc: formatAtomic(volume),
  };
}
