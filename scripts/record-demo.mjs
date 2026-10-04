import { chromium } from "@playwright/test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";

const url =
  process.env.RECEIPTLAB_DEMO_URL ??
  "https://arc-receiptlab.just-duck-9698.chatgpt.site";
const temporary = await mkdtemp(join(tmpdir(), "receiptlab-demo-"));
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  recordVideo: { dir: temporary, size: { width: 1440, height: 1000 } },
  acceptDownloads: true,
});
const page = await context.newPage();
const methods = [];
page.on("request", (request) => {
  if (
    request.url().startsWith("https://rpc.mainnet.arc.io") &&
    request.method() === "POST"
  )
    methods.push(JSON.parse(request.postData()).method);
});
const video = page.video();
try {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.getByTestId("source-label").waitFor();
  await page.addStyleTag({
    content:
      ".demo-caption{position:fixed;z-index:100;left:32px;right:32px;bottom:20px;padding:18px 24px;background:#101d33f5;border:1px solid #7799c4;border-radius:8px;color:#fff;font:500 20px/1.5 -apple-system,BlinkMacSystemFont,sans-serif;box-shadow:0 6px 30px #0003;pointer-events:none}.demo-caption small{color:#9fc4ff;font-size:12px;font-weight:700;letter-spacing:.12em;display:block;margin-bottom:5px}",
  });
  const started = Date.now();
  const at = async (seconds) => {
    await new Promise((resolveWait) =>
      setTimeout(
        resolveWait,
        Math.max(0, started + seconds * 1000 - Date.now()),
      ),
    );
  };
  const caption = async (chapter, text) =>
    page.evaluate(
      ({ chapter, text }) => {
        let overlay = document.querySelector(".demo-caption");
        if (!overlay) {
          overlay = document.createElement("div");
          overlay.className = "demo-caption";
          document.body.append(overlay);
        }
        overlay.replaceChildren();
        const label = document.createElement("small");
        label.textContent = `ARC RECEIPTLAB · ${chapter}`;
        const body = document.createElement("div");
        body.textContent = text;
        overlay.append(label, body);
      },
      { chapter, text },
    );
  const focusRegion = async (selector) => {
    const box = await page.locator(selector).boundingBox();
    if (!box) throw new Error("Demo region is unavailable.");
    await page.mouse.wheel(0, box.y - Math.max(20, (860 - box.height) / 2));
    await page.waitForTimeout(250);
  };
  const live = async () => {
    await page
      .getByRole("button", { name: "Read from mainnet", exact: true })
      .click();
    await page
      .getByTestId("source-label")
      .filter({ hasText: "Live mainnet response" })
      .waitFor({ timeout: 20000 });
  };

  await caption(
    "THE PROBLEM",
    "One USDC transfer can produce two event streams. Developers need the movement and its evidence, without counting the money twice.",
  );
  await at(10);
  await live();
  await focusRegion(".receipt-overview");
  if ((await page.getByTestId("movement-volume").textContent()) !== "1.5 USDC")
    throw new Error("Unexpected live amount.");
  await caption(
    "LIVE MAINNET",
    "This public, existing transaction moved 1.5 USDC. The receipt gas cost is separate. No wallet or new transaction is involved.",
  );
  await at(22);
  await focusRegion(".comparison");
  await caption(
    "COUNT ONCE",
    "The teaching counterexample adds both streams and reports 3 USDC. ReceiptLab keeps one 1.5 USDC movement and both evidence records.",
  );
  await at(34);
  await page
    .getByRole("link", { name: "System · log #20 · 18 decimals" })
    .click();
  await focusRegion("#log-20");
  await caption(
    "INSPECT THE EVIDENCE",
    "System log #20 has 18 decimals. The raw emitter, amount, sender, recipient and event identity stay inspectable.",
  );
  await at(44);
  await page
    .getByRole("link", { name: "ERC-20 · log #21 · 6 decimals" })
    .click();
  await focusRegion("#log-21");
  await caption(
    "SAME MOVEMENT, DIFFERENT UNITS",
    "The ERC-20 counterpart has 6 decimals. It is attached as evidence, never counted as a second movement.",
  );
  await at(54);
  await page.getByRole("button", { name: /Native transfer/ }).click();
  await live();
  await focusRegion(".receipt-overview");
  await caption(
    "NATIVE USDC",
    "A second live mainnet receipt moved 100.42007099937 USDC through a system event. There is no ERC-20 USDC event to require.",
  );
  await at(66);
  await focusRegion(".comparison");
  await caption(
    "DO NOT MISS NATIVE MOVEMENTS",
    "An ERC-20-only indexer would miss this movement. Amounts use exact integer arithmetic, including sub-micro precision.",
  );
  await at(76);
  await page.getByRole("button", { name: /Multiple movements/ }).click();
  await live();
  await focusRegion(".receipt-overview");
  await caption(
    "PRESERVE DISTINCT EVENTS",
    "This receipt has four separate movements. Use log identity for counting, and event senders for attribution; the outer sender can differ.",
  );
  await at(81);
  await focusRegion(".movement-list > li:first-child");
  await at(86);
  await focusRegion(".movement-list > li:last-child");
  await at(90);
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON" }).click();
  await downloading;
  await focusRegion(".integration");
  await caption(
    "REUSE AND REPRODUCE",
    "Export JSON or reuse the same parser. Public source includes three mainnet fixtures, 33 core checks, 16 browser checks and an independently installed package example.",
  );
  await at(100);
  await focusRegion(".scope-note");
  await caption(
    "CLEAR BOUNDARIES",
    "Explicit movements and outer gas only. Not historical balances, invoice settlement or a full audit. Live, recorded and unavailable data stay distinct.",
  );
  await at(108);
  const narrationSeconds = (Date.now() - started) / 1000;
  await context.close();
  await mkdir(resolve("apps/web/public"), { recursive: true });
  await video.saveAs(resolve("apps/web/public/demo.webm"));
  await mkdir(resolve("docs/evidence"), { recursive: true });
  await writeFile(
    resolve("docs/evidence/demo-recording.json"),
    JSON.stringify(
      {
        recordedAt: new Date().toISOString(),
        url,
        format: "WebM/VP8",
        size: "1440x1000",
        narration: "English on-screen captions; no voice audio",
        narrationSeconds,
        source:
          "Real published UI; live read-only queries of existing transactions",
        methods,
        overlay:
          "Explanatory captions added for this recording, not application UI",
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    JSON.stringify({
      file: resolve("apps/web/public/demo.webm"),
      narrationSeconds,
      readMethods: methods,
    }),
  );
} finally {
  await context.close().catch(() => {});
  await browser.close();
  await rm(temporary, { recursive: true, force: true });
}
