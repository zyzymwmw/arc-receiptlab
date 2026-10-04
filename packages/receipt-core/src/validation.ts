import type { Hex } from "viem";

export class ReceiptValidationError extends Error {
  constructor(
    message: string,
    readonly code = "INVALID_INPUT",
  ) {
    super(message);
    this.name = "ReceiptValidationError";
  }
}

export function record(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ReceiptValidationError(`${field} must be an object.`);
  }
  return value as Record<string, unknown>;
}

export function hex(value: unknown, field: string): Hex {
  if (typeof value !== "string" || !/^0x[0-9a-f]*$/i.test(value)) {
    throw new ReceiptValidationError(`${field} must be hex data.`);
  }
  return value as Hex;
}

export function quantity(value: unknown, field: string): bigint {
  if (
    typeof value !== "string" ||
    !/^0x(?:0|[1-9a-f][0-9a-f]*)$/i.test(value)
  ) {
    throw new ReceiptValidationError(
      `${field} must be an unsigned JSON-RPC hex quantity.`,
    );
  }
  return BigInt(value);
}

export function address(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^0x[0-9a-f]{40}$/i.test(value)) {
    throw new ReceiptValidationError(`${field} must be a 20-byte address.`);
  }
  return value.toLowerCase();
}

export function hash(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^0x[0-9a-f]{64}$/i.test(value)) {
    throw new ReceiptValidationError(`${field} must be a 32-byte hash.`);
  }
  return value.toLowerCase();
}
