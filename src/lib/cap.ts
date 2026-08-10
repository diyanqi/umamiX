import { createHash } from "node:crypto";
import { generateChallenge, validateChallenge } from "capjs-core";
import { redis } from "./redis";

const CAP_SECRET = process.env.CAP_SECRET ?? "";

if (!CAP_SECRET) {
  throw new Error("CAP_SECRET environment variable is required");
}

export async function createCapChallenge(scope = "auth") {
  return generateChallenge(CAP_SECRET, {
    scope,
    instrumentation: true,
  });
}

export async function redeemCap(body: unknown, scope = "auth") {
  const result = await validateChallenge(
    CAP_SECRET,
    body as never,
    {
      scope,
      consumeNonce: async (sigHex: string, ttlMs: number) => {
        const previous = await redis.set(
          `cap:nonce:${sigHex}`,
          "1",
          "EX",
          Math.ceil(ttlMs / 1000),
          "NX",
          "GET",
        );
        return previous === null;
      },
    },
  );

  if (!result.success) {
    return result;
  }

  const ttl = result.expires - Date.now();
  if (ttl > 0) {
    await redis.set(`cap:token:${result.tokenKey}`, String(result.expires), "PX", ttl);
  }
  return result;
}

export async function verifyCapToken(token: string): Promise<boolean> {
  const [id, secret] = token.split(":");
  if (!id || !secret) {
    return false;
  }

  const tokenKey = `${id}:${createHash("sha256").update(secret).digest("hex")}`;
  const stored = await redis.get(`cap:token:${tokenKey}`);
  if (!stored) {
    return false;
  }

  await redis.del(`cap:token:${tokenKey}`);
  return Number(stored) > Date.now();
}
