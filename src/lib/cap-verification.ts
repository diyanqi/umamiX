import { cookies } from "next/headers";
import { verifyCapToken } from "./cap";

export async function requireRecentCapVerification(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get("infvar_cap_sensitive_token")?.value;
  if (!token) {
    return false;
  }

  const verified = await verifyCapToken(token);
  if (verified) {
    cookieStore.delete("infvar_cap_sensitive_token");
  }
  return verified;
}
