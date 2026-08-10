import { headers } from "next/headers";

export async function getInstanceSlug(): Promise<string | null> {
  const headerStore = await headers();
  return headerStore.get("x-infvar-instance");
}
