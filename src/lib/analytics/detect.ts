export type DeviceInfo = {
  browser: string;
  os: string;
  device: string;
};

export function detectDevice(userAgent?: string): DeviceInfo {
  const ua = userAgent ?? "";
  const lower = ua.toLowerCase();

  let browser = "Unknown";
  if (lower.includes("edg/") || lower.includes("edge/")) browser = "Edge";
  else if (lower.includes("opr/") || lower.includes("opera")) browser = "Opera";
  else if (lower.includes("chrome") && !lower.includes("chromium")) browser = "Chrome";
  else if (lower.includes("firefox")) browser = "Firefox";
  else if (lower.includes("safari") && !lower.includes("chrome")) browser = "Safari";
  else if (lower.includes("msie") || lower.includes("trident")) browser = "Internet Explorer";
  else if (lower.includes("bot") || lower.includes("spider") || lower.includes("crawler")) browser = "Bot";

  let os = "Unknown";
  if (lower.includes("windows")) os = "Windows";
  else if (lower.includes("android")) os = "Android";
  else if (lower.includes("iphone") || lower.includes("ipad") || lower.includes("ios")) os = "iOS";
  else if (lower.includes("mac os") || lower.includes("macintosh")) os = "macOS";
  else if (lower.includes("linux")) os = "Linux";

  let device = "Desktop";
  if (lower.includes("mobile")) device = "Mobile";
  else if (lower.includes("tablet") || lower.includes("ipad")) device = "Tablet";

  return { browser, os, device };
}

export function getReferrerDomain(referrer?: string): string | undefined {
  if (!referrer) return undefined;
  try {
    return new URL(referrer).hostname;
  } catch {
    return undefined;
  }
}
