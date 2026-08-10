import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const cookieSchema = z.object({
  token: z.string().min(4).max(2000),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = cookieSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("infvar_cap_token", parsed.data.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 20 * 60,
  });
  return response;
}
