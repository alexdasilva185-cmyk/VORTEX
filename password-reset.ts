import crypto from "crypto";

/**
 * Token de reset: 32 bytes randômicos em base64url.
 * O hash SHA-256 é o que vai no banco (token em si só fica no email do
 * usuário). Quando o user clica no link, comparamos por timing-safe.
 */
export function generateResetToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString("base64url");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

export function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora
