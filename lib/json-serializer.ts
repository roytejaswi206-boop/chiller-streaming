/**
 * Safe JSON serializer that handles BigInt without throwing TypeError
 */
export function serializeWithBigInt<T = any>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_key, value) =>
      typeof value === "bigint" ? Number(value) : value
    )
  );
}
