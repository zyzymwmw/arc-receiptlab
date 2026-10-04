import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// Exercise the actual published file boundary, without workspace aliases.
const temporary = await mkdtemp(join(tmpdir(), "receiptlab-package-"));
try {
  const packed = JSON.parse(
    execFileSync(
      "npm",
      [
        "pack",
        "--workspace",
        "@receiptlab/core",
        "--pack-destination",
        temporary,
        "--json",
      ],
      { encoding: "utf8" },
    ),
  );
  const tarball = join(temporary, packed[0].filename);
  await writeFile(
    join(temporary, "package.json"),
    JSON.stringify({ private: true, type: "module" }),
  );
  execFileSync(
    "npm",
    ["install", tarball, "--ignore-scripts", "--no-audit", "--no-fund"],
    { cwd: temporary, stdio: "pipe" },
  );
  await writeFile(
    join(temporary, "fixture.json"),
    await readFile(resolve("fixtures/mainnet/erc20.json")),
  );
  await writeFile(
    join(temporary, "check.mjs"),
    `
import assert from 'node:assert/strict';
import fixture from './fixture.json' with { type: 'json' };
import { analyzeReceipt, formatAtomic } from '@receiptlab/core';
import { readArcReceipt } from '@receiptlab/core/rpc';
const result = analyzeReceipt(fixture);
assert.equal(result.movements[0].amountAtomic18, '1500000000000000000');
assert.equal(result.movementVolumeUsdc, '1.5');
assert.equal(result.movements[0].evidence.length, 2);
assert.equal(formatAtomic(1n), '0.000000000000000001');
assert.equal(typeof readArcReceipt, 'function');
console.log(JSON.stringify({ package: '@receiptlab/core', version: result.parserVersion, externalInstallation: true, movementVolumeUsdc: result.movementVolumeUsdc }));
`,
  );
  process.stdout.write(
    execFileSync("node", ["check.mjs"], { cwd: temporary, encoding: "utf8" }),
  );
} finally {
  await rm(temporary, { recursive: true, force: true });
}
