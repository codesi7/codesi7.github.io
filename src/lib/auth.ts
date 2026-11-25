import type { AuthUser } from "./types";

export const SESSION_COOKIE_NAME = "codei7_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret(): string {
  return process.env.AUTH_SECRET || "codei7-enterprise-admin-session-secret-2026";
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((input.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function signHmac(message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return toBase64Url(new Uint8Array(signature));
}

export interface SessionPayload {
  user: AuthUser;
  exp: number;
  iat: number;
}

export async function createSessionToken(user: AuthUser): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    user,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };
  const payloadStr = JSON.stringify(payload);
  const encodedPayload = toBase64Url(new TextEncoder().encode(payloadStr));
  const sig = await signHmac(encodedPayload);
  return `${encodedPayload}.${sig}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token || !token.includes(".")) return null;
  try {
    const [encodedPayload, sig] = token.split(".");
    if (!encodedPayload || !sig) return null;
    const expectedSig = await signHmac(encodedPayload);
    if (sig !== expectedSig) return null;

    const jsonBytes = fromBase64Url(encodedPayload);
    const payload = JSON.parse(new TextDecoder().decode(jsonBytes)) as SessionPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
