import crypto from "node:crypto";

/**
 * Phase 4: Field Certification (Sovereign Industrial Alpha)
 * Generates a deterministic SHA-256 fingerprint for metal settlements.
 */
export function generateBatchSignature(data: unknown, secret: string = process.env.SOVEREIGN_SYSTEM_SECRET || "sovereign_dev_secret"): string {
  // Deterministic JSON stringification to ensure stable hashing across environments
  const sortedData = deepSortKeys(data);
  const rawPayload = JSON.stringify(sortedData);
  
  return crypto
    .createHmac("sha256", secret)
    .update(rawPayload)
    .digest("hex");
}

/**
 * Deep sort object keys to maintain hash stability.
 */
function deepSortKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(deepSortKeys);
  
  const sorted: Record<string, unknown> = {};
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  
  for (const key of keys) {
    sorted[key] = deepSortKeys((obj as Record<string, unknown>)[key]);
  }
  
  return sorted;
}

/**
 * Verification utility for non-repudiable integrity audits.
 */
export function verifySignature(data: unknown, signature: string, secret: string = process.env.SOVEREIGN_SYSTEM_SECRET || "sovereign_dev_secret"): boolean {
  const expected = generateBatchSignature(data, secret);
  return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
}
