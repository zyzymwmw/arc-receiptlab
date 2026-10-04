export function formatAtomic(value: string | bigint, decimals = 18): string {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255)
    throw new RangeError("decimals must be an integer from 0 to 255.");
  if (
    typeof value !== "bigint" &&
    (typeof value !== "string" || !/^-?\d+$/.test(value))
  )
    throw new TypeError("Amount must be an integer decimal string or bigint.");
  const amount = BigInt(value);
  if (decimals === 0) return amount.toString();
  const sign = amount < 0n ? "-" : "";
  const digits = (amount < 0n ? -amount : amount)
    .toString()
    .padStart(decimals + 1, "0");
  const integer = digits.slice(0, -decimals);
  const fraction = digits.slice(-decimals).replace(/0+$/, "");
  return sign + integer + (fraction ? `.${fraction}` : "");
}
