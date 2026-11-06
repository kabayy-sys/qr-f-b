import crypto from "node:crypto";

export const MEJA_CODES = ["R1", "R2", "R3", "R4", "R5", "V1A", "V1B", "V2"] as const;
export type MejaCode = (typeof MEJA_CODES)[number];

export const MEJA_LABELS: Record<MejaCode, string> = {
  R1: "Reguler 1",
  R2: "Reguler 2",
  R3: "Reguler 3",
  R4: "Reguler 4",
  R5: "Reguler 5",
  V1A: "VIP 1A",
  V1B: "VIP 1B",
  V2: "VIP 2",
};

const secret = process.env.MEJA_SECRET ?? "";
export const mejaConfigured = secret.length > 0;

export function signTable(code: MejaCode): string {
  return crypto.createHmac("sha256", secret).update(code).digest("base64url").slice(0, 16);
}

export function verifyTable(code: string, sig: string | undefined): boolean {
  if (!mejaConfigured || !sig) return false;
  if (!MEJA_CODES.includes(code as MejaCode)) return false;
  return signTable(code as MejaCode) === sig;
}
