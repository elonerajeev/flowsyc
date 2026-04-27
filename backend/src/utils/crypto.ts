import crypto from "crypto";

// Uses JWT_ACCESS_SECRET as the encryption key (already required in env)
// AES-256-GCM: authenticated encryption — detects tampering
const ALGORITHM = "aes-256-gcm";
const KEY = crypto
  .createHash("sha256")
  .update(process.env.JWT_ACCESS_SECRET ?? "fallback-dev-key-change-in-prod")
  .digest(); // 32 bytes

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: iv:tag:ciphertext (all hex)
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(ciphertext: string): string {
  const [ivHex, tagHex, dataHex] = ciphertext.split(":");
  if (!ivHex || !tagHex || !dataHex) throw new Error("Invalid encrypted value format");

  const iv  = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const data = Buffer.from(dataHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(tag);
  return decipher.update(data) + decipher.final("utf8");
}
