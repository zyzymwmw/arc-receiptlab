export interface Diagnostic {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
  logIndices: string[];
}

export interface DataSource {
  kind: "live" | "mainnet-recorded" | "synthetic";
  retrievedAt: string;
  endpoint?: string;
  description?: string;
}

export interface RawLog {
  eventId: string;
  logIndex: string;
  emitter: string;
  stream: "system" | "erc20" | "other";
  data: string;
  topics: string[];
  transfer?: {
    from: string;
    to: string;
    amountRaw: string;
    decimals: 6 | 18;
    amountUsdc: string;
  };
}

export interface Movement {
  kind: "transfer" | "mint" | "burn";
  eventId: string;
  logIndex: string;
  from: string;
  to: string;
  amountAtomic18: string;
  amountUsdc: string;
  evidence: {
    eventId: string;
    logIndex: string;
    emitter: string;
    decimals: 6 | 18;
  }[];
}

export interface AddressFlow {
  address: string;
  incomingAtomic18: string;
  outgoingAtomic18: string;
  netAtomic18: string;
  incomingUsdc: string;
  outgoingUsdc: string;
  netUsdc: string;
}

export interface ReceiptAnalysis {
  schemaVersion: 1;
  chainId: number;
  parserVersion: string;
  transactionHash: string;
  source: DataSource;
  blockNumber: string | null;
  blockHash: string | null;
  status:
    "confirmed" | "reverted" | "pending" | "not-found" | "receipt-unavailable";
  coverage: "complete" | "partial" | "unavailable";
  outerSender: string | null;
  movements: Movement[];
  rawLogs: RawLog[];
  diagnostics: Diagnostic[];
  addressFlows: AddressFlow[];
  movementVolumeAtomic18: string | null;
  movementVolumeUsdc: string | null;
  fee: {
    amountAtomic18: string;
    amountUsdc: string;
    gasUsed: string;
    effectiveGasPriceAtomic18: string;
    outerSender: string | null;
  } | null;
}
