import { expect, it } from "vitest";
import { formatAtomic } from "../src/index.js";

it("formats zero-decimal integer amounts and exact signed fractions without floating point", () => {
  expect(formatAtomic("120", 0)).toBe("120");
  expect(formatAtomic("-1000001", 6)).toBe("-1.000001");
  expect(formatAtomic(0n)).toBe("0");
});

it("rejects decimal precision outside the supported uint8 range and non-integer decimal strings", () => {
  for (const decimals of [-1, 1.5, 256])
    expect(() => formatAtomic("1", decimals)).toThrow("decimals");
  for (const input of ["", "1.5", "0x10", " 10"])
    expect(() => formatAtomic(input)).toThrow("integer");
});
