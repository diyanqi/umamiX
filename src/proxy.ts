import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const INSTANCE_PATH = /^\/i\/([a-z0-9-]+)(?:\/(.*))?$/i;

const protectedPrefixes = [
  "/dashboard",
  "/api/websites",
  "/api/api-keys",
  "/api/goals",
  "/api/reports",
  "/api/team",
  "/api/subscription",
  "/api/billing",
];

const instanceAliases: Record<string, string> = {
  "": "/",
  dashboard: "/dashboard",
  websites: "/dashboard/websites",
  events: "/dashboard/events",
  reports: "/dashboard/reports",
  settings: "/dashboard/settings",
};

export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const instanceMatch = url.pathname.match(INSTANCE_PATH);

  if (instanceMatch) {
    const slug = instanceMatch[1];
    const restRaw = instanceMatch[2] ?? "";
    const rest = restRaw.startsWith("/") ? restRaw : `/${restRaw}`;
    const restKey = restRaw;
    let targetPath = `/${restRaw}`;
    if (restRaw === "script.js") {
      targetPath = "/script.js";
    } else if (restRaw.startsWith("share/")) {
      targetPath = `/share/${restRaw.slice("share/".length)}`;
    } else if (restRaw in instanceAliases) {
      targetPath = instanceAliases[restRaw];
    }
    const target = url.clone();
    target.pathname = targetPath;
    target.searchParams.set("instance", slug);

    const needsAuth = protectedPrefixes.some(
      (prefix) => targetPath === prefix || targetPath.startsWith(`${prefix}/`),
    );
    if (needsAuth) {
      const token = await getToken({
        req: request,
        secret: process.env.AUTH_SECRET,
      });
      if (!token) {
        const signInUrl = new URL("/signin", request.url);
        signInUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
        return NextResponse.redirect(signInUrl);
      }
    }

    const response = NextResponse.rewrite(target);
    response.headers.set("x-infvar-instance", slug);
    return response;
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });
  if (!token) {
    const signInUrl = new URL("/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/websites/:path*",
    "/api/api-keys/:path*",
    "/i/:path*",
  ],
};
