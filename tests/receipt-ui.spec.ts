import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import erc20 from "../fixtures/mainnet/erc20.json" with { type: "json" };
import native from "../fixtures/mainnet/native.json" with { type: "json" };

const rpcPattern = /https:\/\/rpc\.mainnet\.arc\.io\/?$/;

async function stubRpc(
  page: Page,
  options: {
    chain?: string;
    status?: string;
    missing?: boolean;
    pending?: boolean;
  } = {},
) {
  const methods: string[] = [];
  await page.route(rpcPattern, async (route) => {
    const request = JSON.parse(route.request().postData() ?? "{}");
    methods.push(request.method);
    const transaction = options.missing
      ? null
      : {
          ...erc20.transaction,
          ...(options.pending ? { blockNumber: null, blockHash: null } : {}),
        };
    const receipt =
      options.missing || options.pending
        ? null
        : { ...erc20.receipt, status: options.status ?? "0x1" };
    const result =
      request.method === "eth_chainId"
        ? (options.chain ?? "0x13b2")
        : request.method === "eth_getTransactionByHash"
          ? transaction
          : receipt;
    await route.fulfill({ json: { jsonrpc: "2.0", id: request.id, result } });
  });
  return methods;
}

test("recorded examples show independent totals and are reversible", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("source-label")).toHaveText(
    "Recorded mainnet sample",
  );
  await expect(page.getByTestId("movement-volume")).toHaveText("1.5 USDC");
  await expect(page.locator(".incorrect strong")).toHaveText("3 USDC");
  await page.getByRole("button", { name: /Native transfer/ }).click();
  await expect(page.getByTestId("movement-volume")).toHaveText(
    "100.42007099937 USDC",
  );
  await expect(page.locator(".incorrect strong")).toHaveText("0 USDC");
  await page.getByRole("button", { name: /Multiple movements/ }).click();
  await expect(page.getByTestId("movement-count")).toHaveText("4");
  await expect(page.getByTestId("movement-volume")).toHaveText("0.005459 USDC");
  await expect(page.locator(".diagnostics")).toContainText(
    "OUTER SENDER DIFFERS",
  );
  await page.getByRole("button", { name: /ERC-20 transfer/ }).click();
  await expect(page.getByTestId("movement-volume")).toHaveText("1.5 USDC");
});

test("evidence links expand the exact source log and details can be closed", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("link", { name: "System · log #20 · 18 decimals" })
    .click();
  await expect(page.locator("#log-20")).toHaveAttribute("open", "");
  await expect(page.locator("#log-20")).toContainText("1500000000000000000");
  await page.locator("#log-20 summary").click();
  await expect(page.locator("#log-20")).not.toHaveAttribute("open", "");
  await page
    .getByRole("link", { name: "ERC-20 · log #21 · 6 decimals" })
    .click();
  await expect(page.locator("#log-21")).toHaveAttribute("open", "");
  await expect(page.locator("#log-21")).toContainText("1500000");
  await page
    .getByText("Full source transaction and receipt", { exact: true })
    .click();
  await expect(page.locator(".raw-envelope")).toHaveAttribute("open", "");
});

test("JSON export contains exact string amounts and raw source evidence", async ({
  page,
}) => {
  await page.goto("/");
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON" }).click();
  const download = await downloaded;
  const path = await download.path();
  expect(path).not.toBeNull();
  const exported = JSON.parse(await readFile(path!, "utf8"));
  expect(exported.analysis.source.kind).toBe("mainnet-recorded");
  expect(exported.analysis.movements[0].amountAtomic18).toBe(
    "1500000000000000000",
  );
  expect(exported.analysis.movements[0].evidence).toHaveLength(2);
  expect(exported.input.receipt).toEqual(erc20.receipt);
  await expect(page.getByRole("status")).toContainText("Exported the analysis");
});

test("read-only adapter updates the UI from a stubbed RPC response without sending a transaction", async ({
  page,
}) => {
  const methods = await stubRpc(page);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Read from mainnet", exact: true })
    .click();
  await expect(page.getByTestId("source-label")).toHaveText(
    "Live mainnet response",
  );
  await expect(page.getByTestId("movement-volume")).toHaveText("1.5 USDC");
  await expect(page.getByTestId("gas-amount")).toHaveText(
    "0.00312918156459 USDC",
  );
  expect(methods.sort()).toEqual([
    "eth_chainId",
    "eth_getTransactionByHash",
    "eth_getTransactionReceipt",
  ]);
});

test("invalid hash and network failure clear prior success instead of silently using a recorded fixture", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Arc mainnet transaction hash" })
    .fill("not-a-hash");
  await page
    .getByRole("button", { name: "Read from mainnet", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("32-byte hash");
  await expect(page.getByTestId("receipt-results")).toHaveCount(0);
  await page.getByRole("button", { name: /ERC-20 transfer/ }).click();
  await page.route(rpcPattern, (route) =>
    route.fulfill({ status: 503, body: "temporarily unavailable" }),
  );
  await page
    .getByRole("button", { name: "Read from mainnet", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("HTTP 503");
  await expect(page.getByTestId("receipt-results")).toHaveCount(0);
});

test("wrong chain, pending, not-found and reverted responses remain distinct", async ({
  page,
}) => {
  await page.goto("/");
  for (const scenario of [
    { options: { chain: "0x4cef52" }, text: "not Arc mainnet" },
    { options: { pending: true }, text: "Pending" },
    { options: { missing: true }, text: "Not found" },
    { options: { status: "0x0" }, text: "Reverted" },
  ]) {
    await page.unroute(rpcPattern);
    await stubRpc(page, scenario.options);
    await page
      .getByRole("button", { name: "Read from mainnet", exact: true })
      .click();
    if (scenario.options.chain)
      await expect(page.getByRole("alert")).toContainText(scenario.text);
    else {
      await expect(page.locator(".receipt-status")).toHaveText(scenario.text);
      await expect(page.getByTestId("movement-count")).toHaveText(
        scenario.options.status ? "0" : "—",
      );
      await expect(page.getByTestId("movement-volume")).toHaveText(
        scenario.options.status ? "0 USDC" : "— USDC",
      );
    }
  }
});

test("selecting a sample cancels an in-flight lookup and retains its recorded identity", async ({
  page,
}) => {
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(rpcPattern, async (route) => {
    const request = JSON.parse(route.request().postData() ?? "{}");
    await held;
    await route
      .fulfill({ json: { jsonrpc: "2.0", id: request.id, result: "0x13b2" } })
      .catch(() => {});
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Read from mainnet", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Reading mainnet…" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: /Native transfer/ }).click();
  release();
  await expect(page.getByTestId("source-label")).toHaveText(
    "Recorded mainnet sample",
  );
  await expect(page.getByTestId("movement-volume")).toHaveText(
    "100.42007099937 USDC",
  );
  await expect(
    page.getByRole("textbox", { name: "Arc mainnet transaction hash" }),
  ).toHaveValue(native.transactionHash);
});

test("primary query fits, page has no horizontal overflow and visible controls satisfy WCAG AA checks", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Read from mainnet", exact: true }),
  ).toBeInViewport();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await page.addStyleTag({ content: ":root { font-size: 32px !important; }" });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(page.viewportSize()!.width);
});
