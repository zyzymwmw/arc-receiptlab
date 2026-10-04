import { ARC_CHAIN_ID, ARC_RPC_URL } from "./constants.js";
import { hash, quantity, record } from "./validation.js";

export class ArcRpcError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "ArcRpcError";
  }
}

export interface ReadOptions {
  fetch?: typeof fetch;
  endpoint?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export async function readArcReceipt(
  transactionHash: string,
  options: ReadOptions = {},
) {
  const txHash = hash(transactionHash, "transactionHash");
  const endpoint = options.endpoint ?? ARC_RPC_URL;
  const request = options.fetch ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? 12000;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 60000)
    throw new ArcRpcError(
      "RPC timeout must be between 1 and 60000 ms.",
      "INVALID_OPTIONS",
    );
  if (options.signal?.aborted)
    throw new ArcRpcError("Lookup cancelled.", "ABORTED");
  let requestId = 0;
  async function rpc(
    method:
      "eth_chainId" | "eth_getTransactionByHash" | "eth_getTransactionReceipt",
    params: string[] = [],
  ) {
    const id = ++requestId;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancel: (() => void) | undefined;
    const deadline = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        reject(
          new ArcRpcError(
            "Mainnet lookup timed out. No result was inferred.",
            "TIMEOUT",
          ),
        );
        controller.abort();
      }, timeoutMs);
      cancel = () => {
        reject(new ArcRpcError("Lookup cancelled.", "ABORTED"));
        controller.abort();
      };
      options.signal?.addEventListener("abort", cancel, { once: true });
    });
    const operation = async () => {
      const response = await request(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
      });
      if (!response.ok)
        throw new ArcRpcError(
          `Mainnet RPC is unavailable (HTTP ${response.status}). No result was inferred.`,
          "UNAVAILABLE",
        );
      const payload = record(await response.json(), "RPC response");
      if (payload.error)
        throw new ArcRpcError(
          "Mainnet RPC returned an error. No result was inferred.",
          "RPC_ERROR",
        );
      if (!("result" in payload))
        throw new ArcRpcError(
          "Mainnet RPC returned no result.",
          "INVALID_RESPONSE",
        );
      return payload.result;
    };
    try {
      return await Promise.race([operation(), deadline]);
    } finally {
      clearTimeout(timer);
      if (cancel) options.signal?.removeEventListener("abort", cancel);
    }
  }
  if (quantity(await rpc("eth_chainId"), "chainId") !== BigInt(ARC_CHAIN_ID))
    throw new ArcRpcError("RPC is not Arc mainnet (5042).", "WRONG_CHAIN");
  const [transaction, receipt] = await Promise.all([
    rpc("eth_getTransactionByHash", [txHash]),
    rpc("eth_getTransactionReceipt", [txHash]),
  ]);
  return {
    schemaVersion: 1,
    chainId: ARC_CHAIN_ID,
    transactionHash: txHash,
    retrievedAt: new Date().toISOString(),
    source: { kind: "live", endpoint },
    transaction,
    receipt,
  };
}
