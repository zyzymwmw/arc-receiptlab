import { expect, it } from "vitest";
import erc20 from "../../../fixtures/mainnet/erc20.json";
import { analyzeReceipt } from "../src/index.js";
import { readArcReceipt } from "../src/rpc.js";

const fixtureFetch: typeof fetch = async (_url, options) => {
  const request = JSON.parse(String(options?.body));
  const result =
    request.method === "eth_chainId"
      ? "0x13b2"
      : request.method === "eth_getTransactionByHash"
        ? erc20.transaction
        : erc20.receipt;
  return new Response(
    JSON.stringify({ jsonrpc: "2.0", id: request.id, result }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
};

it("reads mainnet transaction and receipt as live provenance through the public read-only interface", async () => {
  const envelope = await readArcReceipt(erc20.transactionHash, {
    fetch: fixtureFetch,
  });
  const result = analyzeReceipt(envelope);
  expect(result.source.kind).toBe("live");
  expect(result.movements[0]?.amountUsdc).toBe("1.5");
});

it("does not turn an HTTP or provider error into a successful payment", async () => {
  await expect(
    readArcReceipt(erc20.transactionHash, {
      fetch: async () => new Response("Unavailable", { status: 503 }),
    }),
  ).rejects.toMatchObject({ code: "UNAVAILABLE" });
  await expect(
    readArcReceipt(erc20.transactionHash, {
      fetch: async () =>
        new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            error: { code: -32000, message: "unknown" },
          }),
        ),
    }),
  ).rejects.toMatchObject({ code: "RPC_ERROR" });
});

it("rejects wrong-network and malformed hashes at the retrieval boundary", async () => {
  await expect(
    readArcReceipt(erc20.transactionHash, {
      fetch: async () =>
        new Response(
          JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0x4cef52" }),
        ),
    }),
  ).rejects.toMatchObject({ code: "WRONG_CHAIN" });
  await expect(
    readArcReceipt("not-a-hash", { fetch: fixtureFetch }),
  ).rejects.toMatchObject({ code: "INVALID_INPUT" });
});

it("finishes with a timeout error when a transport never returns, without fabricating fixture results", async () => {
  const unavailable: typeof fetch = async () => new Promise<Response>(() => {});
  await expect(
    readArcReceipt(erc20.transactionHash, {
      fetch: unavailable,
      timeoutMs: 25,
    }),
  ).rejects.toMatchObject({ code: "TIMEOUT" });
});
